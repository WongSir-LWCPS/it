import { boot, db, isEn, auth, isStaffEmail } from "../../assets/js/common.js?v=20261025a";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, updateDoc, onSnapshot, deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { IPAD_DOC } from "./ipad-config.js?v=20261025a";

const $ = (sel) => document.querySelector(sel);
const S = { user: null };
const ref = () => doc(db, ...IPAD_DOC);

/**
 * Firestore 不接受 undefined，亦不接受由 iframe 建立的物件（屬於另一個 JavaScript 環境，Firestore 會當作「自訂物件」而拒絕儲存）。
 * 因此一般資料一律複製成本頁的普通物件；只有 deleteField() 等 Firestore 特殊值保留原樣。
 * 判斷方法不依賴 Object.prototype（每個 iframe 各有一個）：普通物件的原型再上一層是 null。
 */
const isPlainAnyRealm = (v) => {
  const proto = Object.getPrototypeOf(v);
  return proto === null || Object.getPrototypeOf(proto) === null;
};
const clean = (v) => (v && typeof v === "object" && !Array.isArray(v) && !isPlainAnyRealm(v))
  ? v : JSON.parse(JSON.stringify(v ?? null));
const cleanAll = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clean(v)]));

/* ---------- 即時資料 ----------
 * 登入後立即開始讀取（不用等待平台其他檢查及 iframe 載入），
 * 並先顯示上次的資料（只存於本機），令頁面盡快出現。 */
const CACHE_KEY = "ipad-state-cache";
const LIVE = { data: undefined, error: null, listeners: new Set(), waiters: [], started: false };
function startLive() {
  if (LIVE.started) return;
  LIVE.started = true;
  onSnapshot(ref(), (snap) => {
    LIVE.data = snap.exists() ? snap.data() : null;
    LIVE.waiters.splice(0).forEach((w) => w.resolve(LIVE.data));
    LIVE.listeners.forEach((l) => l.onData(LIVE.data));
    if (LIVE.data && !snap.metadata?.hasPendingWrites) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(LIVE.data)); } catch { /* 空間不足時只影響下次載入速度 */ }
    }
  }, (err) => {
    LIVE.error = err;
    LIVE.started = false;
    LIVE.waiters.splice(0).forEach((w) => w.reject(err));
    LIVE.listeners.forEach((l) => l.onError?.(err));
  });
}
onAuthStateChanged(auth, (user) => {
  if (user && isStaffEmail((user.email || "").toLowerCase())) startLive();
});
function cachedData() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; }
}

/** 提供給 iframe 內 iPad 借用表使用的資料存取 */
function makeStore() {
  return {
    /** 資料庫的最新資料（第一次讀取完成後才回傳） */
    get: () => {
      startLive();
      if (LIVE.data !== undefined) return Promise.resolve(LIVE.data);
      return new Promise((resolve, reject) => LIVE.waiters.push({ resolve, reject }));
    },
    /** 上次的資料（只用於即時顯示） */
    cached: cachedData,
    create: (data) => setDoc(ref(), cleanAll(data)),
    subscribe: (onData, onError) => {
      const l = { onData, onError };
      LIVE.listeners.add(l);
      startLive();
      if (LIVE.data !== undefined) onData(LIVE.data);
      return () => LIVE.listeners.delete(l);
    },
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
  onReady: ({ user, isAdmin }) => {
    S.user = user;
    // 資料未建立時：管理員開啟會以預設設定建立；老師會看到提示（由 app.js 處理）
    startApp(isAdmin, user);
  },
});
