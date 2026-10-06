import {
  boot, db, esc, toast, fmtDate, fmtTimestamp, todayId,
} from "../../assets/js/common.js?v=20261006k";
import {
  collection, doc, onSnapshot, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { emailEnabled } from "../../assets/js/email.js?v=20261006k";
import { notifyAdmins, syncNotifyList } from "../../assets/js/notify.js?v=20261006k";
import { CSTATUS, purposeText } from "./copilot-config.js?v=20261006k";
import { buildCopilotEmail } from "./copilot-email.js?v=20261006k";

const $ = (sel) => document.querySelector(sel);
const applicantEmail = (r) => r.applicantEmail || r.email;
/** 申請人電郵；如由他人代為提交，一併顯示提交者 */
const whoHtml = (r) => esc(applicantEmail(r)) + (r.applicantEmail && r.applicantEmail !== r.email ? `<br><small>由 ${esc(r.email)} 提交</small>` : "");
const S = { user: null, list: [], filter: "all" };
const byNewest = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
const period = (r) => `${fmtDate(r.startDate)} 至 ${fmtDate(r.endDate)}（${r.days} 天）`;
const overdue = (r) => r.status === "approved" && r.endDate < todayId();

boot({
  root: "../../", current: "copilot-admin",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) {
      $("#main").innerHTML = `
        <section class="notice">
          <h1>只限管理員使用</h1>
          <p>你的帳戶（${esc(user.email)}）未有管理員權限。如需權限，請聯絡IT組。</p>
          <a class="btn btn--primary" href="index.html">返回申請表</a>
        </section>`;
      return;
    }
    S.user = user;
    $("#admin-area").hidden = false;
    if (!emailEnabled()) {
      const w = $("#email-status");
      w.hidden = false;
      w.textContent = "尚未設定電郵通知：管理員不會收到電郵。設定方法見 README.md。";
    }
    syncNotifyList().catch((e) => console.warn(e));

    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== `tab-${tab.dataset.tab}`; });
    }));
    $("#all-filter").addEventListener("change", (e) => { S.filter = e.target.value; renderAll(); });

    onSnapshot(collection(db, "copilot_requests"), (snap) => {
      S.list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderPending();
      renderActive();
      renderAll();
    }, (e) => toast("未能讀取資料：" + e.message, "error"));

    $("#pending-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const card = btn.closest("[data-id]");
      const note = card.querySelector("textarea").value.trim();
      const status = btn.dataset.act === "approve" ? "approved" : "rejected";
      if (status === "rejected" && !note && !confirm("未填寫原因。確定不批准這項申請？")) return;
      decide(card.dataset.id, status, note, [...card.querySelectorAll("button")]);
    });
    $("#active-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-return]");
      if (!btn) return;
      const r = S.list.find((x) => x.id === btn.dataset.return);
      if (!confirm(`確認已在 Microsoft 365 收回 ${r.applicantName}（${applicantEmail(r)}）的 Copilot 授權？`)) return;
      decide(r.id, "returned", "", [btn]);
    });
  },
});

function renderPending() {
  const box = $("#pending-list");
  const drafts = {};
  box.querySelectorAll("[data-id]").forEach((el) => { drafts[el.dataset.id] = el.querySelector("textarea").value; });
  const list = S.list.filter((r) => r.status === "pending").sort((a, b) => -byNewest(a, b));
  $("#pending-count").textContent = list.length || "";
  if (!list.length) {
    box.innerHTML = `<p class="empty">沒有待審批的申請。老師提交的新申請會即時出現在這裏。</p>`;
    return;
  }
  box.innerHTML = list.map((r) => `
    <article class="review" data-id="${r.id}">
      <header class="review-head">
        <strong>${esc(r.applicantName)}</strong>
        <span class="review-time">${r.days} 天</span>
      </header>
      <dl class="kv">
        <dt>授權帳戶</dt><dd>${whoHtml(r)}</dd>
        <dt>組別/科組</dt><dd>${esc(r.group)}</dd>
        <dt>借用期間</dt><dd>${period(r)}</dd>
        <dt>用途</dt><dd>${esc(purposeText(r))}</dd>
        <dt>提交時間</dt><dd>${fmtTimestamp(r.createdAt)}</dd>
      </dl>
      <label class="field"><span>給老師的回覆（選填，老師可在「我的申請」看到）</span>
        <textarea rows="2" maxlength="300">${esc(drafts[r.id] || "")}</textarea>
      </label>
      <div class="actions">
        <button class="btn btn--stop" data-act="reject">不批准</button>
        <button class="btn btn--go" data-act="approve">批准</button>
      </div>
    </article>`).join("");
}

function renderActive() {
  const list = S.list.filter((r) => r.status === "approved").sort((a, b) => a.endDate.localeCompare(b.endDate));
  const due = list.filter(overdue).length;
  $("#active-count").textContent = list.length ? (due ? `${due} 到期` : list.length) : "";
  const box = $("#active-list");
  if (!list.length) { box.innerHTML = `<p class="empty">目前沒有借用中的 Copilot。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>申請人</th><th>授權帳戶</th><th>借用期間</th><th>狀態</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td>${esc(r.applicantName)}<br><small>${esc(r.group)}</small></td>
              <td>${whoHtml(r)}</td>
              <td>${period(r)}</td>
              <td>${overdue(r) ? '<span class="badge badge--stop">已到期</span>' : '<span class="badge badge--go">借用中</span>'}</td>
              <td><button class="btn btn--small" data-return="${r.id}">標示為已收回</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderAll() {
  const list = S.list.filter((r) => S.filter === "all" || r.status === S.filter).sort(byNewest);
  const box = $("#all-list");
  if (!list.length) { box.innerHTML = `<p class="empty">沒有符合條件的申請。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>申請人</th><th>組別/科組</th><th>借用期間</th><th>用途</th><th>狀態</th><th>處理</th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td>${esc(r.applicantName)}<br><small>${whoHtml(r)}</small></td>
              <td>${esc(r.group)}</td>
              <td>${period(r)}</td>
              <td>${esc(purposeText(r))}</td>
              <td><span class="badge badge--${CSTATUS[r.status]?.tone}">${CSTATUS[r.status]?.label || r.status}</span>
                ${overdue(r) ? '<br><span class="badge badge--stop">已到期</span>' : ""}</td>
              <td>${r.reviewedBy ? `<small>${esc(r.reviewedBy)}<br>${fmtTimestamp(r.reviewedAt)}</small>` : ""}
                ${r.reviewNote ? `<br>${esc(r.reviewNote)}` : ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function decide(id, status, note, btns) {
  const r = S.list.find((x) => x.id === id);
  if (!r) return;
  btns.forEach((b) => { b.disabled = true; });
  try {
    const data = { status, updatedAt: serverTimestamp() };
    if (status === "returned") Object.assign(data, { returnedBy: S.user.email, returnedAt: serverTimestamp() });
    else Object.assign(data, { reviewNote: note, reviewedBy: S.user.email, reviewedAt: serverTimestamp() });
    await updateDoc(doc(db, "copilot_requests", id), data);
  } catch (e) {
    btns.forEach((b) => { b.disabled = false; });
    toast("未能更新：" + e.message, "error");
    return;
  }
  const done = { approved: "已批准", rejected: "已設為不批准", returned: "已標示為已收回" }[status];
  const result = await notifyAdmins("copilot", buildCopilotEmail(r, status, note, S.user.email));
  if (result.startsWith("已通知")) await updateDoc(doc(db, "copilot_requests", id), { notifiedAt: serverTimestamp() });
  toast(`${done}（${result}）`, "success");
}
