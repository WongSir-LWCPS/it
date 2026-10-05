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

/* ---------- 日期及時間選擇 ---------- */
const CAL_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;

/** 為所有日期欄加上月曆圖示，按下後彈出月曆 */
export function enhanceDateInputs(scope = document) {
  scope.querySelectorAll('input[type="date"]:not([data-enhanced])').forEach((input) => {
    input.dataset.enhanced = "1";
    const wrap = document.createElement("span");
    wrap.className = "picker";
    input.replaceWith(wrap);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "picker-btn";
    btn.setAttribute("aria-label", "開啟月曆");
    btn.innerHTML = CAL_ICON;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      try { input.showPicker(); } catch { input.focus(); input.click(); }
    });
    wrap.append(input, btn);
  });
}

const CLOCK_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const hmToMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/**
 * 把用戶輸入的文字轉為 HH:MM。
 * 接受：8:30、08:30、0830、830、8.30、13：10、8（＝08:00）、下午1:10、1:10pm
 */
export function parseTimeText(text) {
  let s = String(text ?? "").trim().toLowerCase();
  if (!s) return "";
  const pm = /下午|晚上|pm|p\.m\./.test(s);
  const am = /上午|早上|am|a\.m\./.test(s);
  s = s.replace(/上午|下午|早上|晚上|[ap]\.?m\.?/g, "").replace(/[：.．時]/g, ":").replace(/分/g, "").replace(/\s/g, "");
  let h, m, x;
  if ((x = s.match(/^(\d{1,2}):(\d{1,2})$/))) { h = +x[1]; m = +x[2]; }
  else if ((x = s.match(/^(\d{3,4})$/))) { h = +s.slice(0, -2); m = +s.slice(-2); }
  else if ((x = s.match(/^(\d{1,2}):?$/))) { h = +x[1]; m = 0; }
  else return null;
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

/**
 * 時間欄（24 小時制）：可直接輸入，亦可按時鐘圖示彈出「時」「分」按鈕選擇。
 * input 為 <input type="hidden">（實際提交的值），值改變時會觸發 change 事件。
 * opts：from、to（可選範圍）、step（按鈕的分鐘間距）、placeholder、isAllowed(t)、errorText
 */
export function timePicker(input, opts = {}) {
  const o = {
    from: "07:00", to: "19:00", step: 5, placeholder: "例如 08:30",
    isAllowed: () => true, errorText: "", ...opts,
  };
  const wrap = document.createElement("div");
  wrap.className = "tp";
  input.replaceWith(wrap);

  const text = document.createElement("input");
  text.type = "text";
  text.className = "tp-input";
  text.inputMode = "numeric";
  text.autocomplete = "off";
  text.placeholder = o.placeholder;
  text.setAttribute("aria-label", o.label || "時間（24 小時制）");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tp-btn";
  btn.setAttribute("aria-label", "選擇時間");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = CLOCK_ICON;

  const err = document.createElement("p");
  err.className = "tp-error";
  err.hidden = true;

  const pop = document.createElement("div");
  pop.className = "tp-pop";
  pop.hidden = true;
  wrap.append(input, text, btn, pop, err);
  let hour = null;

  const ok = (t) => hmToMin(t) >= hmToMin(o.from) && hmToMin(t) <= hmToMin(o.to) && o.isAllowed(t);
  const renderPop = () => {
    const v = input.value;
    const [vh, vm] = v ? v.split(":") : [null, null];
    const h = hour ?? vh;
    const hours = [];
    for (let i = Number(o.from.slice(0, 2)); i <= Number(o.to.slice(0, 2)); i++) hours.push(pad(i));
    const mins = [];
    for (let m = 0; m < 60; m += o.step) mins.push(pad(m));
    pop.innerHTML = `
      <p class="tp-label">時</p>
      <div class="tp-grid">${hours.map((x) => `<button type="button" data-h="${x}" class="${x === h ? "is-on" : ""}"
        ${mins.some((m) => ok(`${x}:${m}`)) ? "" : "disabled"}>${x}</button>`).join("")}</div>
      <p class="tp-label">分${h ? "" : "（請先選時）"}</p>
      <div class="tp-grid">${mins.map((m) => `<button type="button" data-m="${m}" class="${h === vh && m === vm ? "is-on" : ""}"
        ${h && ok(`${h}:${m}`) ? "" : "disabled"}>${m}</button>`).join("")}</div>`;
  };
  const showError = (msg) => {
    err.hidden = !msg;
    err.textContent = msg;
    text.setAttribute("aria-invalid", msg ? "true" : "false");
  };
  const set = (v, silent = false) => {
    const changed = input.value !== v;
    input.value = v;
    text.value = v;
    hour = null;
    showError("");
    if (!pop.hidden) renderPop();
    if (changed && !silent) input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  // 檢查輸入的文字
  const commit = () => {
    const raw = text.value.trim();
    if (!raw) { set(""); return; }
    const t = parseTimeText(raw);
    if (!t) {
      input.value = "";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      showError("看不懂這個時間，請以 24 小時制輸入，例如 08:30 或 13:10。");
      return;
    }
    if (!ok(t)) {
      text.value = t;
      input.value = "";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      showError(o.errorText || `請輸入 ${o.from} 至 ${o.to} 之間的時間。`);
      return;
    }
    set(t);
  };
  const close = (focus = true) => {
    pop.hidden = true;
    hour = null;
    btn.setAttribute("aria-expanded", "false");
    if (focus) text.focus();
  };
  const open = () => {
    hour = null;
    renderPop();
    pop.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    (pop.querySelector("[data-h].is-on") || pop.querySelector("[data-h]:not(:disabled)"))?.focus();
  };

  text.addEventListener("change", commit);
  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "ArrowDown" && e.altKey) { e.preventDefault(); open(); }
  });
  btn.addEventListener("click", () => (pop.hidden ? open() : close()));
  pop.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.h) {
      hour = b.dataset.h;
      renderPop();
      pop.querySelector("[data-m]:not(:disabled)")?.focus();
    } else if (b.dataset.m) {
      set(`${hour ?? input.value.split(":")[0]}:${b.dataset.m}`);
      close();
    }
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
  });
  // 用 composedPath：按鈕重繪後 e.target 已不在頁面上，contains() 會誤判為按在外面
  document.addEventListener("click", (e) => { if (!pop.hidden && !e.composedPath().includes(wrap)) close(false); });

  input._tp = {
    set,
    refresh: () => { if (!pop.hidden) renderPop(); },
    setOptions: (n) => { Object.assign(o, n); if (!pop.hidden) renderPop(); },
  };
  return input._tp;
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
