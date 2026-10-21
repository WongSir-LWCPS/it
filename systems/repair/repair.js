import {
  boot, db, esc, toast, fmtDate, fmtTimestamp, todayId,
} from "../../assets/js/common.js?v=20261021b";
import {
  collection, addDoc, onSnapshot, query, where, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, isStaffEmail } from "../../assets/js/common.js?v=20261021b";
import { notifyAdmins } from "../../assets/js/notify.js?v=20261021b";
import { REPAIR, RSTATUS, chineseName } from "./repair-config.js?v=20261021b";
import { buildRepairEmail } from "./repair-email.js?v=20261021b";

const $ = (sel) => document.querySelector(sel);
/** 簡短日期，令表格不會太闊，例如 16/10/2026 */
const shortDate = (id) => (id ? id.split("-").reverse().map((x) => String(+x)).join("/") : "");
const S = { user: null, mine: [] };

// 「我的報告」：登入後立即讀取，不用等待平台其他檢查；並先顯示上次的記錄（只存於本機）
const cacheKey = (uid) => `repair-mine-${uid}`;
let listening = false;
function listenMine(user) {
  if (listening) return;
  listening = true;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(user.uid)) || "null");
    if (Array.isArray(cached)) {
      S.mine = cached.map((r) => ({ ...r, followUpAt: r.followUpAt ? { toDate: () => new Date(r.followUpAt) } : null }));
      renderMine();
    }
  } catch { /* 沒有本機記錄 */ }
  onSnapshot(query(collection(db, REPAIR.coll), where("uid", "==", user.uid)), (snap) => {
    if (!$("#mine")) return;   // 系統未開放時頁面沒有這個區域
    S.mine = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderMine();
    fillSuggestions();
    try {
      localStorage.setItem(cacheKey(user.uid), JSON.stringify(S.mine.map((r) => ({
        id: r.id, date: r.date, location: r.location, device: r.device, problem: r.problem,
        status: r.status, doneDate: r.doneDate || "", followUp: r.followUp || "",
        createdAt: { seconds: r.createdAt?.seconds || Date.now() / 1000 },
        followUpAt: r.followUpAt?.toDate ? r.followUpAt.toDate().getTime() : null,
      }))));
    } catch { /* 無法儲存時只影響下次載入速度 */ }
  }, (e) => {
    console.error(e);
    if ($("#mine")) $("#mine").innerHTML = `<p class="load-error">未能讀取你的報告：${esc(e.message)}</p>`;
  });
}
onAuthStateChanged(auth, (user) => {
  if (user && isStaffEmail((user.email || "").toLowerCase())) listenMine(user);
});

boot({
  root: "../../", current: "repair",
  onReady: ({ user, isAdmin }) => {
    S.user = user;
    $("#admin-link").hidden = !isAdmin;
    setupForm();
    listenMine(user);
  },
});

/** 建議選項：預設清單 + 自己以往填寫過的內容 */
function fillSuggestions() {
  const opts = (base, key) => [...new Set([...S.mine.map((r) => r[key]).filter(Boolean), ...base])]
    .map((v) => `<option value="${esc(v)}">`).join("");
  $("#dev-list").innerHTML = opts(REPAIR.devices, "device");
}

function setupForm() {
  const f = $("#rep-form");
  // 報告老師：預設為登入名稱的中文部分，可自行修改
  f.teacherName.defaultValue = chineseName(S.user);
  f.teacherName.value = f.teacherName.defaultValue;
  $("#rep-date").textContent = fmtDate(todayId());
  fillSuggestions();
  // 地點：按 IT組的地點清單選擇，清單以外選「其他」自行輸入
  f.location.insertAdjacentHTML("beforeend",
    REPAIR.locations.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("") + `<option value="__other">其他</option>`);
  f.location.addEventListener("change", () => {
    const other = f.location.value === "__other";
    $("#loc-other-wrap").hidden = !other;
    if (other) f.locationOther.focus();
  });

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const warn = (msg) => { const w = $("#rep-warn"); w.hidden = !msg; w.textContent = msg; };
    const location = (f.location.value === "__other" ? f.locationOther.value : f.location.value).trim();
    const device = f.device.value.trim();
    const problem = f.problem.value.trim();
    const name = f.teacherName.value.trim();
    if (!name) { f.teacherName.focus(); return warn("請填寫報告老師。"); }
    if (!location) { (f.location.value === "__other" ? f.locationOther : f.location).focus(); return warn("請選擇地點。"); }
    if (!device) { f.device.focus(); return warn("請填寫損壞的器材。"); }
    if (!problem) { f.problem.focus(); return warn("請填寫損壞情況。"); }
    warn("");

    const btn = $("#rep-submit");
    btn.disabled = true;
    btn.textContent = "提交中…";
    const data = {
      teacherName: name.slice(0, 40),
      email: S.user.email,
      uid: S.user.uid,
      date: todayId(),
      location: location.slice(0, 60),
      device: device.slice(0, 80),
      problem: problem.slice(0, 1000),
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, REPAIR.coll), data);
    } catch (err) {
      console.error(err);
      warn("未能提交：" + err.message);
      btn.disabled = false;
      btn.textContent = "提交報告";
      return;
    }
    const result = await notifyAdmins("repair", buildRepairEmail(data));
    console.info("通知IT組：", result);
    toast("已提交報告，IT組會盡快跟進。可在「我的報告」分頁查看跟進情況。", "success");
    f.reset();
    $("#loc-other-wrap").hidden = true;
    $("#rep-date").textContent = fmtDate(todayId());
    btn.disabled = false;
    btn.textContent = "提交報告";
  });
}

function renderMine() {
  const list = [...S.mine].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const box = $("#mine");
  if (!box) return;   // 系統未開放時頁面沒有這個區域
  if (!list.length) { box.innerHTML = `<p class="empty">你還未提交任何報告。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>日期</th><th>地點</th><th>器材</th><th>損壞情況</th><th>狀態</th><th>完成日期</th><th>IT組跟進</th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td class="nowrap">${shortDate(r.date)}</td>
              <td data-no-translate>${esc(r.location)}</td>
              <td data-no-translate>${esc(r.device)}</td>
              <td class="pre" data-no-translate>${esc(r.problem)}</td>
              <td><span class="badge badge--${RSTATUS[r.status]?.tone || "wait"}">${RSTATUS[r.status]?.label || "跟進中"}</span></td>
              <td class="nowrap">${r.status === "done" ? shortDate(r.doneDate) : ""}</td>
              <td class="pre" data-no-translate>${esc(r.followUp || "")}${fmtTimestamp(r.followUpAt) ? `<br><small>更新：${fmtTimestamp(r.followUpAt)}</small>` : ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
