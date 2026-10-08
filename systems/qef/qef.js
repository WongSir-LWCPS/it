import {
  boot, db, esc, toast, fmtDate, fmtTimestamp, todayId, pad, enhanceDateInputs, downloadCSV, loadXlsx,
} from "../../assets/js/common.js?v=20261008a";
import {
  collection, doc, onSnapshot, getDoc, getDocs, query, where, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  QEF, STATUS, mdmStatus, currentYearStart, yearLabel,
} from "./qef-config.js?v=20261008a";

const $ = (sel) => document.querySelector(sel);
const S = { user: null, devices: [], openId: null };
const devRef = (id) => doc(db, "qef_devices", id);
const histColl = () => collection(db, "qef_history");
const idOf = (label, serial) => String(label || serial || "").trim().replace(/[\/\s]+/g, "_");
const natural = (a, b) => String(a.label).localeCompare(String(b.label), "en", { numeric: true });
const holderText = (h) => (h ? `${h.name}${h.cls ? `（${h.cls}${h.no ? ` ${h.no}` : ""}）` : ""}` : "");

boot({
  root: "../../", current: "qef",
  onReady: ({ user, isAdmin }) => {
    if (!isAdmin) return;   // 非管理員已由 boot() 擋住
    S.user = user;
    setupTabs();
    setupFilters();
    setupAdd();
    setupImport();
    onSnapshot(collection(db, "qef_devices"), (snap) => {
      S.devices = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(natural);
      renderStats();
      renderFilterOptions();
      renderList();
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
  const inUse = S.devices.filter((d) => !["retired", "lost"].includes(d.status));
  const y = currentYearStart();
  const mdmNow = inUse.filter((d) => mdmStatus(d.batch, y).paid).length;
  const mdmNext = inUse.filter((d) => mdmStatus(d.batch, y + 1).paid).length;
  const cards = [
    ["總數（不包括已註銷）", S.devices.length - count("retired")],
    ["借出中", count("loaned")],
    ["可借出", count("available")],
    ["維修中", count("repair")],
    ["遺失", count("lost")],
    ["已註銷", count("retired")],
    [`${yearLabel(y)} 需購買 MDM`, mdmNow],
    [`${yearLabel(y + 1)} 需購買 MDM`, mdmNext],
  ];
  $("#stats").innerHTML = cards.map(([k, v]) => `<div class="stat"><span class="stat-num">${v}</span><span class="stat-label">${esc(k)}</span></div>`).join("");
}

/* ---------- 清單 ---------- */
function setupFilters() {
  ["#f-q", "#f-status", "#f-batch", "#f-mdm"].forEach((id) => $(id).addEventListener("input", renderList));
  $("#f-status").innerHTML = `<option value="">全部</option>` + Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  $("#f-mdm").innerHTML = `<option value="">全部</option><option value="paid">需每年購買</option><option value="included">已包括</option>`
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
    if (md === "paid" && !mdmStatus(d.batch).paid) return false;
    if (md === "included" && mdmStatus(d.batch).paid) return false;
    if (md.startsWith("sys:") && d.mdm !== md.slice(4)) return false;
    if (!q) return true;
    const h = d.holder || {};
    return [d.label, d.serial, d.pencilLabel, d.pencilSerial, h.name, h.strn, h.cls, `${h.cls || ""}${h.no || ""}`]
      .some((v) => String(v || "").toLowerCase().includes(q));
  });
}

function renderList() {
  const list = filtered();
  $("#list-count").textContent = `顯示 ${list.length} 部（共 ${S.devices.length} 部）`;
  const box = $("#device-list");
  if (!S.devices.length) {
    box.innerHTML = `<p class="empty">還未有 iPad 資料。請到「匯入 Excel」上載現有的點算表，或到「新增 iPad」逐部加入。</p>`;
    return;
  }
  box.innerHTML = `
    <div class="table-scroll">
      <table class="table table--click">
        <thead><tr><th>Label</th><th>機序號</th><th>批次</th><th>MDM</th><th>Pencil</th><th>狀態</th><th>持有者</th><th>STRN</th><th>最近檢查</th></tr></thead>
        <tbody>
          ${list.map((d) => {
            const m = mdmStatus(d.batch);
            const c = d.check || {};
            const problem = [c.body, c.pencil, c.case].some((v) => v && v !== "已檢查正常");
            return `
            <tr data-id="${esc(d.id)}" tabindex="0">
              <td class="nowrap"><strong>${esc(d.label)}</strong></td>
              <td class="mono">${esc(d.serial)}</td>
              <td>${esc(d.batch || "")}</td>
              <td>${esc(d.mdm || "")}<br><small class="${m.paid ? "hint--error" : ""}">${esc(m.paid ? "需每年購買" : m.text)}</small></td>
              <td>${esc(d.pencilLabel || "")}</td>
              <td><span class="badge badge--${STATUS[d.status]?.tone || "muted"}">${STATUS[d.status]?.label || esc(d.status)}</span></td>
              <td>${esc(holderText(d.holder))}</td>
              <td class="mono">${esc(d.holder?.strn || "")}</td>
              <td class="nowrap">${c.date ? fmtDate(c.date) : ""}${problem ? '<br><span class="badge badge--stop">有問題</span>' : ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function exportCSV() {
  const rows = [["Label No.", "機序號", "批次", "MDM 系統", "MDM 狀態", "Pencil Label No.", "Pencil 機序號", "狀態",
    "持有者", "STRN", "班別", "學號", "點算日期", "iPads機身", "Apple Pencil", "保護套", "備註"]];
  for (const d of filtered()) {
    const h = d.holder || {};
    const c = d.check || {};
    rows.push([d.label, d.serial, d.batch, d.mdm, mdmStatus(d.batch).text, d.pencilLabel, d.pencilSerial,
      STATUS[d.status]?.label || d.status, h.name, h.strn, h.cls, h.no, c.date, c.body, c.pencil, c.case, d.note]);
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
  const m = mdmStatus(d.batch);
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
      <dt>MDM</dt><dd>${esc(d.mdm || "—")}，${esc(m.text)}</dd>
      <dt>Apple Pencil</dt><dd>${esc(d.pencilLabel || "—")} <span class="mono">${esc(d.pencilSerial || "")}</span></dd>
      <dt>持有者</dt><dd>${h ? `${esc(holderText(h))} <span class="mono">${esc(h.strn || "")}</span>${h.since ? `，${fmtDate(h.since)} 起` : ""}` : "—"}</dd>
      ${d.lastHolder && !h ? `<dt>上一位持有者</dt><dd>${esc(holderText(d.lastHolder))} <span class="mono">${esc(d.lastHolder.strn || "")}</span></dd>` : ""}
      <dt>最近檢查</dt><dd>${c.date ? `${fmtDate(c.date)}：機身 ${esc(c.body || "—")}，Pencil ${esc(c.pencil || "—")}，保護套 ${esc(c.case || "—")}` : "—"}</dd>
      ${d.note ? `<dt>備註</dt><dd class="pre">${esc(d.note)}</dd>` : ""}
    </dl>

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
          <label class="field"><span>Apple Pencil</span>${checkSelect("pencil")}</label>
          <label class="field"><span>保護套</span>${checkSelect("case")}</label>
        </div>
        <label class="field"><span>備註（選填）</span><input name="note" maxlength="200"></label>
        <p class="hint">如有任何一項不是「已檢查正常」，iPad 會轉為「維修中」。</p>
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
        </div>
        <div class="field-row">
          <label class="field"><span>Pencil Label No.</span><input name="pencilLabel" value="${esc(d.pencilLabel || "")}" maxlength="20"></label>
          <label class="field"><span>Pencil 機序號</span><input name="pencilSerial" value="${esc(d.pencilSerial || "")}" maxlength="30"></label>
        </div>
        <label class="field"><span>備註</span><textarea name="note" rows="2" maxlength="300">${esc(d.note || "")}</textarea></label>
        <button class="btn" type="submit">儲存資料</button>
      </form>
    </details>

    <h3 class="mt-s">歷史記錄</h3>
    <div id="dev-history"><p class="hint">正在讀取…</p></div>`;

  enhanceDateInputs($("#dev-body"));
  if (!keep || !dialog.open) dialog.showModal();
  loadHistory(id);
}

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
    return: `${who} ${esc(r.reason || "歸還")}${c ? `（機身 ${esc(c.body)}，Pencil ${esc(c.pencil)}，保護套 ${esc(c.case)}）` : ""}`,
    status: `狀態改為「${esc(STATUS[r.to]?.label || r.to)}」`,
    edit: "修改了 iPad 資料",
    create: "新增 iPad",
    import: "由 Excel 匯入",
  }[r.type] || esc(r.type);
  return `<li><span class="history-when">${when}</span><span>${what}${r.note ? `<br><small>${esc(r.note)}</small>` : ""}</span>
    <small class="history-by">${esc(r.by || "")}</small></li>`;
}

// 對話框內的表格
$("#dev-dialog").addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) $("#dev-dialog").close();
});
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
    batch.update(devRef(d.id), { ...base, status: "loaned", holder: student });
    batch.set(doc(histColl()), { ...hist, type: "loan", student, date: student.since });
  } else if (type === "return") {
    const check = { date: v("date") || todayId(), body: v("body"), pencil: v("pencil"), case: v("case") };
    const problem = [check.body, check.pencil, check.case].some((x) => x !== "已檢查正常");
    batch.update(devRef(d.id), { ...base, status: problem ? "repair" : "available", holder: null, lastHolder: d.holder || null, check });
    batch.set(doc(histColl()), { ...hist, type: "return", student: d.holder || null, date: check.date, reason: v("reason"), check, note: v("note") });
  } else if (type === "status") {
    batch.update(devRef(d.id), { ...base, status: v("status") });
    batch.set(doc(histColl()), { ...hist, type: "status", from: d.status, to: v("status"), date: todayId(), note: v("note") });
  } else if (type === "edit") {
    const data = { serial: v("serial"), batch: v("batch"), mdm: v("mdm"), pencilLabel: v("pencilLabel"), pencilSerial: v("pencilSerial"), note: v("note") };
    const changes = Object.entries(data).filter(([k, val]) => (d[k] || "") !== val).map(([k, val]) => `${k}: ${d[k] || "—"} → ${val || "—"}`);
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
  const m = String(v || "").match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  return m ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : "";
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
    const extra = s(r, noteCol);
    if (extra) notes.push(extra);
    const date = col.date >= 0 ? toDateId(r[col.date]) : "";
    const check = (s(r, col.body) || s(r, col.pencil) || s(r, col.case) || date)
      ? { date, body: s(r, col.body), pencil: s(r, col.pencil), case: s(r, col.case) } : null;
    out.push({
      id: idOf(label, serial), label, serial: serial.toUpperCase(), batch: bm ? bm[1] : "", mdm: s(r, col.mdm),
      pencilLabel: s(r, col.pLabel), pencilSerial: s(r, col.pSerial).toUpperCase(),
      status, holder, lastHolder, check, note: notes.join("\n"),
    });
  }
  return out;
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
        const { id, ...data } = d;
        b.set(devRef(id), { ...data, updatedAt: serverTimestamp(), updatedBy: S.user.email, importedFrom: sheet });
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

