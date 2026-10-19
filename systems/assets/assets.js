import {
  boot, db, esc, toast, fmtDate, todayId, enhanceDateInputs, downloadCSV,
} from "../../assets/js/common.js?v=20261019a";
import {
  collection, doc, onSnapshot, getDoc, getDocs, query, where, writeBatch, serverTimestamp, deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ASSET, USAGE, STATUS, CHECK, currentYearStart, yearLabel, placeText,
} from "./assets-config.js?v=20261019a";
import { setupImport } from "./assets-import.js?v=20261019a";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, items: [], openId: null };
const itemRef = (id) => doc(db, ASSET.coll, id);
const histColl = () => collection(db, ASSET.histColl);
export const idOf = (label) => String(label || "").trim().replace(/[\/\s]+/g, "_");
const natural = (a, b) => String(a.label).localeCompare(String(b.label), "en", { numeric: true });
const statusLabel = (d) => STATUS[d.status]?.label || d.status || "正常";
const usageLabel = (d) => USAGE[d.usage]?.label || "—";
const active = (d) => d.status !== "retired";

/* ---------- 排序 ---------- */
const SORT = { list: { key: "label", dir: 1 }, teacher: { key: "label", dir: 1 }, stock: { key: "place", dir: 1 } };
const collator = new Intl.Collator("zh-Hant", { numeric: true, sensitivity: "base" });
function cmp(a, b) {
  const ea = a == null || a === "";
  const eb = b == null || b === "";
  if (ea || eb) return ea && eb ? 0 : ea ? 1 : -1;
  return collator.compare(String(a), String(b));
}
const placeKey = (d) => `${{ cart: 1, teacher: 2, room: 3, spare: 4 }[d.usage] || 5}|${placeText(d)}`;
const ACC = {
  label: (d) => d.label, type: (d) => d.type, serial: (d) => d.serial, model: (d) => d.model, mdm: (d) => d.mdm,
  usage: (d) => usageLabel(d), place: placeKey, pencil: (d) => d.pencil, status: (d) => statusLabel(d),
  holder: (d) => d.holder?.name, since: (d) => d.holder?.since,
  stDone: (d) => (stockRec(d) ? 1 : 0), stResult: (d) => stockRec(d)?.result,
};
function sorted(list, table) {
  const { key, dir } = SORT[table];
  const f = ACC[key] || ACC.label;
  return [...list].sort((a, b) => cmp(f(a), f(b)) * dir || natural(a, b));
}
function th(table, key, label) {
  const on = SORT[table].key === key;
  return `<th class="sortable${on ? " is-sorted" : ""}" data-sort-table="${table}" data-sort="${key}"
    aria-sort="${on ? (SORT[table].dir > 0 ? "ascending" : "descending") : "none"}" tabindex="0">${label}<span class="sort-mark" aria-hidden="true">${on ? (SORT[table].dir > 0 ? "▲" : "▼") : "↕"}</span></th>`;
}
const RENDER = { list: () => renderList(), teacher: () => renderTeacher(), stock: () => renderStock() };
function onSortClick(e) {
  const h = e.target.closest("[data-sort]");
  if (!h || (e.type === "keydown" && e.key !== "Enter")) return;
  const st = SORT[h.dataset.sortTable];
  if (st.key === h.dataset.sort) st.dir *= -1; else { st.key = h.dataset.sort; st.dir = 1; }
  RENDER[h.dataset.sortTable]();
}
document.addEventListener("click", onSortClick);
document.addEventListener("keydown", onSortClick);

/* ---------- 啟動 ---------- */
boot({
  root: "../../", current: "assets",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) return;   // 非管理員已由 boot() 擋住
    S.user = user;
    setupTabs();
    setupFilters();
    setupTeacher();
    setupStock();
    setupAdd();
    setupImport({ getItems: () => S.items, userEmail: () => S.user.email });
    $("#dl-template").addEventListener("click", downloadTemplate);
    onSnapshot(collection(db, ASSET.coll), (snap) => {
      S.items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(natural);
      renderAll();
      if (S.openId && $("#asset-dialog").open) renderDetail(S.openId);
    }, (e) => {
      $("#overview").innerHTML = `<p class="load-error">未能讀取資料：${esc(e.message)}。請確認已發佈最新的 Firestore 規則。</p>`;
    });
  },
});

function renderAll() {
  renderStats();
  renderOverview();
  renderFilterOptions();
  renderList();
  renderTeacher();
  renderStock();
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
}
function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== `tab-${name}`; });
}

/* ---------- 統計 ---------- */
function renderStats() {
  const act = S.items.filter(active);
  const n = (f) => act.filter(f).length;
  const cards = [
    ["總數（不包括已注銷）", act.length],
    ["課堂 iPad 車", n((d) => d.usage === "cart")],
    ["教師借用中", n((d) => d.usage === "teacher" && d.holder)],
    ["教師借用：可借出", n((d) => d.usage === "teacher" && !d.holder && d.status === "normal")],
    ["課室／組別專用", n((d) => d.usage === "room")],
    ["維修中", n((d) => d.status === "repair")],
    ["遺失", n((d) => d.status === "lost")],
  ];
  $("#stats").innerHTML = cards.map(([k, v]) => `<div class="stat"><span class="stat-num">${v}</span><span class="stat-label">${esc(k)}</span></div>`).join("");
}

/* ---------- 總覽 ---------- */
function cartsInUse() {
  const set = new Set(ASSET.carts);
  S.items.forEach((d) => { if (d.usage === "cart" && d.cart) set.add(d.cart); });
  return [...set].sort((a, b) => collator.compare(a, b));
}
function renderOverview() {
  const box = $("#overview");
  if (!S.items.length) {
    box.innerHTML = `<p class="empty">還未有器材資料。請到「Excel 匯入／匯出」上載學校的資產表，或到「新增器材」逐部加入。</p>`;
    return;
  }
  const act = S.items.filter(active);
  const issues = (list) => list.filter((d) => d.status !== "normal");
  const carts = cartsInUse().map((c) => {
    const list = act.filter((d) => d.usage === "cart" && d.cart === c);
    const bad = issues(list);
    const models = [...new Set(list.map((d) => d.model).filter(Boolean))];
    return `
      <button class="ov-card" type="button" data-goto-place="cart:${esc(c)}">
        <span class="ov-title">${esc(c)}</span>
        <span class="ov-num">${list.length - bad.length}<small> / ${list.length}</small></span>
        <span class="ov-sub">${bad.length ? `<span class="badge badge--stop">${bad.length} 部有問題</span>` : "全部正常"}</span>
        <span class="ov-sub">${esc(models.join("、") || "—")}</span>
      </button>`;
  }).join("");
  const teach = act.filter((d) => d.usage === "teacher");
  const rooms = {};
  act.filter((d) => d.usage === "room" || d.usage === "spare").forEach((d) => {
    const k = `${d.usage}:${d.location || "（未填位置）"}`;
    (rooms[k] ||= []).push(d);
  });
  const roomRows = Object.entries(rooms).sort(([a], [b]) => collator.compare(a, b)).map(([k, list]) => {
    const [u, place] = [k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1)];
    return `<tr data-goto-place="${esc(k)}" tabindex="0" class="clickable">
      <td data-no-translate>${esc(place)}</td><td>${esc(USAGE[u].label)}</td><td class="num">${list.length}</td>
      <td>${list.map((d) => esc(d.label)).join("、")}</td>
      <td>${issues(list).length ? `<span class="badge badge--stop">${issues(list).length}</span>` : ""}</td></tr>`;
  }).join("");
  const byStatus = Object.entries(STATUS).filter(([k]) => k !== "normal")
    .map(([k, v]) => [v, S.items.filter((d) => d.status === k)]).filter(([, l]) => l.length);
  box.innerHTML = `
    <h2>課堂 iPad 車</h2>
    <p class="hint">數字為正常／總數，按一下查看該車的 iPad。</p>
    <div class="ov-grid">${carts}</div>

    <h2 class="mt">教師長期借用</h2>
    <div class="ov-grid">
      <button class="ov-card" type="button" data-goto-teacher="loaned"><span class="ov-title">借出中</span>
        <span class="ov-num">${teach.filter((d) => d.holder).length}</span></button>
      <button class="ov-card" type="button" data-goto-teacher="free"><span class="ov-title">可借出</span>
        <span class="ov-num">${teach.filter((d) => !d.holder && d.status === "normal").length}</span>
        <span class="ov-sub">${issues(teach.filter((d) => !d.holder)).length ? `另有 ${issues(teach.filter((d) => !d.holder)).length} 部有問題` : ""}</span></button>
    </div>

    <h2 class="mt">課室／組別專用及後備</h2>
    ${roomRows ? `<div class="table-scroll"><table class="table">
      <thead><tr><th>位置／組別</th><th>用途</th><th>數量</th><th>器材</th><th>有問題</th></tr></thead>
      <tbody>${roomRows}</tbody></table></div>` : `<p class="empty">沒有課室或組別專用的器材。</p>`}

    ${byStatus.length ? `<h2 class="mt">需要跟進</h2>
      <div class="table-scroll"><table class="table"><thead><tr><th>狀態</th><th>數量</th><th>器材</th></tr></thead><tbody>
      ${byStatus.map(([v, l]) => `<tr><td><span class="badge badge--${v.tone}">${esc(v.label)}</span></td><td class="num">${l.length}</td>
        <td>${l.map((d) => `<button class="link-btn" type="button" data-open="${esc(d.id)}">${esc(d.label)}</button>`).join("、")}</td></tr>`).join("")}
      </tbody></table></div>` : ""}`;
}
$("#overview").addEventListener("click", (e) => {
  const o = e.target.closest("[data-open]");
  if (o) { renderDetail(o.dataset.open); return; }
  const p = e.target.closest("[data-goto-place]");
  if (p) {
    clearFilters();
    $("#f-place").value = p.dataset.gotoPlace;
    showTab("list");
    renderList();
    return;
  }
  const t = e.target.closest("[data-goto-teacher]");
  if (t) { $("#t-filter").value = t.dataset.gotoTeacher; showTab("teacher"); renderTeacher(); }
});
$("#overview").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("[data-goto-place]")) e.target.click();
});

/* ---------- 資產清單 ---------- */
const FILTERS = ["#f-q", "#f-type", "#f-usage", "#f-place", "#f-model", "#f-mdm", "#f-status"];
function setupFilters() {
  FILTERS.forEach((id) => $(id).addEventListener(id === "#f-q" ? "input" : "change", renderList));
  $("#f-clear").addEventListener("click", () => { clearFilters(); renderList(); });
  $("#export-csv").addEventListener("click", exportCSV);
  $("#asset-list").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr) renderDetail(tr.dataset.id);
  });
  $("#asset-list").addEventListener("keydown", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr && e.key === "Enter") renderDetail(tr.dataset.id);
  });
}
function clearFilters() { FILTERS.forEach((id) => { $(id).value = ""; }); }
/** 位置篩選的值：cart:Car1、teacher:、room:7/F(RM702)、spare:… */
const placeValue = (d) => (d.usage === "cart" ? `cart:${d.cart || ""}` : d.usage === "teacher" ? "teacher:" : `${d.usage}:${d.location || "（未填位置）"}`);
function renderFilterOptions() {
  const keep = (sel, html) => { const v = sel.value; sel.innerHTML = html; if ([...sel.options].some((o) => o.value === v)) sel.value = v; };
  const opts = (list) => list.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
  const uniq = (f) => [...new Set(S.items.map(f).filter(Boolean))].sort((a, b) => collator.compare(a, b));
  keep($("#f-type"), `<option value="">全部</option>${opts(uniq((d) => d.type))}`);
  keep($("#f-usage"), `<option value="">全部</option>` + Object.entries(USAGE).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join(""));
  keep($("#f-status"), `<option value="">全部（不包括已注銷）</option>` + Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join(""));
  keep($("#f-model"), `<option value="">全部</option>${opts(uniq((d) => d.model))}`);
  keep($("#f-mdm"), `<option value="">全部</option>${opts(uniq((d) => d.mdm))}`);
  const places = uniq(placeValue);
  const placeOpts = `<option value="">全部</option>` + places.map((p) => {
    const [u, rest] = [p.slice(0, p.indexOf(":")), p.slice(p.indexOf(":") + 1)];
    return `<option value="${esc(p)}">${esc(u === "teacher" ? USAGE.teacher.label : rest)}</option>`;
  }).join("");
  keep($("#f-place"), placeOpts);
  keep($("#st-place"), placeOpts);
  $("#model-list").innerHTML = opts(uniq((d) => d.model));
  $("#cart-list").innerHTML = opts(cartsInUse());
  $("#place-list").innerHTML = opts(uniq((d) => d.location));
}
function filtered() {
  const q = $("#f-q").value.trim().toLowerCase();
  const v = (id) => $(id).value;
  return S.items.filter((d) => {
    if (v("#f-status") ? d.status !== v("#f-status") : !active(d)) return false;
    if (v("#f-type") && d.type !== v("#f-type")) return false;
    if (v("#f-usage") && d.usage !== v("#f-usage")) return false;
    if (v("#f-place") && placeValue(d) !== v("#f-place")) return false;
    if (v("#f-model") && d.model !== v("#f-model")) return false;
    if (v("#f-mdm") && d.mdm !== v("#f-mdm")) return false;
    if (q && ![d.label, d.serial, d.model, placeText(d), d.location, d.holder?.name, d.pencil, d.accessories, d.note]
      .some((x) => String(x || "").toLowerCase().includes(q))) return false;
    return true;
  });
}
function renderList() {
  const list = sorted(filtered(), "list");
  $("#list-count").textContent = `顯示 ${list.length} 項（共 ${S.items.filter(active).length} 項，不包括已注銷）`;
  const box = $("#asset-list");
  if (!S.items.length) { box.innerHTML = `<p class="empty">還未有器材資料。</p>`; return; }
  if (!list.length) { box.innerHTML = `<p class="empty">沒有符合條件的器材。</p>`; return; }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table table--click">
        <thead><tr>${th("list", "label", "Label")}${th("list", "type", "類別")}${th("list", "serial", "機序號")}${th("list", "model", "型號")}
          ${th("list", "mdm", "MDM")}${th("list", "usage", "用途")}${th("list", "place", "位置／使用者")}${th("list", "pencil", "Apple Pencil")}${th("list", "status", "狀態")}</tr></thead>
        <tbody>
          ${list.map((d) => `
            <tr data-id="${esc(d.id)}" tabindex="0">
              <td><strong>${esc(d.label)}</strong></td>
              <td>${esc(d.type || "")}</td>
              <td class="mono">${esc(d.serial || "")}</td>
              <td>${esc(d.model || "")}</td>
              <td>${esc(d.mdm || "")}</td>
              <td><span class="badge badge--${USAGE[d.usage]?.tone || "muted"}">${esc(usageLabel(d))}</span></td>
              <td data-no-translate>${esc(placeText(d))}${d.usage === "teacher" && d.holder?.since ? `<br><small>${fmtDate(d.holder.since)} 起</small>` : ""}</td>
              <td>${esc(d.pencil || "")}</td>
              <td><span class="badge badge--${STATUS[d.status]?.tone || "go"}">${esc(statusLabel(d))}</span></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
const CSV_HEAD = ["Label", "類別", "機序號", "型號", "MDM 系統", "擁有權", "用途", "iPad 車", "車內編號", "位置／組別", "借用老師", "借用日期",
  "Apple Pencil", "配件", "狀態", "備註"];
const csvRow = (d) => [d.label, d.type, d.serial, d.model, d.mdm, d.owner, usageLabel(d), d.cart, d.slot, d.location,
  d.holder?.name, d.holder?.since, d.pencil, d.accessories, statusLabel(d), d.note];
function exportCSV() {
  downloadCSV(`器材資產_${todayId()}.csv`, [CSV_HEAD, ...sorted(filtered(), "list").map(csvRow)]);
}
function downloadTemplate() {
  downloadCSV(`器材資產_更新範本_${todayId()}.csv`, [CSV_HEAD, ...S.items.map(csvRow)]);
}

/* ---------- 教師借用 ---------- */
function setupTeacher() {
  $("#t-q").addEventListener("input", renderTeacher);
  $("#t-filter").addEventListener("change", renderTeacher);
  $("#teacher-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (b) renderDetail(b.dataset.open, b.dataset.focus);
  });
}
function renderTeacher() {
  const q = $("#t-q").value.trim().toLowerCase();
  const f = $("#t-filter").value;
  const all = S.items.filter((d) => d.usage === "teacher" && active(d));
  const list = sorted(all.filter((d) => {
    if (f === "loaned" && !d.holder) return false;
    if (f === "free" && d.holder) return false;
    return !q || [d.label, d.holder?.name, d.pencil, d.accessories, d.model, d.note].some((x) => String(x || "").toLowerCase().includes(q));
  }), "teacher");
  const box = $("#teacher-list");
  if (!list.length) { box.innerHTML = `<p class="empty">${all.length ? "沒有符合條件的器材。" : "沒有教師長期借用的器材。"}</p>`; return; }
  box.innerHTML = `
    <p class="hint">借出中 ${all.filter((d) => d.holder).length} 部，可借出 ${all.filter((d) => !d.holder).length} 部。</p>
    <div class="table-scroll">
      <table class="table">
        <thead><tr>${th("teacher", "label", "Label")}${th("teacher", "model", "型號")}${th("teacher", "holder", "借用老師")}${th("teacher", "since", "借用日期")}
          ${th("teacher", "pencil", "Apple Pencil")}<th>配件</th>${th("teacher", "status", "狀態")}<th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          ${list.map((d) => `
            <tr>
              <td><button class="link-btn" type="button" data-open="${esc(d.id)}"><strong>${esc(d.label)}</strong></button></td>
              <td>${esc(d.model || "")}</td>
              <td data-no-translate>${d.holder ? esc(d.holder.name) : `<span class="badge badge--wait">可借出</span>`}</td>
              <td class="nowrap">${d.holder?.since ? fmtDate(d.holder.since) : ""}</td>
              <td>${esc(d.pencil || "")}</td>
              <td>${esc(d.accessories || "")}</td>
              <td><span class="badge badge--${STATUS[d.status]?.tone || "go"}">${esc(statusLabel(d))}</span></td>
              <td>${d.holder ? `<button class="btn btn--small" type="button" data-open="${esc(d.id)}" data-focus="return">歸還</button>`
                : `<button class="btn btn--small btn--primary" type="button" data-open="${esc(d.id)}" data-focus="loan">借出</button>`}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---------- 盤點 ---------- */
const stockYear = () => Number($("#st-year")?.value) || currentYearStart();
const stKey = (y) => `y${y}`;
const stockRec = (d) => d.stocktakes?.[stKey(stockYear())];
const isIssue = (r) => r && r.result && r.result !== "正常";
function setupStock() {
  const y = currentYearStart();
  $("#st-year").innerHTML = [y + 1, y, y - 1, y - 2].map((x) => `<option value="${x}" ${x === y ? "selected" : ""}>${yearLabel(x)}</option>`).join("");
  ["#st-year", "#st-filter", "#st-place"].forEach((id) => $(id).addEventListener("change", renderStock));
  $("#st-q").addEventListener("input", renderStock);
  $("#st-export").addEventListener("click", exportStock);
  $("#st-scan").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    const d = S.items.find((x) => String(x.label).toLowerCase() === q || String(x.serial || "").toLowerCase() === q);
    if (!d) { toast(`找不到 ${e.target.value.trim()}。`, "error"); e.target.select(); return; }
    const done = stockRec(d);
    if (done) { toast(`${d.label} 已於 ${fmtDate(done.date)} 盤點。`); e.target.value = ""; return; }
    await saveStock(d, { result: "正常", note: "" });
    e.target.value = "";
  });
  $("#st-list").addEventListener("change", async (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const d = S.items.find((x) => x.id === tr.dataset.id);
    const rec = { result: tr.querySelector("[name=result]").value, note: tr.querySelector("[name=stnote]").value.trim() };
    if (e.target.matches("[data-done]")) {
      if (e.target.checked) await saveStock(d, rec);
      else if (confirm(`取消 ${d.label} 的盤點記錄？`)) await undoStock(d);
      else e.target.checked = true;
    } else if (stockRec(d)) {
      await saveStock(d, rec, true);   // 已盤點：直接更新結果或備註
    }
  });
  $("#st-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (b) renderDetail(b.dataset.open);
  });
}
async function saveStock(d, rec, update = false) {
  const y = stockYear();
  const data = { ...rec, date: todayId(), by: S.user.email };
  const b = writeBatch(db);
  b.update(itemRef(d.id), { [`stocktakes.${stKey(y)}`]: data, updatedAt: serverTimestamp() });
  b.set(doc(histColl()), { itemId: d.id, label: d.label, type: "stock", date: todayId(), by: S.user.email, at: serverTimestamp(),
    note: `${yearLabel(y)}：${rec.result}${rec.note ? `（${rec.note}）` : ""}${update ? "（修改）" : ""}` });
  try {
    await b.commit();
    if (!update) toast(`${d.label} 已完成盤點${isIssue(rec) ? `（${rec.result}）` : ""}。`, isIssue(rec) ? "error" : "success");
  } catch (err) { toast("未能儲存：" + err.message, "error"); }
}
async function undoStock(d) {
  const b = writeBatch(db);
  b.update(itemRef(d.id), { [`stocktakes.${stKey(stockYear())}`]: deleteField(), updatedAt: serverTimestamp() });
  b.set(doc(histColl()), { itemId: d.id, label: d.label, type: "stock", date: todayId(), by: S.user.email, at: serverTimestamp(),
    note: `取消 ${yearLabel(stockYear())} 盤點` });
  try { await b.commit(); toast(`已取消 ${d.label} 的盤點記錄。`); } catch (err) { toast("未能取消：" + err.message, "error"); }
}
function stockList() {
  const f = $("#st-filter").value;
  const pl = $("#st-place").value;
  const q = $("#st-q").value.trim().toLowerCase();
  return S.items.filter(active).filter((d) => {
    const r = stockRec(d);
    if (f === "todo" && r) return false;
    if (f === "done" && !r) return false;
    if (f === "issue" && !isIssue(r)) return false;
    if (pl && placeValue(d) !== pl) return false;
    return !q || [d.label, d.serial, placeText(d), d.location].some((x) => String(x || "").toLowerCase().includes(q));
  });
}
function renderStock() {
  if (!$("#st-year").value) return;
  const all = S.items.filter(active);
  const done = all.filter(stockRec);
  const issues = done.filter((d) => isIssue(stockRec(d)));
  const pct = all.length ? Math.round((done.length / all.length) * 100) : 0;
  $("#st-progress").innerHTML = `<div class="progress"><span style="width:${pct}%"></span></div>
    <p><strong>${done.length} / ${all.length}</strong> 已盤點（${pct}%）　未盤點 ${all.length - done.length} 項　有問題 ${issues.length} 項</p>`;
  const list = sorted(stockList(), "stock");
  const box = $("#st-list");
  if (!list.length) {
    box.innerHTML = `<p class="empty">${$("#st-filter").value === "todo" && all.length ? "全部器材已完成盤點。" : "沒有符合條件的器材。"}</p>`;
    return;
  }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr>${th("stock", "stDone", "完成")}${th("stock", "label", "Label")}${th("stock", "place", "位置／使用者")}${th("stock", "model", "型號")}
          ${th("stock", "serial", "機序號")}${th("stock", "stResult", "結果")}<th>備註</th><th>盤點日期</th></tr></thead>
        <tbody>
          ${list.map((d) => {
            const r = stockRec(d);
            return `
            <tr data-id="${esc(d.id)}" class="${isIssue(r) ? "is-issue" : ""}">
              <td><input type="checkbox" class="st-check" data-done ${r ? "checked" : ""} aria-label="${esc(d.label)} 完成盤點"></td>
              <td><button class="link-btn" type="button" data-open="${esc(d.id)}"><strong>${esc(d.label)}</strong></button></td>
              <td data-no-translate>${esc(placeText(d))}</td>
              <td>${esc(d.model || "")}</td>
              <td class="mono">${esc(d.serial || "")}</td>
              <td><select name="result">${CHECK.map((c) => `<option value="${esc(c)}" ${(r?.result || "正常") === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></td>
              <td><input name="stnote" maxlength="100" value="${esc(r?.note || "")}" placeholder="選填"></td>
              <td class="nowrap">${r ? fmtDate(r.date) : ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}
function exportStock() {
  const y = stockYear();
  const rows = [["Label", "類別", "機序號", "型號", "用途", "位置／使用者", "盤點結果", "盤點備註", "盤點日期", "盤點人"]];
  for (const d of sorted(S.items.filter(active), "stock")) {
    const r = d.stocktakes?.[stKey(y)] || {};
    rows.push([d.label, d.type, d.serial, d.model, usageLabel(d), placeText(d), r.result || "未盤點", r.note, r.date, r.by]);
  }
  downloadCSV(`器材資產_盤點_${yearLabel(y)}.csv`, rows);
}

/* ---------- 詳細資料及操作 ---------- */
const selectOpts = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(v.label)}</option>`).join("");
const listOpts = (list, cur) => [...new Set([...(cur ? [cur] : []), ...list])].map((x) => `<option value="${esc(x)}" ${x === cur ? "selected" : ""}>${esc(x)}</option>`).join("");

function renderDetail(id, focus = "") {
  const d = S.items.find((x) => x.id === id);
  if (!d) return;
  S.openId = id;
  const dialog = $("#asset-dialog");
  const h = d.holder;
  const openForm = (name) => (focus === name ? "open" : "");
  $("#asset-body").innerHTML = `
    <div class="dev-head">
      <h2 id="asset-title">${esc(d.label)} <span class="badge badge--${STATUS[d.status]?.tone || "go"}">${esc(statusLabel(d))}</span></h2>
      <button class="btn btn--small" type="button" data-close>關閉</button>
    </div>
    <dl class="kv kv--wide">
      <dt>類別</dt><dd>${esc(d.type || "—")}</dd>
      <dt>機序號</dt><dd class="mono">${esc(d.serial || "—")}</dd>
      <dt>型號</dt><dd>${esc(d.model || "—")}</dd>
      <dt>MDM</dt><dd>${esc(d.mdm || "—")}</dd>
      ${d.owner ? `<dt>擁有權</dt><dd>${esc(d.owner)}</dd>` : ""}
      <dt>用途</dt><dd><span class="badge badge--${USAGE[d.usage]?.tone || "muted"}">${esc(usageLabel(d))}</span></dd>
      <dt>位置／使用者</dt><dd data-no-translate>${esc(placeText(d))}${h?.since ? `，${fmtDate(h.since)} 起` : ""}</dd>
      <dt>Apple Pencil</dt><dd>${esc(d.pencil || "—")}</dd>
      <dt>配件</dt><dd>${esc(d.accessories || "—")}</dd>
      ${d.note ? `<dt>備註</dt><dd class="pre">${esc(d.note)}</dd>` : ""}
    </dl>

    ${d.usage === "teacher" && !h ? `
      <details class="card-form dev-form" ${openForm("loan") || "open"}><summary><strong>借出給老師</strong></summary>
        <form data-form="loan">
          <div class="field-row">
            <label class="field"><span>借用老師</span><input name="name" maxlength="40" required></label>
            <label class="field field--date"><span>借用日期</span><input type="date" name="since" value="${todayId()}"></label>
          </div>
          <div class="field-row">
            <label class="field"><span>Apple Pencil</span><input name="pencil" maxlength="20" value="${esc(d.pencil || "")}"></label>
            <label class="field"><span>配件</span><input name="accessories" maxlength="120" value="${esc(d.accessories || "")}"></label>
          </div>
          <div class="actions actions--start"><button class="btn btn--primary" type="submit">借出</button></div>
        </form>
      </details>` : ""}

    ${h ? `
      <details class="card-form dev-form" ${openForm("return") || "open"}><summary><strong>歸還</strong>（${esc(h.name)}）</summary>
        <form data-form="return">
          <div class="field-row">
            <label class="field field--date"><span>歸還日期</span><input type="date" name="date" value="${todayId()}"></label>
            <label class="field"><span>機身狀況</span><select name="cond">${CHECK.slice(0, 2).map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></label>
          </div>
          <label class="field"><span>備註（選填，例如欠缺的配件）</span><input name="note" maxlength="200"></label>
          <p class="hint">歸還後器材會留在「教師長期借用」並列為可借出；如機身有損壞，狀態會改為維修中。</p>
          <div class="actions actions--start"><button class="btn btn--primary" type="submit">登記歸還</button></div>
        </form>
      </details>` : ""}

    <details class="card-form dev-form"><summary><strong>調配</strong>（更改用途或位置）</summary>
      <form data-form="move">
        <label class="field"><span>用途</span><select name="usage">${selectOpts(USAGE, d.usage)}</select></label>
        <div class="field-row" data-usage-fields="cart">
          <label class="field"><span>iPad 車</span><select name="cart">${listOpts(cartsInUse(), d.cart)}</select></label>
          <label class="field"><span>車內編號</span><input name="slot" maxlength="5" value="${esc(d.slot || "")}"></label>
        </div>
        <label class="field" data-usage-fields="room spare"><span>位置／組別</span>
          <input name="location" maxlength="60" list="place-list" value="${esc(d.location || "")}"></label>
        <div class="field-row" data-usage-fields="teacher">
          <label class="field"><span>借用老師（留空即可借出）</span><input name="holder" maxlength="40" value="${esc(h?.name || "")}"></label>
          <label class="field field--date"><span>借用日期</span><input type="date" name="since" value="${esc(h?.since || todayId())}"></label>
        </div>
        <label class="field"><span>備註（選填，會記錄在操作記錄）</span><input name="note" maxlength="200"></label>
        <div class="actions actions--start"><button class="btn btn--primary" type="submit">儲存調配</button></div>
      </form>
    </details>

    <details class="card-form dev-form"><summary><strong>更改狀態</strong></summary>
      <form data-form="status">
        <label class="field"><span>新狀態</span><select name="status">${selectOpts(STATUS, d.status || "normal")}</select></label>
        <label class="field"><span>原因／備註</span><input name="note" maxlength="200" placeholder="例如：屏幕損壞，已送修"></label>
        <div class="actions actions--start"><button class="btn btn--primary" type="submit">更改狀態</button></div>
      </form>
    </details>

    <details class="card-form dev-form"><summary><strong>編輯資料</strong></summary>
      <form data-form="edit">
        <div class="field-row">
          <label class="field"><span>類別</span><select name="type">${listOpts(ASSET.types, d.type)}</select></label>
          <label class="field"><span>機序號</span><input name="serial" maxlength="40" value="${esc(d.serial || "")}"></label>
        </div>
        <div class="field-row">
          <label class="field"><span>型號</span><input name="model" maxlength="80" list="model-list" value="${esc(d.model || "")}"></label>
          <label class="field"><span>MDM 系統</span><select name="mdm">${listOpts(ASSET.mdmSystems, d.mdm)}</select></label>
        </div>
        <div class="field-row">
          <label class="field"><span>Apple Pencil</span><input name="pencil" maxlength="20" value="${esc(d.pencil || "")}"></label>
          <label class="field"><span>配件</span><input name="accessories" maxlength="120" value="${esc(d.accessories || "")}"></label>
        </div>
        <label class="field"><span>擁有權</span><input name="owner" maxlength="40" value="${esc(d.owner || "")}"></label>
        <label class="field"><span>備註</span><textarea name="note" rows="2" maxlength="300">${esc(d.note || "")}</textarea></label>
        <div class="actions actions--start">
          <button class="btn btn--primary" type="submit">儲存資料</button>
          <button class="btn btn--stop" type="button" data-act="delete">刪除這項器材</button>
        </div>
      </form>
    </details>

    <h3 class="mt-s">操作記錄</h3>
    <div id="asset-history"><p class="hint">正在讀取…</p></div>`;
  syncUsageFields($("#asset-body form[data-form=move]"));
  enhanceDateInputs($("#asset-body"));
  if (!dialog.open) dialog.showModal();
  loadHistory(id);
}

/** 按用途顯示對應的欄位 */
function syncUsageFields(form) {
  if (!form) return;
  const u = form.usage.value;
  form.querySelectorAll("[data-usage-fields]").forEach((el) => { el.hidden = !el.dataset.usageFields.split(" ").includes(u); });
}

async function loadHistory(id) {
  try {
    const snap = await getDocs(query(histColl(), where("itemId", "==", id)));
    const list = snap.docs.map((x) => x.data()).sort((a, b) => (b.at?.seconds || 0) - (a.at?.seconds || 0));
    if (S.openId !== id) return;
    $("#asset-history").innerHTML = list.length ? `<ul class="history">${list.map((r) => `
      <li><span class="history-when">${fmtDate(r.date)}</span>
        <span><strong>${esc(HIST[r.type] || r.type)}</strong> <span data-no-translate>${esc(r.note || "")}</span></span>
        <span class="history-by">${esc((r.by || "").split("@")[0])}</span></li>`).join("")}</ul>`
      : `<p class="hint">沒有記錄。</p>`;
  } catch (e) {
    $("#asset-history").innerHTML = `<p class="load-error">未能讀取操作記錄：${esc(e.message)}</p>`;
  }
}
const HIST = { add: "新增", loan: "借出", return: "歸還", move: "調配", status: "更改狀態", edit: "修改資料", stock: "盤點", import: "Excel 匯入" };

const dialogEl = $("#asset-dialog");
dialogEl.addEventListener("click", async (e) => {
  if (e.target.closest("[data-close]")) { dialogEl.close(); return; }
  if (e.target.closest("[data-act=delete]")) {
    const d = S.items.find((x) => x.id === S.openId);
    if (!d || !confirm(`刪除 ${d.label}？\n刪除後不能復原。如器材已不再使用，建議改為「已注銷」以保留記錄。`)) return;
    try {
      const b = writeBatch(db);
      b.delete(itemRef(d.id));
      b.set(doc(histColl()), { itemId: d.id, label: d.label, type: "edit", date: todayId(), by: S.user.email, at: serverTimestamp(), note: "刪除器材" });
      await b.commit();
      dialogEl.close();
      toast(`已刪除 ${d.label}。`, "success");
    } catch (err) { toast("未能刪除：" + err.message, "error"); }
  }
});
dialogEl.addEventListener("change", (e) => { if (e.target.name === "usage") syncUsageFields(e.target.form); });
dialogEl.addEventListener("close", () => { S.openId = null; });

dialogEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const d = S.items.find((x) => x.id === S.openId);
  if (!d) return;
  const v = (n) => (f[n]?.value ?? "").trim();
  const hist = { itemId: d.id, label: d.label, by: S.user.email, at: serverTimestamp(), date: todayId() };
  const b = writeBatch(db);
  let msg = "";
  const kind = f.dataset.form;
  if (kind === "loan") {
    if (!v("name")) { toast("請填寫借用老師。", "error"); return; }
    b.update(itemRef(d.id), { holder: { name: v("name"), since: v("since") || todayId() }, pencil: v("pencil"), accessories: v("accessories"), updatedAt: serverTimestamp() });
    b.set(doc(histColl()), { ...hist, type: "loan", date: v("since") || todayId(), note: `借出給 ${v("name")}${v("pencil") ? `，Pencil ${v("pencil")}` : ""}${v("accessories") ? `，${v("accessories")}` : ""}` });
    msg = `已借出給 ${v("name")}。`;
  } else if (kind === "return") {
    const broken = v("cond") !== "正常";
    b.update(itemRef(d.id), { holder: deleteField(), ...(broken ? { status: "repair" } : {}), updatedAt: serverTimestamp() });
    b.set(doc(histColl()), { ...hist, type: "return", date: v("date") || todayId(),
      note: `${d.holder?.name || ""} 歸還（${d.holder?.since ? `${d.holder.since} 起借用，` : ""}機身${v("cond")}）${v("note") ? `：${v("note")}` : ""}` });
    msg = broken ? "已登記歸還，狀態改為維修中。" : "已登記歸還。";
  } else if (kind === "move") {
    const usage = v("usage");
    const data = { usage, updatedAt: serverTimestamp() };
    if (usage === "cart") {
      if (!v("cart")) { toast("請選擇 iPad 車。", "error"); return; }
      Object.assign(data, { cart: v("cart"), slot: v("slot"), location: deleteField(), holder: deleteField() });
    } else if (usage === "teacher") {
      Object.assign(data, { cart: deleteField(), slot: deleteField(), location: deleteField(),
        holder: v("holder") ? { name: v("holder"), since: v("since") || todayId() } : deleteField() });
    } else {
      Object.assign(data, { cart: deleteField(), slot: deleteField(), holder: deleteField(), location: v("location") });
    }
    const after = { ...d, usage, cart: v("cart"), slot: v("slot"), location: v("location"), holder: v("holder") ? { name: v("holder") } : null };
    b.update(itemRef(d.id), data);
    b.set(doc(histColl()), { ...hist, type: "move", note: `${usageLabel(d)} ${placeText(d)} → ${USAGE[usage].label} ${placeText(after)}${v("note") ? `（${v("note")}）` : ""}` });
    msg = "已儲存調配。";
  } else if (kind === "status") {
    const st = v("status");
    if (st === (d.status || "normal") && !v("note")) { toast("資料沒有改變。"); return; }
    b.update(itemRef(d.id), { status: st, updatedAt: serverTimestamp() });
    b.set(doc(histColl()), { ...hist, type: "status", note: `${statusLabel(d)} → ${STATUS[st].label}${v("note") ? `（${v("note")}）` : ""}` });
    msg = "已更改狀態。";
  } else if (kind === "edit") {
    const fields = ["type", "serial", "model", "mdm", "pencil", "accessories", "owner", "note"];
    const data = {};
    const changes = [];
    for (const k of fields) if (v(k) !== (d[k] || "")) { data[k] = v(k); changes.push(`${k}: ${d[k] || "—"} → ${v(k) || "—"}`); }
    if (!changes.length) { toast("資料沒有改變。"); return; }
    if (data.serial && S.items.some((x) => x.id !== d.id && x.serial && x.serial === data.serial)
      && !confirm(`機序號 ${data.serial} 已用於其他器材，仍要儲存？`)) return;
    b.update(itemRef(d.id), { ...data, updatedAt: serverTimestamp() });
    b.set(doc(histColl()), { ...hist, type: "edit", note: changes.join("；") });
    msg = "已儲存資料。";
  }
  try {
    await b.commit();
    toast(msg, "success");
  } catch (err) { toast("未能儲存：" + err.message, "error"); }
});

/* ---------- 新增器材 ---------- */
function setupAdd() {
  const f = $("#add-form");
  f.type.innerHTML = listOpts(ASSET.types, "iPad");
  f.mdm.innerHTML = listOpts(ASSET.mdmSystems, ASSET.mdmSystems[0]);
  f.usage.innerHTML = selectOpts(USAGE, "cart");
  enhanceDateInputs(f);
  syncUsageFields(f);
  f.usage.addEventListener("change", () => syncUsageFields(f));
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (n) => (f[n]?.value ?? "").trim();
    const warn = (m) => { const w = $("#add-warn"); w.hidden = !m; w.textContent = m; };
    const label = v("label");
    if (!label) return warn("請填寫 Label。");
    const id = idOf(label);
    if (S.items.some((d) => d.id === id) || (await getDoc(itemRef(id))).exists()) return warn(`${label} 已存在。`);
    if (v("serial") && S.items.some((d) => d.serial === v("serial"))) return warn(`機序號 ${v("serial")} 已存在。`);
    const usage = v("usage");
    if (usage === "cart" && !v("cart")) return warn("請填寫 iPad 車。");
    warn("");
    const data = {
      label, type: v("type"), serial: v("serial"), model: v("model"), mdm: v("mdm"), usage, status: "normal",
      pencil: v("pencil"), accessories: v("accessories"), note: v("note"), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    if (usage === "cart") Object.assign(data, { cart: v("cart"), slot: v("slot") });
    else if (usage === "teacher") { if (v("holder")) data.holder = { name: v("holder"), since: v("since") || todayId() }; }
    else data.location = v("location");
    const b = writeBatch(db);
    b.set(itemRef(id), data);
    b.set(doc(histColl()), { itemId: id, label, type: "add", date: todayId(), by: S.user.email, at: serverTimestamp(), note: `${USAGE[usage].label} ${placeText(data)}` });
    try {
      await b.commit();
      toast(`已新增 ${label}。`, "success");
      f.reset();
      f.type.value = data.type; f.mdm.value = data.mdm; f.usage.value = usage;
      if (usage === "cart") { f.cart.value = data.cart; f.slot.value = data.slot ? String(Number(data.slot) + 1).padStart(data.slot.length, "0") : ""; }
      syncUsageFields(f);
      f.label.focus();
    } catch (err) { warn("未能新增：" + err.message); }
  });
}

