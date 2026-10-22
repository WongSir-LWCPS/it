import { boot, db, esc, toast, downloadCSV, todayId } from "../../assets/js/common.js?v=20261022a";
import {
  collection, doc, onSnapshot, getDoc, setDoc, writeBatch, deleteDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { newKeyMeta, unlock, encryptJSON, decryptJSON } from "./itdesk-crypto.js?v=20261022a";
import { setupImport } from "./itdesk-import.js?v=20261022a";

const $ = (sel) => document.querySelector(sel);
const META_REF = () => doc(db, "itdesk_meta", "key");
const TABS = () => collection(db, "itdesk_tabs");
const IDLE_MS = 30 * 60 * 1000;   // 閒置 30 分鐘自動鎖上
const S = {
  user: null, meta: null, key: null, raw: [], tabs: [], active: null,
  q: {}, reveal: {}, editingNote: null, lastActive: Date.now(), unsubTabs: null,
};
const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const collator = new Intl.Collator("zh-Hant", { numeric: true, sensitivity: "base" });

/* ---------- 啟動 ---------- */
boot({
  root: "../../", current: "itdesk",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) return;   // 非管理員已由 boot() 擋住
    S.user = user;
    onSnapshot(META_REF(), (snap) => {
      if (S.changing) return;   // 正在更改主密碼
      const meta = snap.exists() ? snap.data() : null;
      const changed = S.meta && meta && S.meta.salt !== meta.salt;
      S.meta = meta;
      if (!meta) { showOnly("setup"); return; }
      if (changed && S.key) { lock("主密碼已被其他同事更改，請以新的主密碼解鎖。"); return; }
      if (!S.key) showOnly("unlock");
    }, (e) => { $("#unlock").hidden = false; $("#unlock-warn").hidden = false; $("#unlock-warn").textContent = "未能讀取資料：" + e.message; });
    setupForms();
    setupDesk();
    setupImport({ getKey: () => S.key, addTab: (data) => createTab(data) });
    ["click", "keydown", "pointermove", "scroll"].forEach((ev) => document.addEventListener(ev, () => { S.lastActive = Date.now(); }, { passive: true }));
    setInterval(() => { if (S.key && Date.now() - S.lastActive > IDLE_MS) lock("閒置超過 30 分鐘，已自動鎖上。"); }, 30000);
  },
});

function showOnly(which) {
  ["setup", "unlock", "desk"].forEach((id) => { $(`#${id}`).hidden = id !== which; });
  $("#lock-btn").hidden = which !== "desk";
  if (which === "unlock") setTimeout(() => $("#unlock-form").pw.focus(), 50);
  if (which === "setup") setTimeout(() => $("#setup-form").p1.focus(), 50);
}

function lock(msg = "") {
  S.key = null;
  S.tabs = [];
  S.raw = [];
  S.unsubTabs?.();
  S.unsubTabs = null;
  S.reveal = {};
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  $("#desk-body").innerHTML = "";
  $("#desk-tabs").innerHTML = "";
  $("#g-search").value = "";
  $("#g-results").hidden = true;
  showOnly(S.meta ? "unlock" : "setup");
  const w = $("#unlock-warn");
  w.hidden = !msg;
  w.textContent = msg;
}

/* ---------- 主密碼 ---------- */
function setupForms() {
  $("#setup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const warn = (m) => { $("#setup-warn").hidden = !m; $("#setup-warn").textContent = m; };
    if (f.p1.value.length < 10) return warn("主密碼最少要有 10 個字元。");
    if (f.p1.value !== f.p2.value) return warn("兩次輸入的主密碼不相同。");
    if ((await getDoc(META_REF())).exists()) return warn("其他同事已設定主密碼，請重新整理頁面後解鎖。");
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const { key, meta } = await newKeyMeta(f.p1.value);
      await setDoc(META_REF(), { ...meta, createdBy: S.user.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      f.reset();
      S.meta = meta;
      openDesk(key);
      toast("已設定主密碼。", "success");
    } catch (err) {
      warn("未能設定：" + err.message);
    }
    btn.disabled = false;
  });

  $("#unlock-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector("button[type=submit]");
    const warn = (m) => { $("#unlock-warn").hidden = !m; $("#unlock-warn").textContent = m; };
    if (!S.meta) return;
    btn.disabled = true;
    btn.textContent = "解鎖中…";
    const key = await unlock(f.pw.value, S.meta);
    btn.disabled = false;
    btn.textContent = "解鎖";
    if (!key) { warn("主密碼不正確。"); f.pw.select(); return; }
    f.reset();
    warn("");
    openDesk(key);
  });

  $("#lock-btn").addEventListener("click", () => lock());

  $("#pw-change").addEventListener("click", () => { $("#pw-form").reset(); $("#pw-warn").hidden = true; $("#pw-dialog").showModal(); });
  $("#pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const warn = (m) => { $("#pw-warn").hidden = !m; $("#pw-warn").textContent = m; };
    if (!(await unlock(f.old.value, S.meta))) return warn("目前的主密碼不正確。");
    if (f.p1.value.length < 10) return warn("新主密碼最少要有 10 個字元。");
    if (f.p1.value !== f.p2.value) return warn("兩次輸入的新主密碼不相同。");
    if (!confirm("以新主密碼重新加密所有分頁？更改後請通知其他IT組同事。")) return;
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    S.changing = true;
    try {
      const { key, meta } = await newKeyMeta(f.p1.value);
      const b = writeBatch(db);
      for (const t of S.tabs) {
        b.set(doc(TABS(), t.id), { order: t.order, box: await encryptJSON(key, t.data), updatedAt: serverTimestamp(), updatedBy: S.user.email });
      }
      // 先更新 S.meta，避免收到自己的改動時被當作其他人更改而鎖上
      S.meta = { ...S.meta, ...meta };
      S.key = key;
      b.set(META_REF(), { ...meta, updatedAt: serverTimestamp(), updatedBy: S.user.email });
      await b.commit();
      $("#pw-dialog").close();
      toast("已更改主密碼，請通知其他IT組同事。", "success");
    } catch (err) {
      warn("未能更改：" + err.message);
    }
    S.changing = false;
    btn.disabled = false;
  });

  document.querySelectorAll("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) d.close(); }));
}

/* ---------- 讀取及解密分頁 ---------- */
function openDesk(key) {
  S.key = key;
  S.lastActive = Date.now();
  showOnly("desk");
  $("#desk-body").innerHTML = `<p class="empty">正在解密…</p>`;
  S.unsubTabs?.();
  S.unsubTabs = onSnapshot(TABS(), async (snap) => {
    const k = S.key;
    if (!k || S.changing) return;
    const list = [];
    let failed = 0;
    for (const d of snap.docs) {
      const x = d.data();
      try {
        list.push({ id: d.id, order: x.order ?? 0, updatedAt: x.updatedAt, updatedBy: x.updatedBy, data: await decryptJSON(k, x.box) });
      } catch {
        failed++;
      }
    }
    if (S.key !== k) return;
    if (failed && !list.length && snap.docs.length) { lock("未能解密資料，主密碼可能已被更改，請重新解鎖。"); return; }
    S.tabs = list.sort((a, b) => a.order - b.order || collator.compare(a.data.title, b.data.title));
    if (!S.tabs.some((t) => t.id === S.active)) S.active = S.tabs[0]?.id || null;
    renderTabs();
    if (!document.querySelector("#desk-body textarea:focus")) renderBody();
    runGlobalSearch();
    if (failed) toast(`${failed} 個分頁未能解密。`, "error");
  }, (e) => { $("#desk-body").innerHTML = `<p class="load-error">未能讀取資料：${esc(e.message)}</p>`; });
}

async function saveTab(t) {
  const box = await encryptJSON(S.key, t.data);
  await setDoc(doc(TABS(), t.id), { order: t.order, box, updatedAt: serverTimestamp(), updatedBy: S.user.email });
}
async function createTab(data) {
  const order = (S.tabs.reduce((m, t) => Math.max(m, t.order), 0) || 0) + 1;
  const t = { id: uid("t"), order, data };
  await saveTab(t);
  S.active = t.id;
  return t;
}
const activeTab = () => S.tabs.find((t) => t.id === S.active);

/* ---------- 分頁列及內容 ---------- */
function setupDesk() {
  $("#desk-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab-id]");
    if (!b) return;
    S.active = b.dataset.tabId;
    S.editingNote = null;
    renderTabs();
    renderBody();
  });
  $("#tab-add").addEventListener("click", () => openTabDialog(null));
  $("#g-search").addEventListener("input", runGlobalSearch);
  $("#g-results").addEventListener("click", (e) => {
    const r = e.target.closest("[data-go]");
    if (!r) return;
    S.active = r.dataset.go;
    S.q[S.active] = $("#g-search").value.trim();
    $("#g-search").value = "";
    runGlobalSearch();
    renderTabs();
    renderBody();
  });
  $("#desk-body").addEventListener("click", onBodyClick);
  $("#desk-body").addEventListener("input", (e) => {
    if (e.target.matches("[data-tab-search]")) { S.q[S.active] = e.target.value; renderRows(); }
  });
  setupTabDialog();
  setupRowDialog();
}

function renderTabs() {
  $("#desk-tabs").innerHTML = S.tabs.map((t) => `
    <button role="tab" class="tab" data-tab-id="${t.id}" aria-selected="${t.id === S.active}">
      <span aria-hidden="true">${t.data.kind === "note" ? "📝" : "▦"}</span> <span data-no-translate>${esc(t.data.title)}</span>
    </button>`).join("");
}

function renderBody() {
  const t = activeTab();
  const box = $("#desk-body");
  if (!t) {
    box.innerHTML = `<div class="empty-state"><p class="empty">還未有分頁。按「＋ 新增分頁」建立表格或筆記，或按「匯入 Excel」由現有的工作表匯入。</p></div>`;
    return;
  }
  const by = t.updatedBy ? `<small class="hint">最後更新：${esc(t.updatedBy.split("@")[0])}${t.updatedAt?.toDate ? ` ${fmtStamp(t.updatedAt.toDate())}` : ""}</small>` : "";
  if (t.data.kind === "note") {
    const editing = S.editingNote === t.id;
    box.innerHTML = `
      <div class="desk-bar">
        <div class="desk-bar-left">${by}</div>
        <div class="desk-bar-right">
          ${editing ? `<button class="btn btn--small btn--primary" type="button" data-act="note-save">儲存</button>
            <button class="btn btn--small" type="button" data-act="note-cancel">取消</button>`
            : `<button class="btn btn--small btn--primary" type="button" data-act="note-edit">編輯</button>`}
          <button class="btn btn--small" type="button" data-act="tab-settings">分頁設定</button>
        </div>
      </div>
      ${editing ? `<textarea class="note-edit" id="note-text" data-no-translate>${esc(t.data.note || "")}</textarea>`
        : `<div class="note-view" data-no-translate>${t.data.note ? linkify(t.data.note) : `<p class="empty">還未有內容，按「編輯」開始輸入。</p>`}</div>`}`;
    if (editing) $("#note-text").focus();
    return;
  }
  box.innerHTML = `
    <div class="desk-bar">
      <div class="desk-bar-left">
        <label class="field field--compact"><span>在此分頁搜尋</span>
          <input type="search" data-tab-search value="${esc(S.q[t.id] || "")}" autocomplete="off"></label>
        <label class="check"><input type="checkbox" data-act="reveal" ${S.reveal[t.id] ? "checked" : ""}> 顯示密碼</label>
        ${by}
      </div>
      <div class="desk-bar-right">
        <button class="btn btn--small btn--primary" type="button" data-act="row-add">＋ 新增一行</button>
        <button class="btn btn--small" type="button" data-act="tab-settings">分頁設定及欄位</button>
        <button class="btn btn--small" type="button" data-act="csv">匯出 CSV</button>
      </div>
    </div>
    <div id="rows"></div>`;
  renderRows();
}

function renderRows() {
  const t = activeTab();
  const box = $("#rows");
  if (!t || !box) return;
  const cols = t.data.columns || [];
  const q = (S.q[t.id] || "").trim().toLowerCase();
  const rows = (t.data.rows || []).filter((r) => !q || cols.some((c) => !c.secret && String(r.c?.[c.id] ?? "").toLowerCase().includes(q)));
  if (!cols.length) { box.innerHTML = `<p class="empty">這個分頁還未有欄位，請按「分頁設定及欄位」加入。</p>`; return; }
  const reveal = S.reveal[t.id];
  box.innerHTML = `
    <p class="hint">${q ? `找到 ${rows.length} 行（共 ${(t.data.rows || []).length} 行）` : `共 ${rows.length} 行`}。按一行可編輯。</p>
    <div class="table-scroll">
      <table class="table table--click desk-table" data-no-translate>
        <thead><tr>${cols.map((c) => `<th>${esc(c.name)}${c.secret ? ' <span title="密碼欄" aria-hidden="true">🔑</span>' : ""}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.length ? rows.map((r) => `
            <tr data-row="${r.id}" tabindex="0">
              ${cols.map((c) => {
                const v = String(r.c?.[c.id] ?? "");
                if (c.secret && v) {
                  return `<td class="secret-cell"><span class="secret-val ${reveal ? "" : "is-masked"}" data-secret>${reveal ? esc(v) : "••••••"}</span>
                    <button class="icon-mini" type="button" data-act="peek" data-col="${c.id}" title="顯示">👁</button>
                    <button class="icon-mini" type="button" data-act="copy" data-col="${c.id}" title="複製">📋</button></td>`;
                }
                return `<td class="pre">${linkify(v)}</td>`;
              }).join("")}
            </tr>`).join("") : `<tr><td colspan="${cols.length}" class="empty">沒有符合條件的資料。</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

async function onBodyClick(e) {
  const t = activeTab();
  if (!t) return;
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "tab-settings") { openTabDialog(t); return; }
  if (act === "note-edit") { S.editingNote = t.id; renderBody(); return; }
  if (act === "note-cancel") { S.editingNote = null; renderBody(); return; }
  if (act === "note-save") {
    const text = $("#note-text").value;
    t.data = { ...t.data, note: text };
    try { await saveTab(t); S.editingNote = null; renderBody(); toast("已儲存。", "success"); }
    catch (err) { toast("未能儲存：" + err.message, "error"); }
    return;
  }
  if (act === "reveal") { S.reveal[t.id] = e.target.checked; renderRows(); return; }
  if (act === "csv") { exportCSV(t); return; }
  if (act === "row-add") { openRowDialog(t, null); return; }
  const tr = e.target.closest("tr[data-row]");
  if (!tr) return;
  const row = t.data.rows.find((r) => r.id === tr.dataset.row);
  if (act === "peek") {
    const span = e.target.closest("td").querySelector("[data-secret]");
    const masked = span.classList.toggle("is-masked");
    span.textContent = masked ? "••••••" : String(row.c?.[e.target.closest("[data-col]").dataset.col] ?? "");
    return;
  }
  if (act === "copy") {
    const v = String(row.c?.[e.target.dataset.col] ?? "");
    try { await navigator.clipboard.writeText(v); toast("已複製。", "success"); } catch { toast("未能複製，請按「顯示」後自行選取。", "error"); }
    return;
  }
  openRowDialog(t, row);
}
$("#desk-body").addEventListener("keydown", (e) => {
  const tr = e.target.closest?.("tr[data-row]");
  if (tr && e.key === "Enter" && e.target === tr) tr.click();
});

function exportCSV(t) {
  if (!confirm("匯出的 CSV 檔案沒有加密，包括所有密碼。請只在安全的電腦使用，用完後刪除。繼續？")) return;
  const cols = t.data.columns || [];
  downloadCSV(`${t.data.title}_${todayId()}.csv`, [cols.map((c) => c.name), ...(t.data.rows || []).map((r) => cols.map((c) => r.c?.[c.id] ?? ""))]);
}

/* ---------- 分頁設定（名稱、形式、欄位、排序、刪除） ---------- */
let editingTab = null;
let draftCols = [];
function openTabDialog(t) {
  editingTab = t;
  const f = $("#tab-form");
  f.reset();
  $("#tab-warn").hidden = true;
  $("#tab-dialog-title").textContent = t ? "分頁設定" : "新增分頁";
  f.title.value = t?.data.title || "";
  $("#tab-kind-field").hidden = !!t;
  if (!t) f.kind.value = "table";
  draftCols = t ? (t.data.columns || []).map((c) => ({ ...c }))
    : [{ id: uid("c"), name: "名稱" }, { id: uid("c"), name: "IP" }, { id: uid("c"), name: "Login" },
      { id: uid("c"), name: "Password", secret: true }, { id: uid("c"), name: "備註" }];
  $("#tab-delete").hidden = !t;
  renderColEditor();
  $("#tab-dialog").showModal();
  f.title.focus();
}
function currentKind() { return editingTab ? editingTab.data.kind : $("#tab-form").kind.value; }
function renderColEditor() {
  const box = $("#col-editor");
  const order = editingTab ? `
    <div class="field"><span>分頁位置</span>
      <div class="actions actions--start">
        <button class="btn btn--small" type="button" data-move="-1">◀ 向左移</button>
        <button class="btn btn--small" type="button" data-move="1">向右移 ▶</button>
      </div></div>` : "";
  if (currentKind() !== "table") { box.innerHTML = order; return; }
  box.innerHTML = `
    ${order}
    <div class="field"><span>欄位（勾選「密碼」的欄位會預設隱藏，並可一按複製）</span>
      <ul class="col-list">
        ${draftCols.map((c, i) => `
          <li data-i="${i}">
            <input data-col-name value="${esc(c.name)}" maxlength="40" aria-label="欄位名稱">
            <label class="check"><input type="checkbox" data-col-secret ${c.secret ? "checked" : ""}> 密碼</label>
            <button class="btn btn--small" type="button" data-col-up ${i ? "" : "disabled"} aria-label="上移">↑</button>
            <button class="btn btn--small" type="button" data-col-down ${i < draftCols.length - 1 ? "" : "disabled"} aria-label="下移">↓</button>
            <button class="btn btn--small btn--stop" type="button" data-col-del aria-label="刪除欄位">✕</button>
          </li>`).join("")}
      </ul>
      <button class="btn btn--small" type="button" data-col-add>＋ 新增欄位</button>
    </div>`;
}
function syncDraftCols() {
  $("#col-editor").querySelectorAll("li[data-i]").forEach((li) => {
    const c = draftCols[Number(li.dataset.i)];
    c.name = li.querySelector("[data-col-name]").value;
    c.secret = li.querySelector("[data-col-secret]").checked;
  });
}
function setupTabDialog() {
  const f = $("#tab-form");
  f.addEventListener("change", (e) => { if (e.target.name === "kind") { syncDraftCols(); renderColEditor(); } });
  $("#col-editor").addEventListener("click", async (e) => {
    const li = e.target.closest("li[data-i]");
    syncDraftCols();
    if (e.target.closest("[data-col-add]")) { draftCols.push({ id: uid("c"), name: "" }); renderColEditor(); $("#col-editor li:last-child [data-col-name]").focus(); return; }
    if (e.target.closest("[data-move]") && editingTab) { await moveTab(editingTab, Number(e.target.closest("[data-move]").dataset.move)); return; }
    if (!li) return;
    const i = Number(li.dataset.i);
    if (e.target.closest("[data-col-up]") && i) [draftCols[i - 1], draftCols[i]] = [draftCols[i], draftCols[i - 1]];
    else if (e.target.closest("[data-col-down]") && i < draftCols.length - 1) [draftCols[i + 1], draftCols[i]] = [draftCols[i], draftCols[i + 1]];
    else if (e.target.closest("[data-col-del]")) {
      const used = editingTab && (editingTab.data.rows || []).some((r) => String(r.c?.[draftCols[i].id] ?? "") !== "");
      if (used && !confirm(`刪除「${draftCols[i].name}」欄？這一欄的資料會在儲存後刪除。`)) return;
      draftCols.splice(i, 1);
    } else return;
    renderColEditor();
  });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    syncDraftCols();
    const warn = (m) => { $("#tab-warn").hidden = !m; $("#tab-warn").textContent = m; };
    const title = f.title.value.trim();
    if (!title) return warn("請填寫分頁名稱。");
    const kind = currentKind();
    const cols = draftCols.map((c) => ({ ...c, name: c.name.trim() })).filter((c) => c.name);
    if (kind === "table" && !cols.length) return warn("請最少加入一個欄位。");
    try {
      if (editingTab) {
        const keep = new Set(cols.map((c) => c.id));
        const rows = (editingTab.data.rows || []).map((r) => ({ ...r, c: Object.fromEntries(Object.entries(r.c || {}).filter(([k]) => keep.has(k))) }));
        editingTab.data = { ...editingTab.data, title, ...(kind === "table" ? { columns: cols, rows } : {}) };
        await saveTab(editingTab);
      } else {
        await createTab(kind === "table" ? { title, kind, columns: cols, rows: [] } : { title, kind, note: "" });
      }
      $("#tab-dialog").close();
      toast("已儲存。", "success");
    } catch (err) { warn("未能儲存：" + err.message); }
  });
  $("#tab-delete").addEventListener("click", async () => {
    const t = editingTab;
    if (!t) return;
    const name = prompt(`刪除分頁「${t.data.title}」及其中所有資料？刪除後不能復原。\n請輸入分頁名稱確認：`);
    if (name == null) return;
    if (name.trim() !== t.data.title) { toast("分頁名稱不相符，沒有刪除。", "error"); return; }
    try { await deleteDoc(doc(TABS(), t.id)); $("#tab-dialog").close(); toast("已刪除分頁。", "success"); }
    catch (err) { toast("未能刪除：" + err.message, "error"); }
  });
}
async function moveTab(t, dir) {
  const i = S.tabs.indexOf(t);
  const j = i + dir;
  if (j < 0 || j >= S.tabs.length) return;
  const other = S.tabs[j];
  // 重新編排所有分頁的次序，避免次序相同
  const list = [...S.tabs];
  [list[i], list[j]] = [list[j], list[i]];
  const b = writeBatch(db);
  for (const [k, x] of list.entries()) {
    if (x.order !== k + 1 || x === t || x === other) {
      x.order = k + 1;
      b.set(doc(TABS(), x.id), { order: x.order }, { merge: true });
    }
  }
  try { await b.commit(); toast("已移動分頁。"); } catch (err) { toast("未能移動：" + err.message, "error"); }
}

/* ---------- 新增／編輯一行 ---------- */
let editingRow = null;
function openRowDialog(t, row) {
  editingRow = { tab: t, row };
  $("#row-dialog-title").textContent = row ? "編輯" : "新增一行";
  $("#row-delete").hidden = !row;
  $("#row-fields").innerHTML = (t.data.columns || []).map((c) => {
    const v = String(row?.c?.[c.id] ?? "");
    const long = v.length > 60 || v.includes("\n");
    return `<label class="field"><span>${esc(c.name)}${c.secret ? "（密碼）" : ""}</span>
      ${long ? `<textarea name="${c.id}" rows="3" data-no-translate>${esc(v)}</textarea>`
        : `<span class="${c.secret ? "secret-input" : ""}"><input name="${c.id}" value="${esc(v)}" ${c.secret ? 'type="password" autocomplete="new-password"' : 'autocomplete="off"'} data-no-translate>
          ${c.secret ? `<button class="btn btn--small" type="button" data-toggle-pw>顯示</button>
            <button class="btn btn--small" type="button" data-gen-pw title="產生隨機密碼">產生</button>` : ""}</span>`}
    </label>`;
  }).join("");
  $("#row-dialog").showModal();
  $("#row-fields input, #row-fields textarea")?.focus();
}
function setupRowDialog() {
  $("#row-fields").addEventListener("click", (e) => {
    const wrap = e.target.closest(".secret-input");
    if (!wrap) return;
    const input = wrap.querySelector("input");
    if (e.target.closest("[data-toggle-pw]")) {
      input.type = input.type === "password" ? "text" : "password";
      e.target.textContent = input.type === "password" ? "顯示" : "隱藏";
    }
    if (e.target.closest("[data-gen-pw]")) {
      if (input.value && !confirm("以新的隨機密碼取代現有內容？")) return;
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      input.value = [...bytes].map((b) => chars[b % chars.length]).join("");
      input.type = "text";
      wrap.querySelector("[data-toggle-pw]").textContent = "隱藏";
    }
  });
  $("#row-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { tab, row } = editingRow;
    const c = {};
    for (const col of tab.data.columns || []) {
      const v = e.target.elements[col.id]?.value ?? "";
      if (v !== "") c[col.id] = v;
    }
    if (!Object.keys(c).length) { toast("請最少填寫一個欄位。", "error"); return; }
    const rows = [...(tab.data.rows || [])];
    if (row) rows[rows.findIndex((r) => r.id === row.id)] = { ...row, c };
    else rows.push({ id: uid("r"), c });
    tab.data = { ...tab.data, rows };
    try { await saveTab(tab); $("#row-dialog").close(); toast("已儲存。", "success"); renderRows(); }
    catch (err) { toast("未能儲存：" + err.message, "error"); }
  });
  $("#row-delete").addEventListener("click", async () => {
    const { tab, row } = editingRow;
    if (!row || !confirm("刪除這一行？")) return;
    tab.data = { ...tab.data, rows: tab.data.rows.filter((r) => r.id !== row.id) };
    try { await saveTab(tab); $("#row-dialog").close(); toast("已刪除。", "success"); renderRows(); }
    catch (err) { toast("未能刪除：" + err.message, "error"); }
  });
}

/* ---------- 搜尋所有分頁 ---------- */
function runGlobalSearch() {
  const q = $("#g-search").value.trim().toLowerCase();
  const box = $("#g-results");
  if (!q) { box.hidden = true; box.innerHTML = ""; return; }
  const hits = [];
  for (const t of S.tabs) {
    if (t.data.kind === "note") {
      const lines = String(t.data.note || "").split("\n").filter((l) => l.toLowerCase().includes(q));
      lines.slice(0, 5).forEach((l) => hits.push({ t, text: l.trim() }));
      if (t.data.title.toLowerCase().includes(q) && !lines.length) hits.push({ t, text: "（分頁名稱）" });
      continue;
    }
    const cols = (t.data.columns || []).filter((c) => !c.secret);
    for (const r of t.data.rows || []) {
      if (cols.some((c) => String(r.c?.[c.id] ?? "").toLowerCase().includes(q))) {
        hits.push({ t, text: cols.map((c) => r.c?.[c.id]).filter(Boolean).slice(0, 4).join("｜") });
      }
    }
  }
  box.hidden = false;
  box.innerHTML = hits.length ? `
    <p class="hint">找到 ${hits.length} 項（不會搜尋密碼欄）：</p>
    <ul class="g-list" data-no-translate>${hits.slice(0, 100).map((h) => `
      <li><button class="link-btn" type="button" data-go="${h.t.id}"><strong>${esc(h.t.data.title)}</strong></button> ${esc(h.text)}</li>`).join("")}</ul>`
    : `<p class="empty">找不到「${esc($("#g-search").value.trim())}」。</p>`;
}

/* ---------- 小工具 ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
const fmtStamp = (d) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
/** 把網址變成可按的連結 */
function linkify(text) {
  return esc(text).replace(/\bhttps?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
}
