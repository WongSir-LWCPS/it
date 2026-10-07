import { boot, db, isEn, toast } from "../../assets/js/common.js?v=20261006n";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { LEGACY_FIREBASE, LEGACY_DOC, IPAD_DOC } from "./ipad-config.js?v=20261006n";

const $ = (sel) => document.querySelector(sel);
const S = { user: null };
const ref = () => doc(db, ...IPAD_DOC);

/** Firestore 不接受 undefined：一般資料先清理，deleteField() 等特殊值保留 */
const clean = (v) => (v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype)
  ? v : JSON.parse(JSON.stringify(v ?? null));
const cleanAll = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clean(v)]));

/** 提供給 iframe 內 iPad 借用表使用的資料存取 */
function makeStore() {
  return {
    get: () => getDoc(ref()).then((s) => (s.exists() ? s.data() : null)),
    create: (data) => setDoc(ref(), cleanAll(data)),
    subscribe: (onData, onError) => onSnapshot(ref(), (s) => onData(s.data()), onError),
    update: (upd) => updateDoc(ref(), cleanAll(upd)),
    del: () => deleteField(),
  };
}

/** 登入名稱去除英文名，例如「黃榮耀Wong Wing Yiu」→「黃榮耀」；全英文名稱則保留原文 */
function teacherShortName(user) {
  const name = (user?.displayName || "").trim();
  return name.replace(/[A-Za-z][A-Za-z.'\- ]*/g, "").trim() || name;
}

function startApp(isAdmin, user) {
  window.IPAD_ENV = {
    isAdmin,
    lang: isEn ? "en" : "zh",
    teacherName: teacherShortName(user),
    openAdmin: isAdmin && new URLSearchParams(location.search).has("admin"),
    store: makeStore(),
    // 管理員可隨時由舊系統重新匯入（平台正式推出前，舊系統仍在使用）
    importLegacy: isAdmin ? importLegacy : null,
  };
  $("#setup").hidden = true;
  const frame = $("#ipad-frame");
  frame.hidden = false;
  // 沿用本檔的版本號，令 iframe 內容在更新後一定重新載入
  frame.src = "app.html" + new URL(import.meta.url).search;
}

let legacyApp = null;
/** 從舊系統（獨立 Firebase 專案）讀取資料 */
async function readLegacy() {
  legacyApp ??= initializeApp(LEGACY_FIREBASE, "ipad-legacy");
  const app = legacyApp;
  const snap = await getDoc(doc(getFirestore(app), ...LEGACY_DOC));
  if (!snap.exists()) throw new Error("舊系統沒有資料");
  const d = snap.data() || {};
  return {
    ipads: d.ipads || [], periods: d.periods || [],
    bookings: d.bookings || {}, reservations: d.reservations || {}, loans: d.loans || {},
  };
}

/** 以舊系統資料覆蓋平台上的 iPad 資料 */
async function importLegacy() {
  const data = await readLegacy();
  await setDoc(ref(), cleanAll(data));
  return { ipads: data.ipads.length, bookings: Object.keys(data.bookings).length };
}

function showSetup() {
  const box = $("#setup");
  box.hidden = false;
  box.innerHTML = `
    <div class="card-form">
      <h1>設定 iPad借用</h1>
      <p>平台還未有 iPad 借用資料。你可以把舊的「iPad借用記錄表」（另一個 Firebase 專案）的 iPad 批次、課節、借用記錄、IT組預留及外借記錄一次過匯入；或者使用預設設定，由空白開始。</p>
      <div class="actions actions--start">
        <button class="btn btn--primary" id="setup-import">從舊系統匯入</button>
        <button class="btn" id="setup-default">使用預設設定</button>
      </div>
      <p class="hint mt-s" id="setup-msg" role="status"></p>
    </div>`;
  $("#setup-default").addEventListener("click", () => startApp(true, S.user));
  $("#setup-import").addEventListener("click", async (e) => {
    const btn = e.target;
    const msg = $("#setup-msg");
    btn.disabled = true;
    msg.textContent = "正在讀取舊系統…";
    try {
      const r = await importLegacy();
      toast(`已匯入：${r.ipads} 個 iPad 批次、${r.bookings} 項借用記錄。`, "success");
      startApp(true, S.user);
    } catch (err) {
      console.error(err);
      msg.textContent = `未能匯入：${err.message}`;
      btn.disabled = false;
    }
  });
}

boot({
  root: "../../", current: "ipad",
  onReady: async ({ user, isAdmin }) => {
    S.user = user;
    let exists = true;
    try { exists = (await getDoc(ref())).exists(); } catch (e) { console.warn(e); }
    if (!exists && isAdmin) { showSetup(); return; }
    if (!exists) {
      $("#setup").hidden = false;
      $("#setup").innerHTML = `<p class="empty">iPad借用尚未設定，請由管理員開啟一次本頁。</p>`;
      return;
    }
    startApp(isAdmin, user);
  },
});
