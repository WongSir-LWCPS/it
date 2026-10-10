import {
  boot, db, esc, toast, fmtDate, fmtTimestamp, todayId, pad, enhanceDateInputs, downloadCSV, loadXlsx,
} from "../../assets/js/common.js?v=20261008m";
import {
  collection, doc, onSnapshot, getDoc, getDocs, query, where, writeBatch, serverTimestamp, updateDoc, deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  QEF, STATUS, mdmStatus, currentYearStart, yearLabel, defaultMdmExpiry, mdmExpiry, yearEnd, addYear,
} from "./qef-config.js?v=20261008m";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, devices: [], openId: null };
const devRef = (id) => doc(db, "qef_devices", id);
const histColl = () => collection(db, "qef_history");
const idOf = (label, serial) => String(label || serial || "").trim().replace(/[\/\s]+/g, "_");
const natural = (a, b) => String(a.label).localeCompare(String(b.label), "en", { numeric: true });
/* ---------- 排序（按表頭） ---------- */
const SORT = {
  list: { key: "label", dir: 1 },
  stock: { key: "label", dir: 1 },
  mdm: { key: "label", dir: 1 },
};
const collator = new Intl.Collator("zh-Hant", { numeric: true, sensitivity: "base" });
function cmp(a, b) {
  const ea = a == null || a === "";
  const eb = b == null || b === "";
  if (ea || eb) return ea && eb ? 0 : ea ? 1 : -1;   // 空白排最後
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}
/** 各欄的排序值 */
const ACC = {
  label: (d) => d.label, serial: (d) => d.serial, batch: (d) => d.batch, mdm: (d) => d.mdm, pencil: (d) => d.pencilLabel,
  status: (d) => STATUS[d.status]?.label, holder: (d) => d.holder?.name, cls: (d) => d.holder?.cls,
  no: (d) => (d.holder?.no ? Number(d.holder.no) : null), strn: (d) => d.holder?.strn, check: (d) => d.check?.date,
  stDone: (d) => (d.stocktakes?.[stKey(stockYear())] ? 1 : 0), stDate: (d) => d.stocktakes?.[stKey(stockYear())]?.date,
  body: (d) => d.stocktakes?.[stKey(stockYear())]?.body, pencilCheck: (d) => d.stocktakes?.[stKey(stockYear())]?.pencil,
  mdmCat: (d) => CAT[mdmCategory(d, mdmYear())][0], expiry: (d) => mdmExpiry(d), renewal: (d) => d.mdmLastRenewal?.date,
};
function sorted(list, table) {
  const { key, dir } = SORT[table];
  const f = ACC[key] || ACC.label;
  return [...list].sort((a, b) => cmp(f(a), f(b)) * dir || cmp(a.label, b.label));
}
/** 可排序的表頭 */
function th(table, key, label) {
  const on = SORT[table].key === key;
  return `<th class="sortable${on ? " is-sorted" : ""}" data-sort-table="${table}" data-sort="${key}"
    aria-sort="${on ? (SORT[table].dir > 0 ? "ascending" : "descending") : "none"}" tabindex="0">${label}<span class="sort-mark" aria-hidden="true">${on ? (SORT[table].dir > 0 ? "▲" : "▼") : "↕"}</span></th>`;
}
const RENDER = { list: () => renderList(), stock: () => renderStock(), mdm: () => renderMdm() };
function onSortClick(e) {
  const h = e.target.closest("[data-sort]");
  if (!h || (e.type === "keydown" && e.key !== "Enter")) return;
  const st = SORT[h.dataset.sortTable];
  if (st.key === h.dataset.sort) st.dir *= -1; else { st.key = h.dataset.sort; st.dir = 1; }
  RENDER[h.dataset.sortTable]();
}
document.addEventListener("click", onSortClick);
document.addEventListener("keydown", onSortClick);

/** 最近一位借用者（借用者記錄的最後一項） */
const lastLog = (d) => (d.holderLog || []).slice(-1)[0] || d.lastHolder || null;
const thisYear = () => yearLabel(currentYearStart());
const holderText = (h) => (h ? `${h.name}${h.cls ? `（${h.cls}${h.no ? ` ${h.no}` : ""}）` : ""}` : "");

boot({
  root: "../../", current: "qef",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) return;   // 非管理員已由 boot() 擋住
    S.user = user;
    setupTabs();
    setupFilters();
    setupStock();
    setupMdm();
    setupAdd();
    setupImport();
    setupUpdate();
    onSnapshot(collection(db, "qef_devices"), (snap) => {
      S.devices = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(natural);
      renderStats();
      renderFilterOptions();
      renderList();
      renderStock();
      renderMdm();
      if (S.openId && $("#dev-dialog").open) renderDetail(S.openId, true);
    }, (e) => {
      $("#device-list").innerHTML = `<p class="load-error">未能讀取資料：${esc(e.message)}。請確認已發佈最新的 Firestore 規則。</p>`;
    });
  },
});

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== `tab-${tab.dataset.tab}`; });
  }));
}

/* ---------- 統計 ---------- */
function renderStats() {
  const count = (st) => S.devices.filter((d) => d.status === st).length;
  const cards = [
    ["總數（不包括已註銷）", S.devices.length - count("retired")],
    ["借出中", count("loaned")],
    ["可借出", count("available")],
    ["維修中", count("repair")],
    ["遺失", count("lost")],
    ["已註銷", count("retired")],
  ];
  $("#stats").innerHTML = cards.map(([k, v]) => `<div class="stat"><span class="stat-num">${v}</span><span class="stat-label">${esc(k)}</span></div>`).join("");
}

/* ---------- 清單 ---------- */
function setupFilters() {
  ["#f-q", "#f-status", "#f-batch", "#f-mdm"].forEach((id) => $(id).addEventListener("input", renderList));
  $("#f-status").innerHTML = `<option value="">全部</option>` + Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  $("#f-mdm").innerHTML = `<option value="">全部</option>`
    + QEF.mdmSystems.map((m) => `<option value="sys:${esc(m)}">${esc(m)}</option>`).join("");
  $("#device-list").addEventListener("click", (e) => {
    const row = e.target.closest("[data-id]");
    if (row) renderDetail(row.dataset.id);
  });
  $("#export-csv").addEventListener("click", exportCSV);
}

function renderFilterOptions() {
  const sel = $("#f-batch");
  const cur = sel.value;
  const batches = [...new Set(S.devices.map((d) => d.batch).filter(Boolean))].sort();
  sel.innerHTML = `<option value="">全部</option>` + batches.map((b) => `<option value="${esc(b)}">${esc(b)}（${S.devices.filter((d) => d.batch === b).length}）</option>`).join("");
  sel.value = batches.includes(cur) ? cur : "";
}

function filtered() {
  const q = $("#f-q").value.trim().toLowerCase();
  const st = $("#f-status").value;
  const bt = $("#f-batch").value;
  const md = $("#f-mdm").value;
  return S.devices.filter((d) => {
    if (st && d.status !== st) return false;
    if (bt && d.batch !== bt) return false;
    if (md.startsWith("sys:") && d.mdm !== md.slice(4)) return false;
    if (!q) return true;
    const h = d.holder || {};
    const past = (d.holderLog || []).flatMap((x) => [x.name, x.strn]);
    return [d.label, d.serial, d.pencilLabel, d.pencilSerial, h.name, h.strn, h.cls, `${h.cls || ""}${h.no || ""}`, ...past]
      .some((v) => String(v || "").toLowerCase().includes(q));
  });
}

function renderList() {
  const list = sorted(filtered(), "list");
  $("#list-count").textContent = `顯示 ${list.length} 部（共 ${S.devices.length} 部）`;
  const box = $("#device-list");
  if (!S.devices.length) {
    box.innerHTML = `<p class="empty">還未有 iPad 資料。請到「匯入 Excel」上載現有的點算表，或到「新增 iPad」逐部加入。</p>`;
    return;
  }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table table--click">
        <thead><tr>${th("list", "label", "Label")}${th("list", "serial", "機序號")}${th("list", "batch", "批次")}${th("list", "mdm", "MDM")}${th("list", "pencil", "Pencil")}${th("list", "status", "狀態")}${th("list", "strn", "STRN")}${th("list", "cls", "班別")}${th("list", "no", "學號")}${th("list", "holder", "持有者")}</tr></thead>
        <tbody>
          ${list.map((d) => {
            const q = $("#f-q").value.trim().toLowerCase();
            const pastHit = q && !d.holder?.name?.toLowerCase().includes(q) && !d.holder?.strn?.toLowerCase().includes(q)
              ? (d.holderLog || []).find((x) => `${x.name} ${x.strn}`.toLowerCase().includes(q)) : null;
            return `
            <tr data-id="${esc(d.id)}" tabindex="0">
              <td class="nowrap"><strong>${esc(d.label)}</strong></td>
              <td class="mono">${esc(d.serial)}</td>
              <td>${esc(d.batch || "")}</td>
              <td>${esc(d.mdm || "")}</td>
              <td>${esc(d.pencilLabel || "")}</td>
              <td><span class="badge badge--${STATUS[d.status]?.tone || "muted"}">${STATUS[d.status]?.label || esc(d.status)}</span></td>
              <td class="mono">${esc(d.holder?.strn || "")}</td>
              <td>${esc(d.holder?.cls || "")}</td>
              <td>${esc(d.holder?.no || "")}</td>
              <td>${esc(d.holder?.name || "")}${pastHit ? `${d.holder ? "<br>" : ""}<small class="badge badge--muted">曾借用：${esc(pastHit.name)}（${esc(pastHit.years.join("、"))}）</small>` : ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function exportCSV() {
  const rows = [["Label No.", "機序號", "批次", "MDM 系統", "MDM 到期日", "Pencil Label No.", "Pencil 機序號", "狀態",
    "持有者", "STRN", "班別", "學號", "點算日期", "iPads機身", "Apple Pencil", "備註"]];
  for (const d of filtered()) {
    const h = d.holder || {};
    const c = d.check || {};
    rows.push([d.label, d.serial, d.batch, d.mdm, mdmExpiry(d) || "", d.pencilLabel, d.pencilSerial,
      STATUS[d.status]?.label || d.status, h.name, h.strn, h.cls, h.no, c.date, c.body, c.pencil, d.note]);
  }
  downloadCSV(`QEF_iPad_${todayId()}.csv`, rows);
}

/* ---------- 詳細資料及操作 ---------- */
const checkSelect = (name, value = "已檢查正常") => `<select name="${name}">${QEF.checkOptions.map((o) =>
  `<option value="${esc(o)}" ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;

async function renderDetail(id, keep = false) {
  const d = S.devices.find((x) => x.id === id);
  if (!d) return;
  S.openId = id;
  const dialog = $("#dev-dialog");
  const m = mdmStatus(d);
  const c = d.check || {};
  const h = d.holder;
  $("#dev-body").innerHTML = `
    <div class="dev-head">
      <h2 id="dev-title">${esc(d.label)} <span class="badge badge--${STATUS[d.status]?.tone}">${STATUS[d.status]?.label || esc(d.status)}</span></h2>
      <button class="btn btn--small" type="button" data-close>關閉</button>
    </div>
    <dl class="kv kv--wide">
      <dt>機序號</dt><dd class="mono">${esc(d.serial)}</dd>
      <dt>批次</dt><dd>${esc(d.batch || "—")}</dd>
      <dt>MDM</dt><dd>${esc(d.mdm || "—")}</dd>
      <dt>MDM 到期日</dt><dd>${m.expiry ? `<span class="badge badge--${{ expired: "stop", thisYear: "wait", ok: "go" }[m.state]}">${esc(m.text)}</span> ${fmtDate(m.expiry)}
        <button class="btn btn--small" type="button" data-act="mdm-renew">續期一年（至 ${fmtDate(renewTarget(m.expiry))}）</button>` : "—"}</dd>
      <dt>Apple Pencil</dt><dd>${esc(d.pencilLabel || "—")} <span class="mono">${esc(d.pencilSerial || "")}</span></dd>
      <dt>持有者</dt><dd>${h ? `${esc(holderText(h))} <span class="mono">${esc(h.strn || "")}</span>${h.since ? `，${fmtDate(h.since)} 起` : ""}` : "—"}</dd>
      <dt>最近檢查</dt><dd>${c.date ? `${fmtDate(c.date)}：機身 ${esc(c.body || "—")}，Pencil ${esc(c.pencil || "—")}` : "—"}</dd>
      ${d.note ? `<dt>備註</dt><dd class="pre">${esc(d.note)}</dd>` : ""}
    </dl>

    <h3 class="mt-s">借用者記錄</h3>
    ${borrowerTable(d)}

    ${d.status === "available" ? `
      <form class="card-form dev-form" data-form="loan">
        <h3>借出</h3>
        <div class="field-row">
          <label class="field"><span>STRN</span><input name="strn" maxlength="12" required></label>
          <label class="field"><span>學生姓名</span><input name="name" maxlength="40" required></label>
        </div>
        <div class="field-row">
          <label class="field"><span>班別</span><input name="cls" maxlength="4" placeholder="例如 3B"></label>
          <label class="field"><span>學號</span><input name="no" maxlength="3" inputmode="numeric"></label>
          <label class="field field--date"><span>借出日期</span><input type="date" name="date" value="${todayId()}"></label>
        </div>
        <p class="hint" data-student-hint></p>
        <button class="btn btn--primary" type="submit">借出</button>
      </form>` : ""}

    ${d.status === "loaned" ? `
      <form class="card-form dev-form" data-form="return">
        <h3>歸還</h3>
        <div class="field-row">
          <label class="field field--date"><span>歸還日期</span><input type="date" name="date" value="${todayId()}"></label>
          <label class="field"><span>原因</span><select name="reason">${QEF.returnReasons.map((r) => `<option>${esc(r)}</option>`).join("")}</select></label>
        </div>
        <div class="field-row">
          <label class="field"><span>iPad 機身</span>${checkSelect("body")}</label>
          <label class="field"><span>Apple Pencil</span>${checkSelect("pencil", hasPencil(d) ? "已檢查正常" : "無")}</label>
        </div>
        <label class="field"><span>備註（選填）</span><input name="note" maxlength="200"></label>
        <p class="hint">如機身或 Apple Pencil 不是「已檢查正常」，iPad 會轉為「維修中」（沒有配對 Apple Pencil 的 iPad，Pencil 選「無」不計）。</p>
        <button class="btn btn--primary" type="submit">歸還</button>
      </form>` : ""}

    ${d.status !== "loaned" ? `
      <form class="card-form dev-form" data-form="status">
        <h3>更改狀態</h3>
        <div class="field-row">
          <label class="field"><span>新狀態</span><select name="status">${Object.entries(STATUS).filter(([k]) => k !== "loaned" && k !== d.status)
            .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}</select></label>
          <label class="field field--grow"><span>原因／備註</span><input name="note" maxlength="200" placeholder="例如：送修、爆 mon、已註銷"></label>
        </div>
        <button class="btn" type="submit">更改狀態</button>
      </form>` : ""}

    <details class="card-form dev-form">
      <summary><strong>編輯 iPad 資料</strong></summary>
      <form data-form="edit" class="mt-s">
        <div class="field-row">
          <label class="field"><span>機序號</span><input name="serial" value="${esc(d.serial || "")}" maxlength="30"></label>
          <label class="field"><span>批次</span><input name="batch" value="${esc(d.batch || "")}" maxlength="5"></label>
          <label class="field"><span>MDM 系統</span><select name="mdm">${QEF.mdmSystems.map((x) => `<option ${x === d.mdm ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
          <label class="field field--date"><span>MDM 到期日</span><input type="date" name="mdmExpiry" value="${esc(m.expiry || "")}"></label>
        </div>
        <div class="field-row">
          <label class="field"><span>Pencil Label No.</span><input name="pencilLabel" value="${esc(d.pencilLabel || "")}" maxlength="20"></label>
          <label class="field"><span>Pencil 機序號</span><input name="pencilSerial" value="${esc(d.pencilSerial || "")}" maxlength="30"></label>
        </div>
        <label class="field"><span>備註</span><textarea name="note" rows="2" maxlength="300">${esc(d.note || "")}</textarea></label>
        <button class="btn" type="submit">儲存資料</button>
      </form>
    </details>

    <details class="mt-s">
      <summary><strong>操作記錄</strong>（借出、歸還、修改等）</summary>
      <div id="dev-history" class="mt-s"><p class="hint">正在讀取…</p></div>
    </details>`;

  enhanceDateInputs($("#dev-body"));
  if (!keep || !dialog.open) dialog.showModal();
  loadHistory(id);
}

/** 借用者記錄：每位學生一行，連續學年合併 */
function borrowerTable(d) {
  const log = [...(d.holderLog || [])].reverse();
  if (!log.length) return `<p class="hint">沒有借用者記錄。匯入 Excel 時選擇「同時匯入歷年借用者」，即可加入以往的記錄。</p>`;
  return `
    <div class="table-scroll">
      <table class="table">
        <thead><tr><th>借用學年</th><th>學生</th><th>STRN</th><th>班別（學號）</th><th>結果</th></tr></thead>
        <tbody>${log.map((x) => `
          <tr class="${x.outcome === "借用中" ? "" : "is-past"}">
            <td class="nowrap">${esc(yearsText(x.years))}${x.from ? `<br><small>${fmtDate(x.from)} 起</small>` : ""}${x.to ? `<br><small>${fmtDate(x.to)} 歸還</small>` : ""}</td>
            <td>${esc(x.name)}</td>
            <td class="mono">${esc(x.strn || "")}</td>
            <td>${esc(x.cls || "")}${x.no ? `（${esc(x.no)}）` : ""}</td>
            <td>${x.outcome === "借用中" ? '<span class="badge badge--go">借用中</span>' : esc(x.outcome || "")}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
const yearsText = (ys = []) => (ys.length > 1 ? `${ys[0]} 至 ${ys[ys.length - 1]}` : ys[0] || "");

async function loadHistory(id) {
  try {
    const snap = await getDocs(query(histColl(), where("deviceId", "==", id)));
    const list = snap.docs.map((x) => x.data()).sort((a, b) => (b.at?.seconds || 0) - (a.at?.seconds || 0));
    const box = $("#dev-history");
    if (!box) return;
    box.innerHTML = list.length ? `<ul class="history">${list.map(historyItem).join("")}</ul>` : `<p class="hint">沒有記錄。</p>`;
  } catch (e) {
    $("#dev-history").innerHTML = `<p class="load-error">未能讀取歷史記錄：${esc(e.message)}</p>`;
  }
}

function historyItem(r) {
  const who = r.student ? `${esc(holderText(r.student))} <span class="mono">${esc(r.student.strn || "")}</span>` : "";
  const when = r.date ? fmtDate(r.date) : fmtTimestamp(r.at);
  const c = r.check;
  const what = {
    loan: `借出給 ${who}`,
    return: `${who} ${esc(r.reason || "歸還")}${c ? `（機身 ${esc(c.body)}，Pencil ${esc(c.pencil)}）` : ""}`,
    status: `狀態改為「${esc(STATUS[r.to]?.label || r.to)}」`,
    edit: "修改了 iPad 資料",
    mdm: "更新 MDM 到期日",
    stocktake: "完成盤點",
    unstock: "取消盤點",
    create: "新增 iPad",
    import: "由 Excel 匯入",
    excel: "以 Excel 更新",
  }[r.type] || esc(r.type);
  return `<li><span class="history-when">${when}</span><span>${what}${r.note ? `<br><small>${esc(r.note)}</small>` : ""}</span>
    <small class="history-by">${esc(r.by || "")}</small></li>`;
}

// 對話框內的表格
$("#dev-dialog").addEventListener("click", async (e) => {
  if (e.target.closest("[data-close]")) { $("#dev-dialog").close(); return; }
  if (e.target.closest('[data-act="mdm-renew"]')) {
    const d = S.devices.find((x) => x.id === S.openId);
    const m = mdmStatus(d);
    if (!confirm(`把 ${d.label} 的 MDM 到期日由 ${fmtDate(m.expiry)} 延至 ${fmtDate(renewTarget(m.expiry))}？`)) return;
    await setMdmExpiry([d], renewTarget(m.expiry));
  }
});

/** 續期一年：由到期日延一年；已過期的由上學年完結日起計（即延至本學年完結） */
const renewTarget = (expiry) => addYear(expiry > yearEnd(currentYearStart() - 1) ? expiry : yearEnd(currentYearStart() - 1));

/** 更新 MDM 到期日（可多部）；restore 為 true 時改回上一次續期前的日期 */
async function setMdmExpiry(devices, expiry, note = "", restore = false) {
  try {
    for (let i = 0; i < devices.length; i += 200) {
      const b = writeBatch(db);
      for (const d of devices.slice(i, i + 200)) {
        const old = mdmExpiry(d);
        const next = restore ? (d.mdmLastRenewal?.prev ?? null) : expiry;
        const upd = { updatedAt: serverTimestamp(), updatedBy: S.user.email };
        if (restore) {
          upd.mdmExpiry = next || deleteField();
          upd.mdmLastRenewal = deleteField();
        } else {
          upd.mdmExpiry = next;
          upd.mdmLastRenewal = { date: todayId(), expiry: next, prev: d.mdmExpiry || null, by: S.user.email, note };
        }
        upd.mdmUntil = deleteField();   // 舊欄位（學年）不再使用
        b.update(devRef(d.id), upd);
        b.set(doc(histColl()), { deviceId: d.id, label: d.label, type: "mdm", date: todayId(), by: S.user.email, at: serverTimestamp(),
          note: `MDM 到期日：${old || "—"} → ${(restore ? next || defaultMdmExpiry(d.batch) : next) || "—"}${note ? `（${note}）` : ""}` });
      }
      await b.commit();
    }
    toast(restore ? `已取消 ${devices.length} 部 iPad 的續期。` : `已把 ${devices.length} 部 iPad 的 MDM 到期日更新為 ${fmtDate(expiry)}。`, "success");
  } catch (err) {
    toast("未能更新：" + err.message, "error");
  }
}

$("#dev-dialog").addEventListener("input", (e) => {
  // 輸入 STRN 時，提示該學生過去的借用記錄
  if (e.target.name !== "strn") return;
  const strn = e.target.value.trim().toUpperCase();
  const hint = $("[data-student-hint]");
  const holding = S.devices.find((d) => d.holder?.strn?.toUpperCase() === strn);
  hint.textContent = strn && holding ? `注意：這位學生現正借用 ${holding.label}。` : "";
});
$("#dev-dialog").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const d = S.devices.find((x) => x.id === S.openId);
  if (!d) return;
  const type = f.dataset.form;
  const v = (n) => (f[n]?.value ?? "").trim();
  const batch = writeBatch(db);
  const hist = { deviceId: d.id, label: d.label, by: S.user.email, at: serverTimestamp() };
  const base = { updatedAt: serverTimestamp(), updatedBy: S.user.email };

  if (type === "loan") {
    const student = { strn: v("strn").toUpperCase(), name: v("name"), cls: v("cls").toUpperCase(), no: v("no"), since: v("date") || todayId() };
    if (!student.strn || !student.name) { toast("請填寫 STRN 及學生姓名。", "error"); return; }
    const holderLog = [...(d.holderLog || []), { years: [thisYear()], name: student.name, strn: student.strn,
      cls: student.cls, no: student.no, outcome: "借用中", from: student.since, source: "app" }];
    batch.update(devRef(d.id), { ...base, status: "loaned", holder: student, holderLog });
    batch.set(doc(histColl()), { ...hist, type: "loan", student, date: student.since });
  } else if (type === "return") {
    const check = { date: v("date") || todayId(), body: v("body"), pencil: v("pencil") };
    const problem = isIssue(check, d);
    const log = [...(d.holderLog || [])];
    const h = d.holder || {};
    const idx = log.map((x, i) => [x, i]).reverse()
      .find(([x]) => x.outcome === "借用中" && ((h.strn && x.strn === h.strn) || x.name === h.name))?.[1];
    const entry = idx != null ? { ...log[idx] } : { years: [thisYear()], name: h.name || "", strn: h.strn || "", cls: h.cls || "", no: h.no || "", source: "app" };
    if (!entry.years.includes(thisYear())) entry.years = [...entry.years, thisYear()];
    Object.assign(entry, { outcome: v("reason"), to: check.date });
    if (idx != null) log[idx] = entry; else log.push(entry);
    batch.update(devRef(d.id), { ...base, status: problem ? "repair" : "available", holder: null, lastHolder: d.holder || null, check, holderLog: log });
    batch.set(doc(histColl()), { ...hist, type: "return", student: d.holder || null, date: check.date, reason: v("reason"), check, note: v("note") });
  } else if (type === "status") {
    batch.update(devRef(d.id), { ...base, status: v("status") });
    batch.set(doc(histColl()), { ...hist, type: "status", from: d.status, to: v("status"), date: todayId(), note: v("note") });
  } else if (type === "edit") {
    const data = { serial: v("serial"), batch: v("batch"), mdm: v("mdm"), pencilLabel: v("pencilLabel"), pencilSerial: v("pencilSerial"), note: v("note") };
    const changes = Object.entries(data).filter(([k, val]) => (d[k] || "") !== val).map(([k, val]) => `${k}: ${d[k] || "—"} → ${val || "—"}`);
    const newExpiry = v("mdmExpiry");
    if (newExpiry && newExpiry !== mdmExpiry(d)) { data.mdmExpiry = newExpiry; changes.push(`MDM 到期日: ${mdmExpiry(d) || "—"} → ${newExpiry}`); }
    if (!changes.length) { toast("資料沒有改變。"); return; }
    batch.update(devRef(d.id), { ...base, ...data });
    batch.set(doc(histColl()), { ...hist, type: "edit", note: changes.join("；") });
  }
  try {
    await batch.commit();
    toast({ loan: "已借出。", return: "已登記歸還。", status: "已更改狀態。", edit: "已儲存資料。" }[type], "success");
  } catch (err) {
    toast("未能儲存：" + err.message, "error");
  }
});

/* ---------- 盤點 ---------- */
const stKey = (yearStart) => `y${yearStart}`;
const OK = "已檢查正常";
/** 沒有配對 Apple Pencil 的 iPad，Pencil 預設為「無」 */
const hasPencil = (d) => Boolean(d.pencilLabel || d.pencilSerial);
const defaultCheck = (d) => ({ body: OK, pencil: hasPencil(d) ? OK : "無" });
/** 有問題：機身或 Pencil 不是「已檢查正常」；沒有 Pencil 的 iPad，Pencil「無」不算問題（保護套不用檢查） */
const isIssue = (r, d = null) => r && [r.body, r.pencil].some((v, i) =>
  v && v !== OK && !(i === 1 && v === "無" && d && !hasPencil(d)));
S.stockDraft = {};   // 未盤點項目中已選擇但未儲存的檢查結果

function stockYear() { return Number($("#st-year").value) || currentYearStart(); }

function setupStock() {
  const sel = $("#st-year");
  const y = currentYearStart();
  sel.innerHTML = [y, y - 1, y - 2, y - 3].map((v) => `<option value="${v}">${yearLabel(v)}</option>`).join("");
  ["#st-year", "#st-filter", "#st-batch", "#st-q"].forEach((id) => $(id).addEventListener("input", renderStock));
  $("#st-export").addEventListener("click", exportStock);

  // 快速盤點：輸入或掃描後按 Enter
  $("#st-scan").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = e.target.value.trim().toUpperCase();
    if (!q) return;
    const d = S.devices.find((x) => x.label.toUpperCase() === q || (x.serial || "").toUpperCase() === q);
    if (!d) { toast(`找不到 ${q}。`, "error"); e.target.select(); return; }
    const done = d.stocktakes?.[stKey(stockYear())];
    if (done) { toast(`${d.label} 已於 ${fmtDate(done.date)} 盤點。`); e.target.value = ""; return; }
    await saveStock(d, S.stockDraft[d.id] || defaultCheck(d));
    e.target.value = "";
    e.target.focus();
  });

  $("#st-list").addEventListener("change", async (e) => {
    const row = e.target.closest("[data-st]");
    if (!row) return;
    const d = S.devices.find((x) => x.id === row.dataset.st);
    const vals = Object.fromEntries([...row.querySelectorAll("select[data-part]")].map((x) => [x.dataset.part, x.value]));
    const done = d.stocktakes?.[stKey(stockYear())];
    if (e.target.matches("[data-done]")) {
      if (e.target.checked) await saveStock(d, vals);
      else if (confirm(`取消 ${d.label} 的盤點記錄？`)) await undoStock(d);
      else e.target.checked = true;
    } else if (e.target.matches("select[data-part]")) {
      if (done) await saveStock(d, vals, true);   // 已盤點：直接更新
      else S.stockDraft[d.id] = vals;             // 未盤點：暫存
    }
  });
}

async function saveStock(d, vals, update = false) {
  const y = stockYear();
  const def = defaultCheck(d);
  const rec = { date: todayId(), body: vals.body || def.body, pencil: vals.pencil || def.pencil, by: S.user.email };
  const old = d.stocktakes?.[stKey(y)];
  if (update && old) rec.date = old.date;
  const b = writeBatch(db);
  const upd = { [`stocktakes.${stKey(y)}`]: rec, updatedAt: serverTimestamp(), updatedBy: S.user.email };
  if (y === currentYearStart()) upd.check = { date: rec.date, body: rec.body, pencil: rec.pencil };
  b.update(devRef(d.id), upd);
  b.set(doc(histColl()), { deviceId: d.id, label: d.label, type: "stocktake", date: rec.date, by: S.user.email, at: serverTimestamp(),
    note: `${yearLabel(y)}：機身 ${rec.body}，Pencil ${rec.pencil}${update ? "（修改）" : ""}` });
  try {
    await b.commit();
    delete S.stockDraft[d.id];
    if (!update) toast(`${d.label} 已完成盤點${isIssue(rec, d) ? "（有問題）" : ""}。`, isIssue(rec, d) ? "error" : "success");
  } catch (err) { toast("未能儲存：" + err.message, "error"); }
}

async function undoStock(d) {
  const y = stockYear();
  const b = writeBatch(db);
  b.update(devRef(d.id), { [`stocktakes.${stKey(y)}`]: deleteField(), updatedAt: serverTimestamp(), updatedBy: S.user.email });
  b.set(doc(histColl()), { deviceId: d.id, label: d.label, type: "unstock", date: todayId(), by: S.user.email, at: serverTimestamp(), note: yearLabel(y) });
  try { await b.commit(); toast(`已取消 ${d.label} 的盤點記錄。`); } catch (err) { toast("未能取消：" + err.message, "error"); }
}

function stockDevices() { return S.devices.filter((d) => d.status !== "retired"); }

function renderStock() {
  if (!$("#st-list")) return;
  const y = stockYear();
  const key = stKey(y);
  const all = stockDevices();
  const doneList = all.filter((d) => d.stocktakes?.[key]);
  const issues = doneList.filter((d) => isIssue(d.stocktakes[key], d));
  const pct = all.length ? Math.round((doneList.length / all.length) * 100) : 0;
  $("#st-progress").innerHTML = `
    <div class="progress"><span style="width:${pct}%"></span></div>
    <p><strong>${doneList.length} / ${all.length}</strong> 已盤點（${pct}%）　未盤點 ${all.length - doneList.length} 部　有問題 ${issues.length} 部</p>`;

  const bsel = $("#st-batch");
  const cur = bsel.value;
  const batches = [...new Set(all.map((d) => d.batch).filter(Boolean))].sort();
  bsel.innerHTML = `<option value="">全部</option>` + batches.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join("");
  bsel.value = batches.includes(cur) ? cur : "";

  const f = $("#st-filter").value;
  const bt = bsel.value;
  const q = $("#st-q").value.trim().toLowerCase();
  const list = sorted(all.filter((d) => {
    const r = d.stocktakes?.[key];
    if (f === "todo" && r) return false;
    if (f === "done" && !r) return false;
    if (f === "issue" && !isIssue(r, d)) return false;
    if (bt && d.batch !== bt) return false;
    if (q) {
      const h = d.holder || {};
      if (![d.label, d.serial, h.name, h.cls, `${h.cls || ""}${h.no || ""}`].some((v) => String(v || "").toLowerCase().includes(q))) return false;
    }
    return true;
  }), "stock");
  const box = $("#st-list");
  if (!list.length) {
    box.innerHTML = `<p class="empty">${f === "todo" && all.length ? "全部 iPad 已完成盤點。" : "沒有符合條件的 iPad。"}</p>`;
    return;
  }
  const sel = (d, part, r) => {
    const v = r?.[part] || S.stockDraft[d.id]?.[part] || defaultCheck(d)[part];
    const issue = v !== OK && !(part === "pencil" && v === "無" && !hasPencil(d));
    return `<select data-part="${part}" class="${issue ? "is-issue" : ""}">${QEF.checkOptions.map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  };
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table stock-table">
        <thead><tr>${th("stock", "stDone", "完成")}${th("stock", "label", "Label")}${th("stock", "serial", "機序號")}${th("stock", "status", "狀態")}${th("stock", "holder", "持有者")}${th("stock", "cls", "班別")}${th("stock", "no", "學號")}${th("stock", "body", "iPad 機身")}${th("stock", "pencilCheck", "Apple Pencil")}${th("stock", "stDate", "盤點記錄")}</tr></thead>
        <tbody>
          ${list.map((d) => {
            const r = d.stocktakes?.[key];
            return `
            <tr data-st="${esc(d.id)}" class="${r ? (isIssue(r, d) ? "st-issue" : "st-done") : ""}">
              <td><input type="checkbox" class="st-check" data-done ${r ? "checked" : ""} aria-label="${esc(d.label)} 完成盤點"></td>
              <td><strong>${esc(d.label)}</strong>${d.pencilLabel ? `<br><small>${esc(d.pencilLabel)}</small>` : ""}</td>
              <td class="mono">${esc(d.serial)}</td>
              <td><span class="badge badge--${STATUS[d.status]?.tone}">${STATUS[d.status]?.label}</span></td>
              <td>${esc(d.holder?.name || "")}</td>
              <td>${esc(d.holder?.cls || "")}</td>
              <td>${esc(d.holder?.no || "")}</td>
              <td>${sel(d, "body", r)}</td>
              <td>${sel(d, "pencil", r)}</td>
              <td class="nowrap">${r ? `${fmtDate(r.date)}${r.by ? `<br><small>${esc(r.by.split("@")[0])}</small>` : ""}` : ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function exportStock() {
  const y = stockYear();
  const key = stKey(y);
  const rows = [["Label No.", "機序號", "批次", "Pencil Label No.", "狀態", "持有者", "STRN", "班別", "學號", "點算日期", "iPads機身", "Apple Pencil", "盤點人"]];
  for (const d of stockDevices()) {
    const r = d.stocktakes?.[key] || {};
    const h = d.holder || {};
    rows.push([d.label, d.serial, d.batch, d.pencilLabel, STATUS[d.status]?.label, h.name, h.strn, h.cls, h.no, r.date, r.body, r.pencil, r.by]);
  }
  downloadCSV(`QEF_iPad_盤點_${yearLabel(y)}.csv`, rows);
}

/* ---------- MDM 管理 ---------- */
S.mdmSel = new Set();
const mdmYear = () => Number($("#m-year").value) || currentYearStart();
const activeDevices = () => S.devices.filter((d) => !["retired", "lost"].includes(d.status));

/** 某學年的 MDM 類別：included（購買後包括期內）／renewed（已續期）／need（需續期） */
function mdmCategory(d, y) {
  const end = yearEnd(y);
  const inc = defaultMdmExpiry(d.batch);
  if (inc != null && inc >= end && !d.mdmExpiry) return "included";
  return (mdmExpiry(d) || "") >= end ? (inc != null && inc >= end ? "included" : "renewed") : "need";
}
const CAT = { need: ["需續期", "stop"], renewed: ["已續期", "go"], included: ["包括期內", "muted"] };

function setupMdm() {
  const y = currentYearStart();
  $("#m-year").innerHTML = [y - 1, y, y + 1, y + 2].map((v) => `<option value="${v}" ${v === y ? "selected" : ""}>${yearLabel(v)}</option>`).join("");
  $("#m-sys").innerHTML = `<option value="">全部</option>` + QEF.mdmSystems.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("");
  $("#m-until").value = `${y + 1}-08-31`;
  $("#m-year").addEventListener("input", () => { $("#m-until").value = `${mdmYear() + 1}-08-31`; S.mdmSel.clear(); renderMdm(); });
  ["#m-filter", "#m-batch", "#m-sys", "#m-q"].forEach((id) => $(id).addEventListener("input", () => { S.mdmSel.clear(); renderMdm(); }));
  $("#m-export").addEventListener("click", () => {
    const y2 = mdmYear();
    const rows = [["Label No.", "機序號", "批次", "MDM 系統", "狀態", `${yearLabel(y2)} MDM`, "MDM 到期日", "最近續期日期", "續期備註"]];
    for (const d of mdmFiltered()) {
      rows.push([d.label, d.serial, d.batch, d.mdm, STATUS[d.status]?.label, CAT[mdmCategory(d, y2)][0], mdmExpiry(d) || "",
        d.mdmLastRenewal?.date || "", d.mdmLastRenewal?.note || ""]);
    }
    downloadCSV(`QEF_iPad_MDM_${yearLabel(y2)}.csv`, rows);
  });
  $("#m-list").addEventListener("change", (e) => {
    if (e.target.matches("#m-all")) {
      const ids = mdmFiltered().map((d) => d.id);
      if (e.target.checked) ids.forEach((id) => S.mdmSel.add(id)); else S.mdmSel.clear();
      renderMdm();
    } else if (e.target.matches("[data-msel]")) {
      if (e.target.checked) S.mdmSel.add(e.target.dataset.msel); else S.mdmSel.delete(e.target.dataset.msel);
      updateMdmBar();
    }
  });
  $("#m-renew").addEventListener("click", async () => {
    const list = S.devices.filter((d) => S.mdmSel.has(d.id));
    if (!list.length) { toast("請先選擇 iPad。", "error"); return; }
    const expiry = $("#m-until").value;
    if (!expiry) { toast("請填寫續期後到期日。", "error"); return; }
    if (expiry < yearEnd(mdmYear()) && !confirm(`到期日 ${fmtDate(expiry)} 早於 ${yearLabel(mdmYear())} 學年完結（${fmtDate(yearEnd(mdmYear()))}），這些 iPad 仍會列為「需續期」。繼續？`)) return;
    if (!confirm(`把已選的 ${list.length} 部 iPad 標示為已續期，MDM 到期日設為 ${fmtDate(expiry)}？`)) return;
    await setMdmExpiry(list, expiry, $("#m-note").value.trim());
    S.mdmSel.clear();
    renderMdm();
  });
  $("#m-undo").addEventListener("click", async () => {
    const y2 = mdmYear();
    const list = S.devices.filter((d) => S.mdmSel.has(d.id) && mdmCategory(d, y2) === "renewed");
    if (!list.length) { toast("已選的 iPad 中沒有「已續期」的項目。", "error"); return; }
    if (!confirm(`取消已選 ${list.length} 部 iPad 最近一次的續期？MDM 到期日會改回續期前的日期。`)) return;
    await setMdmExpiry(list, null, "取消續期", true);
    S.mdmSel.clear();
    renderMdm();
  });
}

function mdmFiltered() {
  const y = mdmYear();
  const f = $("#m-filter").value;
  const bt = $("#m-batch").value;
  const sys = $("#m-sys").value;
  const q = $("#m-q").value.trim().toLowerCase();
  return activeDevices().filter((d) => (!f || mdmCategory(d, y) === f) && (!bt || d.batch === bt) && (!sys || d.mdm === sys)
    && (!q || [d.label, d.serial].some((v) => String(v || "").toLowerCase().includes(q))));
}

function updateMdmBar() {
  $("#m-selected").textContent = `已選 ${S.mdmSel.size} 部`;
  const all = $("#m-all");
  if (all) {
    const ids = mdmFiltered().map((d) => d.id);
    all.checked = ids.length > 0 && ids.every((id) => S.mdmSel.has(id));
  }
}

function renderMdm() {
  if (!$("#m-list")) return;
  const y = mdmYear();
  const act = activeDevices();
  const cnt = (c, yy = y) => act.filter((d) => mdmCategory(d, yy) === c).length;
  const need = cnt("need");
  const renewed = cnt("renewed");
  const due = need + renewed;
  const pct = due ? Math.round((renewed / due) * 100) : 100;
  $("#m-summary").innerHTML = `
    <div class="stat-grid stat-grid--tight">
      <div class="stat"><span class="stat-num">${due}</span><span class="stat-label">${yearLabel(y)} 需要 MDM 續期</span></div>
      <div class="stat"><span class="stat-num">${renewed}</span><span class="stat-label">已續期</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--stop)">${need}</span><span class="stat-label">未續期</span></div>
      <div class="stat"><span class="stat-num">${cnt("included")}</span><span class="stat-label">包括期內（毋須續期）</span></div>
    </div>
    <div class="progress mt-s"><span style="width:${pct}%"></span></div>
    <p class="hint">${yearLabel(y)} 續期進度：${renewed} / ${due}（${pct}%）</p>`;

  const bsel = $("#m-batch");
  const cur = bsel.value;
  const batches = [...new Set(act.map((d) => d.batch).filter(Boolean))].sort();
  bsel.innerHTML = `<option value="">全部</option>` + batches.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join("");
  bsel.value = batches.includes(cur) ? cur : "";

  const list = sorted(mdmFiltered(), "mdm");
  const box = $("#m-list");
  if (!list.length) {
    box.innerHTML = `<p class="empty">沒有符合條件的 iPad。</p>`;
    updateMdmBar();
    return;
  }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr>
          <th><input type="checkbox" id="m-all" class="st-check" aria-label="全選"></th>
          ${th("mdm", "label", "Label")}${th("mdm", "serial", "機序號")}${th("mdm", "batch", "批次")}${th("mdm", "mdm", "MDM 系統")}${th("mdm", "status", "狀態")}${th("mdm", "mdmCat", `${yearLabel(y)} MDM`)}${th("mdm", "expiry", "MDM 到期日")}${th("mdm", "renewal", "最近續期")}
        </tr></thead>
        <tbody>
          ${list.map((d) => {
            const c = mdmCategory(d, y);
            const r = d.mdmLastRenewal;
            return `
            <tr>
              <td><input type="checkbox" class="st-check" data-msel="${esc(d.id)}" ${S.mdmSel.has(d.id) ? "checked" : ""} aria-label="選擇 ${esc(d.label)}"></td>
              <td><strong>${esc(d.label)}</strong></td>
              <td class="mono">${esc(d.serial)}</td>
              <td>${esc(d.batch || "")}</td>
              <td>${esc(d.mdm || "")}</td>
              <td><span class="badge badge--${STATUS[d.status]?.tone}">${STATUS[d.status]?.label}</span></td>
              <td><span class="badge badge--${CAT[c][1]}">${CAT[c][0]}</span></td>
              <td class="nowrap">${mdmExpiry(d) ? fmtDate(mdmExpiry(d)) : "—"}</td>
              <td>${r ? `${fmtDate(r.date)}${r.note ? `<br><small>${esc(r.note)}</small>` : ""}` : ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
  updateMdmBar();
}

/* ---------- Excel 更新 ---------- */
const U_COLS = ["Label No.", "機序號", "批次", "MDM 系統", "MDM 到期日", "Pencil Label No.", "Pencil 機序號", "狀態",
  "持有者", "STRN", "班別", "學號", "備註"];
const STATUS_BY_LABEL = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [v.label, k]));
const U = { plan: null };

function setupUpdate() {
  $("#u-template").addEventListener("click", () => {
    const rows = [U_COLS];
    for (const d of sorted(S.devices, "list")) {
      const h = d.holder || {};
      rows.push([d.label, d.serial, d.batch, d.mdm, mdmExpiry(d) || "", d.pencilLabel, d.pencilSerial,
        STATUS[d.status]?.label || d.status, h.name, h.strn, h.cls, h.no, d.note]);
    }
    downloadCSV(`QEF_iPad_更新範本_${todayId()}.csv`, rows);
  });
  $("#u-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $("#u-result").innerHTML = `<p class="empty">正在讀取 ${esc(file.name)}…</p>`;
    try {
      XLSX = await loadXlsx();
      const buf = await file.arrayBuffer();
      let wb;
      if (/\.csv$/i.test(file.name)) {
        let text;
        try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { text = new TextDecoder("big5").decode(buf); }
        wb = XLSX.read(text, { type: "string", raw: true });
      } else {
        wb = XLSX.read(buf, { type: "array" });
      }
      const ws = wb.Sheets[wb.SheetNames[0]];
      U.plan = planUpdate(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }));
      renderUpdatePlan();
    } catch (err) {
      console.error(err);
      $("#u-result").innerHTML = `<p class="load-error">未能讀取檔案：${esc(err.message)}</p>`;
    }
  });
  $("#u-result").addEventListener("click", (e) => { if (e.target.closest("[data-u-run]")) runUpdate(e.target.closest("[data-u-run]")); });
}

/** 比較檔案與現有資料，列出每部 iPad 的改動 */
function planUpdate(rows) {
  const hi = rows.findIndex((r) => r.some((c) => String(c).trim() === "Label No."));
  if (hi < 0) throw new Error("找不到「Label No.」標題，請使用更新範本。");
  const head = rows[hi].map((c) => String(c ?? "").trim());
  const col = Object.fromEntries(U_COLS.map((n) => [n, head.indexOf(n)]));
  const cell = (r, n) => (col[n] >= 0 && r[col[n]] != null ? String(r[col[n]]).trim() : "");
  const has = (n) => col[n] >= 0;
  const items = [];
  const errors = [];
  const seen = new Set();

  for (const [i, r] of rows.slice(hi + 1).entries()) {
    const label = cell(r, "Label No.");
    if (!label) continue;
    const rowNo = hi + i + 2;
    const id = idOf(label);
    if (seen.has(id)) { errors.push(`第 ${rowNo} 行：${label} 重複。`); continue; }
    seen.add(id);
    const d = S.devices.find((x) => x.id === id);
    const changes = {};
    const notes = [];
    const set = (field, name, val, cur) => {
      if (val === "" || val === (cur ?? "")) return;
      changes[field] = val;
      notes.push(`${name}：${cur || "—"} → ${val}`);
    };
    set("serial", "機序號", cell(r, "機序號").toUpperCase(), d?.serial);
    const bt = cell(r, "批次").match(/^(\d{2}-\d{2})/);
    if (bt) set("batch", "批次", bt[1], d?.batch);
    set("mdm", "MDM 系統", cell(r, "MDM 系統"), d?.mdm);
    if (has("MDM 到期日") && cell(r, "MDM 到期日")) {
      const ex = toDateId(r[col["MDM 到期日"]]);
      if (!ex) errors.push(`第 ${rowNo} 行：${label} 的 MDM 到期日看不懂（請填 2027-08-31）。`);
      else set("mdmExpiry", "MDM 到期日", ex, d ? mdmExpiry(d) : "");
    }
    set("pencilLabel", "Pencil Label", cell(r, "Pencil Label No."), d?.pencilLabel);
    set("pencilSerial", "Pencil 機序號", cell(r, "Pencil 機序號").toUpperCase(), d?.pencilSerial);
    set("note", "備註", cell(r, "備註"), d?.note);
    let status = null;
    if (cell(r, "狀態")) {
      status = STATUS_BY_LABEL[cell(r, "狀態")];
      if (!status) errors.push(`第 ${rowNo} 行：${label} 的狀態「${cell(r, "狀態")}」看不懂。`);
    }

    // 持有者
    let action = null;
    let student = null;
    if (has("持有者")) {
      const name = cell(r, "持有者");
      const strn = cell(r, "STRN").toUpperCase();
      const cls = cell(r, "班別").toUpperCase();
      const no = cell(r, "學號");
      const h = d?.holder;
      if (!name) {
        if (h) { action = "return"; notes.push(`歸還：${holderText(h)}`); }
      } else {
        student = { name, strn, cls, no };
        const same = h && ((strn && h.strn && h.strn === strn) || (!strn || !h.strn) && h.name === name);
        if (same) {
          const diff = ["name", "strn", "cls", "no"].filter((k) => student[k] && student[k] !== (h[k] || ""));
          if (diff.length) {
            action = "student";
            notes.push(`學生資料：${holderText(h)} ${h.strn || ""} → ${holderText({ ...h, ...Object.fromEntries(diff.map((k) => [k, student[k]])) })} ${student.strn || h.strn || ""}`);
          }
        } else {
          action = h ? "transfer" : "loan";
          notes.push(h ? `轉借：${holderText(h)} → ${holderText(student)}` : `借出給 ${holderText(student)}`);
        }
      }
    }
    if (status && status !== d?.status && !(action === "loan" || action === "transfer") && !(action === "return" && status === "available")) {
      notes.push(`狀態：${STATUS[d?.status]?.label || "—"} → ${STATUS[status].label}`);
    }
    if (!d && !changes.serial) { errors.push(`第 ${rowNo} 行：新 iPad ${label} 須填寫機序號。`); continue; }
    if (!notes.length && d) continue;   // 沒有改動
    items.push({ id, label, d, changes, status, action, student, notes, isNew: !d });
  }
  return { items, errors };
}

function renderUpdatePlan() {
  const { items, errors } = U.plan;
  const box = $("#u-result");
  const tag = (it) => it.isNew ? "新增" : { loan: "借出", transfer: "轉借", return: "歸還", student: "更新學生資料" }[it.action] || "更新";
  box.innerHTML = `
    ${errors.length ? `<div class="load-error"><strong>以下 ${errors.length} 行未能處理：</strong><br>${errors.map(esc).join("<br>")}</div>` : ""}
    ${items.length ? `
      <div class="import-bar mt-s">
        <p>將更新 ${items.length} 部 iPad（新增 ${items.filter((x) => x.isNew).length} 部）。其餘沒有改動的 iPad 不受影響。</p>
        <button class="btn btn--primary" data-u-run>確認更新</button>
      </div>
      <div class="table-scroll mt-s">
        <table class="table">
          <thead><tr><th>Label</th><th>類別</th><th>改動</th></tr></thead>
          <tbody>${items.map((it) => `
            <tr><td><strong>${esc(it.label)}</strong></td><td><span class="badge badge--${it.isNew ? "go" : "wait"}">${tag(it)}</span></td>
            <td>${it.notes.map(esc).join("<br>")}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<p class="empty mt-s">檔案中的資料與系統相同，沒有需要更新的項目。</p>`}`;
}

async function runUpdate(btn) {
  const items = U.plan?.items || [];
  if (!items.length) return;
  if (!confirm(`確認更新 ${items.length} 部 iPad？`)) return;
  btn.disabled = true;
  btn.textContent = "更新中…";
  const year = thisYear();
  const today = todayId();
  try {
    for (let i = 0; i < items.length; i += 150) {
      const b = writeBatch(db);
      for (const it of items.slice(i, i + 150)) {
        const d = it.d || {};
        const upd = { ...it.changes, updatedAt: serverTimestamp(), updatedBy: S.user.email };
        let log = [...(d.holderLog || [])];
        const closeOpen = (outcome) => {
          const idx = log.map((x, k) => [x, k]).reverse().find(([x]) => x.outcome === "借用中")?.[1];
          if (idx != null) log[idx] = { ...log[idx], outcome, to: today, years: log[idx].years.includes(year) ? log[idx].years : [...log[idx].years, year] };
        };
        if (it.action === "return") {
          closeOpen("已歸還");
          Object.assign(upd, { holder: null, lastHolder: d.holder || null, status: it.status || "available", holderLog: log });
        } else if (it.action === "loan" || it.action === "transfer") {
          if (it.action === "transfer") closeOpen("轉借");
          const st = { ...it.student, since: today };
          log.push({ years: [year], name: st.name, strn: st.strn, cls: st.cls, no: st.no, outcome: "借用中", from: today, source: "app" });
          Object.assign(upd, { holder: st, status: "loaned", holderLog: log });
        } else if (it.action === "student") {
          const nh = { ...d.holder, ...Object.fromEntries(Object.entries(it.student).filter(([, v]) => v)) };
          const idx = log.map((x, k) => [x, k]).reverse().find(([x]) => x.outcome === "借用中")?.[1];
          if (idx != null) {
            const e = log[idx];
            log[idx] = { ...e, name: nh.name, strn: nh.strn || e.strn, cls: nh.cls, no: nh.no, years: e.years.includes(year) ? e.years : [...e.years, year] };
          }
          Object.assign(upd, { holder: nh, holderLog: log });
          if (it.status) upd.status = it.status;
        } else if (it.status) {
          upd.status = it.status;
        }
        if (it.isNew) {
          Object.assign(upd, { label: it.label, status: upd.status || "available", holder: upd.holder ?? null, createdAt: serverTimestamp() });
          if (!upd.mdm) upd.mdm = QEF.mdmSystems[0];
          b.set(devRef(it.id), upd);
        } else {
          b.update(devRef(it.id), upd);
        }
        b.set(doc(histColl()), {
          deviceId: it.id, label: it.label, type: "excel", date: today, by: S.user.email, at: serverTimestamp(),
          student: upd.holder || null, note: it.notes.join("；"),
        });
      }
      await b.commit();
    }
    U.plan = null;
    $("#u-result").innerHTML = `<p class="empty">已更新 ${items.length} 部 iPad。</p>`;
    $("#u-file").value = "";
    toast(`已更新 ${items.length} 部 iPad。`, "success");
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "確認更新";
    toast("未能更新：" + err.message, "error");
  }
}

/* ---------- 新增 iPad ---------- */
function nextLabel() {
  const nums = S.devices.map((d) => String(d.label).match(/^i(\d+)$/i)).filter(Boolean).map((m) => Number(m[1]));
  return nums.length ? `i${Math.max(...nums) + 1}` : "";
}

function setupAdd() {
  const f = $("#add-form");
  f.mdm.innerHTML = QEF.mdmSystems.map((m) => `<option>${esc(m)}</option>`).join("");
  document.querySelector('.tab[data-tab="add"]').addEventListener("click", () => {
    if (!f.label.value) f.label.value = nextLabel();
    if (!f.batch.value) f.batch.value = yearLabel(currentYearStart());
  });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const warn = (m) => { const w = $("#add-warn"); w.hidden = !m; w.textContent = m; };
    const data = {
      label: f.label.value.trim(), serial: f.serial.value.trim().toUpperCase(), batch: f.batch.value.trim(),
      mdm: f.mdm.value, pencilLabel: f.pencilLabel.value.trim(), pencilSerial: f.pencilSerial.value.trim().toUpperCase(),
      note: f.note.value.trim(),
    };
    if (!data.label || !data.serial) return warn("請填寫 Label No. 及機序號。");
    if (!/^\d{2}-\d{2}$/.test(data.batch)) return warn("批次格式應為「26-27」。");
    const id = idOf(data.label);
    if ((await getDoc(devRef(id))).exists()) return warn(`${data.label} 已存在。`);
    if (S.devices.some((d) => d.serial === data.serial)) return warn(`機序號 ${data.serial} 已存在。`);
    warn("");
    const b = writeBatch(db);
    b.set(devRef(id), { ...data, status: "available", holder: null, check: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: S.user.email });
    b.set(doc(histColl()), { deviceId: id, label: data.label, type: "create", by: S.user.email, at: serverTimestamp(), date: todayId() });
    try {
      await b.commit();
      toast(`已新增 ${data.label}。`, "success");
      f.reset();
      f.label.value = nextLabel();
      f.batch.value = data.batch;
      f.mdm.value = data.mdm;
    } catch (err) { warn("未能新增：" + err.message); }
  });
}

/* ---------- 匯入 Excel ---------- */
let XLSX = null;
const IMP = { wb: null, rows: null };
// 「現時持有者」欄中代表 iPad 已不在學生手上的字眼
const RETURNED = /歸還|取機|放棄|畢業|退學|轉校|框中|在校/;

function toDateId(v) {
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === "number" && v > 30000) { const p = XLSX.SSF.parse_date_code(v); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; }
  const t = String(v || "").trim();
  let m = t.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);   // 日/月/年
  return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : "";
}

/** 讀取 QEF 校產點算工作表 */
function parseSheet(rows) {
  const hi = rows.findIndex((r) => r.some((c) => String(c).trim() === "Label No."));
  if (hi < 0) return null;
  const h = rows[hi].map((c) => String(c ?? "").trim());
  const at = (name, nth = 0) => h.reduce((acc, x, i) => (x === name ? [...acc, i] : acc), [])[nth] ?? -1;
  const col = {
    label: at("Label No."), serial: at("機序號"), batch: at("可上堂借用"), mdm: at("MDM 系統"),
    pLabel: at("Pencil Label No."), pSerial: at("Pencil 機序號"),
    applicant: at("申請者"), strn: at("申請者STRN"), cls1: at("班別", 0), no1: at("學號", 0),
    state: at("狀況"), holder: at("現時持有者") >= 0 ? at("現時持有者") : at("持有者"),
    cls2: at("班別", 1), no2: at("學號", 1), date: at("點算日期"),
    body: at("iPads機身"), pencil: at("Apple Pencil"), case: at("保護套"),
  };
  const noteCol = col.case >= 0 ? col.case + 1 : -1;
  const s = (r, i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : "");
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const label = s(r, col.label);
    const serial = s(r, col.serial);
    if (!label || !serial) continue;   // 略過總結行
    const bm = s(r, col.batch).match(/^(\d{2}-\d{2})/);
    const holderRaw = s(r, col.holder);
    const state = s(r, col.state);
    const applicant = { name: s(r, col.applicant), strn: s(r, col.strn).toUpperCase(), cls: s(r, col.cls1).toUpperCase(), no: s(r, col.no1) };
    let status;
    let holder = null;
    let lastHolder = null;
    const notes = [];
    if (/注銷|註銷/.test(holderRaw)) { status = "retired"; notes.push(holderRaw); }
    else if (!holderRaw || RETURNED.test(holderRaw)) {
      status = "available";
      if (applicant.name) lastHolder = applicant;
      if (holderRaw) notes.push(`${applicant.name ? `${applicant.name}：` : ""}${holderRaw}`);
    } else {
      status = "loaned";
      holder = {
        name: holderRaw,
        strn: holderRaw === applicant.name ? applicant.strn : "",
        cls: (s(r, col.cls2) || applicant.cls).toUpperCase(),
        no: s(r, col.no2) || applicant.no,
        since: "",
      };
    }
    if (state) {
      notes.push(`狀況：${state}`);
      if (status === "available" && /壞|爆|維修/.test(state)) status = "repair";
    }
    // 當年的借用者（用於「借用者記錄」）
    const log = [];
    if (applicant.name) {
      let outcome = "";
      if (/畢業|退學|轉校|放棄/.test(state)) outcome = state;
      else if (holderRaw && (RETURNED.test(holderRaw) || /注銷|註銷/.test(holderRaw))) outcome = holderRaw;
      else if (holderRaw === applicant.name) outcome = "借用中";
      else if (holderRaw) outcome = "轉借";
      // 仍由申請者持有時，用當年的班別及學號（「現時持有者」旁的欄）
      const sameHolder = holderRaw === applicant.name;
      log.push({ ...applicant, cls: (sameHolder && s(r, col.cls2).toUpperCase()) || applicant.cls,
        no: (sameHolder && s(r, col.no2)) || applicant.no, outcome });
    }
    if (status === "loaned" && holder.name !== applicant.name) log.push({ name: holder.name, strn: "", cls: holder.cls, no: holder.no, outcome: "借用中" });
    const extra = s(r, noteCol);
    if (extra) notes.push(extra);
    const date = col.date >= 0 ? toDateId(r[col.date]) : "";
    // 保護套不用檢查，只讀取機身及 Pencil（保護套欄只用來找出其後的備註欄）
    const check = (s(r, col.body) || s(r, col.pencil) || date)
      ? { date, body: s(r, col.body), pencil: s(r, col.pencil) } : null;
    out.push({
      id: idOf(label, serial), label, serial: serial.toUpperCase(), batch: bm ? bm[1] : "", mdm: s(r, col.mdm),
      pencilLabel: s(r, col.pLabel), pencilSerial: s(r, col.pSerial).toUpperCase(),
      status, holder, lastHolder, check, note: notes.join("\n"), log,
    });
  }
  return out;
}

/** 由工作表名稱推算學年開始年份，例如「2025-2026年度…」→ 2025；「2024-9月_…-2023-9-27」→ 2023 */
function sheetYear(name) {
  let m = name.match(/(\d{4})-(\d{4})年度/);
  if (m) return Number(m[1]);
  m = name.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s*$/);
  if (m) return Number(m[2]) >= 9 ? Number(m[1]) : Number(m[1]) - 1;
  m = name.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

/** 各學年工作表的點算結果 → 每部 iPad 的盤點記錄 */
function buildStocktakes(sheets) {
  const out = {};
  for (const { year, list } of sheets) {
    for (const d of list) {
      const c = d.check;
      if (!c || !(c.date || c.body || c.pencil)) continue;
      (out[d.id] ||= {})[`y${year}`] = { date: c.date || "", body: c.body || "", pencil: c.pencil || "", by: "Excel" };
    }
  }
  return out;
}

/** 把各學年的借用者合併為每部 iPad 的借用者記錄（同一學生連續學年合併為一行） */
function buildLogs(sheets) {
  const byDev = {};
  for (const { year, list } of [...sheets].sort((a, b) => a.year - b.year)) {
    for (const d of list) {
      for (const e of d.log) {
        const arr = (byDev[d.id] ||= []);
        const key = (x) => (x.strn || x.name).toUpperCase();
        const last = arr[arr.length - 1];
        if (last && key(last) === key(e)) {
          if (!last.years.includes(yearLabel(year))) last.years.push(yearLabel(year));
          Object.assign(last, { cls: e.cls || last.cls, no: e.no || last.no, outcome: e.outcome || last.outcome, strn: last.strn || e.strn });
        } else {
          arr.push({ years: [yearLabel(year)], name: e.name, strn: e.strn, cls: e.cls, no: e.no, outcome: e.outcome, source: "excel" });
        }
      }
    }
  }
  // 較早的記錄若仍寫「借用中」，代表之後已轉給其他學生
  for (const arr of Object.values(byDev)) arr.forEach((x, i) => { if (i < arr.length - 1 && x.outcome === "借用中") x.outcome = "—"; });
  return byDev;
}

function setupImport() {
  $("#import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $("#import-result").innerHTML = `<p class="empty">正在讀取 ${esc(file.name)}…</p>`;
    try {
      XLSX = await loadXlsx();
      IMP.wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const names = IMP.wb.SheetNames.filter((n) => /QEF/.test(n));
      const sel = $("#import-sheet");
      sel.innerHTML = (names.length ? names : IMP.wb.SheetNames).map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
      // 預設選最新年度
      const latest = [...names].sort((a, b) => (b.match(/20\d\d/)?.[0] || "").localeCompare(a.match(/20\d\d/)?.[0] || ""))[0];
      if (latest) sel.value = latest;
      $("#import-sheet-wrap").hidden = false;
      preview();
    } catch (err) {
      $("#import-result").innerHTML = `<p class="load-error">未能讀取檔案：${esc(err.message)}</p>`;
    }
  });
  $("#import-sheet").addEventListener("change", preview);
  $("#import-result").addEventListener("click", (e) => { if (e.target.closest("[data-run-import]")) runImport(e.target.closest("[data-run-import]")); });
}

function preview() {
  const rows = XLSX.utils.sheet_to_json(IMP.wb.Sheets[$("#import-sheet").value], { header: 1, raw: true, defval: "" });
  const list = parseSheet(rows);
  const box = $("#import-result");
  if (!list?.length) { IMP.rows = null; box.innerHTML = `<p class="load-error">這個工作表找不到「Label No.」標題或 iPad 資料。</p>`; return; }
  IMP.rows = list;
  const qefSheets = IMP.wb.SheetNames.filter((n) => /QEF校產/.test(n) && sheetYear(n) != null);
  const main = $("#import-sheet").value;
  const sheetData = qefSheets.map((n) => ({
    year: sheetYear(n),
    list: n === main ? list : (parseSheet(XLSX.utils.sheet_to_json(IMP.wb.Sheets[n], { header: 1, raw: true, defval: "" })) || []),
  }));
  IMP.logs = buildLogs(sheetData);
  IMP.stocks = buildStocktakes(sheetData);
  const logCount = Object.values(IMP.logs).reduce((n, a) => n + a.length, 0);
  const by = (key) => list.reduce((m, d) => { m[d[key]] = (m[d[key]] || 0) + 1; return m; }, {});
  const batches = by("batch");
  const statuses = by("status");
  const exist = list.filter((d) => S.devices.some((x) => x.id === d.id)).length;
  const noStrn = list.filter((d) => d.status === "loaned" && !d.holder.strn);
  box.innerHTML = `
    <div class="import-bar">
      <p>共 ${list.length} 部 iPad：新增 ${list.length - exist} 部，更新 ${exist} 部。</p>
      <button class="btn btn--primary" data-run-import>確認匯入</button>
    </div>
    <label class="check mt-s"><input type="checkbox" id="import-logs" checked>
      同時匯入歷年借用者及點算記錄（${qefSheets.length} 張 QEF 校產點算工作表：${qefSheets.map((n) => yearLabel(sheetYear(n))).sort().join("、")}，共 ${logCount} 項）</label>
    <div class="forms-grid mt-s">
      <div class="card-form"><h3>各批次數量</h3><ul class="old-list">${Object.entries(batches).sort().map(([k, v]) => `<li>${esc(k || "（未有批次）")}：${v} 部</li>`).join("")}</ul></div>
      <div class="card-form"><h3>狀態</h3><ul class="old-list">${Object.entries(statuses).map(([k, v]) => `<li>${STATUS[k]?.label || k}：${v} 部</li>`).join("")}</ul></div>
    </div>
    ${noStrn.length ? `<p class="warn mt-s">${noStrn.length} 部借出中的 iPad，持有者與申請者不同，所以沒有 STRN：${noStrn.map((d) => esc(d.label)).join("、")}。匯入後可在詳細資料補上。</p>` : ""}
    <div class="table-scroll mt-s">
      <table class="table">
        <thead><tr><th>Label</th><th>機序號</th><th>批次</th><th>MDM</th><th>狀態</th><th>持有者</th><th>備註</th></tr></thead>
        <tbody>${list.map((d) => `
          <tr><td>${esc(d.label)}</td><td class="mono">${esc(d.serial)}</td><td>${esc(d.batch)}</td><td>${esc(d.mdm)}</td>
          <td><span class="badge badge--${STATUS[d.status].tone}">${STATUS[d.status].label}</span></td>
          <td>${esc(holderText(d.holder))} <span class="mono">${esc(d.holder?.strn || "")}</span></td>
          <td class="pre"><small>${esc(d.note)}</small></td></tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function runImport(btn) {
  if (!IMP.rows) return;
  if (!confirm(`匯入 ${IMP.rows.length} 部 iPad？同一 Label 的現有資料會被更新。`)) return;
  btn.disabled = true;
  btn.textContent = "匯入中…";
  const sheet = $("#import-sheet").value;
  try {
    for (let i = 0; i < IMP.rows.length; i += 200) {
      const b = writeBatch(db);
      for (const d of IMP.rows.slice(i, i + 200)) {
        const { id, log, ...data } = d;
        if ($("#import-logs")?.checked) {
          // 保留在平台上登記（source: app）而 Excel 沒有的記錄
          const appLogs = (S.devices.find((x) => x.id === id)?.holderLog || []).filter((x) => x.source === "app");
          data.holderLog = [...(IMP.logs[id] || []), ...appLogs];
          // 歷年點算結果；已在平台盤點的學年不會被覆蓋
          const existing = S.devices.find((x) => x.id === id)?.stocktakes || {};
          data.stocktakes = { ...(IMP.stocks[id] || {}), ...existing };
        }
        void log;
        b.set(devRef(id), { ...data, updatedAt: serverTimestamp(), updatedBy: S.user.email, importedFrom: sheet }, { merge: true });
        b.set(doc(histColl()), {
          deviceId: id, label: d.label, type: "import", by: S.user.email, at: serverTimestamp(), date: todayId(),
          student: d.holder || null, note: `${sheet}${d.note ? `：${d.note.replace(/\n/g, "；")}` : ""}`,
        });
      }
      await b.commit();
    }
    IMP.rows = null;
    $("#import-result").innerHTML = `<p class="empty">匯入完成。</p>`;
    $("#import-file").value = "";
    toast("匯入完成。", "success");
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "確認匯入";
    toast("未能匯入：" + err.message, "error");
  }
}

