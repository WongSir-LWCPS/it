import {
  boot, db, esc, toast, fmtDate, fmtTimestamp, daysUntil, parseDateId, toDateId, pad, todayId,
  enhanceDateInputs, timePicker,
} from "../../assets/js/common.js?v=20261006f";
import {
  collection, doc, onSnapshot, writeBatch, updateDoc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { KTV, STATUS } from "./ktv-config.js?v=20261006f";
import {
  timeLabel, toMin, lockIdOf, isActive, regularIndex, findConflict, sortBookings,
} from "./ktv-common.js?v=20261006f";
import { notifyAdmins } from "../../assets/js/notify.js?v=20261006f";
import { buildKtvEmail } from "./ktv-email.js?v=20261006f";
import { emailEnabled } from "../../assets/js/email.js?v=20261006f";

const S = {
  user: null, regularDates: [], bookings: [], filter: "active", upcoming: false,
  loaded: { c: false, b: false },
};
const $ = (sel) => document.querySelector(sel);
const settingsRef = () => doc(db, "ktv_settings", "main");

boot({
  root: "../../", current: "ktv-admin",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) {
      $("#main").innerHTML = `
        <section class="notice">
          <h1>只限管理員使用</h1>
          <p>你的帳戶（${esc(user.email)}）未有樂Kids TV的管理員權限。如需權限，請聯絡IT組。</p>
          <a class="btn btn--primary" href="index.html">返回播放時間表</a>
        </section>`;
      return;
    }
    S.user = user;
    $("#admin-area").hidden = false;
    enhanceDateInputs();
    if (!emailEnabled()) {
      const w = $("#email-status");
      w.hidden = false;
      w.textContent = "尚未設定電郵通知：管理員不會收到電郵。設定方法見 README.md。";
    }

    setupTabs();
    setupActions();
    setupEditDialog();
    setupDates();
    setupImport();

    onSnapshot(settingsRef(), (snap) => {
      S.regularDates = [...((snap.data()?.regularDates || []).filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
      S.loaded.c = true;
      render();
    }, onError);
    onSnapshot(collection(db, "ktv_bookings"), (snap) => {
      S.bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.date || "") && /^\d{2}:\d{2}$/.test(b.start || "") && /^\d{2}:\d{2}$/.test(b.end || ""));
      S.loaded.b = true;
      render();
    }, onError);
  },
});

function onError(e) {
  console.error(e);
  toast("未能讀取資料：" + e.message, "error");
}

function render() {
  if (!S.loaded.c || !S.loaded.b) return;
  for (const fn of [renderPending, renderAll, renderDates]) {
    try { fn(); } catch (e) { console.error(e); toast(`部分內容未能顯示：${e.message}`, "error"); }
  }
}

/* ---------- 分頁 ---------- */
function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== `tab-${name}`; });
}
function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
  const hash = location.hash.slice(1);
  if (document.querySelector(`.tab[data-tab="${hash}"]`)) showTab(hash);
  $("#all-filter").addEventListener("change", (e) => { S.filter = e.target.value; renderAll(); });
  $("#all-upcoming").addEventListener("change", (e) => { S.upcoming = e.target.checked; renderAll(); });
}

const kindLabel = (b) => (b.kind === "custom" ? '<span class="tag tag--extra">其他時段</span>' : "");

/* ---------- 待審批 ---------- */
function renderPending() {
  const box = $("#pending-list");
  // 保留管理員正在輸入的回覆，避免資料更新時被清除
  const drafts = {};
  box.querySelectorAll("[data-id]").forEach((el) => { drafts[el.dataset.id] = el.querySelector("textarea").value; });

  const list = S.bookings.filter((b) => b.status === "pending").sort(sortBookings);
  $("#pending-count").textContent = list.length || "";
  if (!list.length) {
    box.innerHTML = `<p class="empty">沒有待審批的申請。老師提交的新申請會即時出現在這裏。</p>`;
    return;
  }
  box.innerHTML = list.map((b) => {
    const clash = findConflict(S.bookings.filter((x) => x.status === "approved"), b.date, b.start, b.end, b.id);
    return `
    <article class="review" data-id="${b.id}">
      <header class="review-head">
        <strong>${fmtDate(b.date)}</strong>
        <span class="review-time">${timeLabel(b)}</span>
        ${kindLabel(b)}
        ${daysUntil(b.date) < 0 ? '<span class="badge badge--stop">播放日已過</span>' : ""}
      </header>
      ${clash ? `<p class="warn">與已批准的「${esc(clash.topic)}」（${timeLabel(clash)}）時間重疊。</p>` : ""}
      <dl class="kv">
        <dt>主題</dt><dd>${esc(b.topic)}</dd>
        <dt>負責老師</dt><dd>${esc(b.teacherName)}（${esc(b.teacherEmail)}）</dd>
        <dt>播放模式</dt><dd>${esc(b.mode)}</dd>
        ${b.remarks ? `<dt>備註</dt><dd>${esc(b.remarks)}</dd>` : ""}
        <dt>申請時間</dt><dd>${fmtTimestamp(b.createdAt)}</dd>
      </dl>
      <label class="field"><span>給老師的回覆（選填，老師可在「我的申請」看到）</span>
        <textarea rows="2" maxlength="300">${esc(drafts[b.id] || "")}</textarea>
      </label>
      <div class="actions">
        <button class="btn btn--small" data-act="edit">修改</button>
        <button class="btn btn--stop" data-act="reject">不批准</button>
        <button class="btn btn--go" data-act="approve">批准</button>
      </div>
    </article>`;
  }).join("");
}

async function notify(b, status, note) {
  const result = await notifyAdmins("ktv", buildKtvEmail(b, status, note, S.user.email));
  if (result.startsWith("已通知")) await updateDoc(doc(db, "ktv_bookings", b.id), { notifiedAt: serverTimestamp() });
  return result;
}

async function decide(id, status, note, btns = []) {
  const b = S.bookings.find((x) => x.id === id);
  if (!b) return;
  btns.forEach((x) => { x.disabled = true; });
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "ktv_bookings", id), {
      status, reviewNote: note, reviewedBy: S.user.email,
      reviewedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    if (status !== "approved") batch.delete(doc(db, "ktv_slots", b.lockId));
    await batch.commit();
  } catch (e) {
    btns.forEach((x) => { x.disabled = false; });
    toast("未能更新：" + e.message, "error");
    return;
  }
  const done = { approved: "已批准", rejected: "已設為不批准", cancelled: "已取消節目" }[status];
  toast(`${done}（${await notify(b, status, note)}）`, "success");
}

/* ---------- 全部節目 ---------- */
function renderAll() {
  const list = S.bookings
    .filter((b) => S.filter === "all" || (S.filter === "active" ? isActive(b) : b.status === S.filter))
    .filter((b) => !S.upcoming || daysUntil(b.date) >= 0)
    .sort(sortBookings);
  const box = $("#all-list");
  if (!list.length) { box.innerHTML = `<p class="empty">沒有符合條件的節目。按「新增節目」可直接加入。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>播放日期</th><th>時間</th><th>主題</th><th>負責老師</th><th>模式</th><th>狀態</th><th>審批備註</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((b) => `
            <tr class="${daysUntil(b.date) < 0 ? "is-past" : ""}">
              <td class="nowrap">${fmtDate(b.date)}</td>
              <td class="nowrap">${timeLabel(b)}${b.kind === "custom" ? "<br><small>其他時段</small>" : ""}</td>
              <td>${esc(b.topic)}</td>
              <td>${esc(b.teacherName)}${b.teacherEmail ? `<br><small>${esc(b.teacherEmail)}</small>` : ""}</td>
              <td class="nowrap">${esc(b.mode)}</td>
              <td><span class="badge badge--${STATUS[b.status]?.tone}">${STATUS[b.status]?.label || b.status}</span>
                ${b.notifiedAt ? "<br><small>已寄通知</small>" : ""}</td>
              <td>${esc(b.reviewNote || "")}</td>
              <td><div class="row-actions">
                ${isActive(b) ? `<button class="btn btn--small" data-edit="${b.id}">修改</button>` : ""}
                ${b.status === "approved" ? `<button class="btn btn--small btn--danger-text" data-cancel="${b.id}">取消節目</button>` : ""}
              </div></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---------- 新增／修改節目 ---------- */
function setupEditDialog() {
  const f = $("#edit-form");
  const dialog = $("#edit-dialog");
  f.slot.innerHTML = KTV.slots.map((s, i) => `<option value="${i}">${s.start} - ${s.end}</option>`).join("");
  f.mode.innerHTML = KTV.modes.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("");
  const syncKind = () => {
    const custom = f.querySelector('input[name="kind"]:checked').value === "custom";
    $("#edit-slot-wrap").hidden = custom;
    $("#edit-custom-wrap").hidden = !custom;
  };
  f.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", syncKind));
  $("#edit-cancel").addEventListener("click", () => dialog.close());
  $("#add-booking").addEventListener("click", () => openEdit(null));
  f._sync = syncKind;

  // 管理員可安排 07:00 至 19:00 的任何時間
  timePicker(f.start, { from: "07:00", to: "18:55", label: "開始時間" });
  timePicker(f.end, {
    from: "07:05", to: "19:00", label: "結束時間",
    isAllowed: (t) => !f.start.value || t > f.start.value,
    errorText: "結束時間必須遲於開始時間，並在下午 07:00 或之前。",
  });
  f.start.addEventListener("change", () => {
    if (f.end.value && f.end.value <= f.start.value) f.end._tp.set("", true);
    f.end._tp.refresh();
  });

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const warn = (msg) => { const w = $("#edit-warn"); w.hidden = !msg; w.textContent = msg; };
    const id = f.bookingId.value;
    const old = id ? S.bookings.find((x) => x.id === id) : null;
    const kind = f.querySelector('input[name="kind"]:checked').value;
    const date = f.date.value;
    let start, end;
    if (kind === "regular") ({ start, end } = KTV.slots[Number(f.slot.value)]);
    else { start = f.start.value; end = f.end.value; }
    const topic = f.topic.value.trim();
    const teacherName = f.teacherName.value.trim();

    if (!date || !start || !end) return warn("請填寫日期及時間。");
    if (toMin(end) <= toMin(start)) return warn("結束時間必須遲於開始時間。");
    if (!topic || !teacherName) return warn("請填寫主題及負責老師。");
    const clash = findConflict(S.bookings, date, start, end, id || null);
    if (clash) return warn(`與「${clash.topic}」（${fmtDate(clash.date)} ${timeLabel(clash)}）時間重疊。`);
    warn("");

    const lockId = lockIdOf(date, start);
    const data = {
      date, start, end, kind, lockId, topic, teacherName,
      teacherEmail: f.teacherEmail.value.trim(),
      mode: f.mode.value,
      remarks: f.remarks.value.trim(),
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(db);
    let ref;
    if (old) {
      ref = doc(db, "ktv_bookings", old.id);
      batch.update(ref, data);
      if (old.lockId !== lockId) {
        if (old.lockId) batch.delete(doc(db, "ktv_slots", old.lockId));
        batch.set(doc(db, "ktv_slots", lockId), { bookingId: old.id, date, start, uid: old.uid, createdAt: serverTimestamp() });
      }
    } else {
      ref = doc(collection(db, "ktv_bookings"));
      batch.set(ref, {
        ...data, uid: "admin-entry", status: "approved", reviewNote: "",
        reviewedBy: S.user.email, reviewedAt: serverTimestamp(), createdAt: serverTimestamp(),
      });
      batch.set(doc(db, "ktv_slots", lockId), { bookingId: ref.id, date, start, uid: "admin-entry", createdAt: serverTimestamp() });
    }
    // 使用樂Kids TV 時段時，自動把日期加入播放日
    if (kind === "regular" && !S.regularDates.includes(date)) {
      batch.set(settingsRef(), { regularDates: arrayUnion(date) }, { merge: true });
    }

    const save = $("#edit-save");
    save.disabled = true;
    try {
      await batch.commit();
      dialog.close();
      let msg = old ? "已儲存更改" : "已加入節目";
      if (old && old.status === "approved" && f.notify.checked) {
        msg += `（${await notify({ ...old, ...data }, "updated", "")}）`;
      }
      toast(msg + "。", "success");
    } catch (err) {
      warn("未能儲存：" + err.message);
    } finally {
      save.disabled = false;
    }
  });
}

function openEdit(b) {
  const f = $("#edit-form");
  f.reset();
  $("#edit-warn").hidden = true;
  $("#edit-title").textContent = b ? "修改節目" : "新增節目";
  f.bookingId.value = b?.id || "";
  if (b) {
    const i = regularIndex(b.start, b.end);
    f.querySelector(`input[name="kind"][value="${i >= 0 ? "regular" : "custom"}"]`).checked = true;
    f.date.value = b.date;
    f.slot.value = String(Math.max(i, 0));
    f.start._tp.set(b.start, true);
    f.end._tp.set(b.end, true);
    f.topic.value = b.topic;
    f.teacherName.value = b.teacherName;
    f.teacherEmail.value = b.teacherEmail || "";
    f.mode.value = b.mode;
    f.remarks.value = b.remarks || "";
  } else {
    f.date.value = S.regularDates.find((d) => daysUntil(d) >= 0) || "";
  }
  $("#edit-notify-wrap").hidden = !(b && b.status === "approved" && b.teacherEmail);
  if (!b) { f.start._tp.set("", true); f.end._tp.set("", true); }
  f._sync();
  $("#edit-dialog").showModal();
}

/* ---------- 按鈕事件 ---------- */
function setupActions() {
  $("#pending-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const card = btn.closest("[data-id]");
    if (btn.dataset.act === "edit") { openEdit(S.bookings.find((x) => x.id === card.dataset.id)); return; }
    const note = card.querySelector("textarea").value.trim();
    const status = btn.dataset.act === "approve" ? "approved" : "rejected";
    if (status === "rejected" && !note && !confirm("未填寫原因。確定不批准這項申請？")) return;
    decide(card.dataset.id, status, note, [...card.querySelectorAll("button")]);
  });

  $("#all-list").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit]");
    if (edit) { openEdit(S.bookings.find((x) => x.id === edit.dataset.edit)); return; }
    const btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    const b = S.bookings.find((x) => x.id === btn.dataset.cancel);
    const note = prompt(`取消 ${fmtDate(b.date)} ${timeLabel(b)}「${b.topic}」？\n請輸入原因（會寄給老師）：`);
    if (note === null) return;
    decide(b.id, "cancelled", note.trim(), [btn]);
  });
}

/* ---------- 播放日期 ---------- */
function parseSkipDates(text) {
  const set = new Set();
  for (const t of text.split(/[\s,，、]+/)) {
    const id = cellDate(t);
    if (id) set.add(id);
  }
  return set;
}

async function addRegularDates(dates) {
  if (!dates.length) return;
  await setDoc(settingsRef(), { regularDates: arrayUnion(...dates) }, { merge: true });
}

function setupDates() {
  // 以學年設定作為「一次過加入」的預設期間
  getDoc(doc(db, "settings", "schoolYear")).then((snap) => {
    const y = snap.data();
    const f = $("#form-bulk");
    if (y && !f.from.value && !f.to.value) {
      f.from.value = y.start > todayId() ? y.start : todayId();
      f.to.value = y.end;
    }
  }).catch(() => {});

  $("#form-single").addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = e.target.date.value;
    if (!date) return;
    if (S.regularDates.includes(date)) { toast(`${fmtDate(date)} 已在清單內。`, "error"); return; }
    try {
      await addRegularDates([date]);
      e.target.reset();
      toast(`已加入 ${fmtDate(date)}。`, "success");
    } catch (err) { toast("未能加入：" + err.message, "error"); }
  });

  $("#form-bulk").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.from.value || !f.to.value) return;
    const weekday = Number(f.weekday.value);
    const skip = parseSkipDates(f.skip.value);
    const dates = [];
    const end = parseDateId(f.to.value);
    for (let d = parseDateId(f.from.value); d <= end; d.setDate(d.getDate() + 1)) {
      const id = toDateId(d);
      if (d.getDay() === weekday && !skip.has(id) && !S.regularDates.includes(id)) dates.push(id);
    }
    if (!dates.length) { toast("這段期間沒有新的日期可加入。", "error"); return; }
    if (!confirm(`將加入 ${dates.length} 個播放日期：\n${dates.map(fmtDate).join("\n")}`)) return;
    try {
      await addRegularDates(dates);
      f.reset();
      toast(`已加入 ${dates.length} 個播放日期。`, "success");
    } catch (err) { toast("未能加入：" + err.message, "error"); }
  });

  $("#dates-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const date = btn.dataset.remove;
    const count = S.bookings.filter((b) => isActive(b) && b.date === date).length;
    const msg = count
      ? `${fmtDate(date)} 有 ${count} 個節目或申請。移除播放日後，節目仍會保留並顯示在時間表，但老師不能再預約這天的樂Kids TV時段。確定移除？`
      : `從播放日移除 ${fmtDate(date)}？`;
    if (!confirm(msg)) return;
    try {
      await updateDoc(settingsRef(), { regularDates: arrayRemove(date) });
      toast("已移除。", "success");
    } catch (err) { toast("未能移除：" + err.message, "error"); }
  });
}

function renderDates() {
  const box = $("#dates-list");
  if (!S.regularDates.length) {
    box.innerHTML = `<p class="empty">還未有樂Kids TV播放日。用上面的表格加入，或到「匯入」上載舊的預約表。</p>`;
    return;
  }
  const counts = {};
  S.bookings.filter(isActive).forEach((b) => { counts[b.date] = (counts[b.date] || 0) + 1; });
  const months = new Map();
  for (const d of S.regularDates) {
    const key = d.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(d);
  }
  box.innerHTML = `
    <h2>樂Kids TV 播放日（共 ${S.regularDates.length} 天）</h2>
    ${[...months].map(([key, list]) => {
      const [y, m] = key.split("-").map(Number);
      return `
        <div class="month">
          <h3>${y}年${m}月</h3>
          <ul class="chips">
            ${list.map((d) => `
              <li class="chip${daysUntil(d) < 0 ? " is-past" : ""}">
                <span>${parseDateId(d).getDate()}日（${"日一二三四五六"[parseDateId(d).getDay()]}）</span>
                <span class="chip-count">${counts[d] || 0}/${KTV.slots.length}</span>
                <button type="button" data-remove="${d}" aria-label="移除 ${fmtDate(d)}">✕</button>
              </li>`).join("")}
          </ul>
        </div>`;
    }).join("")}`;
}

/* ---------- 匯入 Excel／CSV ---------- */
let XLSX = null;
const IMP = { wb: null, parsed: null };

const XLSX_SOURCES = [
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
];
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { s.remove(); reject(new Error(src)); };
    document.head.append(s);
  });
}
async function loadXlsx() {
  for (const src of XLSX_SOURCES) {
    if (window.XLSX) break;
    try { await loadScript(src); } catch { /* 試下一個來源 */ }
  }
  if (!window.XLSX) throw new Error("未能載入 Excel 讀取工具。學校網絡可能封鎖了 cdnjs.cloudflare.com 及 cdn.jsdelivr.net。");
  return window.XLSX;
}

function decodeText(buf) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch { return new TextDecoder("big5").decode(buf); }   // Excel 中文版另存的 CSV
}

/** 儲存格 → 日期 ID（YYYY-MM-DD），日／月／年排序 */
function cellDate(v) {
  if (typeof v === "number") {
    if (v < 30000 || !XLSX) return null;
    const p = XLSX.SSF.parse_date_code(v);
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  }
  const s = String(v ?? "").trim();
  let m, y, mo, d;
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) [, d, mo, y] = m;
  else if ((m = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/))) [, y, mo, d] = m;
  else if ((m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/))) [, y, mo, d] = m;
  else return null;
  y = Number(y) < 100 ? 2000 + Number(y) : Number(y);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** 儲存格 → 時間（HH:MM） */
function cellTime(v) {
  if (typeof v === "number" && v >= 0 && v < 1) {
    const mins = Math.round(v * 1440);
    return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }
  const m = String(v ?? "").match(/(\d{1,2})[:：.](\d{2})/);
  return m ? `${pad(m[1])}:${m[2]}` : null;
}

/** 儲存格 → 時間範圍，例如「13:10 - 13:15」 */
function cellRange(v) {
  const m = String(v ?? "").match(/(\d{1,2})[:：](\d{2})\s*[-–—~至到]\s*(\d{1,2})[:：](\d{2})/);
  return m ? { start: `${pad(m[1])}:${m[2]}`, end: `${pad(m[3])}:${m[4]}` } : null;
}

const cleanMode = (m) => {
  const t = String(m ?? "").trim().toLowerCase();
  const alias = Object.entries(KTV.modeAliases || {}).find(([k]) => k.toLowerCase() === t);
  return KTV.modes.find((x) => x.toLowerCase() === t) || alias?.[1] || KTV.modes[0];
};

/** 讀取工作表內容，支援舊預約表格式及一行一個節目的表格 */
function parseRows(rows) {
  const regular = new Set();
  const items = [];
  const str = (v) => String(v ?? "").trim();
  const headerIdx = rows.findIndex((r) => r.some((c) => str(c) === "日期") && r.some((c) => str(c) === "主題"));

  if (headerIdx >= 0) {
    // 格式二：一行一個節目
    const h = rows[headerIdx].map(str);
    const col = (...names) => h.findIndex((x) => names.includes(x));
    const c = {
      date: col("日期"), range: col("時段", "時間"), start: col("開始時間", "開始"), end: col("結束時間", "結束"),
      topic: col("主題"), teacher: col("負責老師", "老師"), email: col("老師電郵", "電郵"),
      mode: col("播放模式", "模式"), remarks: col("備註"),
    };
    for (const r of rows.slice(headerIdx + 1)) {
      const date = cellDate(r[c.date]);
      if (!date) continue;
      const topic = str(r[c.topic]);
      const teacherName = str(r[c.teacher]);
      let t = c.range >= 0 ? cellRange(r[c.range]) : null;
      if (!t && c.start >= 0) {
        const start = cellTime(r[c.start]);
        let end = c.end >= 0 ? cellTime(r[c.end]) : null;
        if (start && !end) end = KTV.slots.find((s) => s.start === start)?.end || null;
        if (start && end) t = { start, end };
      }
      if (!topic && !teacherName) { regular.add(date); continue; }   // 只有日期：樂Kids TV 播放日
      if (!t) continue;
      if (regularIndex(t.start, t.end) >= 0) regular.add(date);
      items.push({
        date, ...t, topic: topic || "（未填主題）", teacherName: teacherName || "（未填）",
        teacherEmail: c.email >= 0 ? str(r[c.email]) : "",
        mode: cleanMode(c.mode >= 0 ? r[c.mode] : ""),
        remarks: c.remarks >= 0 ? str(r[c.remarks]) : "",
      });
    }
  } else {
    // 格式一：舊預約表（日期一行，下面是各時段）
    let cur = null;
    for (const r of rows) {
      const date = cellDate(r[0]);
      if (date) { cur = date; regular.add(date); continue; }
      if (!cur) continue;
      const t = cellRange(r[0]);
      if (!t) continue;
      const topic = str(r[1]);
      const teacherName = str(r[2]);
      if (!topic && !teacherName) continue;
      items.push({
        date: cur, ...t, topic: topic || "（未填主題）", teacherName: teacherName || "（未填）",
        teacherEmail: "", mode: cleanMode(r[3]), remarks: "",
      });
    }
  }
  return { regular: [...regular].sort(), items };
}

function setupImport() {
  $("#download-template").addEventListener("click", (e) => {
    e.preventDefault();
    const csv = "\ufeff日期,開始時間,結束時間,主題,負責老師,老師電郵,播放模式,備註\n"
      + "9/10/2026,13:10,13:15,數學天地,繆嘉旋,,播片,\n"
      + "9/10/2026,13:15,13:20,趣味中文,陳寶如,,聲音直播,\n"
      + "16/10/2026,,,,,,,\n"
      + "21/10/2026,08:00,08:10,早會宣傳,楊詠文,,播片,其他時段例子\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "樂KidsTV匯入範本.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $("#import-result").innerHTML = `<p class="empty">正在讀取 ${esc(file.name)}…</p>`;
    try {
      XLSX = await loadXlsx();
      const buf = await file.arrayBuffer();
      IMP.wb = /\.csv$/i.test(file.name)
        ? XLSX.read(decodeText(buf), { type: "string", raw: true })
        : XLSX.read(buf, { type: "array" });
      const names = IMP.wb.SheetNames;
      const sel = $("#import-sheet");
      sel.innerHTML = names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
      $("#import-sheet-wrap").hidden = names.length < 2;
      // 預設選第一個有資料的工作表
      sel.value = names.find((n) => parseRows(sheetRows(n)).items.length) || names[0];
      previewImport();
    } catch (err) {
      console.error(err);
      $("#import-result").innerHTML = `<p class="load-error">未能讀取檔案：${esc(err.message)}</p>`;
    }
  });
  $("#import-sheet").addEventListener("change", previewImport);
  $("#import-result").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-import-run]");
    if (btn) runImport();
  });
}

const sheetRows = (name) => XLSX.utils.sheet_to_json(IMP.wb.Sheets[name], { header: 1, raw: true, defval: "" });

function previewImport() {
  try {
    buildPreview();
  } catch (err) {
    console.error(err);
    $("#import-result").innerHTML = `<p class="load-error">未能分析這個工作表：${esc(err.message)}</p>`;
  }
}

function buildPreview() {
  const box = $("#import-result");
  const { regular, items } = parseRows(sheetRows($("#import-sheet").value));
  if (!regular.length && !items.length) {
    IMP.parsed = null;
    box.innerHTML = `<p class="load-error">這個工作表找不到日期或節目。請確認使用舊預約表，或範本的欄位名稱（日期、開始時間、結束時間、主題、負責老師）。</p>`;
    return;
  }
  // 標示重複或時間衝突的項目
  const accepted = [];
  for (const it of items) {
    const existing = findConflict(S.bookings, it.date, it.start, it.end);
    const dup = accepted.find((a) => a.date === it.date && toMin(a.start) < toMin(it.end) && toMin(it.start) < toMin(a.end));
    it.skip = existing ? `已有「${existing.topic}」` : dup ? "檔案內時間重疊" : "";
    if (!it.skip) accepted.push(it);
  }
  const newDates = regular.filter((d) => !S.regularDates.includes(d));
  IMP.parsed = { newDates, items: accepted };
  const skipped = items.length - accepted.length;

  const canImport = newDates.length > 0 || accepted.length > 0;
  const bar = canImport
    ? `<div class="import-bar">
         <p>將加入 ${newDates.length} 個樂Kids TV播放日及 ${accepted.length} 個節目${skipped ? `；${skipped} 個會略過` : ""}。</p>
         <button class="btn btn--primary" data-import-run>確認匯入</button>
       </div>`
    : `<div class="import-bar import-bar--none">
         <p>這個檔案的資料已全部在系統內，沒有需要匯入的項目。${skipped ? "略過的原因見下表。" : ""}</p>
       </div>`;

  box.innerHTML = `
    <h2>預覽</h2>
    <p class="hint">檔案內共 ${regular.length} 個樂Kids TV播放日${regular[0] ? `（${fmtDate(regular[0])} 至 ${fmtDate(regular[regular.length - 1])}）` : ""}及 ${items.length} 個節目。</p>
    ${bar}
    ${items.length ? `
      <div class="table-scroll mt-s">
        <table class="table">
          <thead><tr><th>播放日期</th><th>時間</th><th>主題</th><th>負責老師</th><th>模式</th><th>結果</th></tr></thead>
          <tbody>${items.map((b) => `
            <tr class="${b.skip ? "is-past" : ""}">
              <td class="nowrap">${fmtDate(b.date)}</td><td class="nowrap">${timeLabel(b)}</td>
              <td>${esc(b.topic)}</td><td>${esc(b.teacherName)}</td><td>${esc(b.mode)}</td>
              <td>${b.skip ? `略過：${esc(b.skip)}` : '<span class="badge badge--go">匯入</span>'}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>` : ""}
    ${canImport && items.length > 8 ? `<div class="actions actions--start mt-s"><button class="btn btn--primary" data-import-run>確認匯入</button></div>` : ""}`;
}

async function runImport() {
  if (!IMP.parsed) return;
  const btns = [...document.querySelectorAll("[data-import-run]")];
  btns.forEach((b) => { b.disabled = true; b.textContent = "匯入中…"; });
  const { newDates, items } = IMP.parsed;
  try {
    await addRegularDates(newDates);
    for (let i = 0; i < items.length; i += 200) {
      const batch = writeBatch(db);
      items.slice(i, i + 200).forEach((it) => {
        const ref = doc(collection(db, "ktv_bookings"));
        const lockId = lockIdOf(it.date, it.start);
        batch.set(ref, {
          date: it.date, start: it.start, end: it.end,
          kind: regularIndex(it.start, it.end) >= 0 ? "regular" : "custom",
          lockId, topic: it.topic, teacherName: it.teacherName, teacherEmail: it.teacherEmail,
          mode: it.mode, remarks: it.remarks, uid: "admin-entry", status: "approved", reviewNote: "",
          reviewedBy: S.user.email, reviewedAt: serverTimestamp(),
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, "ktv_slots", lockId), {
          bookingId: ref.id, date: it.date, start: it.start, uid: "admin-entry", createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
    IMP.parsed = null;
    $("#import-result").innerHTML = `<p class="empty">已匯入 ${newDates.length} 個播放日及 ${items.length} 個節目。到「全部節目」或樂Kids TV頁面即可看到。</p>`;
    $("#import-file").value = "";
    toast("匯入完成。", "success");
  } catch (e) {
    btns.forEach((b) => { b.disabled = false; b.textContent = "確認匯入"; });
    toast("未能匯入：" + e.message, "error");
  }
}
