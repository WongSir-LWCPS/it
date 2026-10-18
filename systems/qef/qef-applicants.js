// QEF iPad管理：申請記錄
// - 各年申請人名單（教育局申請者名單／借用情況文件）
// - 每學年向教育局回覆的借用情況（A／B／C／D）
// - 檢查新申請者是否三年內已申請
import { db, esc, toast, downloadCSV, loadXlsx } from "../../assets/js/common.js?v=20261018a";
import {
  collection, doc, onSnapshot, writeBatch, updateDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { currentYearStart, yearLabel } from "./qef-config.js?v=20261018a";

const $ = (sel) => document.querySelector(sel);
const WINDOW = 3;   // 檢查最近幾個學年

/** 回覆狀態（以最近年度教育局文件的寫法為準） */
const REPLY = {
  A: "A - Continues to borrow the device",
  B: "B - Continues studying in the school but no longer needs to borrow the device which has been returned for redeployment.",
  C: "C - Returned the device for redeployment",
  D: "D - Returned the device which needs replacement",
};
const REPLY_ZH = { A: "繼續借用", B: "仍在校但已歸還", C: "已歸還（可再借出）", D: "已歸還（需更換）" };
const TONE = { A: "go", B: "muted", C: "wait", D: "stop" };

const A = { list: [], loaded: false, ctx: null, plan: null, sort: { key: "year", dir: -1 } };
const collator = new Intl.Collator("zh-Hant", { numeric: true, sensitivity: "base" });
const normStrn = (v) => String(v ?? "").trim().toUpperCase().replace(/[\s()（）-]/g, "");
const yk = (y) => `y${y}`;

/** 「P1 (2021/22)」→ { level: "P1", yearStart: 2021 } */
export function parseLevelYear(v) {
  const t = String(v ?? "");
  const lv = t.match(/P\s*([1-6])/i);
  const yr = t.match(/(20\d{2})\s*[/／-]\s*(\d{2,4})/);
  return { level: lv ? `P${lv[1]}` : "", yearStart: yr ? Number(yr[1]) : null };
}
const appText = (r) => `${r.level} (${r.yearStart}/${String(r.yearStart + 1).slice(-2)})`;

export function setupApplicants(ctx) {
  A.ctx = ctx;
  $("#a-window-n").textContent = WINDOW;
  const y = currentYearStart();
  $("#a-year").innerHTML = [y + 1, y, y - 1].map((v) => `<option value="${v}" ${v === y ? "selected" : ""}>${yearLabel(v)}</option>`).join("");
  $("#a-r-title").textContent = `教育局借用情況回覆（${yearLabel(replyYear())}）`;
  $("#a-legend").innerHTML = Object.entries(REPLY).map(([k, v]) =>
    `<li><span class="badge badge--${TONE[k]}">${k}</span> ${esc(REPLY_ZH[k])}：<small>${esc(v)}</small></li>`).join("");
  // 第一次打開分頁才讀取，節省讀取量
  document.querySelector('.tab[data-tab="apply"]').addEventListener("click", load, { once: true });
  ["#a-f-year", "#a-f-level", "#a-f-status", "#a-q"].forEach((id) => $(id).addEventListener("input", renderList));
  $("#a-export").addEventListener("click", exportList);
  $("#a-r-export").addEventListener("click", exportReply);
  $("#a-suggest").addEventListener("click", suggest);
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
  $("#a-list").addEventListener("change", (e) => {
    const sel = e.target.closest("[data-reply]");
    if (sel) setReply(sel.dataset.reply, sel.value);
  });
}

function load() {
  $("#a-list").innerHTML = `<p class="empty">正在讀取…</p>`;
  onSnapshot(collection(db, "qef_applicants"), (snap) => {
    A.list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    A.loaded = true;
    renderSummary();
    renderFilters();
    renderReplySummary();
    renderList();
  }, (e) => { $("#a-list").innerHTML = `<p class="load-error">未能讀取申請記錄：${esc(e.message)}。請確認已發佈最新的 Firestore 規則。</p>`; });
}

/* ---------- 回覆學年 ---------- */
/** 回覆學年固定為本學年：每年匯入教育局名單後回覆，不用回覆舊年份 */
const replyYear = () => currentYearStart();
/** 某學年名單上的申請人 */
const listedIn = (y) => A.list.filter((r) => r.statuses?.[yk(y)]);

function renderReplySummary() {
  const y = replyYear();
  const list = listedIn(y);
  const n = (c) => list.filter((r) => (r.statuses[yk(y)].code || "") === c).length;
  $("#a-r-summary").innerHTML = list.length ? `
    <p>${yearLabel(y)} 名單共 <strong>${list.length}</strong> 人：
      ${Object.keys(REPLY).map((k) => `<span class="badge badge--${TONE[k]}">${k}</span> ${n(k)}`).join("　")}
      　<span class="badge badge--stop">未回覆</span> <strong>${n("")}</strong></p>`
    : `<p class="hint">${yearLabel(y)} 未有教育局名單。請先在頁面最底匯入今年教育局的名單。</p>`;
}

/* ---------- 名單 ---------- */
function renderSummary() {
  const years = [...new Set(A.list.map((r) => r.yearStart))].sort((a, b) => b - a);
  $("#a-summary").innerHTML = years.length ? `
    <div class="stat-grid stat-grid--tight">${years.map((y) => `
      <div class="stat"><span class="stat-num">${A.list.filter((r) => r.yearStart === y).length}</span><span class="stat-label">${yearLabel(y)} 申請人</span></div>`).join("")}
      <div class="stat"><span class="stat-num">${A.list.length}</span><span class="stat-label">歷年申請人合共</span></div>
    </div>` : "";
}

function renderFilters() {
  const keep = (sel, opts) => { const v = sel.value; sel.innerHTML = opts; if ([...sel.options].some((o) => o.value === v)) sel.value = v; };
  const years = [...new Set(A.list.map((r) => r.yearStart))].sort((a, b) => b - a);
  const levels = [...new Set(A.list.map((r) => r.level).filter(Boolean))].sort();
  keep($("#a-f-year"), `<option value="">全部</option>` + years.map((y) => `<option value="${y}">${yearLabel(y)}</option>`).join(""));
  keep($("#a-f-level"), `<option value="">全部</option>` + levels.map((l) => `<option>${esc(l)}</option>`).join(""));
  const ry = yearLabel(replyYear());
  keep($("#a-f-status"), `<option value="">全部</option><option value="listed">在 ${ry} 名單上</option>`
    + Object.keys(REPLY).map((k) => `<option value="${k}">${ry}：${k} ${REPLY_ZH[k]}</option>`).join("")
    + `<option value="none">${ry}：未回覆</option>`);
}

function filtered() {
  const y = $("#a-f-year").value;
  const l = $("#a-f-level").value;
  const st = $("#a-f-status").value;
  const q = $("#a-q").value.trim().toLowerCase();
  const key = yk(replyYear());
  return A.list.filter((r) => {
    if (y && String(r.yearStart) !== y) return false;
    if (l && r.level !== l) return false;
    const s = r.statuses?.[key];
    if (st === "listed" && !s) return false;
    if (st === "none" && (!s || s.code)) return false;
    if (st && st.length === 1 && s?.code !== st) return false;
    return !q || [r.strn, r.name].some((v) => String(v || "").toLowerCase().includes(q));
  });
}

const ACC = {
  strn: (r) => r.strn, name: (r) => r.name, year: (r) => r.yearStart, level: (r) => r.level,
  reply: (r) => r.statuses?.[yk(replyYear())]?.code ?? "~",
};
function renderList() {
  if (!A.loaded) return;
  const { key, dir } = A.sort;
  const list = filtered().sort((a, b) => (collator.compare(String(ACC[key](a) ?? ""), String(ACC[key](b) ?? "")) * dir)
    || collator.compare(a.level || "", b.level || "") || collator.compare(a.name || "", b.name || ""));
  $("#a-count").textContent = `顯示 ${list.length} 項（共 ${A.list.length} 項）`;
  if (!A.list.length) {
    $("#a-list").innerHTML = `<p class="empty">還未有申請記錄。請在下方匯入教育局文件。</p>`;
    return;
  }
  const ry = replyYear();
  const th = (k, label) => `<th class="sortable${A.sort.key === k ? " is-sorted" : ""}" data-a-sort="${k}">${label}<span class="sort-mark" aria-hidden="true">${A.sort.key === k ? (A.sort.dir > 0 ? "▲" : "▼") : "↕"}</span></th>`;
  $("#a-list").innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr>${th("year", "申請學年")}${th("level", "年級")}${th("strn", "STRN")}${th("name", "姓名")}
          ${th("reply", `${yearLabel(ry)} 回覆`)}<th>QEF iPad</th></tr></thead>
        <tbody>${list.map((r) => {
          const cur = r.statuses?.[yk(ry)];
          return `
          <tr>
            <td>${yearLabel(r.yearStart)}</td>
            <td>${esc(r.level || "")}</td>
            <td class="mono">${esc(r.strn)}</td>
            <td>${esc(r.name || "")}</td>
            <td>${cur ? `<select data-reply="${esc(r.id)}" class="reply-select ${cur.code ? `reply-${cur.code}` : "reply-none"}">
                <option value="">未回覆</option>
                ${Object.keys(REPLY).map((k) => `<option value="${k}" ${cur.code === k ? "selected" : ""}>${k} ${REPLY_ZH[k]}</option>`).join("")}
              </select>` : `<small class="hint">不在名單</small>`}</td>
            <td>${loanText(r.strn)}</td>
          </tr>`;
        }).join("")}
        </tbody>
      </table>
    </div>`;
}

/** 以 STRN 找出該學生借用過的 QEF iPad */
function loansOf(strn) {
  const out = [];
  for (const d of A.ctx.getDevices()) {
    const holding = d.holder?.strn && normStrn(d.holder.strn) === strn;
    if (holding) out.push({ d, label: d.label, current: true, years: [] });
    for (const x of d.holderLog || []) {
      if (x.strn && normStrn(x.strn) === strn && !(holding && x.outcome === "借用中")) {
        out.push({ d, label: d.label, current: false, years: x.years || [], outcome: x.outcome });
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

/* ---------- 回覆狀態 ---------- */
async function setReply(id, code) {
  const y = replyYear();
  try {
    await updateDoc(doc(db, "qef_applicants", id), {
      [`statuses.${yk(y)}.code`]: code,
      [`statuses.${yk(y)}.text`]: code ? REPLY[code] : "",
      [`statuses.${yk(y)}.by`]: A.ctx.userEmail(),
      [`statuses.${yk(y)}.at`]: serverTimestamp(),
    });
  } catch (e) {
    toast("未能儲存：" + e.message, "error");
  }
}

/**
 * 按 QEF iPad 借用情況建議狀態：
 * 現正借用 → A；已歸還而該 iPad 現時維修中／待注銷／已注銷 → D；其他已歸還 → C；
 * 去年已回覆 C／D 而今年沒有借用 → 沿用去年。沒有資料的不會填寫。
 */
function suggestFor(r, y) {
  const loans = loansOf(normStrn(r.strn));
  if (loans.some((x) => x.current)) return "A";
  const prev = r.statuses?.[yk(y - 1)]?.code;
  const returned = loans.filter((x) => !x.current);
  if (returned.length) {
    const last = returned[returned.length - 1];
    return ["repair", "pendingWriteOff", "retired"].includes(last.d.status) && (last.years || []).includes(yearLabel(y)) ? "D" : (prev === "D" ? "D" : "C");
  }
  if (prev === "C" || prev === "D" || prev === "B") return prev;
  return "";
}

async function suggest() {
  if (!A.loaded) return;
  const y = replyYear();
  const todo = listedIn(y).filter((r) => !r.statuses[yk(y)].code)
    .map((r) => ({ r, code: suggestFor(r, y) })).filter((x) => x.code);
  const left = listedIn(y).filter((r) => !r.statuses[yk(y)].code).length - todo.length;
  if (!todo.length) { toast(left ? `沒有可建議的項目，尚有 ${left} 人需要人手選擇。` : "全部已回覆。"); return; }
  const n = (c) => todo.filter((x) => x.code === c).length;
  if (!confirm(`按 iPad 借用情況建議 ${todo.length} 人的 ${yearLabel(y)} 狀態：\nA ${n("A")}、B ${n("B")}、C ${n("C")}、D ${n("D")}。\n${left ? `另有 ${left} 人沒有足夠資料，需要人手選擇。\n` : ""}之後仍可逐一修改。確定？`)) return;
  try {
    for (let i = 0; i < todo.length; i += 400) {
      const b = writeBatch(db);
      for (const { r, code } of todo.slice(i, i + 400)) {
        b.update(doc(db, "qef_applicants", r.id), {
          [`statuses.${yk(y)}.code`]: code, [`statuses.${yk(y)}.text`]: REPLY[code],
          [`statuses.${yk(y)}.by`]: `${A.ctx.userEmail()}（系統建議）`, [`statuses.${yk(y)}.at`]: serverTimestamp(),
        });
      }
      await b.commit();
    }
    toast(`已填寫 ${todo.length} 人的建議狀態，請檢查後再匯出。`, "success");
  } catch (e) {
    toast("未能儲存：" + e.message, "error");
  }
}

/** 匯出教育局格式的回覆 */
function exportReply() {
  const y = replyYear();
  const list = listedIn(y).sort((a, b) => (a.statuses[yk(y)].no ?? 9999) - (b.statuses[yk(y)].no ?? 9999)
    || collator.compare(a.level, b.level) || collator.compare(a.name || "", b.name || ""));
  if (!list.length) { toast(`${yearLabel(y)} 未有名單。`, "error"); return; }
  const missing = list.filter((r) => !r.statuses[yk(y)].code).length;
  if (missing && !confirm(`尚有 ${missing} 人未回覆，仍要匯出嗎？`)) return;
  const rows = [["No.", "Student Reference Number (STRN)", "Student Name", "Class Level (Application Year)", "Status"]];
  list.forEach((r, i) => {
    const s = r.statuses[yk(y)];
    rows.push([i + 1, r.strn, r.name, appText(r), s.code ? (s.text || REPLY[s.code]) : ""]);
  });
  downloadCSV(`QEF_Status_${y}-${y + 1}.csv`, rows);
}

function exportList() {
  const rows = [["STRN", "姓名", "申請年份及年級"]];
  for (const r of filtered()) rows.push([r.strn, r.name, appText(r)]);
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
    const sheets = await readSheets(file);
    const rows = sheets[0].rows;
    const hi = rows.findIndex((r) => r.some((c) => /STRN/i.test(String(c))));
    const ci = hi >= 0 ? rows[hi].findIndex((c) => /STRN/i.test(String(c))) : -1;
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
    return { strn, name: recs[0]?.name || "", recs, state };
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
          <tr>
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

/* ---------- 匯入教育局文件 ---------- */
async function readSheets(file) {
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
  return wb.SheetNames.map((name) => ({ name, rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "" }) }));
}

/** 讀取教育局名單（欄位：No.、STRN、姓名、申請年份及年級）；名單上的申請人即為本學年需回覆的名單 */
function parseSheetRows(name, rows, bad) {
  const hi = rows.findIndex((r) => r.some((c) => /STRN/i.test(String(c))));
  if (hi < 0) return [];
  const h = rows[hi].map((c) => String(c).trim());
  const ci = {
    strn: h.findIndex((c) => /STRN/i.test(c)),
    no: h.findIndex((c) => /^No\.?$/i.test(c)),
    name: h.findIndex((c) => /姓名|Name/i.test(c)),
    ly: h.findIndex((c) => /年份|年級|Class Level|Application Year/i.test(c)),
  };
  const out = [];
  rows.slice(hi + 1).forEach((r, i) => {
    const strn = normStrn(r[ci.strn]);
    if (!strn) return;
    const { level, yearStart } = parseLevelYear(r[ci.ly]);
    if (!yearStart) { bad.push(`${name} 第 ${hi + i + 2} 行（${strn}）：看不懂「${r[ci.ly]}」`); return; }
    out.push({ id: `${strn}_${yearStart}`, strn, name: String(r[ci.name] ?? "").trim(), level, yearStart, no: Number(r[ci.no]) || out.length + 1 });
  });
  return out;
}

async function importFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const box = $("#a-import-result");
  box.innerHTML = `<p class="empty">正在讀取 ${esc(file.name)}…</p>`;
  try {
    const sheets = await readSheets(file);
    const bad = [];
    const rows = parseSheetRows(sheets[0].name, sheets[0].rows, bad);   // 只讀取第一張工作表
    if (!rows.length) throw new Error("找不到 STRN 欄或任何申請人。");
    // 按申請人合併：同一 STRN＋申請學年一份記錄，各學年狀態分開
    const map = new Map();
    for (const r of rows) {
      const cur = map.get(r.id) || { id: r.id, strn: r.strn, name: r.name, level: r.level, yearStart: r.yearStart, no: r.no };
      if (!cur.name && r.name) cur.name = r.name;
      map.set(r.id, cur);
    }
    if (!A.loaded) load();
    const exist = new Set(A.list.map((r) => r.id));
    A.plan = [...map.values()];
    box.innerHTML = `
      ${bad.length ? `<p class="load-error">${bad.map(esc).join("<br>")}</p>` : ""}
      <div class="import-bar mt-s">
        <p>共 ${A.plan.length} 位申請人（新增 ${A.plan.filter((x) => !exist.has(x.id)).length} 位），會成為 ${yearLabel(replyYear())} 需回覆的名單。</p>
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
    for (let i = 0; i < A.plan.length; i += 300) {
      const b = writeBatch(db);
      for (const r of A.plan.slice(i, i + 300)) {
        const existing = A.list.find((x) => x.id === r.id);
        // 列入本學年回覆名單；已填寫的回覆狀態不會被清除
        const key = yk(replyYear());
        const old = existing?.statuses?.[key];
        b.set(doc(db, "qef_applicants", r.id), {
          strn: r.strn, name: r.name || existing?.name || "", level: r.level, yearStart: r.yearStart,
          statuses: { [key]: { code: old?.code || "", text: old?.text || "", no: r.no } },
          source: "edb", updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      await b.commit();
    }
    $("#a-import-result").innerHTML = `<p class="empty mt-s">已匯入 ${A.plan.length} 位申請人。</p>`;
    toast("匯入完成。", "success");
    A.plan = null;
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "確認匯入";
    toast("未能匯入：" + err.message, "error");
  }
}

