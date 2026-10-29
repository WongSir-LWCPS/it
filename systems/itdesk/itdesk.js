import { boot, db, esc, toast } from "../../assets/js/common.js?v=20261029a";
import {
  collection, doc, onSnapshot, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { newKeyMeta, unlock, encryptJSON, decryptJSON } from "./itdesk-crypto.js?v=20261029a";
import { contactsPage } from "./pages/contacts.js?v=20261029a";
import { printersPage } from "./pages/printers.js?v=20261029a";
import { devicesPage } from "./pages/devices.js?v=20261029a";

/*
 * IT組工作資料：每個頁面各有自己的版面及資料（例如外判商聯絡人、器材 IP）。
 * 新增頁面：在 pages/ 建立模組（提供 id、name、icon、defaultData()、render()），再加入下面的 PAGES。
 */
const PAGES = [contactsPage, printersPage, devicesPage];

const $ = (sel) => document.querySelector(sel);
const META_REF = () => doc(db, "itdesk_meta", "key");
const PAGES_COLL = () => collection(db, "itdesk_pages");
const IDLE_MS = 30 * 60 * 1000;   // 閒置 30 分鐘自動鎖上
const S = {
  user: null, meta: null, key: null, pages: {}, active: PAGES[0].id, lastActive: Date.now(), unsub: null, changing: false,
};

/* ---------- 啟動 ---------- */
boot({
  root: "../../", current: "itdesk",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) return;   // 非管理員已由 boot() 擋住
    S.user = user;
    // 曾經設定主密碼的電腦：不用等待讀取資料庫，先顯示解鎖方塊（按「解鎖」時才等待密碼資料）
    if (lsGet(READY_FLAG) === "1") showOnly("unlock");
    else $("#desk-loading").hidden = false;
    onSnapshot(META_REF(), (snap) => {
      if (S.changing) return;   // 正在更改主密碼
      $("#desk-loading").hidden = true;
      const meta = snap.exists() ? snap.data() : null;
      metaLoaded(meta);
      if (meta) lsSet(READY_FLAG, "1");
      const changed = S.meta && meta && S.meta.salt !== meta.salt;
      S.meta = meta;
      if (!meta) { showOnly("setup"); return; }
      if (changed && S.key) { lock("主密碼已被其他同事更改，請以新的主密碼解鎖。"); return; }
      if (!S.key) showOnly("unlock");
    }, (e) => {
      S.metaError = "未能讀取資料：" + e.message;
      $("#desk-loading").hidden = true;
      metaLoaded(null);
      $("#unlock").hidden = false; $("#unlock-warn").hidden = false; $("#unlock-warn").textContent = S.metaError;
    });
    setupForms();
    setupDesk();
    ["click", "keydown", "pointermove", "scroll"].forEach((ev) => document.addEventListener(ev, () => { S.lastActive = Date.now(); }, { passive: true }));
    setInterval(() => { if (S.key && Date.now() - S.lastActive > IDLE_MS) lock("閒置超過 30 分鐘，已自動鎖上。"); }, 30000);
  },
});

const READY_FLAG = "itdesk-has-key";   // 只記錄「已設定主密碼」，不含任何密碼資料
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 略過 */ } }
let metaLoaded;
const metaReady = new Promise((r) => { metaLoaded = r; });

function showOnly(which) {
  ["setup", "unlock", "desk"].forEach((id) => { $(`#${id}`).hidden = id !== which; });
  $("#lock-btn").hidden = which !== "desk";
  if (which === "unlock") setTimeout(() => $("#unlock-form").pw.focus(), 50);
  if (which === "setup") setTimeout(() => $("#setup-form").p1.focus(), 50);
}

function lock(msg = "") {
  S.key = null;
  S.pages = {};
  S.unsub?.();
  S.unsub = null;
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  $("#page-body").innerHTML = "";
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
    btn.disabled = true;
    btn.textContent = "解鎖中…";
    if (!S.meta) await metaReady;
    if (!S.meta) {
      btn.disabled = false; btn.textContent = "解鎖";
      if (S.metaError) warn(S.metaError); else showOnly("setup");
      return;
    }
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
    if (!confirm("以新主密碼重新加密所有頁面？更改後請通知其他IT組同事。")) return;
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    S.changing = true;
    try {
      const { key, meta } = await newKeyMeta(f.p1.value);
      const b = writeBatch(db);
      for (const [id, p] of Object.entries(S.pages)) {
        b.set(doc(PAGES_COLL(), id), { box: await encryptJSON(key, p.data), updatedAt: serverTimestamp(), updatedBy: S.user.email });
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

/* ---------- 讀取及解密頁面 ---------- */
function openDesk(key) {
  S.key = key;
  S.lastActive = Date.now();
  showOnly("desk");
  renderNav();
  $("#page-body").innerHTML = `<p class="empty">正在解密…</p>`;
  S.unsub?.();
  let first = true;
  S.unsub = onSnapshot(PAGES_COLL(), async (snap) => {
    const k = S.key;
    if (!k || S.changing) return;
    const pages = {};
    let failed = 0;
    for (const d of snap.docs) {
      const x = d.data();
      try {
        pages[d.id] = { data: await decryptJSON(k, x.box), updatedAt: x.updatedAt, updatedBy: x.updatedBy };
      } catch { failed++; }
    }
    if (S.key !== k) return;
    if (failed && !Object.keys(pages).length) { lock("未能解密資料，主密碼可能已被更改，請重新解鎖。"); return; }
    S.pages = pages;
    // 第一次使用某頁面：以預設資料建立
    if (first) {
      first = false;
      for (const p of PAGES) {
        if (!pages[p.id] && p.defaultData) {
          try { await savePage(p.id, p.defaultData()); } catch (err) { console.warn(err); }
        }
      }
    }
    renderPage();
  }, (e) => { $("#page-body").innerHTML = `<p class="load-error">未能讀取資料：${esc(e.message)}</p>`; });
}

/** 加密並儲存某頁面的資料 */
async function savePage(id, data) {
  if (!S.key) throw new Error("已鎖上，請先解鎖。");
  S.pages[id] = { ...(S.pages[id] || {}), data };
  await setDoc(doc(PAGES_COLL(), id), { box: await encryptJSON(S.key, data), updatedAt: serverTimestamp(), updatedBy: S.user.email });
}

async function removePage(id) {
  delete S.pages[id];
  await deleteDoc(doc(PAGES_COLL(), id));
}

/* ---------- 頁面切換 ---------- */
function setupDesk() {
  $("#page-nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b) return;
    S.active = b.dataset.page;
    renderNav();
    renderPage();
  });
}
function renderNav() {
  $("#page-nav").innerHTML = PAGES.map((p) => `
    <button role="tab" class="tab" data-page="${p.id}" aria-selected="${p.id === S.active}">
      <span aria-hidden="true">${p.icon}</span> ${esc(p.name)}</button>`).join("");
}
function renderPage() {
  const p = PAGES.find((x) => x.id === S.active) || PAGES[0];
  const rec = S.pages[p.id];
  const box = $("#page-body");
  if (!rec) { box.innerHTML = `<p class="empty">正在準備頁面…</p>`; return; }
  p.render(box, rec.data, {
    save: (data) => savePage(p.id, data),
    // 頁面的附加文件（例如位置圖圖片），ID 以頁面 ID 開頭，同樣加密
    extra: (name) => S.pages[`${p.id}__${name}`]?.data ?? null,
    saveExtra: (name, data) => savePage(`${p.id}__${name}`, data),
    removeExtra: (name) => removePage(`${p.id}__${name}`),
    updatedBy: rec.updatedBy,
    updatedAt: rec.updatedAt?.toDate ? rec.updatedAt.toDate() : null,
    user: S.user,
  });
}
