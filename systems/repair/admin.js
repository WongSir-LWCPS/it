import {
  boot, db, esc, toast, fmtDate, fmtTimestamp, todayId, downloadCSV, enhanceDateInputs,
} from "../../assets/js/common.js?v=20261016a";
import {
  collection, doc, onSnapshot, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { emailEnabled } from "../../assets/js/email.js?v=20261016a";
import { syncNotifyList } from "../../assets/js/notify.js?v=20261016a";
import { REPAIR, RSTATUS } from "./repair-config.js?v=20261016a";

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
      d.closest(".field").hidden = !e.target.checked;
      if (e.target.checked && !d.value) d.value = todayId();
    };
    ["#open-list", "#done-list"].forEach((id) => {
      $(id).addEventListener("click", onClick);
      $(id).addEventListener("change", onChange);
    });
  },
});

/** 跟進表單 */
function editor(r, draft) {
  const done = draft ? draft.done : r.status === "done";
  const doneDate = draft ? draft.doneDate : (r.doneDate || "");
  const followUp = draft ? draft.followUp : (r.followUp || "");
  return `
    <div class="repair-edit">
      <label class="check"><input type="checkbox" name="done" ${done ? "checked" : ""}> 已完成維修</label>
      <label class="field field--date" ${done ? "" : "hidden"}><span>完成維修日期</span>
        <input type="date" name="doneDate" value="${esc(doneDate)}" max="${todayId()}">
      </label>
      <label class="field"><span>跟進情況（老師可在「我的報告」看到）</span>
        <textarea name="followUp" rows="2" maxlength="1000" placeholder="例如：已更換投影機燈泡；已聯絡供應商，等待維修">${esc(followUp)}</textarea>
      </label>
      <div class="actions">
        <button class="btn btn--primary btn--small" type="button" data-save>儲存</button>
      </div>
    </div>`;
}

/** 重新繪畫前保存未儲存的輸入，避免其他人更新資料時清走正在輸入的內容 */
function drafts(box) {
  const out = {};
  box.querySelectorAll("[data-id]").forEach((el) => {
    const f = (n) => el.querySelector(`[name="${n}"]`);
    if (!f("done") || el.dataset.saved) return;
    out[el.dataset.id] = { done: f("done").checked, doneDate: f("doneDate").value, followUp: f("followUp").value };
  });
  return out;
}

function render() {
  renderOpen();
  renderDone();
}

function info(r) {
  return `
    <dl class="kv kv--wide">
      <dt>報告老師</dt><dd data-no-translate>${esc(r.teacherName)}<br><small>${esc(r.email)}</small></dd>
      <dt>報告日期</dt><dd>${fmtDate(r.date)}</dd>
      <dt>地點</dt><dd data-no-translate>${esc(r.location)}</dd>
      <dt>損壞的器材</dt><dd data-no-translate>${esc(r.device)}</dd>
      <dt>損壞情況</dt><dd class="pre" data-no-translate>${esc(r.problem)}</dd>
      ${r.followUpBy ? `<dt>最後更新</dt><dd><small>${esc(r.followUpBy)}<br>${fmtTimestamp(r.followUpAt)}</small></dd>` : ""}
    </dl>`;
}

function renderOpen() {
  const box = $("#open-list");
  const keep = drafts(box);
  const all = S.list.filter((r) => r.status !== "done");
  $("#open-count").textContent = all.length || "";
  const list = all.filter(match).sort((a, b) => -byNewest(a, b));
  if (!list.length) {
    box.innerHTML = `<p class="empty">${all.length ? "沒有符合搜尋的報告。" : "沒有未完成維修的報告。老師提交的新報告會即時出現在這裏。"}</p>`;
    return;
  }
  box.innerHTML = list.map((r) => `
    <article class="review" data-id="${r.id}">
      <header class="review-head">
        <strong data-no-translate>${esc(r.location)}：${esc(r.device)}</strong>
        <span class="badge badge--wait">跟進中</span>
      </header>
      ${info(r)}
      ${editor(r, keep[r.id])}
    </article>`).join("");
  enhanceDateInputs(box);
}

function renderDone() {
  const box = $("#done-list");
  const keep = drafts(box);
  const list = S.list.filter((r) => r.status === "done" && match(r))
    .sort((a, b) => (b.doneDate || "").localeCompare(a.doneDate || "") || byNewest(a, b));
  if (!list.length) { box.innerHTML = `<p class="empty">沒有已完成維修的報告。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>報告日期</th><th>地點</th><th>損壞的器材</th><th>損壞情況</th><th>報告老師</th><th>完成維修日期</th><th>跟進情況</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr data-id="${r.id}">
              <td class="nowrap">${fmtDate(r.date)}</td>
              <td data-no-translate>${esc(r.location)}</td>
              <td data-no-translate>${esc(r.device)}</td>
              <td class="pre" data-no-translate>${esc(r.problem)}</td>
              <td data-no-translate>${esc(r.teacherName)}</td>
              <td class="nowrap">${fmtDate(r.doneDate)}</td>
              <td class="pre" data-no-translate>${esc(r.followUp || "")}</td>
              <td>${keep[r.id] ? editor(r, keep[r.id]) : `<button class="btn btn--small" type="button" data-edit>修改</button>`}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
  box.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
    const tr = b.closest("[data-id]");
    const r = S.list.find((x) => x.id === tr.dataset.id);
    b.parentElement.innerHTML = editor(r);
    enhanceDateInputs(tr);
  }));
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
