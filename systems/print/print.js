import {
  boot, db, esc, toast, fmtDate, fmtTimestamp, todayId,
} from "../../assets/js/common.js?v=20261005q";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, query, where, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { sendEmail } from "../../assets/js/email.js?v=20261005q";
import { getNotifyEmails } from "../../assets/js/notify.js?v=20261005q";
import { PRINT, PSTATUS } from "./print-config.js?v=20261005q";
import { buildPrintEmail } from "./print-email.js?v=20261005q";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, mine: [] };

boot({
  root: "../../", current: "print",
  onReady: ({ user, isAdmin }) => {
    S.user = user;
    $("#admin-link").hidden = !isAdmin;
    $("#intro").textContent = PRINT.intro;
    $("#req-email").textContent = user.email;
    setupForm();

    onSnapshot(query(collection(db, "print_requests"), where("uid", "==", user.uid)), (snap) => {
      S.mine = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderMine();
    }, (e) => {
      console.error(e);
      $("#mine").innerHTML = `<p class="load-error">未能讀取你的申請：${esc(e.message)}</p>`;
    });
    $("#mine").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (btn) cancelMine(btn.dataset.cancel);
    });
  },
});

const loginName = () => (S.user.displayName || S.user.email.split("@")[0]).trim();

function setupForm() {
  const f = $("#req-form");
  $("#login-name").textContent = `使用登入名稱：${loginName()}`;
  const sync = () => {
    const other = f.nameMode.value === "other";
    $("#other-wrap").hidden = !other;
    if (other) f.otherName.focus();
  };
  f.querySelectorAll('input[name="nameMode"]').forEach((r) => r.addEventListener("change", sync));

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const warn = (msg) => { const w = $("#req-warn"); w.hidden = !msg; w.textContent = msg; };
    const applicantName = (f.nameMode.value === "other" ? f.otherName.value : loginName()).trim().slice(0, 40);
    if (!applicantName) return warn("請輸入申請人名稱。");
    warn("");

    const btn = $("#req-submit");
    btn.disabled = true;
    btn.textContent = "提交中…";
    const data = {
      applicantName,
      date: todayId(),
      remarks: f.remarks.value.trim(),
      email: S.user.email,
      uid: S.user.uid,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, "print_requests"), data);
    } catch (err) {
      console.error(err);
      warn("未能提交：" + err.message);
      btn.disabled = false;
      btn.textContent = "提交申請";
      return;
    }

    // 通知申請人及管理員（失敗不影響申請）
    let mailNote = "";
    try {
      const admins = await getNotifyEmails();
      const r = { ...data, createdAt: null };
      const a = await sendEmail({ to: S.user.email, ...buildPrintEmail(r, "received") });
      if (admins.length) await sendEmail({ to: admins, ...buildPrintEmail(r, "new") });
      if (!a) mailNote = "（未設定電郵通知）";
    } catch (err) {
      console.error(err);
      mailNote = "（通知電郵未能寄出，IT組仍會在平台看到你的申請）";
    }
    toast(`已提交申請。${mailNote || "確認電郵已寄出。"}`, "success");
    f.reset();
    $("#other-wrap").hidden = true;
    btn.disabled = false;
    btn.textContent = "提交申請";
  });
}

function renderMine() {
  const list = [...S.mine].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const box = $("#mine");
  if (!list.length) { box.innerHTML = `<p class="empty">你還未提交任何申請。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>申請日期</th><th>申請人</th><th>提交時間</th><th>狀態</th><th>IT組備註</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td class="nowrap">${fmtDate(r.date)}</td>
              <td>${esc(r.applicantName)}</td>
              <td class="nowrap">${fmtTimestamp(r.createdAt)}</td>
              <td><span class="badge badge--${PSTATUS[r.status]?.tone}">${PSTATUS[r.status]?.label || r.status}</span></td>
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
    await updateDoc(doc(db, "print_requests", id), { status: "cancelled", updatedAt: serverTimestamp() });
    toast("已取消申請。", "success");
  } catch (e) {
    toast("未能取消：" + e.message, "error");
  }
}
