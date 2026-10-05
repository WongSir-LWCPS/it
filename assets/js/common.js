import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, APP } from "./firebase-config.js";
import { SYSTEMS } from "./systems.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { APP };

/* ---------- 文字及日期工具 ---------- */
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
export const pad = (n) => String(n).padStart(2, "0");
export const toDateId = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseDateId(id) {
  const [y, m, d] = id.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export const todayId = () => toDateId(new Date());
export function daysUntil(id) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((parseDateId(id) - t) / 86400000);
}
export const weekdayName = (id) => "星期" + WEEK[parseDateId(id).getDay()];
export function fmtDate(id) {
  const d = parseDateId(id);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdayName(id)}）`;
}
export function fmtTimestamp(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 是否屬於被封鎖的帳戶（例如學生帳戶） */
export function isBlockedEmail(email) {
  return (APP.blockedEmailPatterns || []).some((re) => re.test(email));
}

/* ---------- 提示訊息 ---------- */
export function toast(msg, kind = "info") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    document.body.append(box);
  }
  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;
  el.textContent = msg;
  box.append(el);
  setTimeout(() => el.remove(), 4500);
}

/* ---------- 頁首及側邊選單 ---------- */
function renderHeader(el, root, user, isAdmin) {
  el.innerHTML = `
    <div class="bar">
      ${user ? `
        <button class="menu-btn" id="menu-btn" aria-label="開啟系統選單" aria-expanded="false" aria-controls="drawer">
          <span aria-hidden="true"></span>
        </button>` : ""}
      <a class="brand" href="${root}index.html">
        <img class="brand-logo" src="${root}assets/img/school-logo.png" alt="${esc(APP.schoolName)}校徽">
        <span class="brand-text"><strong>IT一站式平台</strong><small>${esc(APP.schoolName)}</small></span>
      </a>
      ${user ? `
        <div class="who">
          <span class="who-name">${esc(user.displayName || user.email)}${isAdmin ? '<span class="role">管理員</span>' : ""}</span>
          <button class="btn btn--small" id="signout">登出</button>
        </div>` : ""}
    </div>`;
  el.querySelector("#signout")?.addEventListener("click", async () => {
    await signOut(auth);
    location.reload();
  });
}

function setupDrawer(root, isAdmin, current) {
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  const drawer = document.createElement("nav");
  drawer.id = "drawer";
  drawer.className = "drawer";
  drawer.setAttribute("aria-label", "系統選單");
  const link = (href, label, id, icon = "", sub = false) =>
    `<a class="drawer-link${sub ? " drawer-link--sub" : ""}${id === current ? " is-current" : ""}" href="${root}${href}"
       ${id === current ? 'aria-current="page"' : ""}>${icon ? `<span class="drawer-icon" aria-hidden="true">${icon}</span>` : ""}${esc(label)}</a>`;

  drawer.innerHTML = `
    <div class="drawer-head">
      <strong>系統選單</strong>
      <button class="drawer-close" id="drawer-close" aria-label="關閉選單">✕</button>
    </div>
    ${link("index.html", "平台首頁", "home", "🏠")}
    <p class="drawer-group">系統</p>
    ${SYSTEMS.map((s) => `
      ${link(s.href, s.name, s.id, s.icon || "🧩")}
      ${isAdmin && s.adminHref ? link(s.adminHref, "管理及審批", `${s.id}-admin`, "", true) : ""}`).join("")}`;
  document.body.append(backdrop, drawer);

  const btn = document.getElementById("menu-btn");
  const set = (open) => {
    drawer.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
    if (open) drawer.querySelector(".drawer-link")?.focus();
  };
  btn.addEventListener("click", () => set(!drawer.classList.contains("is-open")));
  backdrop.addEventListener("click", () => set(false));
  drawer.querySelector("#drawer-close").addEventListener("click", () => { set(false); btn.focus(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) { set(false); btn.focus(); }
  });
}

function showGate(gate, msg = "") {
  gate.hidden = false;
  gate.innerHTML = `
    <div class="gate-card">
      <img class="gate-logo" src="${gate.dataset.root || "./"}assets/img/school-logo.png" alt="">
      <h1>登入 IT一站式平台</h1>
      <p>請使用學校的 Google 帳戶登入，以使用 IT組的校內系統。</p>
      ${msg ? `<p class="gate-error" role="alert">${esc(msg)}</p>` : ""}
      <button class="btn btn--primary" id="signin">使用 Google 帳戶登入</button>
    </div>`;
  gate.querySelector("#signin").addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    const params = { prompt: "select_account" };
    if (APP.allowedDomain) params.hd = APP.allowedDomain;
    provider.setCustomParameters(params);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
        showGate(gate, "未能登入：" + e.message);
      }
    }
  });
}

/**
 * 每個頁面共用的啟動流程：處理登入、檢查網域及管理員身份。
 * 頁面需要有 #site-header、#gate、#main 三個元素。
 * current：目前頁面的 ID（用於側邊選單標示），例如 "home"、"ktv"、"ktv-admin"。
 */
export function boot({ root = "./", current = "", onReady }) {
  const header = document.getElementById("site-header");
  const gate = document.getElementById("gate");
  const main = document.getElementById("main");
  const loading = document.getElementById("loading");
  gate.dataset.root = root;
  renderHeader(header, root, null, false);
  let started = false;

  onAuthStateChanged(auth, async (user) => {
    loading?.remove();
    if (!user) {
      main.hidden = true;
      showGate(gate);
      return;
    }
    const email = (user.email || "").toLowerCase();
    if (APP.allowedDomain && !email.endsWith("@" + APP.allowedDomain.toLowerCase())) {
      await signOut(auth);
      showGate(gate, `${email} 不是學校帳戶。請改用 @${APP.allowedDomain} 的帳戶登入。`);
      return;
    }
    if (isBlockedEmail(email)) {
      await signOut(auth);
      showGate(gate, `${email}：${APP.blockedMessage || "此帳戶不能使用此平台。"}`);
      return;
    }
    let isAdmin = false;
    try {
      isAdmin = (await getDoc(doc(db, "admins", email))).exists();
    } catch (e) {
      console.warn("未能檢查管理員身份", e);
    }
    renderHeader(header, root, user, isAdmin);
    setupDrawer(root, isAdmin, current);
    gate.hidden = true;
    main.hidden = false;
    if (!started) {
      started = true;
      onReady({ user, isAdmin });
    }
  });
}
