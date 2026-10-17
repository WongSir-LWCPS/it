import {
  boot, db, esc, toast, todayId, downloadCSV, enhanceDateInputs,
} from "../../assets/js/common.js?v=20261017b";
import {
  collection, doc, onSnapshot, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { emailEnabled } from "../../assets/js/email.js?v=20261017b";
import { syncNotifyList } from "../../assets/js/notify.js?v=20261017b";
import { REPAIR, RSTATUS } from "./repair-config.js?v=20261017b";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, list: [], q: "" };
const byNewest = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
const match = (r) => !S.q || [r.location, r.device, r.problem, r.teacherName, r.email, r.followUp]
  .some((v) => (v || "").toLowerCase().includes(S.q));

boot({
  root: "../../", current: "repair-admin",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) {
      $("#main").innerHTML = `
        <section class="notice">
          <h1>只限管理員使用</h1>
          <p>你的帳戶（${esc(user.email)}）未有管理員權限。如需權限，請聯絡IT組。</p>
          <a class="btn btn--primary" href="index.html">返回報告表</a>
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
    $("#search").addEventListener("input", (e) => { S.q = e.target.value.trim().toLowerCase(); render(); });
    $("#export").addEventListener("click", exportCSV);

    onSnapshot(collection(db, REPAIR.coll), (snap) => {
      S.list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }, (e) => toast("未能讀取資料：" + e.message, "error"));

    // 跟進表單（未完成及已完成兩個分頁共用）
    const onClick = (e) => {
      const btn = e.target.closest("[data-save]");
      if (btn) save(btn.closest("[data-id]"), btn);
    };
    const onChange = (e) => {
      if (!e.target.matches('input[name="done"]')) return;
      const card = e.target.closest("[data-id]");
      const d = card.querySelector('input[name="doneDate"]');
      card.querySelector(".repair-date").hidden = !e.target.checked;
      if (e.target.checked && !d.value) d.value = todayId();
    };
    ["#open-list", "#done-list"].forEach((id) => {
      $(id).addEventListener("click", onClick);
      $(id).addEventListener("change", onChange);
    });
  },
});

/** 簡短日期，令表格不會太闊，例如 16/10/2026 */
const shortDate = (id) => (id ? id.split("-").reverse().map((x) => String(+x)).join("/") : "");

/** 重新繪畫前保存未儲存的輸入，避免其他人更新資料時清走正在輸入的內容 */
function drafts(box) {
  const out = {};
  box.querySelectorAll("tr[data-id]").forEach((el) => {
    const f = (n) => el.querySelector(`[name="${n}"]`);
    if (!f("done") || el.dataset.saved) return;
    const r = S.list.find((x) => x.id === el.dataset.id);
    const d = { done: f("done").checked, doneDate: f("doneDate").value, followUp: f("followUp").value };
    // 只保留有改動的輸入
    if (r && (d.done !== (r.status === "done") || d.doneDate !== (r.doneDate || "") || d.followUp !== (r.followUp || ""))) out[el.dataset.id] = d;
  });
  return out;
}

function render() {
  const open = S.list.filter((r) => r.status !== "done");
  $("#open-count").textContent = open.length || "";
  renderTable($("#open-list"), open.filter(match).sort((a, b) => -byNewest(a, b)),
    open.length ? "沒有符合搜尋的報告。" : "沒有未完成維修的報告。老師提交的新報告會即時出現在這裏。");
  renderTable($("#done-list"), S.list.filter((r) => r.status === "done" && match(r))
    .sort((a, b) => (b.doneDate || "").localeCompare(a.doneDate || "") || byNewest(a, b)),
  "沒有已完成維修的報告。");
}

/** 一行代表一個報告；完成維修、日期及跟進情況可直接在表內修改 */
function renderTable(box, list, emptyText) {
  const keep = drafts(box);
  if (!list.length) { box.innerHTML = `<p class="empty">${emptyText}</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table repair-table">
        <thead><tr>
          <th>報告日期</th><th>地點</th><th>損壞的器材</th><th>損壞情況</th><th>報告老師</th>
          <th>已完成維修</th><th>完成維修日期</th><th>跟進情況</th><th><span class="sr-only">操作</span></th>
        </tr></thead>
        <tbody>
          ${list.map((r) => {
            const k = keep[r.id];
            const done = k ? k.done : r.status === "done";
            const doneDate = k ? k.doneDate : (r.doneDate || "");
            const followUp = k ? k.followUp : (r.followUp || "");
            return `
            <tr data-id="${r.id}">
              <td class="nowrap">${shortDate(r.date)}</td>
              <td data-no-translate>${esc(r.location)}</td>
              <td data-no-translate>${esc(r.device)}</td>
              <td class="pre repair-problem" data-no-translate>${esc(r.problem)}</td>
              <td class="nowrap" data-no-translate>${esc(r.teacherName)}</td>
              <td class="center"><input type="checkbox" name="done" aria-label="已完成維修" ${done ? "checked" : ""}></td>
              <td><div class="repair-date" ${done ? "" : "hidden"}><input type="date" name="doneDate" value="${esc(doneDate)}" max="${todayId()}" aria-label="完成維修日期"></div></td>
              <td><textarea name="followUp" rows="2" maxlength="1000" aria-label="跟進情況" placeholder="跟進情況">${esc(followUp)}</textarea></td>
              <td><button class="btn btn--primary btn--small" type="button" data-save>儲存</button></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
  enhanceDateInputs(box);
}

async function save(el, btn) {
  const r = S.list.find((x) => x.id === el.dataset.id);
  if (!r) return;
  const f = (n) => el.querySelector(`[name="${n}"]`);
  const done = f("done").checked;
  const doneDate = f("doneDate").value;
  const followUp = f("followUp").value.trim();
  if (done && !/^\d{4}-\d{2}-\d{2}$/.test(doneDate)) { toast("請填寫完成維修日期。", "error"); f("doneDate").focus(); return; }
  btn.disabled = true;
  el.dataset.saved = "1";   // 儲存後不再保留這張表單的輸入
  try {
    await updateDoc(doc(db, REPAIR.coll, r.id), {
      status: done ? "done" : "open",
      doneDate: done ? doneDate : "",
      followUp,
      followUpBy: S.user.email,
      followUpAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    toast(done ? "已儲存：已完成維修" : "已儲存跟進情況", "success");
  } catch (e) {
    btn.disabled = false;
    delete el.dataset.saved;
    toast("未能儲存：" + e.message, "error");
  }
}

function exportCSV() {
  const list = S.list.filter(match).sort(byNewest);
  downloadCSV(`器材損壞報告_${todayId()}.csv`, [
    ["報告日期", "地點", "損壞的器材", "損壞情況", "報告老師", "電郵", "狀態", "完成維修日期", "跟進情況"],
    ...list.map((r) => [r.date, r.location, r.device, r.problem, r.teacherName, r.email,
      RSTATUS[r.status]?.label || r.status, r.doneDate || "", r.followUp || ""]),
  ]);
}
