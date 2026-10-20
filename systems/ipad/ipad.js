import { boot, db, isEn } from "../../assets/js/common.js?v=20261020e";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { IPAD_DOC } from "./ipad-config.js?v=20261020e";

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
    email: (user?.email || "").toLowerCase(),
    openAdmin: isAdmin && new URLSearchParams(location.search).has("admin"),
    store: makeStore(),
  };
  $("#setup").hidden = true;
  const frame = $("#ipad-frame");
  frame.hidden = false;
  // 沿用本檔的版本號，令 iframe 內容在更新後一定重新載入
  frame.src = "app.html" + new URL(import.meta.url).search;
}

boot({
  root: "../../", current: "ipad",
  onReady: async ({ user, isAdmin }) => {
    S.user = user;
    let exists = true;
    try { exists = (await getDoc(ref())).exists(); } catch (e) { console.warn(e); }
    // 第一次使用：管理員開啟時以預設設定建立資料
    if (!exists && isAdmin) { startApp(true, user); return; }
    if (!exists) {
      $("#setup").hidden = false;
      $("#setup").innerHTML = `<p class="empty">iPad借用尚未設定，請由管理員開啟一次本頁。</p>`;
      return;
    }
    startApp(isAdmin, user);
  },
});
