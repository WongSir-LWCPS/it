import {
  boot, db, esc, toast, isStaffEmail, fmtDate, fmtTimestamp, todayId, enhanceDateInputs,
} from "../../assets/js/common.js?v=20261008n";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, query, where, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { notifyAdmins } from "../../assets/js/notify.js?v=20261008n";
import { COPILOT, CSTATUS, loanDays, purposeText } from "./copilot-config.js?v=20261008n";
import { buildCopilotEmail } from "./copilot-email.js?v=20261008n";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, mine: [] };
const loginName = () => (S.user.displayName || S.user.email.split("@")[0]).trim();

boot({
  root: "../../", current: "copilot",
  onReady: ({ user, isAdmin }) => {
    S.user = user;
    $("#admin-link").hidden = !isAdmin;
    $("#intro").textContent = COPILOT.intro;
    $("#notice").textContent = COPILOT.notice;
    setupForm();

    onSnapshot(query(collection(db, "copilot_requests"), where("uid", "==", user.uid)), (snap) => {
      S.mine = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderMine();
    }, (e) => { $("#mine").innerHTML = `<p class="load-error">未能讀取你的申請：${esc(e.message)}</p>`; });
    $("#mine").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (btn) cancelMine(btn.dataset.cancel);
    });
  },
});

/** 檢查日期；沒有問題時回傳空字串 */
function checkDates(start, end) {
  if (!start || !end) return "請填寫開始及結束借用日期。";
  if (start < todayId()) return "開始借用日期不能早於今天。";
  if (end < start) return "結束日期不能早於開始日期。";
  if (loanDays(start, end) > COPILOT.maxDays) return `每次最多借用 ${COPILOT.maxDays} 天，請於到期後再次填表續借。`;
  return "";
}

function setupForm() {
  const f = $("#req-form");
  $("#login-name").textContent = `使用登入名稱：${loginName()}`;
  f.group.innerHTML = `<option value="">請選擇</option>` + COPILOT.groups.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
  $("#purpose-choices").innerHTML = COPILOT.purposes.map((p) => `
    <label class="choice"><input type="checkbox" name="purpose" value="${esc(p)}"><span>${esc(p)}</span></label>`).join("");
  enhanceDateInputs(f);

  const resetDates = () => {
    f.startDate.min = todayId();
    f.startDate.value = todayId();
    f.endDate.value = "";
  };
  resetDates();

  const showDays = () => {
    const { value: s } = f.startDate;
    const { value: e } = f.endDate;
    f.endDate.min = s || todayId();
    const msg = s && e ? checkDates(s, e) : "";
    const info = $("#days-info");
    info.textContent = msg || (s && e ? `借用日數：${loanDays(s, e)} 天` : `每次最多可借用 ${COPILOT.maxDays} 天。`);
    info.classList.toggle("hint--error", Boolean(msg));
  };
  f.startDate.addEventListener("change", showDays);
  f.endDate.addEventListener("change", showDays);
  showDays();

  f.querySelectorAll('input[name="nameMode"]').forEach((r) => r.addEventListener("change", () => {
    $("#other-wrap").hidden = f.nameMode.value !== "other";
    if (f.nameMode.value === "other") f.otherName.focus();
  }));
  f.group.addEventListener("change", () => {
    $("#other-group-wrap").hidden = f.group.value !== "其他";
    if (f.group.value === "其他") f.otherGroup.focus();
  });
  $("#purpose-choices").addEventListener("change", () => {
    const other = f.querySelector('input[name="purpose"][value="其他"]').checked;
    $("#other-purpose-wrap").hidden = !other;
  });

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const warn = (msg) => { const w = $("#req-warn"); w.hidden = !msg; w.textContent = msg; };
    const isOther = f.nameMode.value === "other";
    const applicantName = (isOther ? f.otherName.value : loginName()).trim().slice(0, 40);
    const applicantEmail = (isOther ? f.otherEmail.value : S.user.email).trim().toLowerCase();
    const purposes = [...f.querySelectorAll('input[name="purpose"]:checked')].map((x) => x.value);
    const otherPurpose = purposes.includes("其他") ? f.otherPurpose.value.trim() : "";
    if (!applicantName) return warn("請輸入姓名或代號。");
    if (isOther && !isStaffEmail(applicantEmail)) return warn("請輸入申請人的學校電郵（@lwcps.edu.hk）。");
    const group = (f.group.value === "其他" ? f.otherGroup.value : f.group.value).trim().slice(0, 40);
    if (!f.group.value) return warn("請選擇所屬組別/科組。");
    if (!group) return warn("請輸入所屬組別/科組。");
    const dateMsg = checkDates(f.startDate.value, f.endDate.value);
    if (dateMsg) return warn(dateMsg);
    if (!purposes.length) return warn("請選擇最少一項用途。");
    if (purposes.includes("其他") && !otherPurpose) return warn("請說明「其他」用途。");
    warn("");

    const btn = $("#req-submit");
    btn.disabled = true;
    btn.textContent = "提交中…";
    const data = {
      applicantName,
      group,
      startDate: f.startDate.value,
      endDate: f.endDate.value,
      days: loanDays(f.startDate.value, f.endDate.value),
      purposes,
      otherPurpose,
      applicantEmail,
      email: S.user.email,
      uid: S.user.uid,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, "copilot_requests"), data);
    } catch (err) {
      console.error(err);
      warn("未能提交：" + err.message);
      btn.disabled = false;
      btn.textContent = "提交申請";
      return;
    }

    const result = await notifyAdmins("copilot", buildCopilotEmail({ ...data, createdAt: null }, "new"));
    console.info("通知管理員：", result);
    toast("已提交申請，IT組審批後可在下方「我的申請」查看結果。", "success");
    f.reset();
    $("#other-wrap").hidden = true;
    $("#other-purpose-wrap").hidden = true;
    $("#other-group-wrap").hidden = true;
    resetDates();
    showDays();
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
        <thead><tr><th>借用期間</th><th>用途</th><th>提交時間</th><th>狀態</th><th>IT組備註</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td class="nowrap">${fmtDate(r.startDate)}<br>至 ${fmtDate(r.endDate)}<br><small>${r.days} 天</small></td>
              <td>${esc(purposeText(r))}</td>
              <td class="nowrap">${fmtTimestamp(r.createdAt)}</td>
              <td><span class="badge badge--${CSTATUS[r.status]?.tone}">${CSTATUS[r.status]?.label || r.status}</span></td>
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
    await updateDoc(doc(db, "copilot_requests", id), { status: "cancelled", updatedAt: serverTimestamp() });
    toast("已取消申請。", "success");
  } catch (e) {
    toast("未能取消：" + e.message, "error");
  }
}
