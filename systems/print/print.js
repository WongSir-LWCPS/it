import {
  boot, db, esc, toast, isStaffEmail, fmtDate, fmtTimestamp, todayId,
} from "../../assets/js/common.js?v=20261008c";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, query, where, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { notifyAdmins } from "../../assets/js/notify.js?v=20261008c";
import { PRINT, PSTATUS } from "./print-config.js?v=20261008c";
import { buildPrintEmail } from "./print-email.js?v=20261008c";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, mine: [] };

boot({
  root: "../../", current: "print",
  onReady: ({ user, isAdmin }) => {
    S.user = user;
    $("#admin-link").hidden = !isAdmin;
    $("#intro").textContent = PRINT.intro;
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
    const isOther = f.nameMode.value === "other";
    const applicantName = (isOther ? f.otherName.value : loginName()).trim().slice(0, 40);
    const applicantEmail = (isOther ? f.otherEmail.value : S.user.email).trim().toLowerCase();
    if (!applicantName) return warn("請輸入申請人名稱。");
    if (isOther && !isStaffEmail(applicantEmail)) return warn("請輸入申請人的學校電郵（@lwcps.edu.hk）。");
    warn("");

    const btn = $("#req-submit");
    btn.disabled = true;
    btn.textContent = "提交中…";
    const data = {
      applicantName,
      date: todayId(),
      remarks: f.remarks.value.trim(),
      applicantEmail,
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

    // 通知管理員（失敗不影響申請）
    const result = await notifyAdmins("print", buildPrintEmail({ ...data, createdAt: null }, "new"));
    console.info("通知管理員：", result);
    toast("已提交申請，IT組會盡快處理。可在下方「我的申請」查看進度。", "success");
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
