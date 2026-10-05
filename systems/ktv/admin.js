import {
  boot, db, esc, toast, fmtDate, fmtTimestamp, daysUntil, parseDateId, toDateId, pad,
} from "../../assets/js/common.js";
import {
  collection, doc, onSnapshot, query, orderBy, writeBatch, updateDoc, getDoc, setDoc, deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { KTV, STATUS } from "./ktv-config.js";
import { buildKtvEmail } from "./ktv-email.js";
import { sendEmail, emailEnabled } from "../../assets/js/email.js";

const S = { user: null, sessions: [], bookings: [], filter: "all", loaded: { s: false, b: false } };
const $ = (sel) => document.querySelector(sel);
const byDateSlot = (a, b) => a.sessionId.localeCompare(b.sessionId) || a.slot - b.slot;

boot({
  root: "../../",
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
    if (!emailEnabled()) {
      const w = $("#email-status");
      w.hidden = false;
      w.textContent = "尚未設定電郵通知：審批結果只會在系統內更新，不會寄給老師。設定方法見 README.md。";
    }

    setupTabs();
    setupSessionForms();
    setupManualForm();
    setupActions();

    onSnapshot(query(collection(db, "ktv_sessions"), orderBy("date")), (snap) => {
      S.sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      S.loaded.s = true;
      render();
    }, onError);
    onSnapshot(collection(db, "ktv_bookings"), (snap) => {
      S.bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      S.loaded.b = true;
      render();
    }, onError);
  },
});

function onError(e) {
  console.error(e);
  toast("未能讀取資料：" + e.message, "error");
}

const isActive = (b) => b.status === "pending" || b.status === "approved";
function activeMap() {
  const m = new Map();
  S.bookings.filter(isActive).forEach((b) => m.set(`${b.sessionId}_${b.slot}`, b));
  return m;
}

function render() {
  if (!S.loaded.s || !S.loaded.b) return;
  renderPending();
  renderSessions();
  renderManualOptions();
  renderAll();
}

/* ---------- 分頁 ---------- */
function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== `tab-${tab.dataset.tab}`; });
    });
  });
  $("#all-filter").addEventListener("change", (e) => { S.filter = e.target.value; renderAll(); });
}

/* ---------- 待審批 ---------- */
function renderPending() {
  const box = $("#pending-list");
  // 保留管理員正在輸入的備註，避免資料更新時被清除
  const drafts = {};
  box.querySelectorAll("[data-id]").forEach((el) => { drafts[el.dataset.id] = el.querySelector("textarea").value; });

  const list = S.bookings.filter((b) => b.status === "pending").sort(byDateSlot);
  $("#pending-count").textContent = list.length || "";
  if (!list.length) {
    box.innerHTML = `<p class="empty">沒有待審批的申請。老師提交的新申請會即時出現在這裏。</p>`;
    return;
  }
  box.innerHTML = list.map((b) => `
    <article class="review" data-id="${b.id}">
      <header class="review-head">
        <strong>${fmtDate(b.sessionId)}</strong>
        <span class="review-time">${esc(b.slotLabel)}</span>
        ${daysUntil(b.sessionId) < 0 ? '<span class="badge badge--stop">播放日已過</span>' : ""}
      </header>
      <dl class="kv">
        <dt>主題</dt><dd>${esc(b.topic)}</dd>
        <dt>負責老師</dt><dd>${esc(b.teacherName)}（${esc(b.teacherEmail)}）</dd>
        <dt>播放模式</dt><dd>${esc(b.mode)}</dd>
        ${b.remarks ? `<dt>備註</dt><dd>${esc(b.remarks)}</dd>` : ""}
        <dt>申請時間</dt><dd>${fmtTimestamp(b.createdAt)}</dd>
      </dl>
      <label class="field"><span>給老師的回覆（選填，會放入通知電郵）</span>
        <textarea rows="2" maxlength="300">${esc(drafts[b.id] || "")}</textarea>
      </label>
      <div class="actions">
        <button class="btn btn--stop" data-act="reject">不批准並通知老師</button>
        <button class="btn btn--go" data-act="approve">批准並通知老師</button>
      </div>
    </article>`).join("");
}

async function decide(id, status, note, btns = []) {
  const b = S.bookings.find((x) => x.id === id);
  if (!b) return;
  btns.forEach((x) => { x.disabled = true; });
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "ktv_bookings", id), {
      status,
      reviewNote: note,
      reviewedBy: S.user.email,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (status !== "approved") batch.delete(doc(db, "ktv_slots", `${b.sessionId}_${b.slot}`));
    await batch.commit();
  } catch (e) {
    btns.forEach((x) => { x.disabled = false; });
    toast("未能更新：" + e.message, "error");
    return;
  }

  const done = { approved: "已批准", rejected: "已設為不批准", cancelled: "已取消節目" }[status];
  if (!b.teacherEmail) { toast(`${done}（沒有老師電郵，未寄出通知）`, "success"); return; }
  try {
    const sent = await sendEmail({ to: b.teacherEmail, ...buildKtvEmail(b, status, note) });
    if (sent) {
      await updateDoc(doc(db, "ktv_bookings", id), { notifiedAt: serverTimestamp() });
      toast(`${done}，已寄電郵通知 ${b.teacherName}。`, "success");
    } else {
      toast(`${done}（未設定電郵通知）`, "success");
    }
  } catch (e) {
    console.error(e);
    toast(`${done}，但電郵未能寄出：${e.message}`, "error");
  }
}

/* ---------- 播放日期 ---------- */
function parseSkipDates(text) {
  const set = new Set();
  for (const raw of text.split(/[\s,，、]+/)) {
    const t = raw.trim();
    let m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) set.add(`${m[1]}-${pad(m[2])}-${pad(m[3])}`);
    else if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) set.add(`${m[3]}-${pad(m[2])}-${pad(m[1])}`);
  }
  return set;
}

function setupSessionForms() {
  $("#form-single").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const date = f.date.value;
    if (!date) return;
    const ref = doc(db, "ktv_sessions", date);
    try {
      if ((await getDoc(ref)).exists()) { toast(`${fmtDate(date)} 已在清單內。`, "error"); return; }
      await setDoc(ref, { date, open: true, note: f.note.value.trim(), createdAt: serverTimestamp() });
      f.reset();
      toast(`已加入 ${fmtDate(date)}。`, "success");
    } catch (err) { toast("未能加入：" + err.message, "error"); }
  });

  $("#form-bulk").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.from.value || !f.to.value) return;
    const weekday = Number(f.weekday.value);
    const skip = parseSkipDates(f.skip.value);
    const existing = new Set(S.sessions.map((s) => s.id));
    const dates = [];
    const end = parseDateId(f.to.value);
    for (let d = parseDateId(f.from.value); d <= end; d.setDate(d.getDate() + 1)) {
      const id = toDateId(d);
      if (d.getDay() === weekday && !skip.has(id) && !existing.has(id)) dates.push(id);
    }
    if (!dates.length) { toast("這段期間沒有新的日期可加入。", "error"); return; }
    if (!confirm(`將加入 ${dates.length} 個播放日期：\n${dates.map(fmtDate).join("\n")}`)) return;
    try {
      const batch = writeBatch(db);
      dates.forEach((date) => batch.set(doc(db, "ktv_sessions", date), {
        date, open: true, note: "", createdAt: serverTimestamp(),
      }));
      await batch.commit();
      f.reset();
      toast(`已加入 ${dates.length} 個播放日期。`, "success");
    } catch (err) { toast("未能加入：" + err.message, "error"); }
  });
}

function renderSessions() {
  const map = activeMap();
  const box = $("#session-list");
  if (!S.sessions.length) {
    box.innerHTML = `<p class="empty">還未有播放日期。用上面的表格加入第一個日期，老師便可以開始預約。</p>`;
    return;
  }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>日期</th><th>備註</th><th>時段使用</th><th>預約狀態</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${S.sessions.map((s) => {
            const used = KTV.slots.map((_, i) => map.get(`${s.id}_${i}`)).filter(Boolean);
            const approved = used.filter((b) => b.status === "approved").length;
            const pending = used.length - approved;
            const past = daysUntil(s.date) < 0;
            return `
              <tr class="${past ? "is-past" : ""}">
                <td class="nowrap">${fmtDate(s.date)}</td>
                <td>${esc(s.note || "")}</td>
                <td class="nowrap">${approved} 已批准${pending ? `，${pending} 審批中` : ""}／${KTV.slots.length}</td>
                <td>${past ? '<span class="badge badge--muted">已播放</span>'
                  : s.open === false ? '<span class="badge badge--stop">暫停預約</span>'
                  : '<span class="badge badge--go">開放預約</span>'}</td>
                <td class="row-actions">
                  ${past ? "" : `<button class="btn btn--small" data-toggle="${s.id}">${s.open === false ? "開放預約" : "暫停預約"}</button>`}
                  <button class="btn btn--small" data-note="${s.id}">修改備註</button>
                  <button class="btn btn--small btn--danger-text" data-delete="${s.id}" ${used.length ? "disabled title=\"此日已有節目或申請，不能刪除\"" : ""}>刪除</button>
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---------- 直接加入節目 ---------- */
function setupManualForm() {
  $("#manual-mode").innerHTML = KTV.modes.map((m) => `<option>${esc(m)}</option>`).join("");
  $("#manual-session").addEventListener("change", renderSlotOptions);

  $("#form-manual").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const sessionId = f.sessionId.value;
    const slot = Number(f.slot.value);
    if (!sessionId || Number.isNaN(slot)) { toast("請選擇播放日期及時段。", "error"); return; }
    if (activeMap().has(`${sessionId}_${slot}`)) { toast("此時段已有節目或申請。", "error"); return; }
    const ref = doc(collection(db, "ktv_bookings"));
    const batch = writeBatch(db);
    batch.set(ref, {
      sessionId,
      slot,
      slotLabel: KTV.slots[slot],
      topic: f.topic.value.trim(),
      teacherName: f.teacherName.value.trim(),
      teacherEmail: f.teacherEmail.value.trim(),
      mode: f.mode.value,
      remarks: "",
      uid: "admin-entry",
      status: "approved",
      reviewNote: "",
      reviewedBy: S.user.email,
      reviewedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "ktv_slots", `${sessionId}_${slot}`), {
      bookingId: ref.id, sessionId, slot, uid: "admin-entry", createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      f.topic.value = ""; f.teacherName.value = ""; f.teacherEmail.value = "";
      toast("已加入節目。", "success");
    } catch (err) { toast("未能加入：" + err.message, "error"); }
  });
}

function renderManualOptions() {
  const sel = $("#manual-session");
  const current = sel.value;
  sel.innerHTML = S.sessions.length
    ? S.sessions.map((s) => `<option value="${s.id}">${fmtDate(s.date)}</option>`).join("")
    : `<option value="">（請先加入播放日期）</option>`;
  const fallback = S.sessions.find((s) => daysUntil(s.date) >= 0)?.id || S.sessions[0]?.id || "";
  sel.value = S.sessions.some((s) => s.id === current) ? current : fallback;
  renderSlotOptions();
}

function renderSlotOptions() {
  const sessionId = $("#manual-session").value;
  const map = activeMap();
  const sel = $("#manual-slot");
  const current = sel.value;
  sel.innerHTML = KTV.slots.map((t, i) => {
    const taken = map.has(`${sessionId}_${i}`);
    return `<option value="${i}" ${taken ? "disabled" : ""}>${t}${taken ? "（已有節目）" : ""}</option>`;
  }).join("");
  const firstFree = KTV.slots.findIndex((_, i) => !map.has(`${sessionId}_${i}`));
  sel.value = current && !map.has(`${sessionId}_${current}`) ? current : String(Math.max(firstFree, 0));
}

/* ---------- 全部申請 ---------- */
function renderAll() {
  const list = S.bookings
    .filter((b) => S.filter === "all" || b.status === S.filter)
    .sort((a, b) => b.sessionId.localeCompare(a.sessionId) || a.slot - b.slot);
  const box = $("#all-list");
  if (!list.length) { box.innerHTML = `<p class="empty">沒有符合條件的申請。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>播放日期</th><th>時段</th><th>主題</th><th>負責老師</th><th>模式</th><th>狀態</th><th>審批備註</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((b) => `
            <tr>
              <td class="nowrap">${fmtDate(b.sessionId)}</td>
              <td class="nowrap">${esc(b.slotLabel)}</td>
              <td>${esc(b.topic)}</td>
              <td>${esc(b.teacherName)}${b.teacherEmail ? `<br><small>${esc(b.teacherEmail)}</small>` : ""}</td>
              <td class="nowrap">${esc(b.mode)}</td>
              <td><span class="badge badge--${STATUS[b.status]?.tone}">${STATUS[b.status]?.label || b.status}</span>
                ${b.notifiedAt ? "<br><small>已寄通知</small>" : ""}</td>
              <td>${esc(b.reviewNote || "")}</td>
              <td>${b.status === "approved" ? `<button class="btn btn--small btn--danger-text" data-cancel="${b.id}">取消節目</button>` : ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---------- 按鈕事件 ---------- */
function setupActions() {
  $("#pending-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const card = btn.closest("[data-id]");
    const note = card.querySelector("textarea").value.trim();
    const status = btn.dataset.act === "approve" ? "approved" : "rejected";
    if (status === "rejected" && !note && !confirm("未填寫原因。確定不批准這項申請？")) return;
    decide(card.dataset.id, status, note, [...card.querySelectorAll("button")]);
  });

  $("#all-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    const b = S.bookings.find((x) => x.id === btn.dataset.cancel);
    const note = prompt(`取消 ${fmtDate(b.sessionId)} ${b.slotLabel}「${b.topic}」？\n請輸入原因（會寄給老師）：`);
    if (note === null) return;
    decide(b.id, "cancelled", note.trim(), [btn]);
  });

  $("#session-list").addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    try {
      if (t.dataset.toggle) {
        const s = S.sessions.find((x) => x.id === t.dataset.toggle);
        await updateDoc(doc(db, "ktv_sessions", s.id), { open: s.open === false });
        toast(s.open === false ? `${fmtDate(s.date)} 已開放預約。` : `${fmtDate(s.date)} 已暫停預約。`, "success");
      } else if (t.dataset.note) {
        const s = S.sessions.find((x) => x.id === t.dataset.note);
        const note = prompt(`${fmtDate(s.date)} 的備註：`, s.note || "");
        if (note === null) return;
        await updateDoc(doc(db, "ktv_sessions", s.id), { note: note.trim() });
        toast("已更新備註。", "success");
      } else if (t.dataset.delete) {
        const id = t.dataset.delete;
        if (!confirm(`刪除播放日期 ${fmtDate(id)}？`)) return;
        await deleteDoc(doc(db, "ktv_sessions", id));
        toast("已刪除播放日期。", "success");
      }
    } catch (err) { toast("未能更新：" + err.message, "error"); }
  });
}
