import {
  boot, db, esc, toast, fmtDate, fmtTimestamp,
} from "../../assets/js/common.js?v=20261006a";
import {
  collection, doc, onSnapshot, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { emailEnabled } from "../../assets/js/email.js?v=20261006a";
import { notifyAdmins, syncNotifyList } from "../../assets/js/notify.js?v=20261006a";
import { PSTATUS } from "./print-config.js?v=20261006a";
import { buildPrintEmail } from "./print-email.js?v=20261006a";

const $ = (sel) => document.querySelector(sel);
const applicantEmail = (r) => r.applicantEmail || r.email;
/** 申請人電郵；如由他人代為提交，一併顯示提交者 */
const whoHtml = (r) => esc(applicantEmail(r)) + (r.applicantEmail && r.applicantEmail !== r.email ? `<br><small>由 ${esc(r.email)} 提交</small>` : "");
const S = { user: null, list: [], filter: "all" };
const byNewest = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);

boot({
  root: "../../", current: "print-admin",
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
    // 確保通知名單存在（第一次使用時建立）
    syncNotifyList().catch((e) => console.warn(e));

    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== `tab-${tab.dataset.tab}`; });
    }));
    $("#all-filter").addEventListener("change", (e) => { S.filter = e.target.value; renderAll(); });

    onSnapshot(collection(db, "print_requests"), (snap) => {
      S.list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderPending();
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
  },
});

function renderPending() {
  const box = $("#pending-list");
  const drafts = {};
  box.querySelectorAll("[data-id]").forEach((el) => { drafts[el.dataset.id] = el.querySelector("textarea").value; });
  const list = S.list.filter((r) => r.status === "pending").sort((a, b) => -byNewest(a, b));
  $("#pending-count").textContent = list.length || "";
  if (!list.length) {
    box.innerHTML = `<p class="empty">沒有待處理的申請。老師提交的新申請會即時出現在這裏。</p>`;
    return;
  }
  box.innerHTML = list.map((r) => `
    <article class="review" data-id="${r.id}">
      <header class="review-head">
        <strong>${esc(r.applicantName)}</strong>
        <span class="review-time">${fmtDate(r.date)}</span>
      </header>
      <dl class="kv">
        <dt>電郵</dt><dd>${whoHtml(r)}</dd>
        <dt>提交時間</dt><dd>${fmtTimestamp(r.createdAt)}</dd>
        ${r.remarks ? `<dt>備註</dt><dd>${esc(r.remarks)}</dd>` : ""}
      </dl>
      <label class="field"><span>給老師的回覆（選填，老師可在「我的申請」看到）</span>
        <textarea rows="2" maxlength="300">${esc(drafts[r.id] || "")}</textarea>
      </label>
      <div class="actions">
        <button class="btn btn--stop" data-act="reject">不批准</button>
        <button class="btn btn--go" data-act="approve">已增加限額</button>
      </div>
    </article>`).join("");
}

async function decide(id, status, note, btns) {
  const r = S.list.find((x) => x.id === id);
  if (!r) return;
  btns.forEach((b) => { b.disabled = true; });
  try {
    await updateDoc(doc(db, "print_requests", id), {
      status, reviewNote: note, reviewedBy: S.user.email,
      reviewedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  } catch (e) {
    btns.forEach((b) => { b.disabled = false; });
    toast("未能更新：" + e.message, "error");
    return;
  }
  const done = status === "approved" ? "已標示為已增加限額" : "已設為不批准";
  const result = await notifyAdmins("print", buildPrintEmail(r, status, note, S.user.email));
  if (result.startsWith("已通知")) await updateDoc(doc(db, "print_requests", id), { notifiedAt: serverTimestamp() });
  toast(`${done}（${result}）`, "success");
}

function renderAll() {
  const list = S.list.filter((r) => S.filter === "all" || r.status === S.filter).sort(byNewest);
  const box = $("#all-list");
  if (!list.length) { box.innerHTML = `<p class="empty">沒有符合條件的申請。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>申請人</th><th>申請日期</th><th>提交時間</th><th>狀態</th><th>處理</th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td>${esc(r.applicantName)}<br><small>${whoHtml(r)}</small></td>
              <td class="nowrap">${fmtDate(r.date)}</td>
              <td class="nowrap">${fmtTimestamp(r.createdAt)}</td>
              <td><span class="badge badge--${PSTATUS[r.status]?.tone}">${PSTATUS[r.status]?.label || r.status}</span>
                ${r.notifiedAt ? "<br><small>已寄通知</small>" : ""}</td>
              <td>${r.reviewedBy ? `<small>${esc(r.reviewedBy)}<br>${fmtTimestamp(r.reviewedAt)}</small>` : ""}
                ${r.reviewNote ? `<br>${esc(r.reviewNote)}` : ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
