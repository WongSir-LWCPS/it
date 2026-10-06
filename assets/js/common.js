import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, APP } from "./firebase-config.js?v=20261006e";
import { startI18n, isEn, setLang, WEEKDAYS_EN, MONTHS_EN } from "./i18n.js?v=20261006e";
import { SYSTEMS } from "./systems.js?v=20261006e";

startI18n();
export { tr, t, isEn } from "./i18n.js?v=20261006e";

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
export const weekdayName = (id) => (isEn ? WEEKDAYS_EN : WEEK.map((w) => "星期" + w))[parseDateId(id).getDay()];
export function fmtDate(id) {
  const d = parseDateId(id);
  if (isEn) return `${WEEKDAYS_EN[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`;
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

/** 是否學校教職員電郵（符合網域，且不是學生帳戶） */
export function isStaffEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  if (APP.allowedDomain && !e.endsWith("@" + APP.allowedDomain.toLowerCase())) return false;
  return !isBlockedEmail(e);
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

/** HH:MM → 「下午 01:40」 */
export function fmtTime12(v) {
  if (!v) return "";
  const [h, m] = v.split(":").map(Number);
  const h12 = pad(h % 12 === 0 ? 12 : h % 12);
  if (isEn) return `${h12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
  return `${h < 12 ? "上午" : "下午"} ${h12}:${pad(m)}`;
}

/**
 * 時間欄：可直接輸入（例如 830、13:10、下午1:40），
 * 亦可按時鐘圖示，在「上午／下午」「時」「分」三欄中選擇。
 * input 為 <input type="hidden">，實際值為 24 小時制 HH:MM，改變時觸發 change 事件。
 * opts：from、to（可選範圍）、placeholder、isAllowed(t)、errorText、label
 */
export function timePicker(input, opts = {}) {
  const o = {
    from: "07:00", to: "19:00", placeholder: "-- --:--",
    isAllowed: () => true, errorText: "", ...opts,
  };
  const wrap = document.createElement("div");
  wrap.className = "tp";
  input.replaceWith(wrap);

  const text = document.createElement("input");
  text.type = "text";
  text.className = "tp-input";
  text.autocomplete = "off";
  text.placeholder = o.placeholder;
  text.setAttribute("aria-label", o.label || "時間");

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

  const ok = (t) => hmToMin(t) >= hmToMin(o.from) && hmToMin(t) <= hmToMin(o.to) && o.isAllowed(t);
  const to24 = (p, h12, m) => `${pad((h12 % 12) + (p === "下午" ? 12 : 0))}:${m}`;
  const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  const MINS = Array.from({ length: 60 }, (_, i) => pad(i));
  const anyIn = (p, h) => MINS.some((m) => ok(to24(p, Number(h), m)));
  // 正在選擇中的值：{ p, h, m }
  let draft = {};

  const fromValue = (v) => {
    if (!v) return {};
    const [h, m] = v.split(":").map(Number);
    return { p: h < 12 ? "上午" : "下午", h: pad(h % 12 === 0 ? 12 : h % 12), m: pad(m) };
  };

  const renderPop = () => {
    const d = draft;
    const col = (key, items, isDisabled) => `
      <div class="tp-col" data-col="${key}" role="listbox" aria-label="${{ p: "上午或下午", h: "時", m: "分" }[key]}">
        ${items.map((x) => `<button type="button" role="option" data-${key}="${x}"
          class="${d[key] === x ? "is-on" : ""}" aria-selected="${d[key] === x}"
          ${isDisabled(x) ? "disabled" : ""}>${x}</button>`).join("")}
      </div>`;
    pop.innerHTML =
      col("p", ["上午", "下午"], (p) => !HOURS.some((h) => anyIn(p, h)))
      + col("h", HOURS, (h) => !(d.p ? anyIn(d.p, h) : ["上午", "下午"].some((p) => anyIn(p, h))))
      + col("m", MINS, (m) => (d.p && d.h ? !ok(to24(d.p, Number(d.h), m)) : false));
  };
  const scrollToSelected = () => {
    pop.querySelectorAll(".tp-col").forEach((c) => {
      const on = c.querySelector(".is-on") || c.querySelector("button:not(:disabled)");
      if (on) c.scrollTop = on.offsetTop - c.offsetTop - 4;
    });
  };

  const showError = (msg) => {
    err.hidden = !msg;
    err.textContent = msg;
    text.setAttribute("aria-invalid", msg ? "true" : "false");
  };
  const set = (v, silent = false) => {
    const changed = input.value !== v;
    input.value = v;
    text.value = fmtTime12(v);
    showError("");
    if (!silent) draft = fromValue(v);
    if (changed && !silent) input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  // 由輸入的文字取值
  const commit = () => {
    const raw = text.value.trim();
    if (!raw) { set(""); return; }
    const t = parseTimeText(raw);
    const fail = (msg) => {
      input.value = "";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      showError(msg);
    };
    if (!t) return fail("看不懂這個時間，請輸入例如 08:30、13:10 或 下午1:10。");
    if (!ok(t)) { text.value = fmtTime12(t); return fail(o.errorText || `請輸入 ${fmtTime12(o.from)} 至 ${fmtTime12(o.to)} 之間的時間。`); }
    set(t);
  };

  const close = (focus = true) => {
    pop.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (focus) text.focus();
  };
  const open = () => {
    draft = fromValue(input.value);
    renderPop();
    pop.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    scrollToSelected();
  };

  text.addEventListener("change", commit);
  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); close(false); }
    if (e.key === "ArrowDown" && e.altKey) { e.preventDefault(); open(); }
  });
  btn.addEventListener("click", () => (pop.hidden ? open() : close()));

  pop.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const key = Object.keys(b.dataset)[0];        // p、h 或 m
    draft = { ...draft, [key]: b.dataset[key] };
    // 未選的部分自動填上第一個可用的值（與瀏覽器內置時間欄相同）
    if (!draft.p) draft.p = ["上午", "下午"].find((p) => HOURS.some((h) => anyIn(p, h)));
    if (!draft.h || !anyIn(draft.p, draft.h)) draft.h = HOURS.find((h) => anyIn(draft.p, h));
    if (!draft.m || !ok(to24(draft.p, Number(draft.h), draft.m))) {
      draft.m = MINS.find((m) => ok(to24(draft.p, Number(draft.h), m)));
    }
    const cols = [...pop.querySelectorAll(".tp-col")].map((c) => c.scrollTop);
    renderPop();
    pop.querySelectorAll(".tp-col").forEach((c, i) => { c.scrollTop = cols[i]; });
    if (draft.p && draft.h && draft.m) set(to24(draft.p, Number(draft.h), draft.m), false);
    // 選完分鐘即關閉
    if (key === "m") close();
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); close(); }
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

/* ---------- 下載 CSV ---------- */
export function downloadCSV(filename, rows) {
  const cell = (v) => {
    const t = String(v ?? "");
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = "\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- 通知電郵版面（各系統共用） ---------- */
export function mailLayout({ greet, lead, rows = [], note = "", link = "", linkText = "查看詳情" }) {
  const text = [
    greet, "", lead,
    ...rows.map(([k, v]) => `${k}：${v}`),
    note ? `\nIT組備註：${note}` : "",
    link ? `\n${linkText}：${link}` : "",
    "", `${APP.schoolName} IT組`,
  ].join("\n");
  const html = `
  <div style="font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;color:#1B2550;line-height:1.7;max-width:560px">
    <p>${esc(greet)}</p>
    <p>${esc(lead)}</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:6px 12px;background:#F3F5FA;width:110px;white-space:nowrap">${esc(k)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #DCE1EC">${esc(v)}</td>
        </tr>`).join("")}
    </table>
    ${note ? `<p><strong>IT組備註：</strong>${esc(note)}</p>` : ""}
    ${link ? `<p><a href="${esc(link)}">${esc(linkText)}</a></p>` : ""}
    <p>${esc(APP.schoolName)} IT組</p>
  </div>`;
  return { html, text };
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
  const langBtn = `<button class="btn btn--small lang-btn" id="lang-toggle" data-no-translate
    aria-label="${isEn ? "切換至中文" : "Switch to English"}">${isEn ? "中文" : "EN"}</button>`;
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
          ${langBtn}
          <button class="btn btn--small" id="signout">登出</button>
        </div>` : `<div class="who">${langBtn}</div>`}
    </div>`;
  el.querySelector("#lang-toggle").addEventListener("click", () => setLang(isEn ? "zh" : "en"));
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
      ${isAdmin && s.adminHref && (current === s.id || current === `${s.id}-admin`)
        ? link(s.adminHref, "管理及審批", `${s.id}-admin`, "", true) : ""}`).join("")}
    ${isAdmin ? `<p class="drawer-group">管理</p>${link("settings.html", "平台設定", "settings", "⚙️")}` : ""}`;
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
