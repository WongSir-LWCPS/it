import {
  boot, db, esc, toast, fmtDate, todayId, isStaffEmail, enhanceDateInputs, timePicker,
} from "../../assets/js/common.js?v=20261007a";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { notifyAdmins } from "../../assets/js/notify.js?v=20261007a";
import {
  INFO, ISTATUS, deviceName, deviceWithPlace, findClashes, isActive, slotEnd,
} from "./infostation-config.js?v=20261007a";
import { buildInfoEmail, slotText } from "./infostation-email.js?v=20261007a";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, all: [], dates: [] };
const loginName = () => (S.user.displayName || S.user.email.split("@")[0]).trim();

boot({
  root: "../../", current: "infostation",
  onReady: ({ user, isAdmin }) => {
    S.user = user;
    $("#admin-link").hidden = !isAdmin;
    $("#intro").textContent = INFO.intro;
    setupForm();

    // 讀取所有預約：用於顯示已預約時段及檢查時間衝突
    onSnapshot(collection(db, "infostation_bookings"), (snap) => {
      S.all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderSchedule();
      renderMine();
    }, (e) => { $("#schedule").innerHTML = `<p class="load-error">未能讀取預約：${esc(e.message)}</p>`; });

    $("#mine").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (btn) cancelMine(btn.dataset.cancel);
    });
  },
});

/* ---------- 表格 ---------- */
function setupForm() {
  const f = $("#req-form");
  $("#login-name").textContent = `使用登入名稱：${loginName()}`;
  $("#device-choices").innerHTML = INFO.devices.map((d) => `
    <label class="choice"><input type="checkbox" name="device" value="${d.id}"><span>${esc(d.name)}</span></label>`).join("");
  enhanceDateInputs(f);
  const tp = { from: INFO.timeFrom, to: INFO.timeTo };
  timePicker(f.startTime, { ...tp, label: "開始時間" });
  timePicker(f.endTime, { ...tp, label: "完結時間" });
  timePicker(f.multiStart, { ...tp, label: "每日開始時間" });
  timePicker(f.multiEnd, { ...tp, label: "每日完結時間", isAllowed: (t) => !f.multiStart.value || t > f.multiStart.value,
    errorText: "完結時間必須遲於開始時間。" });
  f.multiStart.addEventListener("change", () => f.multiEnd._tp.refresh());

  f.querySelectorAll('input[name="nameMode"]').forEach((r) => r.addEventListener("change", () => {
    $("#other-wrap").hidden = f.nameMode.value !== "other";
    if (f.nameMode.value === "other") f.otherName.focus();
  }));
  $("#device-choices").addEventListener("change", renderLocations);
  f.querySelectorAll('input[name="dateMode"]').forEach((r) => r.addEventListener("change", () => {
    const multi = f.dateMode.value === "multi";
    $("#range-fields").hidden = multi;
    $("#multi-fields").hidden = !multi;
  }));
  f.startDate.addEventListener("change", () => { if (!f.endDate.value || f.endDate.value < f.startDate.value) f.endDate.value = f.startDate.value; });

  // 多個日期
  $("#add-date").addEventListener("click", () => {
    const d = f.addDate.value;
    if (!d) return;
    if (d < todayId()) { toast("不能選擇已過去的日期。", "error"); return; }
    if (!S.dates.includes(d)) S.dates = [...S.dates, d].sort();
    f.addDate.value = "";
    renderDates();
  });
  $("#date-chips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-date]");
    if (!btn) return;
    S.dates = S.dates.filter((x) => x !== btn.dataset.removeDate);
    renderDates();
  });
  resetForm();
  f.addEventListener("submit", submit);
}

function renderLocations() {
  const f = $("#req-form");
  const box = $("#location-fields");
  const keep = {};
  box.querySelectorAll("input").forEach((i) => { keep[i.dataset.loc] = i.value; });
  const selected = [...f.querySelectorAll('input[name="device"]:checked')].map((x) => x.value);
  box.innerHTML = INFO.devices.filter((d) => d.mobile && selected.includes(d.id)).map((d) => `
    <label class="field">
      <span>${esc(d.name)} 擺放地點</span>
      <input data-loc="${d.id}" maxlength="60" placeholder="例如：禮堂、有蓋操場" value="${esc(keep[d.id] || "")}">
    </label>`).join("");
}

function renderDates() {
  $("#date-chips").innerHTML = S.dates.map((d) => `
    <li class="chip"><span>${fmtDate(d)}</span>
      <button type="button" data-remove-date="${d}" aria-label="移除 ${fmtDate(d)}">✕</button></li>`).join("");
  $("#date-count").textContent = S.dates.length ? `已選 ${S.dates.length} 個日期。` : "請加入最少一個日期。";
}

function resetForm() {
  const f = $("#req-form");
  f.reset();
  ["startTime", "endTime", "multiStart", "multiEnd"].forEach((n) => f[n]._tp.set("", true));
  f.startDate.min = todayId();
  f.endDate.min = todayId();
  f.addDate.min = todayId();
  f.startDate.value = todayId();
  f.endDate.value = todayId();
  S.dates = [];
  $("#other-wrap").hidden = true;
  $("#range-fields").hidden = false;
  $("#multi-fields").hidden = true;
  renderLocations();
  renderDates();
}

/** 由表格取得時段；有問題時回傳錯誤訊息 */
function readSlots(f) {
  if (f.dateMode.value === "multi") {
    const st = f.multiStart.value;
    const en = f.multiEnd.value;
    if (!S.dates.length) return { error: "請加入最少一個日期。" };
    if (!st || !en) return { error: "請填寫每日開始及完結時間。" };
    if (en <= st) return { error: "完結時間必須遲於開始時間。" };
    return { slots: S.dates.map((d) => ({ startDate: d, startTime: st, endDate: d, endTime: en })) };
  }
  const s = { startDate: f.startDate.value, startTime: f.startTime.value, endDate: f.endDate.value, endTime: f.endTime.value };
  if (!s.startDate || !s.startTime || !s.endDate || !s.endTime) return { error: "請填寫開始及完結的日期和時間。" };
  if (s.startDate < todayId()) return { error: "開始日期不能早於今天。" };
  if (`${s.endDate}T${s.endTime}` <= `${s.startDate}T${s.startTime}`) return { error: "完結時間必須遲於開始時間。" };
  return { slots: [s] };
}

async function submit(e) {
  e.preventDefault();
  const f = $("#req-form");
  const warn = (msg) => { const w = $("#req-warn"); w.hidden = !msg; w.textContent = msg; };
  const isOther = f.nameMode.value === "other";
  const applicantName = (isOther ? f.otherName.value : loginName()).trim().slice(0, 40);
  const applicantEmail = (isOther ? f.otherEmail.value : S.user.email).trim().toLowerCase();
  const devices = [...f.querySelectorAll('input[name="device"]:checked')].map((x) => x.value);
  const locations = {};
  $("#location-fields").querySelectorAll("input").forEach((i) => { locations[i.dataset.loc] = i.value.trim(); });
  const activity = f.activity.value.trim();
  const content = f.content.value.trim();

  if (!applicantName) return warn("請輸入申請人名稱。");
  if (isOther && !isStaffEmail(applicantEmail)) return warn("請輸入申請人的學校電郵（@lwcps.edu.hk）。");
  if (!devices.length) return warn("請選擇最少一部器材。");
  const missing = Object.entries(locations).find(([, v]) => !v);
  if (missing) return warn(`請填寫${deviceName(missing[0])}的擺放地點。`);
  if (!activity) return warn("請填寫活動名稱。");
  const { slots, error } = readSlots(f);
  if (error) return warn(error);
  if (!content) return warn("請填寫顯示資料，或資料擺放的位置。");
  const clashes = findClashes(S.all, devices, slots);
  if (clashes.length) {
    const c = clashes[0];
    return warn(`${c.devices.map(deviceName).join("、")} 在 ${slotText(c.slot)} 已有預約「${c.booking.activity}」，請選擇其他時間或器材。`);
  }
  warn("");

  const btn = $("#req-submit");
  btn.disabled = true;
  btn.textContent = "提交中…";
  const dates = slots.flatMap((s) => [s.startDate, s.endDate]).sort();
  const data = {
    applicantName, applicantEmail, email: S.user.email, uid: S.user.uid,
    devices, locations, activity, content, slots,
    firstDate: dates[0], lastDate: dates[dates.length - 1],
    status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  try {
    await addDoc(collection(db, "infostation_bookings"), data);
  } catch (err) {
    console.error(err);
    warn("未能提交：" + err.message);
    btn.disabled = false;
    btn.textContent = "提交申請";
    return;
  }
  notifyAdmins("infostation", buildInfoEmail(data, "new")).then((r) => console.info("通知管理員：", r));
  toast("已提交申請，IT組審批後可在下方「我的申請」查看結果。", "success");
  resetForm();
  btn.disabled = false;
  btn.textContent = "提交申請";
}

/* ---------- 已預約時段 ---------- */
function renderSchedule() {
  const now = `${todayId()}T00:00`;
  const rows = S.all.filter(isActive)
    .flatMap((b) => (b.slots || []).filter((s) => slotEnd(s) >= now).map((s) => ({ b, s })))
    .sort((a, b) => `${a.s.startDate}T${a.s.startTime}`.localeCompare(`${b.s.startDate}T${b.s.startTime}`));
  const box = $("#schedule");
  if (!rows.length) { box.innerHTML = `<p class="empty">暫時沒有預約。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>日期及時間</th><th>器材</th><th>活動名稱</th><th>狀態</th></tr></thead>
        <tbody>
          ${rows.map(({ b, s }) => `
            <tr>
              <td class="nowrap">${slotText(s)}</td>
              <td>${esc(deviceWithPlace(b))}</td>
              <td data-no-translate>${esc(b.activity)}</td>
              <td><span class="badge badge--${ISTATUS[b.status].tone}">${ISTATUS[b.status].label}</span></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---------- 我的申請 ---------- */
function renderMine() {
  const list = S.all.filter((r) => r.uid === S.user.uid)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const box = $("#mine");
  if (!list.length) { box.innerHTML = `<p class="empty">你還未提交任何申請。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>活動名稱</th><th>器材</th><th>日期及時間</th><th>狀態</th><th>IT組備註</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td data-no-translate>${esc(r.activity)}</td>
              <td>${esc(deviceWithPlace(r))}</td>
              <td class="nowrap">${(r.slots || []).map(slotText).join("<br>")}</td>
              <td><span class="badge badge--${ISTATUS[r.status]?.tone}">${ISTATUS[r.status]?.label || r.status}</span></td>
              <td>${esc(r.reviewNote || "")}</td>
              <td>${r.status === "pending" ? `<button class="btn btn--small" data-cancel="${r.id}">取消申請</button>` : ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function cancelMine(id) {
  if (!confirm("取消這項申請？")) return;
  try {
    await updateDoc(doc(db, "infostation_bookings", id), { status: "cancelled", updatedAt: serverTimestamp() });
    toast("已取消申請。", "success");
  } catch (e) {
    toast("未能取消：" + e.message, "error");
  }
}

