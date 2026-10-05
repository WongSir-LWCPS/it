import {
  boot, db, esc, toast, APP, isBlockedEmail, fmtTimestamp, fmtDate, todayId, enhanceDateInputs, downloadCSV,
} from "./common.js?v=20261005q";
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, getDocs, writeBatch,
  serverTimestamp, arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { syncNotifyList } from "./notify.js?v=20261005q";

const $ = (sel) => document.querySelector(sel);
const S = { me: "", admins: [] };

boot({
  root: "./", current: "settings",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) {
      $("#main").innerHTML = `
        <section class="notice">
          <h1>只限管理員使用</h1>
          <p>你的帳戶（${esc(user.email)}）未有管理員權限。如需權限，請聯絡IT組。</p>
          <a class="btn btn--primary" href="index.html">返回平台首頁</a>
        </section>`;
      return;
    }
    S.me = user.email.toLowerCase();
    $("#admin-section").hidden = false;
    $("#year-section").hidden = false;
    setupYear();

    onSnapshot(collection(db, "admins"), (snap) => {
      S.admins = snap.docs.map((d) => ({ email: d.id, ...d.data() })).sort((a, b) => a.email.localeCompare(b.email));
      renderAdmins();
    }, (e) => toast("未能讀取管理員名單：" + e.message, "error"));

    $("#add-admin").addEventListener("submit", addAdmin);
    $("#admin-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (btn) removeAdmin(btn.dataset.remove);
    });
    $("#admin-list").addEventListener("change", async (e) => {
      const box = e.target.closest("[data-notify]");
      if (!box) return;
      try {
        await updateDoc(doc(db, "admins", box.dataset.notify), { notify: box.checked });
        await syncNotifyList();
        toast(box.checked ? `${box.dataset.notify} 會收到申請通知。` : `${box.dataset.notify} 不再收到申請通知。`, "success");
      } catch (err) {
        box.checked = !box.checked;
        toast("未能更新：" + err.message, "error");
      }
    });
    syncNotifyList().catch((e) => console.warn(e));
  },
});

function renderAdmins() {
  $("#admin-list").innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>電郵</th><th>名稱</th><th>接收申請通知</th><th>加入者</th><th>加入時間</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${S.admins.map((a) => `
            <tr>
              <td>${esc(a.email)}${a.email === S.me ? ' <span class="badge badge--go">你</span>' : ""}</td>
              <td>${esc(a.name || "")}</td>
              <td><label class="check"><input type="checkbox" data-notify="${esc(a.email)}" ${a.notify !== false ? "checked" : ""}> 電郵通知</label></td>
              <td>${esc(a.addedBy || "（Firebase 設定）")}</td>
              <td class="nowrap">${fmtTimestamp(a.addedAt)}</td>
              <td>${a.email === S.me
                ? '<small class="hint">不能移除自己</small>'
                : `<button class="btn btn--small btn--danger-text" data-remove="${esc(a.email)}">移除</button>`}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="hint mt-s">共 ${S.admins.length} 位管理員。</p>`;
}

async function addAdmin(e) {
  e.preventDefault();
  const f = e.target;
  const warn = (msg) => { const w = $("#add-warn"); w.hidden = !msg; w.textContent = msg; };
  const email = f.email.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return warn("請輸入正確的電郵地址。");
  if (APP.allowedDomain && !email.endsWith("@" + APP.allowedDomain.toLowerCase())) {
    return warn(`只可加入 @${APP.allowedDomain} 的學校帳戶。`);
  }
  if (isBlockedEmail(email)) return warn("學生帳戶不能成為管理員。");
  if (S.admins.some((a) => a.email === email)) return warn(`${email} 已經是管理員。`);
  warn("");
  try {
    await setDoc(doc(db, "admins", email), {
      name: f.name.value.trim(),
      notify: true,
      addedBy: S.me,
      addedAt: serverTimestamp(),
    });
    f.reset();
    await syncNotifyList();
    toast(`已加入 ${email} 為管理員。對方重新整理頁面後即可使用管理功能。`, "success");
  } catch (err) {
    warn("未能加入：" + err.message);
  }
}

async function removeAdmin(email) {
  if (email === S.me) return;
  if (S.admins.length <= 1) { toast("最少要保留一位管理員。", "error"); return; }
  if (!confirm(`移除 ${email} 的管理員權限？`)) return;
  try {
    await deleteDoc(doc(db, "admins", email));
    await syncNotifyList();
    toast(`已移除 ${email}。`, "success");
  } catch (err) {
    toast("未能移除：" + err.message, "error");
  }
}

/* ================= 學年設定 ================= */
const yearRef = () => doc(db, "settings", "schoolYear");

/** 按今天推算學年（9 月開始） */
function defaultYear() {
  const d = new Date();
  const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return { name: `${y}-${String(y + 1).slice(-2)}`, start: `${y}-09-01`, end: `${y + 1}-08-31` };
}

async function setupYear() {
  const f = $("#year-form");
  enhanceDateInputs(f);
  let year;
  try { year = (await getDoc(yearRef())).data(); } catch (e) { console.warn(e); }
  const saved = Boolean(year);
  year = year || defaultYear();
  f.name.value = year.name;
  f.start.value = year.start;
  f.end.value = year.end;
  showYear(year, saved);

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const y = { name: f.name.value.trim(), start: f.start.value, end: f.end.value };
    if (!y.name || !y.start || !y.end) { toast("請填寫學年、開始及結束日期。", "error"); return; }
    if (y.end <= y.start) { toast("結束日期必須遲於開始日期。", "error"); return; }
    try {
      await setDoc(yearRef(), { ...y, updatedBy: S.me, updatedAt: serverTimestamp() });
      showYear(y, true);
      toast(`已把目前學年設為 ${y.name}。`, "success");
    } catch (err) { toast("未能儲存：" + err.message, "error"); }
  });
}

function showYear(y, saved) {
  S.year = y;
  $("#year-current").textContent = `目前學年：${y.name}（${fmtDate(y.start)} 至 ${fmtDate(y.end)}）${saved ? "" : "，尚未儲存"}`;
  const w = $("#year-warn");
  w.hidden = !(todayId() > y.end);
  w.textContent = `${y.name} 學年已於 ${fmtDate(y.end)} 完結，請更新為新學年。`;
  loadOldData();
}

/* ---------- 刪除舊學年資料 ---------- */
const SOURCES = [
  {
    key: "ktv", label: "樂Kids TV 節目及申請", coll: "ktv_bookings",
    old: (r, start) => (r.date || r.sessionId || "") < start,
    row: (r) => ["樂Kids TV", r.date, `${r.start || ""}-${r.end || ""}`, r.topic, r.teacherName, r.teacherEmail, r.status, r.remarks],
  },
  {
    key: "print", label: "增加彩色列印限額申請", coll: "print_requests",
    old: (r, start) => (r.date || "") < start,
    row: (r) => ["彩色列印限額", r.date, "", r.remarks, r.applicantName, r.email, r.status, r.reviewNote],
  },
  {
    key: "copilot", label: "Copilot借用申請", coll: "copilot_requests",
    old: (r, start) => (r.endDate || "") < start,
    row: (r) => ["Copilot借用", r.startDate, `至 ${r.endDate}`, (r.purposes || []).join("、"), r.applicantName, r.email, r.status, r.reviewNote],
  },
];

async function loadOldData() {
  const box = $("#old-data");
  const start = S.year.start;
  try {
    S.old = {};
    for (const src of SOURCES) {
      const snap = await getDocs(collection(db, src.coll));
      S.old[src.key] = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => src.old(r, start));
    }
    const ktvSettings = (await getDoc(doc(db, "ktv_settings", "main"))).data();
    S.old.ktvDates = (ktvSettings?.regularDates || []).filter((d) => d < start);
  } catch (e) {
    box.innerHTML = `<p class="load-error">未能統計資料：${esc(e.message)}</p>`;
    return;
  }
  const rows = [
    ...SOURCES.map((src) => ({ key: src.key, label: src.label, count: S.old[src.key].length })),
    { key: "ktvDates", label: "樂Kids TV 播放日", count: S.old.ktvDates.length },
  ];
  const total = rows.reduce((n, r) => n + r.count, 0);
  if (!total) {
    box.innerHTML = `<p class="empty">沒有 ${fmtDate(start)} 之前的資料。</p>`;
    return;
  }
  box.innerHTML = `
    <p>${fmtDate(start)} 之前的資料：</p>
    <ul class="old-list">
      ${rows.map((r) => `
        <li><label class="check"><input type="checkbox" data-old="${r.key}" ${r.count ? "checked" : "disabled"}>
          ${esc(r.label)}：<strong>${r.count}</strong> 項</label></li>`).join("")}
    </ul>
    <div class="actions actions--start mt-s">
      <button class="btn" type="button" id="old-backup">下載備份（CSV）</button>
      <button class="btn btn--stop" type="button" id="old-delete">刪除所選資料</button>
    </div>`;
  $("#old-backup").addEventListener("click", backupOld);
  $("#old-delete").addEventListener("click", deleteOld);
}

const selectedOld = () => [...document.querySelectorAll("[data-old]:checked")].map((x) => x.dataset.old);

function backupOld() {
  const rows = [["系統", "日期", "時間／期間", "內容", "申請人", "電郵", "狀態", "備註"]];
  for (const src of SOURCES) S.old[src.key].forEach((r) => rows.push(src.row(r)));
  S.old.ktvDates.forEach((d) => rows.push(["樂Kids TV 播放日", d, "", "", "", "", "", ""]));
  downloadCSV(`IT一站式平台_舊資料備份_${S.year.start}之前.csv`, rows);
}

async function deleteOld() {
  const keys = selectedOld();
  if (!keys.length) { toast("請選擇要刪除的資料。", "error"); return; }
  const answer = prompt(`將刪除 ${fmtDate(S.year.start)} 之前的所選資料，刪除後不能復原。\n請輸入「刪除」確認：`);
  if (answer?.trim() !== "刪除") return;

  const ops = [];
  for (const src of SOURCES) {
    if (!keys.includes(src.key)) continue;
    for (const r of S.old[src.key]) {
      ops.push((b) => b.delete(doc(db, src.coll, r.id)));
      if (src.key === "ktv" && r.lockId) ops.push((b) => b.delete(doc(db, "ktv_slots", r.lockId)));
    }
  }
  const btn = $("#old-delete");
  btn.disabled = true;
  btn.textContent = "刪除中…";
  try {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      ops.slice(i, i + 400).forEach((op) => op(batch));
      await batch.commit();
    }
    if (keys.includes("ktvDates") && S.old.ktvDates.length) {
      await updateDoc(doc(db, "ktv_settings", "main"), { regularDates: arrayRemove(...S.old.ktvDates) });
    }
    toast("已刪除所選的舊學年資料。", "success");
  } catch (e) {
    toast("未能刪除：" + e.message, "error");
  }
  loadOldData();
}
