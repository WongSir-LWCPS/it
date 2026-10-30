// IT組工作資料：裝置 IP 記錄（伺服器、網絡設備、無線基站、影音及課室設備等）
// 資料（包括 IP、MAC、登入密碼）不會寫在程式內：由 Excel 匯入或在頁面新增，全部以主密碼加密儲存。
import { esc, toast, loadXlsx } from "../../../assets/js/common.js?v=20261030a";

const uid = (p = "d") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const CATS = ["伺服器", "網絡設備", "無線網絡", "影音及課室", "打印機", "其他"];
const catRank = (c) => { const i = CATS.indexOf(c); return i < 0 ? 99 : i; };
const V = { q: "", cat: "", data: null, api: null, dialog: null, reveal: false, editing: null };
const MASK = "••••••";

function defaultData() { return { items: [] }; }

/** 由名稱、設備類型推斷分類（匯入時用，之後可在編輯視窗修改） */
function guessCat(x) {
  const t = `${x.name} ${x.type} ${x.note}`;
  if (/ricoh|打印機|影印機|printer|^HP-\d|laserjet/i.test(t)) return "打印機";
  if (/linksys|aruba|\bAP\b|\(AP\)|wifi|wi-fi|RT-AX/i.test(t)) return "無線網絡";
  if (/hall|matrix|mixer|pa-system|aver|streaming|cctv|控制主機|led wall|^RM\d|^LC\d|eattendance/i.test(t)) return "影音及課室";
  if (/cisco|huawei|netgear|hpe|mikrotik|fortinet|switch|router|firewall|asa\d/i.test(t)) return "網絡設備";
  if (/svr|server|^DC\d|\bLBS|\bLDS|\bAIS|\bLIS|idrac|imm2?|hyper-v|synology|esda|readwrite|vmsvr|domain/i.test(t)) return "伺服器";
  return "其他";
}

const lines = (v) => String(v || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
/** 從「10.94.96.2」「http://10.10.20.30」「172.16.15.18 (LWCPS)」取出 IP */
const ipOf = (s) => (String(s).match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/) || [])[1] || "";

/** 所有 IP 出現次數，用來提示重複 */
function ipIndex(items) {
  const idx = {};
  for (const x of items) {
    for (const s of [...lines(x.ip), ...lines(x.vlan)]) {
      const ip = ipOf(s);
      if (ip) (idx[ip] ||= new Set()).add(x.id);
    }
  }
  return idx;
}

/* ---------- 版面 ---------- */
function render(box, data, api) {
  V.data = { items: [], ...data };
  V.api = api;
  ensureDialog();
  const hadFocus = document.activeElement?.id === "dv-q";
  const caret = hadFocus ? document.activeElement.selectionStart : null;
  box.innerHTML = `
    <section class="cx-card">
      <header class="cx-head">
        <h2 class="cx-title"><span class="cx-title-icon pr-icon" aria-hidden="true">🌐</span>裝置 IP 記錄</h2>
        <div class="cx-tools">
          <select id="dv-cat" class="dv-cat" aria-label="分類">
            <option value="">全部分類</option>
            ${CATS.map((c) => `<option value="${c}" ${V.cat === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
          <input id="dv-q" type="search" class="cx-search" placeholder="過濾名稱、IP、MAC、類型…" value="${esc(V.q)}" autocomplete="off">
          <button class="btn btn--small" type="button" data-dv-import>匯入 Excel</button>
          <button class="btn btn--small btn--primary" type="button" data-dv-add>＋ 新增</button>
        </div>
      </header>
      <div id="dv-view"></div>
      <footer class="cx-foot" id="dv-foot"></footer>
    </section>
    <input type="file" id="dv-file" accept=".xlsx,.xls" hidden>`;
  const q = box.querySelector("#dv-q");
  q.addEventListener("input", () => { V.q = q.value; renderView(); });
  if (hadFocus) { q.focus(); try { q.setSelectionRange(caret, caret); } catch { /* 部分瀏覽器不支援 */ } }
  box.querySelector("#dv-cat").addEventListener("change", (e) => { V.cat = e.target.value; renderView(); });
  box.querySelector("[data-dv-add]").addEventListener("click", () => openDialog(null));
  box.querySelector("[data-dv-import]").addEventListener("click", () => box.querySelector("#dv-file").click());
  box.querySelector("#dv-file").addEventListener("change", importExcel);
  box.querySelector("#dv-view").addEventListener("click", onViewClick);
  box.querySelector("#dv-view").addEventListener("change", (e) => {
    if (e.target.matches("[data-dv-reveal]")) { V.reveal = e.target.checked; renderView(); }
  });
  renderView();
}

const matches = (x, q) => !q || [x.name, x.category, x.ip, x.vlan, x.mac, x.sn, x.type, x.note, ...(x.accounts || []).map((a) => a.login)]
  .some((v) => String(v || "").toLowerCase().includes(q));

function renderView() {
  const q = V.q.trim().toLowerCase();
  const items = V.data.items;
  const list = items.filter((x) => (!V.cat || (x.category || "其他") === V.cat) && matches(x, q));
  const by = V.api.updatedBy ? `最後更新：${esc(V.api.updatedBy.split("@")[0])}${V.api.updatedAt ? ` ${fmt(V.api.updatedAt)}` : ""}` : "";
  document.querySelector("#dv-foot").innerHTML = `<span>${list.length !== items.length ? `顯示 ${list.length} 部（共 ${items.length} 部）` : `共 ${items.length} 部`}</span><span>${by}</span>`;
  const box = document.querySelector("#dv-view");
  if (!items.length) {
    box.innerHTML = `<div class="pr-empty"><p>還未有裝置資料。</p>
      <p class="hint">按「匯入 Excel」上載裝置 IP 資料表（欄位：名稱、內部網路 IP、VLAN4 IP、MAC、S/N、Login、Password、設備類型、備註），或按「＋ 新增」逐部加入。</p></div>`;
    return;
  }
  const idx = ipIndex(items);
  const dupCount = Object.values(idx).filter((s) => s.size > 1).length;
  const cats = [...new Set(list.map((x) => x.category || "其他"))].sort((a, b) => catRank(a) - catRank(b));
  box.innerHTML = `
    <div class="pr-tools">
      ${dupCount ? `<span class="dv-dup-note">⚠ 有 ${dupCount} 個 IP 同時記錄在多於一部裝置</span>` : ""}
      <label class="check"><input type="checkbox" data-dv-reveal ${V.reveal ? "checked" : ""}> 顯示密碼</label>
    </div>
    ${list.length ? `
      <div class="table-scroll cx-scroll"><table class="cx-table pr-table dv-table" data-no-translate>
        <colgroup>
          <col class="dv-c-name"><col class="dv-c-ip"><col class="dv-c-vlan"><col class="dv-c-mac"><col class="dv-c-sn">
          <col class="dv-c-login"><col class="dv-c-pw"><col class="dv-c-type"><col class="dv-c-note"><col class="pr-c-edit">
        </colgroup>
        <thead><tr><th>名稱</th><th>內部網路 IP</th><th>VLAN4 IP</th><th>MAC</th><th>S/N</th><th>Login</th><th>Password</th><th>設備類型</th><th>備註</th><th><span class="sr-only">編輯</span></th></tr></thead>
        ${cats.map((c) => {
          const rows = list.filter((x) => (x.category || "其他") === c).sort(byIp);
          return `<tbody>
            <tr class="pr-floor-row"><th colspan="10" scope="rowgroup">${esc(c)} <small>${rows.length} 部</small></th></tr>
            ${rows.map((x) => rowHtml(x, idx)).join("")}
          </tbody>`;
        }).join("")}
      </table></div>` : `<p class="empty pr-pad">沒有符合的裝置。</p>`}`;
}

/** 按第一個 IP 排序（數字順序），沒有 IP 的排最後 */
function byIp(a, b) {
  const key = (x) => {
    const ip = ipOf(lines(x.ip)[0] || "");
    return ip ? ip.split(".").map((n) => n.padStart(3, "0")).join(".") : "999";
  };
  return key(a).localeCompare(key(b)) || String(a.name).localeCompare(String(b.name));
}

function ipCell(v, idx, selfId) {
  const ls = lines(v);
  if (!ls.length) return "";
  return ls.map((s) => {
    const ip = ipOf(s);
    if (!ip) return `<div>${esc(s)}</div>`;
    const others = [...(idx[ip] || [])].filter((id) => id !== selfId);
    const names = others.map((id) => V.data.items.find((x) => x.id === id)?.name || "").filter(Boolean);
    const extra = s.replace(/^https?:\/\//i, "").replace(ip, "").trim();
    return `<div class="dv-ipline"><a class="pr-ip" href="http://${esc(ip)}" target="_blank" rel="noopener noreferrer" title="開啟網頁管理介面">${esc(ip)}</a>${extra ? ` <small class="pr-alias">${esc(extra)}</small>` : ""}${others.length ? ` <span class="dv-dup" title="同一 IP 亦記錄在：${esc(names.join("、"))}">重複</span>` : ""}</div>`;
  }).join("");
}

function rowHtml(x, idx) {
  const acc = (x.accounts || []).filter((a) => a.login || a.password);
  return `
    <tr data-id="${x.id}" tabindex="0" title="按一下編輯">
      <td><span class="cx-company dv-name">${esc(x.name)}</span></td>
      <td>${ipCell(x.ip, idx, x.id) || `<span class="hint">—</span>`}</td>
      <td>${ipCell(x.vlan, idx, x.id)}</td>
      <td class="pr-mono">${lines(x.mac).map((m) => `<div>${esc(m)}</div>`).join("")}</td>
      <td class="pr-mono">${esc(x.sn || "")}</td>
      <td class="pr-login">${acc.map((a) => `<div class="dv-acc">${esc(a.login || "—")}</div>`).join("")}</td>
      <td class="pr-pwcell">${acc.map((a, i) => `<div class="dv-acc">${a.password ? `<span class="pr-pw" data-pw="${i}">${V.reveal ? esc(a.password) : MASK}</span>
        <button class="icon-mini" type="button" data-dv-peek="${i}" title="顯示">👁</button>
        <button class="icon-mini" type="button" data-dv-copy="${i}" title="複製密碼">📋</button>` : ""}</div>`).join("")}</td>
      <td class="dv-pre">${esc(x.type || "")}</td>
      <td class="cx-note dv-pre">${esc(x.note || "")}</td>
      <td class="cx-edit"><span aria-hidden="true">✎</span></td>
    </tr>`;
}

async function onViewClick(e) {
  const tr = e.target.closest("tr[data-id]");
  if (!tr || e.target.closest("a")) return;
  const x = V.data.items.find((i) => i.id === tr.dataset.id);
  if (!x) return;
  const peek = e.target.closest("[data-dv-peek]");
  if (peek) {
    const i = Number(peek.dataset.dvPeek);
    const span = tr.querySelector(`[data-pw="${i}"]`);
    const pw = (x.accounts || []).filter((a) => a.login || a.password)[i]?.password || "";
    span.textContent = span.textContent === MASK ? pw : MASK;
    return;
  }
  const copy = e.target.closest("[data-dv-copy]");
  if (copy) {
    const pw = (x.accounts || []).filter((a) => a.login || a.password)[Number(copy.dataset.dvCopy)]?.password || "";
    try { await navigator.clipboard.writeText(pw); toast("已複製密碼。", "success"); } catch { toast("未能複製，請按「顯示」後自行選取。", "error"); }
    return;
  }
  openDialog(x.id);
}

/* ---------- 匯入 Excel ---------- */
async function importExcel(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const XLSX = await loadXlsx();
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const items = parseSheet(XLSX, ws);
    if (!items.length) throw new Error("檔案中沒有裝置資料。");
    const msg = V.data.items.length
      ? `以檔案中的 ${items.length} 部裝置取代現有的 ${V.data.items.length} 部？（相同名稱及 IP 的分類會保留）`
      : `匯入 ${items.length} 部裝置？`;
    if (!confirm(msg)) return;
    await commit({ ...V.data, items }, `已匯入 ${items.length} 部裝置。請檢查各部的分類是否正確。`);
    renderView();
  } catch (err) {
    console.error(err);
    toast("未能匯入：" + err.message, "error");
  }
}

/**
 * 讀取裝置 IP 表：
 * 「名稱」欄合併了幾行的，視為同一部裝置（例如一部伺服器有兩個 IP，或有兩組登入帳戶）。
 */
function parseSheet(XLSX, ws) {
  const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : { s: { r: 0, c: 0 } };
  const r0 = range.s.r;
  const c0 = range.s.c;
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: true })
    .map((r) => r.map((v) => String(v ?? "").trim()));
  const merges = (ws["!merges"] || []).map((m) => ({ s: { r: m.s.r - r0, c: m.s.c - c0 }, e: { r: m.e.r - r0, c: m.e.c - c0 } }));
  const hi = grid.findIndex((r) => r.some((c) => /名稱|name/i.test(c)) && r.some((c) => /ip/i.test(c)));
  if (hi < 0) throw new Error("找不到「名稱」及「IP」標題。");
  const head = grid[hi];
  const col = (re, not) => head.findIndex((c) => re.test(c) && !(not && not.test(c)));
  const C = {
    name: col(/名稱|name/i), ip: col(/ip/i, /vlan/i), vlan: col(/vlan/i), mac: col(/mac/i), sn: col(/s\/?n|serial|序號/i),
    login: col(/login|帳戶|user/i), password: col(/pass|密碼/i), type: col(/類型|type/i), note: col(/備註|備注|remark|note/i),
  };
  const cell = (r, k) => { const v = C[k] >= 0 ? (grid[r]?.[C[k]] || "") : ""; return /^(null|n\/a|-)$/i.test(v) ? "" : v; };
  // 名稱欄合併範圍：被覆蓋的行屬於同一部裝置
  const owner = {};
  for (const m of merges) {
    if (m.s.c <= C.name && C.name <= m.e.c && m.e.r > m.s.r) for (let r = m.s.r + 1; r <= m.e.r; r++) owner[r] = m.s.r;
  }
  const groups = [];
  let cur = null;
  for (let r = hi + 1; r < grid.length; r++) {
    const has = Object.keys(C).some((k) => cell(r, k));
    if (!has) continue;
    if (cell(r, "name") || !(r in owner) || !cur) {
      cur = { rows: [r] };
      groups.push(cur);
    } else cur.rows.push(r);
  }
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  return groups.map(({ rows }) => {
    const all = (k) => uniq(rows.map((r) => cell(r, k)));
    const accounts = rows.map((r) => ({ login: cell(r, "login"), password: cell(r, "password") })).filter((a) => a.login || a.password);
    const x = {
      name: cell(rows[0], "name") || "（未命名）",
      ip: all("ip").join("\n"), vlan: all("vlan").join("\n"),
      mac: all("mac").map((m) => m.toUpperCase()).join("\n"), sn: all("sn").join("\n"),
      accounts, type: all("type").join("\n"), note: all("note").join("\n"),
    };
    const first = ipOf(lines(x.ip)[0] || "");
    const old = V.data.items.find((o) => o.name === x.name && ipOf(lines(o.ip)[0] || "") === first);
    return { id: old?.id || uid(), category: old?.category || guessCat(x), ...x };
  });
}

/* ---------- 新增／編輯 ---------- */
function ensureDialog() {
  if (V.dialog) return;
  const d = document.createElement("dialog");
  d.className = "sheet sheet--wide";
  d.id = "dv-dialog";
  d.setAttribute("aria-labelledby", "dv-dialog-title");
  d.innerHTML = `
    <form id="dv-form" novalidate>
      <div class="dev-head"><h2 id="dv-dialog-title">新增裝置</h2><button class="btn btn--small" type="button" data-dv-close>關閉</button></div>
      <div class="field-row">
        <label class="field"><span>名稱</span><input name="name" maxlength="80" required placeholder="例如 DC005、Cisco C3850" data-no-translate></label>
        <label class="field"><span>分類</span><select name="category">${CATS.map((c) => `<option value="${c}">${c}</option>`).join("")}</select></label>
      </div>
      <div class="field-row">
        <label class="field"><span>內部網路 IP（一行一個）</span><textarea name="ip" rows="2" maxlength="300" data-no-translate></textarea></label>
        <label class="field"><span>VLAN4 IP（一行一個）</span><textarea name="vlan" rows="2" maxlength="300" data-no-translate></textarea></label>
      </div>
      <div class="field-row">
        <label class="field"><span>MAC（一行一個）</span><textarea name="mac" rows="2" maxlength="300" data-no-translate></textarea></label>
        <label class="field"><span>S/N</span><input name="sn" maxlength="80" data-no-translate></label>
      </div>
      <div class="field"><span>登入帳戶</span>
        <div id="dv-acc-list"></div>
        <button class="btn btn--small" type="button" data-dv-acc-add>＋ 新增帳戶</button></div>
      <label class="field"><span>設備類型</span><textarea name="type" rows="2" maxlength="500" data-no-translate></textarea></label>
      <label class="field"><span>備註（選填）</span><textarea name="note" rows="2" maxlength="500" data-no-translate></textarea></label>
      <p class="warn" id="dv-warn" hidden></p>
      <div class="actions actions--start cx-actions">
        <button class="btn btn--primary" type="submit">儲存</button>
        <button class="btn btn--stop" type="button" data-dv-delete>刪除</button>
      </div>
    </form>`;
  document.body.append(d);
  V.dialog = d;
  d.addEventListener("click", async (e) => {
    if (e.target.closest("[data-dv-close]")) d.close();
    if (e.target.closest("[data-dv-acc-add]")) { addAccRow({}); d.querySelector("#dv-acc-list .cx-phone-row:last-child input").focus(); }
    if (e.target.closest("[data-dv-acc-del]")) e.target.closest(".cx-phone-row").remove();
    const tg = e.target.closest("[data-dv-acc-toggle]");
    if (tg) {
      const i = tg.closest(".cx-phone-row").querySelector("[name=acc-pw]");
      i.type = i.type === "password" ? "text" : "password";
      tg.textContent = i.type === "password" ? "顯示" : "隱藏";
    }
    if (e.target.closest("[data-dv-delete]")) {
      const x = V.data.items.find((i) => i.id === V.editing);
      if (x && confirm(`刪除「${x.name}」？`)
        && await commit({ ...V.data, items: V.data.items.filter((i) => i.id !== x.id) }, "已刪除。")) { d.close(); renderView(); }
    }
  });
  d.querySelector("#dv-form").addEventListener("submit", (e) => { e.preventDefault(); save(); });
}
function addAccRow(a) {
  const row = document.createElement("div");
  row.className = "cx-phone-row";
  row.innerHTML = `
    <input name="acc-login" maxlength="80" placeholder="Login" autocomplete="off" value="${esc(a.login || "")}" data-no-translate>
    <input name="acc-pw" type="password" maxlength="120" placeholder="Password" autocomplete="new-password" value="${esc(a.password || "")}" data-no-translate>
    <button class="btn btn--small" type="button" data-dv-acc-toggle>顯示</button>
    <button class="btn btn--small btn--stop" type="button" data-dv-acc-del aria-label="刪除這個帳戶">✕</button>`;
  V.dialog.querySelector("#dv-acc-list").append(row);
}
function openDialog(id) {
  const x = id ? V.data.items.find((i) => i.id === id) : null;
  V.editing = id;
  const f = V.dialog.querySelector("#dv-form");
  f.reset();
  V.dialog.querySelector("#dv-warn").hidden = true;
  V.dialog.querySelector("#dv-dialog-title").textContent = x ? "編輯裝置" : "新增裝置";
  for (const k of ["name", "ip", "vlan", "mac", "sn", "type", "note"]) f[k].value = x?.[k] || "";
  f.category.value = x?.category || (V.cat || "其他");
  V.dialog.querySelector("#dv-acc-list").innerHTML = "";
  const acc = x?.accounts?.length ? x.accounts : [{}];
  acc.forEach(addAccRow);
  V.dialog.querySelector("[data-dv-delete]").hidden = !x;
  V.dialog.showModal();
  f.name.focus();
}
async function save() {
  const f = V.dialog.querySelector("#dv-form");
  const warn = (m) => { const w = V.dialog.querySelector("#dv-warn"); w.hidden = !m; w.textContent = m; };
  const v = (k) => f[k].value.trim();
  if (!v("name")) { f.name.focus(); return warn("請填寫名稱。"); }
  const accounts = [...V.dialog.querySelectorAll("#dv-acc-list .cx-phone-row")].map((r) => ({
    login: r.querySelector("[name=acc-login]").value.trim(), password: r.querySelector("[name=acc-pw]").value,
  })).filter((a) => a.login || a.password);
  const clean = (k) => lines(f[k].value).join("\n");
  const item = {
    id: V.editing || uid(), name: v("name"), category: f.category.value,
    ip: clean("ip"), vlan: clean("vlan"), mac: lines(f.mac.value).map((m) => m.toUpperCase()).join("\n"), sn: v("sn"),
    accounts, type: f.type.value.trim(), note: f.note.value.trim(),
  };
  const old = V.data.items.find((i) => i.id === V.editing);
  const items = old ? V.data.items.map((i) => (i.id === item.id ? item : i)) : [...V.data.items, item];
  if (await commit({ ...V.data, items }, "已儲存。")) { V.dialog.close(); renderView(); }
}

async function commit(data, msg) {
  try {
    await V.api.save(data);
    V.data = data;
    toast(msg, "success");
    return true;
  } catch (err) {
    toast("未能儲存：" + err.message, "error");
    return false;
  }
}
const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export const devicesPage = { id: "devices", name: "裝置 IP", icon: "🌐", defaultData, render };
