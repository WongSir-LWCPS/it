// IT組工作資料：逐張匯入 Excel 工作表，新增為表格分頁
import { esc, toast, loadXlsx } from "../../assets/js/common.js?v=20261021b";

const $ = (sel) => document.querySelector(sel);
const I = { ctx: null, wb: null, XLSX: null, grid: [], cols: [], sheet: "" };
const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const SECRET_RE = /pass|密碼|pwd|key|金鑰|pin\b/i;
const colName = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

export function setupImport(ctx) {
  I.ctx = ctx;
  $("#import-open").addEventListener("click", () => {
    I.wb = null;
    $("#im-file").value = "";
    $("#im-sheet").innerHTML = "";
    $("#im-sheet").disabled = true;
    $("#im-body").innerHTML = "";
    $("#import-dialog").showModal();
  });
  $("#im-file").addEventListener("change", onFile);
  $("#im-sheet").addEventListener("change", () => loadSheet($("#im-sheet").value));
  $("#im-body").addEventListener("change", (e) => {
    if (e.target.id === "im-head") $("#im-from").value = Math.min(I.grid.length, (Number(e.target.value) || 1) + 1);
    if (e.target.matches("[data-im-range]")) renderPreview();
    else if (e.target.matches("[data-im-col]")) syncCols();
  });
  $("#im-body").addEventListener("click", (e) => { if (e.target.closest("[data-im-run]")) runImport(e.target.closest("[data-im-run]")); });
}

async function onFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  $("#im-body").innerHTML = `<p class="empty">正在讀取 ${esc(file.name)}…</p>`;
  try {
    I.XLSX = await loadXlsx();
    const buf = await file.arrayBuffer();
    if (/\.csv$/i.test(file.name)) {
      let text;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { text = new TextDecoder("big5").decode(buf); }
      I.wb = I.XLSX.read(text, { type: "string", raw: true });
    } else {
      I.wb = I.XLSX.read(buf, { type: "array" });
    }
    const names = I.wb.SheetNames.filter((n) => sheetGrid(n).length);
    if (!names.length) throw new Error("檔案中沒有資料。");
    $("#im-sheet").innerHTML = names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
    $("#im-sheet").disabled = false;
    loadSheet(names[0]);
  } catch (err) {
    console.error(err);
    $("#im-body").innerHTML = `<p class="load-error">未能讀取檔案：${esc(err.message)}</p>`;
  }
}

/** 讀取工作表為二維陣列；直向合併的儲存格會向下填上相同內容 */
function sheetGrid(name) {
  const ws = I.wb.Sheets[name];
  const grid = I.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }).map((r) => r.map((v) => String(v ?? "").trim()));
  for (const m of ws["!merges"] || []) {
    const v = grid[m.s.r]?.[m.s.c] ?? "";
    for (let r = m.s.r + 1; r <= m.e.r; r++) {
      grid[r] ??= [];
      if (!grid[r][m.s.c]) grid[r][m.s.c] = v;
    }
  }
  while (grid.length && !grid[grid.length - 1].some(Boolean)) grid.pop();
  return grid;
}

function loadSheet(name) {
  I.sheet = name;
  I.grid = sheetGrid(name);
  // 估計標題行：第一行有兩格或以上文字
  const guess = I.grid.findIndex((r) => r.filter(Boolean).length >= 2);
  $("#im-body").innerHTML = `
    <div class="field-row mt-s">
      <label class="field"><span>分頁名稱</span><input id="im-title" maxlength="40" value="${esc(name)}" data-no-translate></label>
      <label class="field"><span>標題行（第幾行）</span><input type="number" min="1" max="${I.grid.length}" value="${guess + 1 || 1}" id="im-head" data-im-range></label>
      <label class="field"><span>資料由第幾行開始</span><input type="number" min="1" max="${I.grid.length}" value="${(guess + 1 || 1) + 1}" id="im-from" data-im-range></label>
      <label class="field"><span>至第幾行</span><input type="number" min="1" max="${I.grid.length}" value="${I.grid.length}" id="im-to" data-im-range></label>
    </div>
    <label class="check"><input type="checkbox" id="im-nohead" data-im-range> 沒有標題行（以 A、B、C… 作欄名）</label>
    <div id="im-preview"></div>`;
  renderPreview();
}

function range() {
  const n = (id) => Math.max(1, Math.min(I.grid.length, Number($(id).value) || 1)) - 1;
  const noHead = $("#im-nohead").checked;
  return { head: noHead ? -1 : n("#im-head"), from: n("#im-from"), to: n("#im-to") };
}

/** 按標題行及範圍整理欄位；完全空白的欄位會略過 */
function renderPreview() {
  const { head, from, to } = range();
  const rows = I.grid.slice(from, to + 1).filter((r) => r.some(Boolean) && !r.every((v) => !v || /^[=\-_]{3,}$/.test(v)));
  const width = Math.max(0, ...I.grid.slice(Math.max(0, head), to + 1).map((r) => r.length));
  const seen = {};
  I.cols = [];
  for (let i = 0; i < width; i++) {
    const hasData = rows.some((r) => r[i]);
    let name = head >= 0 ? (I.grid[head][i] || "") : colName(i);
    if (!hasData) continue;
    if (!name) name = `欄 ${colName(i)}`;
    seen[name] = (seen[name] || 0) + 1;
    if (seen[name] > 1) name = `${name} ${seen[name]}`;
    I.cols.push({ i, name, use: true, secret: SECRET_RE.test(name) });
  }
  I.rows = rows;
  const box = $("#im-preview");
  if (!I.cols.length) { box.innerHTML = `<p class="empty">所選範圍沒有資料。</p>`; return; }
  box.innerHTML = `
    <p class="hint mt-s">共 ${rows.length} 行、${I.cols.length} 個欄位。可取消不需要的欄位，並勾選密碼欄（密碼欄會預設隱藏）。以下顯示首 10 行：</p>
    <div class="table-scroll">
      <table class="table im-table" data-no-translate>
        <thead>
          <tr>${I.cols.map((c, k) => `<th>
            <label class="check"><input type="checkbox" data-im-col="use" data-k="${k}" ${c.use ? "checked" : ""}> 匯入</label>
            <input class="im-colname" data-im-col="name" data-k="${k}" value="${esc(c.name)}" maxlength="40">
            <label class="check"><input type="checkbox" data-im-col="secret" data-k="${k}" ${c.secret ? "checked" : ""}> 密碼</label>
          </th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.slice(0, 10).map((r) => `<tr>${I.cols.map((c) => `<td class="pre">${c.secret && r[c.i] ? "••••••" : esc(r[c.i] || "")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="actions actions--start mt-s"><button class="btn btn--primary" type="button" data-im-run>匯入為新分頁</button></div>`;
}
function syncCols() {
  $("#im-preview").querySelectorAll("[data-im-col]").forEach((el) => {
    const c = I.cols[Number(el.dataset.k)];
    if (el.dataset.imCol === "use") c.use = el.checked;
    else if (el.dataset.imCol === "secret") c.secret = el.checked;
    else c.name = el.value.trim() || c.name;
  });
}

async function runImport(btn) {
  syncCols();
  if (!I.ctx.getKey()) { toast("已鎖上，請先解鎖。", "error"); return; }
  const cols = I.cols.filter((c) => c.use).map((c) => ({ ...c, id: uid("c") }));
  if (!cols.length) { toast("請最少選擇一個欄位。", "error"); return; }
  const title = $("#im-title").value.trim() || I.sheet;
  const rows = I.rows.map((r) => {
    const c = {};
    for (const col of cols) if (r[col.i]) c[col.id] = r[col.i];
    return { id: uid("r"), c };
  }).filter((r) => Object.keys(r.c).length);
  btn.disabled = true;
  btn.textContent = "匯入中…";
  try {
    await I.ctx.addTab({ title, kind: "table", columns: cols.map(({ id, name, secret }) => ({ id, name, ...(secret ? { secret: true } : {}) })), rows });
    toast(`已匯入「${title}」：${rows.length} 行。`, "success");
    $("#im-preview").innerHTML = `<p class="empty mt-s">已匯入「${esc(title)}」。可選擇另一張工作表繼續匯入，或按「關閉」。</p>`;
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = "匯入為新分頁";
    toast("未能匯入：" + err.message, "error");
  }
}
