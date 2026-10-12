// QEF iPad管理：申請記錄（各年申請人名單、檢查新申請者是否三年內已申請）
import { db, esc, toast, downloadCSV, loadXlsx } from "../../assets/js/common.js?v=20261008t";
import {
  collection, doc, onSnapshot, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { currentYearStart, yearLabel } from "./qef-config.js?v=20261008t";

const $ = (sel) => document.querySelector(sel);
const WINDOW = 3;   // 檢查最近幾個學年
const A = { list: [], loaded: false, ctx: null, plan: null, sort: { key: "year", dir: -1 } };
const collator = new Intl.Collator("zh-Hant", { numeric: true, sensitivity: "base" });
const normStrn = (v) => String(v ?? "").trim().toUpperCase().replace(/[\s()（）-]/g, "");

/** 「P1 (2021/22)」→ { level: "P1", yearStart: 2021 } */
export function parseLevelYear(v) {
  const t = String(v ?? "");
  const lv = t.match(/P\s*([1-6])/i);
  const yr = t.match(/(20\d{2})\s*[/／-]\s*(\d{2,4})/);
  return { level: lv ? `P${lv[1]}` : "", yearStart: yr ? Number(yr[1]) : null };
}

export function setupApplicants(ctx) {
  A.ctx = ctx;
  $("#a-window-n").textContent = WINDOW;
  const y = currentYearStart();
  $("#a-year").innerHTML = [y + 1, y, y - 1].map((v) => `<option value="${v}" ${v === y ? "selected" : ""}>${yearLabel(v)}</option>`).join("");
  // 第一次打開分頁才讀取，節省讀取量
  document.querySelector('.tab[data-tab="apply"]').addEventListener("click", load, { once: true });
  ["#a-f-year", "#a-f-level", "#a-q"].forEach((id) => $(id).addEventListener("input", renderList));
  $("#a-export").addEventListener("click", exportList);
  $("#a-check").addEventListener("click", () => check(parseStrns($("#a-strns").value)));
  $("#a-check-file").addEventListener("change", checkFile);
  $("#a-import-file").addEventListener("change", importFile);
  $("#a-import-result").addEventListener("click", (e) => { if (e.target.closest("[data-a-run]")) runImport(e.target.closest("[data-a-run]")); });
  $("#a-list").addEventListener("click", (e) => {
    const h = e.target.closest("[data-a-sort]");
    if (!h) return;
    if (A.sort.key === h.dataset.aSort) A.sort.dir *= -1; else A.sort = { key: h.dataset.aSort, dir: 1 };
    renderList();
  });
}

function load() {
  $("#a-list").innerHTML = `<p class="empty">正在讀取…</p>`;
  onSnapshot(collection(db, "qef_applicants"), (snap) => {
    A.list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    A.loaded = true;
    renderSummary();
    renderFilters();
    renderList();
  }, (e) => { $("#a-list").innerHTML = `<p class="load-error">未能讀取申請記錄：${esc(e.message)}。請確認已發佈最新的 Firestore 規則。</p>`; });
}

/* ---------- 名單 ---------- */
function renderSummary() {
  const years = [...new Set(A.list.map((r) => r.yearStart))].sort((a, b) => b - a);
  $("#a-summary").innerHTML = years.length ? `
    <div class="stat-grid stat-grid--tight">${years.map((y) => `
      <div class="stat"><span class="stat-num">${A.list.filter((r) => r.yearStart === y).length}</span><span class="stat-label">${yearLabel(y)} 申請人</span></div>`).join("")}
    </div>` : "";
}

function renderFilters() {
  const ysel = $("#a-f-year");
  const lsel = $("#a-f-level");
  const yv = ysel.value;
  const lv = lsel.value;
  const years = [...new Set(A.list.map((r) => r.yearStart))].sort((a, b) => b - a);
  const levels = [...new Set(A.list.map((r) => r.level).filter(Boolean))].sort();
  ysel.innerHTML = `<option value="">全部</option>` + years.map((y) => `<option value="${y}">${yearLabel(y)}</option>`).join("");
  lsel.innerHTML = `<option value="">全部</option>` + levels.map((l) => `<option>${esc(l)}</option>`).join("");
  ysel.value = years.map(String).includes(yv) ? yv : "";
  lsel.value = levels.includes(lv) ? lv : "";
}

function filtered() {
  const y = $("#a-f-year").value;
  const l = $("#a-f-level").value;
  const q = $("#a-q").value.trim().toLowerCase();
  return A.list.filter((r) => (!y || String(r.yearStart) === y) && (!l || r.level === l)
    && (!q || [r.strn, r.name].some((v) => String(v || "").toLowerCase().includes(q))));
}

const ACC = { strn: (r) => r.strn, name: (r) => r.name, year: (r) => r.yearStart, level: (r) => r.level };
function renderList() {
  if (!A.loaded) return;
  const { key, dir } = A.sort;
  const list = filtered().sort((a, b) => (collator.compare(String(ACC[key](a) ?? ""), String(ACC[key](b) ?? "")) * dir)
    || collator.compare(a.level || "", b.level || "") || collator.compare(a.name || "", b.name || ""));
  $("#a-count").textContent = `顯示 ${list.length} 項（共 ${A.list.length} 項）`;
  if (!A.list.length) {
    $("#a-list").innerHTML = `<p class="empty">還未有申請記錄。請在下方匯入教育局的申請者名單。</p>`;
    return;
  }
  const th = (k, label) => `<th class="sortable${A.sort.key === k ? " is-sorted" : ""}" data-a-sort="${k}">${label}<span class="sort-mark" aria-hidden="true">${A.sort.key === k ? (A.sort.dir > 0 ? "▲" : "▼") : "↕"}</span></th>`;
  $("#a-list").innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr>${th("year", "申請學年")}${th("level", "年級")}${th("strn", "STRN")}${th("name", "姓名")}<th>現時／以往借用的 QEF iPad</th></tr></thead>
        <tbody>${list.map((r) => `
          <tr>
            <td>${yearLabel(r.yearStart)}</td>
            <td>${esc(r.level || "")}</td>
            <td class="mono">${esc(r.strn)}</td>
            <td>${esc(r.name || "")}</td>
            <td>${loanText(r.strn)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/** 以 STRN 找出該學生借用過的 QEF iPad */
function loansOf(strn) {
  const out = [];
  for (const d of A.ctx.getDevices()) {
    if (d.holder?.strn && normStrn(d.holder.strn) === strn) out.push({ label: d.label, current: true, years: [] });
    for (const x of d.holderLog || []) {
      if (x.strn && normStrn(x.strn) === strn && !(d.holder?.strn && normStrn(d.holder.strn) === strn && x.outcome === "借用中")) {
        out.push({ label: d.label, current: false, years: x.years || [], outcome: x.outcome });
      }
    }
  }
  return out;
}
function loanText(strn) {
  const l = loansOf(normStrn(strn));
  if (!l.length) return "";
  return l.map((x) => x.current
    ? `<span class="badge badge--go">現正借用 ${esc(x.label)}</span>`
    : `<small>${esc(x.label)}（${esc(x.years.join("、"))}${x.outcome ? `，${esc(x.outcome)}` : ""}）</small>`).join(" ");
}

function exportList() {
  const rows = [["STRN", "姓名", "申請年份及年級", "申請學年", "年級"]];
  for (const r of filtered()) rows.push([r.strn, r.name, `${r.level} (${r.yearStart}/${String(r.yearStart + 1).slice(-2)})`, yearLabel(r.yearStart), r.level]);
  downloadCSV("QEF_申請人名單.csv", rows);
}

/* ---------- 檢查新申請者 ---------- */
/** 由貼上的文字找出 STRN，例如 S8055310、S805490A、S805490(A)、N005172A、41808470 */
function parseStrns(text) {
  const t = String(text).toUpperCase().replace(/\((\w)\)/g, "$1");
  const out = [];
  for (const m of t.matchAll(/\b(?:[A-Z]\d{6}[0-9A]|\d{8})\b/g)) {
    if (!out.includes(m[0])) out.push(m[0]);
  }
  return out;
}

async function checkFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const rows = await readRows(file);
    const hi = rows.findIndex((r) => r.some((c) => normStrn(c) === "STRN"));
    const ci = hi >= 0 ? rows[hi].findIndex((c) => normStrn(c) === "STRN") : -1;
    const strns = ci >= 0 ? rows.slice(hi + 1).map((r) => normStrn(r[ci])).filter(Boolean) : parseStrns(rows.flat().join("\n"));
    $("#a-strns").value = strns.join("\n");
    check(strns);
  } catch (err) {
    toast("未能讀取檔案：" + err.message, "error");
  }
  e.target.value = "";
}

function check(strns) {
  const box = $("#a-check-result");
  if (!strns.length) { box.innerHTML = `<p class="warn">請輸入最少一個 STRN。</p>`; return; }
  if (!A.loaded) { box.innerHTML = `<p class="empty">正在讀取申請記錄，請稍後再按「檢查」。</p>`; load(); return; }
  const y = Number($("#a-year").value);
  const from = y - WINDOW;
  const res = strns.map((strn) => {
    const recs = A.list.filter((r) => normStrn(r.strn) === strn).sort((a, b) => b.yearStart - a.yearStart);
    const recent = recs.filter((r) => r.yearStart >= from && r.yearStart < y);
    const same = recs.filter((r) => r.yearStart === y);
    const older = recs.filter((r) => r.yearStart < from);
    const state = recent.length ? "recent" : same.length ? "same" : older.length ? "older" : "none";
    return { strn, name: recs[0]?.name || "", recs, recent, state };
  });
  const order = { recent: 0, same: 1, older: 2, none: 3 };
  res.sort((a, b) => order[a.state] - order[b.state]);
  const LBL = {
    recent: ["stop", `${WINDOW} 年內曾申請`],
    same: ["wait", `已有 ${yearLabel(y)} 申請記錄`],
    older: ["muted", `${WINDOW} 年前曾申請`],
    none: ["go", "沒有申請記錄"],
  };
  const n = (k) => res.filter((r) => r.state === k).length;
  box.innerHTML = `
    <div class="import-bar import-bar--none">
      <p>檢查 ${res.length} 人（${yearLabel(y)} 申請，比對 ${yearLabel(from)} 至 ${yearLabel(y - 1)}）：
        <strong class="hint--error">${n("recent")} 人 ${WINDOW} 年內曾申請</strong>、${n("same")} 人已有本學年記錄、${n("older")} 人 ${WINDOW} 年前曾申請、${n("none")} 人沒有記錄。</p>
    </div>
    <div class="table-scroll mt-s">
      <table class="table">
        <thead><tr><th>STRN</th><th>姓名</th><th>結果</th><th>申請記錄</th><th>QEF iPad</th></tr></thead>
        <tbody>${res.map((r) => `
          <tr class="${r.state === "recent" ? "st-issue" : ""}">
            <td class="mono">${esc(r.strn)}</td>
            <td>${esc(r.name)}</td>
            <td><span class="badge badge--${LBL[r.state][0]}">${LBL[r.state][1]}</span></td>
            <td>${r.recs.map((x) => `${yearLabel(x.yearStart)} ${esc(x.level || "")}`).join("<br>")}</td>
            <td>${loanText(r.strn)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---------- 匯入教育局名單 ---------- */
async function readRows(file) {
  const XLSX = await loadXlsx();
  const buf = await file.arrayBuffer();
  let wb;
  if (/\.csv$/i.test(file.name)) {
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { text = new TextDecoder("big5").decode(buf); }
    wb = XLSX.read(text, { type: "string", raw: true });
  } else {
    wb = XLSX.read(buf, { type: "array" });
  }
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
}

async function importFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const box = $("#a-import-result");
  box.innerHTML = `<p class="empty">正在讀取 ${esc(file.name)}…</p>`;
  try {
    const rows = await readRows(file);
    const hi = rows.findIndex((r) => r.some((c) => normStrn(c) === "STRN"));
    if (hi < 0) throw new Error("找不到「STRN」標題。");
    const h = rows[hi].map((c) => String(c).trim());
    const ci = { strn: h.findIndex((c) => normStrn(c) === "STRN"), name: h.findIndex((c) => /姓名|Name/i.test(c)),
      ly: h.findIndex((c) => /年份|年級|Year|Level/i.test(c)) };
    const items = [];
    const bad = [];
    rows.slice(hi + 1).forEach((r, i) => {
      const strn = normStrn(r[ci.strn]);
      if (!strn) return;
      const { level, yearStart } = parseLevelYear(r[ci.ly]);
      if (!yearStart) { bad.push(`第 ${hi + i + 2} 行（${strn}）：看不懂「${r[ci.ly]}」`); return; }
      items.push({ id: `${strn}_${yearStart}`, strn, name: String(r[ci.name] ?? "").trim(), level, yearStart });
    });
    if (!A.loaded) load();
    const exist = new Set(A.list.map((r) => r.id));
    A.plan = items;
    const by = items.reduce((m, r) => { m[r.yearStart] = (m[r.yearStart] || 0) + 1; return m; }, {});
    box.innerHTML = `
      ${bad.length ? `<p class="load-error">${bad.map(esc).join("<br>")}</p>` : ""}
      <div class="import-bar mt-s">
        <p>共 ${items.length} 項（新增 ${items.filter((x) => !exist.has(x.id)).length} 項）：
          ${Object.entries(by).sort().map(([y, n]) => `${yearLabel(Number(y))} ${n} 人`).join("、")}</p>
        <button class="btn btn--primary" data-a-run>確認匯入</button>
      </div>`;
  } catch (err) {
    box.innerHTML = `<p class="load-error">未能讀取檔案：${esc(err.message)}</p>`;
  }
  e.target.value = "";
}

async function runImport(btn) {
  if (!A.plan?.length) return;
  btn.disabled = true;
  btn.textContent = "匯入中…";
  try {
    for (let i = 0; i < A.plan.length; i += 400) {
      const b = writeBatch(db);
      for (const r of A.plan.slice(i, i + 400)) {
        const { id, ...data } = r;
        b.set(doc(db, "qef_applicants", id), { ...data, source: "edb", updatedAt: serverTimestamp() }, { merge: true });
      }
      await b.commit();
    }
    $("#a-import-result").innerHTML = `<p class="empty mt-s">已匯入 ${A.plan.length} 項申請記錄。</p>`;
    toast("匯入完成。", "success");
    A.plan = null;
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "確認匯入";
    toast("未能匯入：" + err.message, "error");
  }
}
