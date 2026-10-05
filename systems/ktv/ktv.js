import {
  boot, db, esc, toast, fmtDate, daysUntil, parseDateId, weekdayName,
} from "../../assets/js/common.js";
import {
  collection, doc, onSnapshot, query, orderBy, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { KTV, STATUS } from "./ktv-config.js";

const S = { user: null, isAdmin: false, sessions: [], bookings: [], showPast: false, loaded: { s: false, b: false } };
const $ = (sel) => document.querySelector(sel);

boot({
  root: "../../", current: "ktv",
  onReady: ({ user, isAdmin }) => {
    S.user = user;
    S.isAdmin = isAdmin;
    $("#admin-link").hidden = !isAdmin;
    $("#guide").innerHTML = `<p class="empty">正在讀取播放時間表…</p>`;
    $("#guide-hint").textContent =
      `每次播放共 ${KTV.slots.length} 個時段，每段 5 分鐘。按「預約此時段」填寫申請，管理員批核後會以電郵通知你。播放日前 ${KTV.cutoffDays} 天截止預約。`;

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

    $("#toggle-past").addEventListener("change", (e) => { S.showPast = e.target.checked; render(); });
    $("#guide").addEventListener("click", (e) => {
      const btn = e.target.closest(".slot--open");
      if (btn) openDialog(btn.dataset.session, Number(btn.dataset.slot));
    });
    $("#mine").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (btn) cancelMine(btn.dataset.cancel);
    });
    setupDialog();
  },
});

function onError(e) {
  console.error(e);
  const hint = e.code === "permission-denied"
    ? "沒有讀取權限。請確認 Firestore 規則已發佈，並以教職員帳戶登入。"
    : e.message;
  $("#guide").innerHTML = `<p class="load-error" role="alert">未能讀取播放時間表：${esc(hint)}</p>`;
  toast("未能讀取資料：" + hint, "error");
}

/** 時段 → 有效申請（審批中或已批准） */
function activeMap() {
  const m = new Map();
  for (const b of S.bookings) {
    if (b.status === "pending" || b.status === "approved") m.set(`${b.sessionId}_${b.slot}`, b);
  }
  return m;
}

function render() {
  if (!S.loaded.s || !S.loaded.b) return;
  const map = activeMap();
  renderHero(map);
  renderGuide(map);
  renderMine();
}

/* ---------- 下一次播放 ---------- */
function renderHero(map) {
  const next = S.sessions.find((s) => daysUntil(s.date) >= 0);
  const hero = $("#hero");
  if (!next) {
    hero.innerHTML = `<div class="onair-head"><p class="onair-label">下一次播放</p><p class="onair-sub">未有安排</p></div>`;
    return;
  }
  const d = parseDateId(next.date);
  const n = daysUntil(next.date);
  const countdown = n === 0 ? "今天播放" : n === 1 ? "明天播放" : `還有 ${n} 天`;
  const lineup = KTV.slots.map((t, i) => {
    const b = map.get(`${next.id}_${i}`);
    const start = t.split("-")[0].trim();
    if (b?.status === "approved") return `<li><span class="t">${start}</span>${esc(b.topic)}</li>`;
    if (b) return `<li class="dim"><span class="t">${start}</span>審批中</li>`;
    return `<li class="dim"><span class="t">${start}</span>未有節目</li>`;
  }).join("");

  hero.innerHTML = `
    <div class="onair-head">
      <p class="onair-label">下一次播放</p>
      <p class="onair-date">${d.getMonth() + 1}月${d.getDate()}日</p>
      <p class="onair-sub">${weekdayName(next.date)}，${countdown}${next.note ? `，${esc(next.note)}` : ""}</p>
    </div>
    <ol class="lineup" aria-label="節目次序">${lineup}</ol>`;
}

/* ---------- 播放時間表 ---------- */
function renderGuide(map) {
  const list = S.sessions.filter((s) => S.showPast || daysUntil(s.date) >= 0);
  const guide = $("#guide");
  if (!list.length) {
    guide.innerHTML = `<p class="empty">${S.sessions.length
      ? "沒有即將播放的日期。勾選「顯示已播放的日期」可查看過往節目。"
      : S.isAdmin
        ? '資料庫內還未有播放日期。到 <a href="admin.html#import">管理及審批 → 匯入試算表</a> 匯入現有預約，或在「播放日期」加入日期。'
        : "IT組尚未加入播放日期。"}</p>`;
    return;
  }
  guide.innerHTML = list.map((s) => {
    const d = parseDateId(s.date);
    const past = daysUntil(s.date) < 0;
    return `
      <div class="ep-row${past ? " is-past" : ""}">
        <div class="ep-date">
          <span class="ep-day">${d.getDate()}</span>
          <span class="ep-month">${d.getFullYear()}年${d.getMonth() + 1}月</span>
          <span class="ep-week">${weekdayName(s.date)}</span>
          ${s.note ? `<span class="ep-note">${esc(s.note)}</span>` : ""}
        </div>
        ${KTV.slots.map((_, i) => slotHtml(s, i, map.get(`${s.id}_${i}`))).join("")}
      </div>`;
  }).join("");
}

function slotHtml(s, i, b) {
  const time = `<span class="slot-time">${KTV.slots[i]}</span>`;
  if (b?.status === "approved") {
    return `<div class="slot slot--approved">${time}
      <span class="slot-topic">${esc(b.topic)}</span>
      <span class="slot-meta">${esc(b.teacherName)}<span class="tag">${esc(b.mode)}</span></span></div>`;
  }
  if (b) {
    return `<div class="slot slot--pending">${time}
      <span class="slot-topic">${esc(b.topic)}</span>
      <span class="slot-meta">${esc(b.teacherName)}，審批中</span></div>`;
  }
  const n = daysUntil(s.date);
  if (n < 0) return `<div class="slot slot--quiet">${time}<span class="slot-note">沒有節目</span></div>`;
  if (s.open === false) return `<div class="slot slot--quiet">${time}<span class="slot-note">暫停預約</span></div>`;
  if (n < KTV.cutoffDays) return `<div class="slot slot--quiet">${time}<span class="slot-note">已截止預約</span></div>`;
  return `<button type="button" class="slot slot--open" data-session="${s.id}" data-slot="${i}"
    aria-label="預約 ${fmtDate(s.date)} ${KTV.slots[i]}">${time}<span class="slot-cta">預約此時段</span></button>`;
}

/* ---------- 我的申請 ---------- */
function renderMine() {
  const mine = S.bookings
    .filter((b) => b.uid === S.user.uid)
    .sort((a, b) => b.sessionId.localeCompare(a.sessionId) || a.slot - b.slot);
  const box = $("#mine");
  if (!mine.length) {
    box.innerHTML = `<p class="empty">你還未提交任何申請。在上面的時間表選擇一個可預約的時段即可開始。</p>`;
    return;
  }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>播放日期</th><th>時段</th><th>主題</th><th>模式</th><th>狀態</th><th>管理員備註</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${mine.map((b) => `
            <tr>
              <td>${fmtDate(b.sessionId)}</td>
              <td class="nowrap">${esc(b.slotLabel)}</td>
              <td>${esc(b.topic)}</td>
              <td class="nowrap">${esc(b.mode)}</td>
              <td><span class="badge badge--${STATUS[b.status]?.tone}">${STATUS[b.status]?.label || b.status}</span></td>
              <td>${esc(b.reviewNote || "")}</td>
              <td>${b.status === "pending" ? `<button class="btn btn--small" data-cancel="${b.id}">取消申請</button>` : ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function cancelMine(id) {
  const b = S.bookings.find((x) => x.id === id);
  if (!b || !confirm(`取消 ${fmtDate(b.sessionId)} ${b.slotLabel}「${b.topic}」的申請？`)) return;
  const batch = writeBatch(db);
  batch.update(doc(db, "ktv_bookings", id), { status: "cancelled", updatedAt: serverTimestamp() });
  batch.delete(doc(db, "ktv_slots", `${b.sessionId}_${b.slot}`));
  try {
    await batch.commit();
    toast("已取消申請，該時段已重新開放。", "success");
  } catch (e) {
    toast("未能取消：" + e.message, "error");
  }
}

/* ---------- 預約表格 ---------- */
function setupDialog() {
  const dialog = $("#book-dialog");
  const form = $("#book-form");
  $("#mode-choices").innerHTML = KTV.modes.map((m, i) => `
    <label class="choice"><input type="radio" name="mode" value="${esc(m)}" ${i === 0 ? "checked" : ""}><span>${esc(m)}</span></label>`).join("");
  $("#book-cancel").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const sessionId = fd.get("sessionId");
    const slot = Number(fd.get("slot"));
    const topic = fd.get("topic").trim();
    const teacherName = fd.get("teacherName").trim();
    if (!topic || !teacherName) { toast("請填寫主題及負責老師。", "error"); return; }
    if (activeMap().has(`${sessionId}_${slot}`)) {
      toast("此時段剛有其他老師申請，請選擇另一個時段。", "error");
      dialog.close();
      return;
    }

    const submit = $("#book-submit");
    submit.disabled = true;
    submit.textContent = "提交中…";
    const bookingRef = doc(collection(db, "ktv_bookings"));
    const batch = writeBatch(db);
    batch.set(bookingRef, {
      sessionId,
      slot,
      slotLabel: KTV.slots[slot],
      topic,
      teacherName,
      teacherEmail: S.user.email,
      mode: fd.get("mode"),
      remarks: fd.get("remarks").trim(),
      uid: S.user.uid,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // 時段鎖：確保同一時段只會有一份有效申請
    batch.set(doc(db, "ktv_slots", `${sessionId}_${slot}`), {
      bookingId: bookingRef.id, sessionId, slot, uid: S.user.uid, createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      dialog.close();
      toast("已提交申請。審批結果會以電郵通知你。", "success");
    } catch (err) {
      console.error(err);
      toast(err.code === "permission-denied"
        ? "未能提交：此時段可能剛被預約，或該日已暫停預約。請重新選擇時段。"
        : "未能提交：" + err.message, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "提交申請";
    }
  });
}

function openDialog(sessionId, slot) {
  const form = $("#book-form");
  form.reset();
  form.sessionId.value = sessionId;
  form.slot.value = slot;
  form.teacherName.value = S.user.displayName || "";
  $("#book-when").textContent = `${fmtDate(sessionId)}　${KTV.slots[slot]}`;
  $("#book-email").textContent = S.user.email;
  $("#book-dialog").showModal();
  form.topic.focus();
}

