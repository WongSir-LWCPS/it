import {
  boot, db, esc, toast, fmtDate, daysUntil, parseDateId, weekdayName,
  enhanceDateInputs, timePicker, fmtTime12,
} from "../../assets/js/common.js?v=20261008j";
import {
  collection, doc, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { notifyAdmins } from "../../assets/js/notify.js?v=20261008j";
import { buildKtvEmail } from "./ktv-email.js?v=20261008j";
import { KTV, STATUS } from "./ktv-config.js?v=20261008j";
import {
  timeLabel, toMin, lockIdOf, findConflict, buildDays, overlapsKtvWindow, minBookDate, canBook, sortBookings,
} from "./ktv-common.js?v=20261008j";

const S = {
  user: null, isAdmin: false, regularDates: [], bookings: [], hidePast: true,
  loaded: { c: false, b: false },
};
const $ = (sel) => document.querySelector(sel);

boot({
  root: "../../", current: "ktv",
  onReady: ({ user, isAdmin }) => {
    S.user = user;
    S.isAdmin = isAdmin;
    $("#admin-link").hidden = !isAdmin;
    $("#guide").innerHTML = `<p class="empty">正在讀取播放時間表…</p>`;
    $("#guide-hint").textContent =
      `樂Kids TV 每次播放共 ${KTV.slots.length} 個時段，每段 5 分鐘。按「預約此時段」填寫申請；如要在其他日子或時間播放，按「預約其他時段」。提交後可在下方「我的申請」查看審批結果。須在播放日前 ${KTV.cutoffDays} 天申請。`;

    onSnapshot(doc(db, "ktv_settings", "main"), (snap) => {
      S.regularDates = (snap.data()?.regularDates || []).filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
      S.loaded.c = true;
      render();
    }, onError);
    onSnapshot(collection(db, "ktv_bookings"), (snap) => {
      S.bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.date || "") && /^\d{2}:\d{2}$/.test(b.start || "") && /^\d{2}:\d{2}$/.test(b.end || ""));
      S.loaded.b = true;
      render();
    }, onError);

    $("#toggle-past").addEventListener("change", (e) => { S.hidePast = e.target.checked; render(); });
    $("#jump-next").addEventListener("click", () => {
      const next = [...document.querySelectorAll(".ep-row")].find((r) => daysUntil(r.dataset.date) >= 0);
      next?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#book-custom").addEventListener("click", () => openDialog({ kind: "custom" }));
    $("#guide").addEventListener("click", (e) => {
      const btn = e.target.closest(".slot--open");
      if (btn) openDialog({ kind: "regular", date: btn.dataset.date, slot: Number(btn.dataset.slot) });
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

function render() {
  if (!S.loaded.c || !S.loaded.b) return;
  try {
    const days = buildDays(S.regularDates, S.bookings);
    renderHero(days);
    renderGuide(days);
    renderMine();
  } catch (e) {
    console.error(e);
    $("#guide").innerHTML = `<p class="load-error" role="alert">未能顯示播放時間表：${esc(e.message)}。請把這段文字告訴IT組。</p>`;
  }
}

/* ---------- 下一次播放 ---------- */
function renderHero(days) {
  const next = days.find((d) => d.regular && daysUntil(d.date) >= 0);
  const hero = $("#hero");
  if (!next) {
    hero.innerHTML = `<div class="onair-head"><p class="onair-label">下一次播放</p><p class="onair-sub">未有安排</p></div>`;
    return;
  }
  const d = parseDateId(next.date);
  const n = daysUntil(next.date);
  const countdown = n === 0 ? "今天播放" : n === 1 ? "明天播放" : `還有 ${n} 天`;
  const lineup = next.slots.map((s) => {
    const b = s.booking;
    if (b?.status === "approved") return `<li><span class="t">${s.start}</span><span data-no-translate>${esc(b.topic)}</span></li>`;
    if (b) return `<li class="dim"><span class="t">${s.start}</span>審批中</li>`;
    return `<li class="dim"><span class="t">${s.start}</span>未有節目</li>`;
  }).join("");
  hero.innerHTML = `
    <div class="onair-head">
      <p class="onair-label">下一次播放</p>
      <p class="onair-date">${d.getMonth() + 1}月${d.getDate()}日</p>
      <p class="onair-sub">${weekdayName(next.date)}，${countdown}</p>
    </div>
    <ol class="lineup" aria-label="節目次序">${lineup}</ol>`;
}

/* ---------- 播放時間表 ---------- */
function renderGuide(days) {
  const list = days.filter((d) => !S.hidePast || daysUntil(d.date) >= 0);
  const guide = $("#guide");
  if (!list.length) {
    guide.innerHTML = `<p class="empty">${days.length
      ? "沒有即將播放的日期。取消勾選「隱藏已播放的日期」可查看過往節目。"
      : S.isAdmin
        ? '還未有播放資料。到 <a href="admin.html#import">管理及審批 → 匯入</a> 匯入試算表，或在「播放日期」加入日期。'
        : "IT組尚未加入播放日期。你仍可按「預約其他時段」申請。"}</p>`;
    return;
  }
  guide.innerHTML = list.map((day) => {
    const d = parseDateId(day.date);
    const past = daysUntil(day.date) < 0;
    return `
      <div class="ep-row${past ? " is-past" : ""}" data-date="${day.date}" id="day-${day.date}">
        <div class="ep-date${day.regular ? "" : " ep-date--extra"}">
          <span class="ep-day">${d.getDate()}</span>
          <span class="ep-month">${d.getFullYear()}年${d.getMonth() + 1}月</span>
          <span class="ep-week">${weekdayName(day.date)}</span>
          ${day.regular ? "" : '<span class="ep-note">其他時段</span>'}
        </div>
        <div class="ep-slots">
          ${day.slots.map((s, i) => s.booking ? bookedCell(s.booking) : openCell(day.date, i)).join("")}
          ${day.extras.map((b) => bookedCell(b, true)).join("")}
        </div>
      </div>`;
  }).join("");
}

function bookedCell(b, extra = false) {
  const time = `<span class="slot-time">${timeLabel(b)}${extra ? '<span class="tag tag--extra">其他時段</span>' : ""}</span>`;
  if (b.status === "approved") {
    return `<div class="slot slot--approved">${time}
      <span class="slot-topic" data-no-translate>${esc(b.topic)}</span>
      <span class="slot-meta"><span data-no-translate>${esc(b.teacherName)}</span><span class="tag">${esc(b.mode)}</span></span></div>`;
  }
  return `<div class="slot slot--pending">${time}
    <span class="slot-topic" data-no-translate>${esc(b.topic)}</span>
    <span class="slot-meta"><span data-no-translate>${esc(b.teacherName)}</span>，審批中</span></div>`;
}

function openCell(date, i) {
  const s = KTV.slots[i];
  const time = `<span class="slot-time">${s.start} - ${s.end}</span>`;
  if (daysUntil(date) < 0) return `<div class="slot slot--quiet">${time}<span class="slot-note">沒有節目</span></div>`;
  if (!canBook(date)) return `<div class="slot slot--quiet">${time}<span class="slot-note">已截止預約</span></div>`;
  return `<button type="button" class="slot slot--open" data-date="${date}" data-slot="${i}"
    aria-label="預約 ${fmtDate(date)} ${s.start}">${time}<span class="slot-cta">預約此時段</span></button>`;
}

/* ---------- 我的申請 ---------- */
function renderMine() {
  const mine = S.bookings.filter((b) => b.uid === S.user.uid).sort((a, b) => -sortBookings(a, b));
  const box = $("#mine");
  if (!mine.length) {
    box.innerHTML = `<p class="empty">你還未提交任何申請。在上面的時間表選擇可預約的時段，或按「預約其他時段」。</p>`;
    return;
  }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>播放日期</th><th>時間</th><th>主題</th><th>模式</th><th>狀態</th><th>管理員備註</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${mine.map((b) => `
            <tr>
              <td>${fmtDate(b.date)}</td>
              <td class="nowrap">${timeLabel(b)}${b.kind === "custom" ? "<br><small>其他時段</small>" : ""}</td>
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
  if (!b || !confirm(`取消 ${fmtDate(b.date)} ${timeLabel(b)}「${b.topic}」的申請？`)) return;
  const batch = writeBatch(db);
  batch.update(doc(db, "ktv_bookings", id), { status: "cancelled", updatedAt: serverTimestamp() });
  batch.delete(doc(db, "ktv_slots", b.lockId));
  try {
    await batch.commit();
    toast("已取消申請，該時段已重新開放。", "success");
  } catch (e) {
    toast("未能取消：" + e.message, "error");
  }
}

/* ---------- 預約表格 ---------- */
/** 檢查「其他時段」；沒有問題時回傳空字串 */
function checkCustom(date, start, end) {
  if (!date || !start || !end) return "請填寫日期、開始時間及結束時間。";
  if (!canBook(date)) return `須在播放日前 ${KTV.cutoffDays} 天申請，最早可預約 ${fmtDate(minBookDate())}。`;
  if (toMin(end) <= toMin(start)) return "結束時間必須遲於開始時間。";
  if (toMin(end) - toMin(start) > KTV.maxCustomMinutes) return `每次最長 ${KTV.maxCustomMinutes} 分鐘。`;
  const w = KTV.customWindow;
  if (toMin(start) < toMin(w.from) || toMin(end) > toMin(w.to)) return `時間須在 ${w.from} 至 ${w.to} 之間。`;
  if (S.regularDates.includes(date) && overlapsKtvWindow(start, end)) {
    return "這段時間是當日樂Kids TV的播放時間，請關閉此視窗，在時間表直接預約樂Kids TV時段。";
  }
  const c = findConflict(S.bookings, date, start, end);
  if (c) return `與已有的節目「${c.topic}」（${timeLabel(c)}）時間重疊，請選擇其他時間。`;
  return "";
}

function setupDialog() {
  const dialog = $("#book-dialog");
  const form = $("#book-form");
  $("#mode-choices").innerHTML = KTV.modes.map((m, i) => `
    <label class="choice"><input type="radio" name="mode" value="${esc(m)}" ${i === 0 ? "checked" : ""}><span>${esc(m)}</span></label>`).join("");
  $("#custom-hint").textContent =
    `用於樂Kids TV播放時間以外的日子或時間。可預約 ${KTV.customWindow.from} 至 ${KTV.customWindow.to}，每次最長 ${KTV.maxCustomMinutes} 分鐘。`;
  $("#book-cancel").addEventListener("click", () => dialog.close());

  enhanceDateInputs(form);
  timePicker(form.start, {
    from: KTV.customWindow.from,
    to: toHHMM(toMin(KTV.customWindow.to) - 5),
    label: "開始時間",
    errorText: `請輸入 ${fmtTime12(KTV.customWindow.from)} 至 ${fmtTime12(toHHMM(toMin(KTV.customWindow.to) - 5))} 之間的時間。`,
  });
  timePicker(form.end, {
    from: toHHMM(toMin(KTV.customWindow.from) + 5),
    to: KTV.customWindow.to,
    label: "結束時間",
    isAllowed: (t) => !form.start.value
      || (toMin(t) > toMin(form.start.value) && toMin(t) - toMin(form.start.value) <= KTV.maxCustomMinutes),
    errorText: `結束時間須遲於開始時間，每次最長 ${KTV.maxCustomMinutes} 分鐘，並在 ${fmtTime12(KTV.customWindow.to)} 或之前。`,
  });

  // 填寫日期或時間後即時檢查
  form.start.addEventListener("change", () => { form.end._tp.refresh(); syncEnd(); });
  form.end.addEventListener("change", syncEnd);
  form.date.addEventListener("change", syncEnd);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const kind = fd.get("kind");
    let date, start, end;
    if (kind === "regular") {
      date = fd.get("rdate");
      ({ start, end } = KTV.slots[Number(fd.get("rslot"))]);
      const c = findConflict(S.bookings, date, start, end);
      if (c) { showWarn("此時段剛有其他老師申請，請選擇另一個時段。"); return; }
    } else {
      date = fd.get("date"); start = fd.get("start"); end = fd.get("end");
      const msg = checkCustom(date, start, end);
      if (msg) { showWarn(msg); return; }
    }
    const topic = fd.get("topic").trim();
    const teacherName = fd.get("teacherName").trim();
    if (!topic || !teacherName) { showWarn("請填寫主題及負責老師。"); return; }

    const submit = $("#book-submit");
    submit.disabled = true;
    submit.textContent = "提交中…";
    const lockId = lockIdOf(date, start);
    const ref = doc(collection(db, "ktv_bookings"));
    const batch = writeBatch(db);
    batch.set(ref, {
      date, start, end, kind, lockId,
      topic, teacherName,
      teacherEmail: S.user.email,
      mode: fd.get("mode"),
      remarks: fd.get("remarks").trim(),
      uid: S.user.uid,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // 時段鎖：確保同一開始時間只會有一份有效申請
    batch.set(doc(db, "ktv_slots", lockId), {
      bookingId: ref.id, date, start, uid: S.user.uid, createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      dialog.close();
      toast("已提交申請。審批結果可在下方「我的申請」查看。", "success");
      notifyAdmins("ktv", buildKtvEmail({ date, start, end, kind, topic, teacherName, teacherEmail: S.user.email,
        mode: fd.get("mode"), remarks: fd.get("remarks").trim() }, "new")).then((r) => console.info("通知管理員：", r));
    } catch (err) {
      console.error(err);
      showWarn(err.code === "permission-denied"
        ? "未能提交：這個時間可能剛被預約。請選擇其他時間。"
        : "未能提交：" + err.message);
    } finally {
      submit.disabled = false;
      submit.textContent = "提交申請";
    }
  });
}

const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** 顯示播放時間並即時檢查 */
function syncEnd() {
  const form = $("#book-form");
  const start = form.start.value;
  const end = form.end.value;
  const mins = start && end ? toMin(end) - toMin(start) : 0;
  $("#end-preview").textContent = mins > 0 ? `播放時間：${start} 至 ${end}（${mins} 分鐘）` : "";
  const warn = $("#book-warn");
  const msg = form.date.value && start && end ? checkCustom(form.date.value, start, end) : "";
  warn.hidden = !msg;
  warn.textContent = msg;
}

function showWarn(msg) {
  const w = $("#book-warn");
  w.hidden = false;
  w.textContent = msg;
}

function openDialog({ kind, date = "", slot = 0 }) {
  const form = $("#book-form");
  form.reset();
  form.kind.value = kind;
  form.teacherName.value = S.user.displayName || "";
  $("#book-warn").hidden = true;
  const custom = kind === "custom";
  $("#custom-fields").hidden = !custom;
  $("#book-when").hidden = custom;
  $("#book-title").textContent = custom ? "預約其他時段" : "預約樂Kids TV時段";
  if (custom) {
    form.date.min = minBookDate();
    form.date.value = date;
    form.start._tp.set("", true);
    form.end._tp.set("", true);
    setTimeout(syncEnd);
  } else {
    form.rdate.value = date;
    form.rslot.value = slot;
    $("#book-when").textContent = `${fmtDate(date)}　${KTV.slots[slot].start} - ${KTV.slots[slot].end}`;
  }
  $("#book-dialog").showModal();
  (custom ? form.date : form.topic).focus();
}
