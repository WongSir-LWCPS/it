// 器材資產管理：Excel 匯入
// 支援兩種格式：
// 1. 學校的 iPad 資產表（iPad機名稱、S/N、所屬的MDM 系統、最終擁有權所屬、Model、借用人、身份、借用時間、歸還時間、備註1、備註2）
// 2. 本系統的更新範本（Label、類別、機序號、型號……）
import { db, esc, toast, loadXlsx, todayId } from "../../assets/js/common.js?v=20261029a";
import {
  doc, collection, writeBatch, serverTimestamp, deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ASSET, USAGE, STATUS, placeText } from "./assets-config.js?v=20261029a";

const $ = (sel) => document.querySelector(sel);
const I = { ctx: null, plan: null };
const idOf = (label) => String(label || "").trim().replace(/[\/\s]+/g, "_");
const USAGE_BY_LABEL = Object.fromEntries(Object.entries(USAGE).map(([k, v]) => [v.label, k]));
const STATUS_BY_LABEL = { ...Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [v.label, k])), 已註銷: "retired", 待註銷: "pendingWriteOff", 可借出: "normal" };
const pad2 = (n) => String(n).padStart(2, "0");

export function setupImport(ctx) {
  I.ctx = ctx;
  $("#im-type").innerHTML = ASSET.types.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  $("#im-file").addEventListener("change", onFile);
  $("#im-result").addEventListener("click", (e) => {
    const b = e.target.closest("[data-im-run]");
    if (b) runImport(b);
  });
}

/** 日期：Excel 日期數字、Date、2026-09-29、9/29/2026（月/日/年）、29/9/2026（日大於 12 時）→ 2026-09-29 */
function toDateId(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  const t = String(v).trim();
  let m = t.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [mo, d] = a > 12 ? [b, a] : [a, b];   // 預設為 月/日/年
    return `${m[3]}-${pad2(mo)}-${pad2(d)}`;
  }
  return "";
}
const isNA = (v) => /^(n\/?a|-|—)?$/i.test(String(v ?? "").trim());
const str = (v) => (v == null ? "" : String(v).replace(/^"+|"+$/g, "").trim());

/** 由備註找出 Apple Pencil 編號：P05、Pencil P87、Apple Pencil (27)、Pencil 35 → P05、P87、P27、P35 */
function pencilOf(...texts) {
  for (const t of texts) {
    const s = str(t);
    if (!s) continue;
    let m = s.match(/\bP\s*0*(\d{1,3})\b/i) || s.match(/pencil\s*\(?\s*P?\s*0*(\d{1,3})\b/i);
    if (m) return `P${pad2(m[1])}`;
  }
  return "";
}

async function onFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  $("#im-result").innerHTML = `<p class="empty">正在讀取 ${esc(file.name)}…</p>`;
  try {
    const XLSX = await loadXlsx();
    const buf = await file.arrayBuffer();
    let wb;
    if (/\.csv$/i.test(file.name)) {
      let text;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { text = new TextDecoder("big5").decode(buf); }
      wb = XLSX.read(text, { type: "string", raw: true });
    } else {
      wb = XLSX.read(buf, { type: "array", cellDates: true });
    }
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    I.plan = plan(rows);
    renderPlan();
  } catch (err) {
    console.error(err);
    $("#im-result").innerHTML = `<p class="load-error">未能讀取檔案：${esc(err.message)}</p>`;
  }
  e.target.value = "";
}

/* ---------- 讀取每一行，轉為器材資料 ---------- */
function readSchoolRow(r, col, type) {
  const c = (n) => (col[n] >= 0 ? r[col[n]] : "");
  const label = str(c("iPad機名稱"));
  const borrower = str(c("借用人"));
  const ident = str(c("身份"));
  const outDate = c("借用時間");
  const back = str(c("歸還時間"));
  const n1 = str(c("備註1"));
  const n2 = str(c("備註2"));
  const rec = {
    label, type, serial: str(c("S/N")).toUpperCase(), model: str(c("Model")), mdm: str(c("所屬的MDM 系統")),
    owner: str(c("最終擁有權所屬")), status: "normal", usage: "spare", pencil: pencilOf(n2, n1), accessories: n1,
  };
  const notes = [];
  const broken = borrower && ASSET.brokenWords.some((w) => borrower.includes(w));
  const car = ident.match(/^(Car\s*\d+)[_\-\s#]*(\d+)?$/i);
  if (car) {
    rec.usage = "cart";
    rec.cart = car[1].replace(/\s+/g, "").replace(/^car/i, "Car");
    rec.slot = car[2] || "";
  } else if (ident === "教師" && borrower && !broken && !/(RM|\/F|室|後備|staff|組)/i.test(borrower)) {
    rec.usage = "teacher";
    rec.holder = { name: borrower, since: toDateId(outDate) };
  } else if (ident === "教師" && (!borrower || broken)) {
    rec.usage = "teacher";
  } else if (borrower && !broken && borrower !== "課堂使用機") {
    rec.usage = "room";
    rec.location = borrower;
  }
  if (broken) { rec.status = "repair"; notes.push(borrower); }
  // 備註寫的是損壞情況而不是配件
  if (n1 && ASSET.brokenWords.some((w) => n1.includes(w))) { rec.accessories = ""; if (!notes.includes(n1)) notes.push(n1); }
  if (back && !isNA(back)) notes.push(`歸還記錄：${back}`);
  if (ident && !car && ident !== "教師") notes.push(`身份：${ident}`);
  rec.note = notes.join("；");
  return rec;
}

function readTemplateRow(r, col) {
  const c = (n) => (col[n] >= 0 ? str(r[col[n]]) : "");
  const rec = {
    label: c("Label"), type: c("類別"), serial: c("機序號").toUpperCase(), model: c("型號"), mdm: c("MDM 系統"), owner: c("擁有權"),
    pencil: c("Apple Pencil"), accessories: c("配件"), note: c("備註"),
  };
  const u = USAGE_BY_LABEL[c("用途")];
  if (c("用途")) rec.usage = u || "?" + c("用途");
  if (c("狀態")) rec.status = STATUS_BY_LABEL[c("狀態")] || "?" + c("狀態");
  if (rec.usage === "cart") { rec.cart = c("iPad 車"); rec.slot = c("車內編號"); }
  else if (rec.usage === "teacher") { if (c("借用老師")) rec.holder = { name: c("借用老師"), since: toDateId(col["借用日期"] >= 0 ? r[col["借用日期"]] : "") }; }
  else if (rec.usage) rec.location = c("位置／組別");
  return rec;
}

/** 比較檔案與現有資料，列出每項器材的改動 */
function plan(rows) {
  const find = (name) => rows.findIndex((r) => r.some((x) => str(x) === name));
  let hi = find("iPad機名稱");
  let format = "school";
  if (hi < 0) { hi = find("Label"); format = "template"; }
  if (hi < 0) throw new Error("找不到「iPad機名稱」或「Label」標題。請上載學校的資產表或本系統的更新範本。");
  const head = rows[hi].map((x) => str(x).replace(/\s+/g, " "));
  const col = {};
  head.forEach((h, i) => { if (h && col[h] == null) col[h] = i; });
  // 學校資產表的欄名可能有換行，例如「最新年度 班別」
  const type = $("#im-type").value || "iPad";
  const items = [];
  const errors = [];
  const seen = new Map();
  const serials = new Map();
  const existing = new Map(I.ctx.getItems().map((d) => [d.id, d]));

  rows.slice(hi + 1).forEach((r, i) => {
    const rowNo = hi + i + 2;
    const rec = format === "school" ? readSchoolRow(r, col, type) : readTemplateRow(r, col);
    if (!rec.label) return;
    const id = idOf(rec.label);
    if (seen.has(id)) { errors.push(`第 ${rowNo} 行：${rec.label} 重複（第 ${seen.get(id)} 行已有），已略過。`); return; }
    seen.set(id, rowNo);
    if (String(rec.usage || "").startsWith("?")) { errors.push(`第 ${rowNo} 行：${rec.label} 的用途「${rec.usage.slice(1)}」看不懂，已略過。`); return; }
    if (String(rec.status || "").startsWith("?")) { errors.push(`第 ${rowNo} 行：${rec.label} 的狀態「${rec.status.slice(1)}」看不懂，已略過。`); return; }
    if (rec.usage === "cart" && !rec.cart) { errors.push(`第 ${rowNo} 行：${rec.label} 的用途為課堂 iPad 車，但沒有填寫 iPad 車，已略過。`); return; }
    if (rec.serial) {
      if (serials.has(rec.serial)) errors.push(`注意：機序號 ${rec.serial} 同時用於 ${serials.get(rec.serial)} 及 ${rec.label}，請檢查。`);
      else serials.set(rec.serial, rec.label);
    }
    const d = existing.get(id);
    const set = {};
    const del = [];
    const notes = [];
    const text = (f, name) => {
      const val = rec[f];
      if (val == null || val === "" || val === (d?.[f] ?? "")) return;
      set[f] = val;
      if (d) notes.push(`${name}：${d[f] || "—"} → ${val}`);
    };
    text("type", "類別"); text("serial", "機序號"); text("model", "型號"); text("mdm", "MDM"); text("owner", "擁有權");
    text("pencil", "Apple Pencil"); text("accessories", "配件"); text("note", "備註");
    if (rec.status && rec.status !== (d?.status || (d ? "normal" : ""))) {
      set.status = rec.status;
      if (d) notes.push(`狀態：${STATUS[d.status || "normal"].label} → ${STATUS[rec.status].label}`);
    }
    if (!d && !set.status) set.status = "normal";
    if (!d && !set.type) set.type = type;
    // 用途、位置、借用老師以檔案為準
    if (rec.usage) {
      const before = d ? `${USAGE[d.usage]?.label || "—"} ${placeText(d)}` : "";
      const after = `${USAGE[rec.usage].label} ${placeText(rec)}`;
      const same = d && d.usage === rec.usage && (d.cart || "") === (rec.cart || "") && (d.slot || "") === (rec.slot || "")
        && (d.location || "") === (rec.location || "") && (d.holder?.name || "") === (rec.holder?.name || "")
        && (!rec.holder?.since || (d.holder?.since || "") === rec.holder.since);
      if (!same) {
        set.usage = rec.usage;
        for (const f of ["cart", "slot", "location"]) {
          if (rec[f]) set[f] = rec[f]; else if (d?.[f] != null) del.push(f);
        }
        if (rec.holder) set.holder = rec.holder; else if (d?.holder) del.push("holder");
        if (d) notes.push(`${before} → ${after}`);
      }
    }
    if (!d) notes.push(`新增：${USAGE[rec.usage || "spare"].label} ${placeText({ usage: rec.usage || "spare", ...rec })}`);
    if (!d && !set.usage) set.usage = "spare";
    if (Object.keys(set).length || del.length) items.push({ id, label: rec.label, isNew: !d, set, del, notes });
  });
  return { format, items, errors, rows: seen.size };
}

function renderPlan() {
  const { format, items, errors, rows } = I.plan;
  const box = $("#im-result");
  const newCount = items.filter((x) => x.isNew).length;
  const usageCount = {};
  items.filter((x) => x.isNew).forEach((x) => { const u = x.set.usage || "spare"; usageCount[u] = (usageCount[u] || 0) + 1; });
  box.innerHTML = `
    <div class="mt-s">
      <p><strong>${format === "school" ? "學校資產表" : "更新範本"}</strong>：共 ${rows} 項。
        將新增 ${newCount} 項、更新 ${items.length - newCount} 項；其餘 ${rows - items.length} 項沒有改動。</p>
      ${newCount ? `<p class="hint">新增的器材：${Object.entries(usageCount).map(([u, n]) => `${USAGE[u].label} ${n} 項`).join("、")}</p>` : ""}
      ${errors.length ? `<div class="load-error"><strong>請注意（${errors.length}）：</strong><br>${errors.map(esc).join("<br>")}</div>` : ""}
      ${items.length ? `
        <div class="actions actions--start mt-s"><button class="btn btn--primary" type="button" data-im-run>確認匯入</button></div>
        <div class="table-scroll mt-s">
          <table class="table">
            <thead><tr><th>Label</th><th>類別</th><th>改動</th></tr></thead>
            <tbody>
              ${items.map((x) => `<tr><td><strong>${esc(x.label)}</strong></td>
                <td>${x.isNew ? `<span class="badge badge--go">新增</span>` : `<span class="badge badge--wait">更新</span>`}</td>
                <td>${x.notes.map((n) => `<span>${esc(n)}</span>`).join("<br>")}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>` : `<p class="empty">檔案中的資料與系統相同，沒有需要更新的項目。</p>`}
    </div>`;
}

async function runImport(btn) {
  const { items } = I.plan || {};
  if (!items?.length) return;
  if (!confirm(`確認匯入？將新增 ${items.filter((x) => x.isNew).length} 項、更新 ${items.filter((x) => !x.isNew).length} 項器材。`)) return;
  btn.disabled = true;
  btn.textContent = "匯入中…";
  try {
    // 每批最多 400 個寫入（每項器材 2 個：資料及記錄）
    for (let i = 0; i < items.length; i += 200) {
      const b = writeBatch(db);
      for (const x of items.slice(i, i + 200)) {
        const ref = doc(db, ASSET.coll, x.id);
        const data = { ...x.set, updatedAt: serverTimestamp() };
        x.del.forEach((f) => { data[f] = deleteField(); });
        if (x.isNew) b.set(ref, { label: x.label, ...x.set, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        else b.update(ref, data);
        b.set(doc(collection(db, ASSET.histColl)), { itemId: x.id, label: x.label, type: "import", date: todayId(),
          by: I.ctx.userEmail(), at: serverTimestamp(), note: x.notes.join("；") });
      }
      await b.commit();
    }
    $("#im-result").innerHTML = `<p class="empty">已匯入 ${items.length} 項器材。</p>`;
    toast(`已匯入 ${items.length} 項器材。`, "success");
    I.plan = null;
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = "確認匯入";
    toast("未能匯入：" + err.message, "error");
  }
}
