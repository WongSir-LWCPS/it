import {
  boot, db, esc, toast, fmtTimestamp, todayId,
} from "../../assets/js/common.js?v=20261006n";
import {
  collection, doc, onSnapshot, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { emailEnabled } from "../../assets/js/email.js?v=20261006n";
import { notifyAdmins, syncNotifyList } from "../../assets/js/notify.js?v=20261006n";
import { ISTATUS, deviceWithPlace, findClashes, isActive, deviceName } from "./infostation-config.js?v=20261006n";
import { buildInfoEmail, slotText } from "./infostation-email.js?v=20261006n";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, list: [], filter: "active", upcoming: true };
const byFirst = (a, b) => (a.firstDate || "").localeCompare(b.firstDate || "");
const who = (r) => {
  const e = r.applicantEmail || r.email;
  return `${esc(r.applicantName)}<br><small>${esc(e)}${e !== r.email ? `<br>由 ${esc(r.email)} 提交` : ""}</small>`;
};

boot({
  root: "../../", current: "infostation-admin",
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
    $("#all-upcoming").addEventListener("change", (e) => { S.upcoming = e.target.checked; renderAll(); });

    onSnapshot(collection(db, "infostation_bookings"), (snap) => {
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
    $("#all-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (!btn) return;
      const r = S.list.find((x) => x.id === btn.dataset.cancel);
      const note = prompt(`取消「${r.activity}」的預約？\n請輸入原因：`);
      if (note === null) return;
      decide(r.id, "cancelled", note.trim(), [btn]);
    });
  },
});

function renderPending() {
  const box = $("#pending-list");
  const drafts = {};
  box.querySelectorAll("[data-id]").forEach((el) => { drafts[el.dataset.id] = el.querySelector("textarea").value; });
  const list = S.list.filter((r) => r.status === "pending").sort(byFirst);
  $("#pending-count").textContent = list.length || "";
  if (!list.length) {
    box.innerHTML = `<p class="empty">沒有待審批的申請。老師提交的新申請會即時出現在這裏。</p>`;
    return;
  }
  box.innerHTML = list.map((r) => {
    const clashes = findClashes(S.list.filter((x) => x.status === "approved"), r.devices || [], r.slots || [], r.id);
    return `
    <article class="review" data-id="${r.id}">
      <header class="review-head"><strong data-no-translate>${esc(r.activity)}</strong></header>
      ${clashes.length ? `<p class="warn">與已批准的「${esc(clashes[0].booking.activity)}」（${clashes[0].devices.map(deviceName).join("、")}，${slotText(clashes[0].slot)}）時間重疊。</p>` : ""}
      <dl class="kv">
        <dt>申請人</dt><dd>${who(r)}</dd>
        <dt>器材</dt><dd>${esc(deviceWithPlace(r))}</dd>
        <dt>日期及時間</dt><dd>${(r.slots || []).map(slotText).join("<br>")}</dd>
        <dt>顯示資料</dt><dd class="pre" data-no-translate>${esc(r.content)}</dd>
        <dt>提交時間</dt><dd>${fmtTimestamp(r.createdAt)}</dd>
      </dl>
      <label class="field"><span>給老師的回覆（選填，老師可在「我的申請」看到）</span>
        <textarea rows="2" maxlength="300">${esc(drafts[r.id] || "")}</textarea>
      </label>
      <div class="actions">
        <button class="btn btn--stop" data-act="reject">不批准</button>
        <button class="btn btn--go" data-act="approve">批准</button>
      </div>
    </article>`;
  }).join("");
}

function renderAll() {
  const today = todayId();
  const list = S.list
    .filter((r) => S.filter === "all" || (S.filter === "active" ? isActive(r) : r.status === S.filter))
    .filter((r) => !S.upcoming || (r.lastDate || "") >= today)
    .sort(byFirst);
  const box = $("#all-list");
  if (!list.length) { box.innerHTML = `<p class="empty">沒有符合條件的申請。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>活動名稱</th><th>申請人</th><th>器材</th><th>日期及時間</th><th>顯示資料</th><th>狀態</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td data-no-translate>${esc(r.activity)}</td>
              <td>${who(r)}</td>
              <td>${esc(deviceWithPlace(r))}</td>
              <td class="nowrap">${(r.slots || []).map(slotText).join("<br>")}</td>
              <td class="pre" data-no-translate>${esc(r.content)}</td>
              <td><span class="badge badge--${ISTATUS[r.status]?.tone}">${ISTATUS[r.status]?.label || r.status}</span>
                ${r.reviewNote ? `<br><small>${esc(r.reviewNote)}</small>` : ""}</td>
              <td>${r.status === "approved" ? `<button class="btn btn--small btn--danger-text" data-cancel="${r.id}">取消預約</button>` : ""}</td>
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
    await updateDoc(doc(db, "infostation_bookings", id), {
      status, reviewNote: note, reviewedBy: S.user.email, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  } catch (e) {
    btns.forEach((b) => { b.disabled = false; });
    toast("未能更新：" + e.message, "error");
    return;
  }
  const done = { approved: "已批准", rejected: "已設為不批准", cancelled: "已取消預約" }[status];
  const result = await notifyAdmins("infostation", buildInfoEmail(r, status, note, S.user.email));
  toast(`${done}（${result}）`, "success");
}
