import { boot, db, esc, toast, APP, isBlockedEmail, fmtTimestamp } from "./common.js?v=20261005k";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

    onSnapshot(collection(db, "admins"), (snap) => {
      S.admins = snap.docs.map((d) => ({ email: d.id, ...d.data() })).sort((a, b) => a.email.localeCompare(b.email));
      renderAdmins();
    }, (e) => toast("未能讀取管理員名單：" + e.message, "error"));

    $("#add-admin").addEventListener("submit", addAdmin);
    $("#admin-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (btn) removeAdmin(btn.dataset.remove);
    });
  },
});

function renderAdmins() {
  $("#admin-list").innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>電郵</th><th>名稱</th><th>加入者</th><th>加入時間</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${S.admins.map((a) => `
            <tr>
              <td>${esc(a.email)}${a.email === S.me ? ' <span class="badge badge--go">你</span>' : ""}</td>
              <td>${esc(a.name || "")}</td>
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
      addedBy: S.me,
      addedAt: serverTimestamp(),
    });
    f.reset();
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
    toast(`已移除 ${email}。`, "success");
  } catch (err) {
    toast("未能移除：" + err.message, "error");
  }
}
