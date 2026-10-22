// IT組工作資料：外判商與工程聯絡人清單
import { esc, toast } from "../../../assets/js/common.js?v=20261022g";

const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ICON = {
  phone: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>`,
  tech: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M22.7 19.3 13.6 10.2a6 6 0 0 0-7.9-7.6l3.9 3.9-2.8 2.8-4-3.9a6 6 0 0 0 7.6 7.9l9.1 9.1a1 1 0 0 0 1.4 0l1.8-1.8a1 1 0 0 0 0-1.4z"/></svg>`,
};
const KINDS = { phone: "電話", tech: "技術支援／師傅" };

/** 第一次使用時的預設資料 */
function defaultData() {
  const row = (company, contact, phones, scope, note = "") => ({ id: uid(), company, contact, phones, scope, note });
  const p = (number, label = "", kind = "phone") => ({ number, label, kind });
  return {
    items: [
      row("Senco", "Stephen", [p("96240584")], "電腦軟硬件採購"),
      row("力衡電腦", "施生", [p("96240584")], "內廣場音響 及 PA 系統"),
      row("信興", "馮生", [p("68786665")], "Hall (禮堂) 音響工程"),
      row("Provision", "Tony Cheung / LED 維修師傅", [p("60964620"), p("90392403", "師傅", "tech")], "LED WALL 維修與工程"),
      row("Xenus", "Terrence", [p("53990822")], "IT 系統供應商"),
      row("世紀科技", "Eddy", [p("97440320")], "科技支援"),
      row("拉線工程", "Don Lau", [p("62283960")], "校園網絡拉線工程"),
      row("HGC", "Gary", [p("97214214")], "網絡寬頻 ISP"),
      row("Contex", "Celia Liu", [p("98737966")], "1樓活動區 LED Wall", "聯絡多在群組"),
      row("動力國際", "黎生", [p("94903767")], "對講機系統維護"),
      row("Library CEO", "Jack Hui", [p("3421-1917")], "圖書館系統 Activation Key 更新"),
      row("Appraisal 網頁外判", "Tony Chan", [p("9316-3893")], "Appraisal 評核網頁維護"),
      row("歐綠寶回收", "熱線", [p("60815096")], "舊電子產品與電腦回收"),
    ],
  };
}

const V = { q: "", data: null, api: null, editing: null, dialog: null };
/**
 * 範疇及備註（舊資料只有「負責範疇與備註」一欄：結尾括號內的文字視為備註，
 * 例如「1樓活動區 LED Wall (聯絡多在群組)」→ 範疇「1樓活動區 LED Wall」、備註「聯絡多在群組」；下次儲存時會分開保存）
 */
function split(x) {
  if (x.note != null) return { scope: x.scope || "", note: x.note || "" };
  const m = String(x.scope || "").match(/^(.*\S)\s*[(（]([^()（）]+)[)）]$/);
  return m ? { scope: m[1], note: m[2] } : { scope: x.scope || "", note: "" };
}
const telHref = (n) => "tel:" + String(n).replace(/[^\d+]/g, "");

function render(box, data, api) {
  V.data = data;
  V.api = api;
  ensureDialog();
  const hadFocus = document.activeElement?.id === "cx-q";
  const caret = hadFocus ? document.activeElement.selectionStart : null;
  box.innerHTML = `
    <section class="cx-card">
      <header class="cx-head">
        <h2 class="cx-title"><span class="cx-title-icon">${ICON.phone}</span>外判商與工程聯絡人清單</h2>
        <div class="cx-tools">
          <input id="cx-q" type="search" class="cx-search" placeholder="過濾廠商名稱或項目…" value="${esc(V.q)}" autocomplete="off">
          <button class="btn btn--small btn--primary" type="button" data-cx-add>＋ 新增聯絡人</button>
        </div>
      </header>
      <div class="table-scroll cx-scroll"><table class="cx-table">
        <thead><tr><th>服務項目 / 公司</th><th>聯絡人</th><th>電話號碼（可按鈕撥號）</th><th>範疇</th><th>備註</th><th><span class="sr-only">編輯</span></th></tr></thead>
        <tbody id="cx-rows"></tbody>
      </table></div>
      <footer class="cx-foot" id="cx-foot"></footer>
    </section>`;
  renderRows();
  const q = box.querySelector("#cx-q");
  q.addEventListener("input", () => { V.q = q.value; renderRows(); });
  if (hadFocus) { q.focus(); try { q.setSelectionRange(caret, caret); } catch { /* 部分瀏覽器不支援 */ } }
  box.querySelector("[data-cx-add]").addEventListener("click", () => openDialog(null));
  box.querySelector("#cx-rows").addEventListener("click", (e) => {
    if (e.target.closest("a")) return;   // 按電話號碼撥號，不打開編輯
    const tr = e.target.closest("tr[data-id]");
    if (tr) openDialog(tr.dataset.id);
  });
}

function renderRows() {
  const items = V.data.items || [];
  const q = V.q.trim().toLowerCase();
  const list = items.filter((x) => !q || [x.company, x.contact, x.scope, x.note, ...(x.phones || []).flatMap((p) => [p.number, p.label])]
    .some((v) => String(v || "").toLowerCase().includes(q)));
  const tbody = document.querySelector("#cx-rows");
  tbody.innerHTML = list.length ? list.map((x) => `
    <tr data-id="${x.id}" tabindex="0" title="按一下編輯">
      <td class="cx-company">${esc(x.company)}</td>
      <td>${esc(x.contact || "")}</td>
      <td class="cx-phones">${(x.phones || []).filter((p) => p.number).map((p) => `
        <a class="cx-phone" href="${telHref(p.number)}"><span class="cx-phone-icon">${ICON[p.kind] || ICON.phone}</span>${esc(p.number)}${p.label ? `<span class="cx-phone-label">（${esc(p.label)}）</span>` : ""}</a>`).join("")}</td>
      <td>${esc(split(x).scope)}</td>
      <td class="cx-note">${esc(split(x).note)}</td>
      <td class="cx-edit"><span aria-hidden="true">✎</span></td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty">${items.length ? "沒有符合的聯絡人。" : "還未有聯絡人，按「＋ 新增聯絡人」加入。"}</td></tr>`;
  const by = V.api.updatedBy ? `最後更新：${esc(V.api.updatedBy.split("@")[0])}${V.api.updatedAt ? ` ${fmt(V.api.updatedAt)}` : ""}` : "";
  document.querySelector("#cx-foot").innerHTML = `<span>${q ? `顯示 ${list.length} 個（共 ${items.length} 個）` : `共 ${items.length} 個聯絡人`}</span><span>${by}</span>`;
}
const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/* ---------- 新增／編輯 ---------- */
function ensureDialog() {
  if (V.dialog) return;
  const d = document.createElement("dialog");
  d.className = "sheet sheet--wide";
  d.id = "cx-dialog";
  d.setAttribute("aria-labelledby", "cx-dialog-title");
  d.innerHTML = `
    <form id="cx-form" novalidate>
      <div class="dev-head"><h2 id="cx-dialog-title">新增聯絡人</h2><button class="btn btn--small" type="button" data-cx-close>關閉</button></div>
      <div class="field-row">
        <label class="field"><span>服務項目 / 公司</span><input name="company" maxlength="60" required data-no-translate></label>
        <label class="field"><span>聯絡人</span><input name="contact" maxlength="60" data-no-translate></label>
      </div>
      <div class="field"><span>電話號碼</span><div id="cx-phone-list"></div>
        <button class="btn btn--small" type="button" data-cx-phone-add>＋ 新增電話</button></div>
      <label class="field"><span>範疇</span><input name="scope" maxlength="150" placeholder="例如：LED WALL 維修與工程" data-no-translate></label>
      <label class="field"><span>備註（選填）</span><textarea name="note" rows="2" maxlength="300" placeholder="例如：聯絡多在群組" data-no-translate></textarea></label>
      <p class="warn" id="cx-warn" hidden></p>
      <div class="actions actions--start cx-actions">
        <button class="btn btn--primary" type="submit">儲存</button>
        <button class="btn btn--small" type="button" data-cx-move="-1">↑ 上移</button>
        <button class="btn btn--small" type="button" data-cx-move="1">↓ 下移</button>
        <button class="btn btn--stop" type="button" data-cx-delete>刪除</button>
      </div>
    </form>`;
  document.body.append(d);
  V.dialog = d;
  d.addEventListener("click", (e) => {
    if (e.target.closest("[data-cx-close]")) d.close();
    if (e.target.closest("[data-cx-phone-add]")) { addPhoneRow({}); d.querySelector("#cx-phone-list .cx-phone-row:last-child input").focus(); }
    if (e.target.closest("[data-cx-phone-del]")) e.target.closest(".cx-phone-row").remove();
    if (e.target.closest("[data-cx-delete]")) remove();
    if (e.target.closest("[data-cx-move]")) move(Number(e.target.closest("[data-cx-move]").dataset.cxMove));
  });
  d.querySelector("#cx-form").addEventListener("submit", (e) => { e.preventDefault(); save(); });
}
function addPhoneRow(p) {
  const list = V.dialog.querySelector("#cx-phone-list");
  const row = document.createElement("div");
  row.className = "cx-phone-row";
  row.innerHTML = `
    <input name="pnum" placeholder="電話號碼" maxlength="30" value="${esc(p.number || "")}" inputmode="tel" data-no-translate>
    <input name="plabel" placeholder="標籤（選填，例如 師傅）" maxlength="30" value="${esc(p.label || "")}" data-no-translate>
    <select name="pkind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${(p.kind || "phone") === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>
    <button class="btn btn--small btn--stop" type="button" data-cx-phone-del aria-label="刪除這個電話">✕</button>`;
  list.append(row);
}
function openDialog(id) {
  const x = id ? V.data.items.find((i) => i.id === id) : null;
  V.editing = id;
  const f = V.dialog.querySelector("#cx-form");
  f.reset();
  V.dialog.querySelector("#cx-warn").hidden = true;
  V.dialog.querySelector("#cx-dialog-title").textContent = x ? "編輯聯絡人" : "新增聯絡人";
  f.company.value = x?.company || "";
  f.contact.value = x?.contact || "";
  const sn = x ? split(x) : { scope: "", note: "" };
  f.scope.value = sn.scope;
  f.note.value = sn.note;
  V.dialog.querySelector("#cx-phone-list").innerHTML = "";
  (x?.phones?.length ? x.phones : [{}]).forEach(addPhoneRow);
  V.dialog.querySelectorAll("[data-cx-delete], [data-cx-move]").forEach((b) => { b.hidden = !x; });
  V.dialog.showModal();
  f.company.focus();
}
async function commit(items, msg) {
  const data = { ...V.data, items };
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
async function save() {
  const f = V.dialog.querySelector("#cx-form");
  const warn = (m) => { const w = V.dialog.querySelector("#cx-warn"); w.hidden = !m; w.textContent = m; };
  const company = f.company.value.trim();
  if (!company) { f.company.focus(); return warn("請填寫服務項目或公司名稱。"); }
  const phones = [...V.dialog.querySelectorAll(".cx-phone-row")].map((r) => ({
    number: r.querySelector("[name=pnum]").value.trim(),
    label: r.querySelector("[name=plabel]").value.trim(),
    kind: r.querySelector("[name=pkind]").value,
  })).filter((p) => p.number);
  const item = { id: V.editing || uid(), company, contact: f.contact.value.trim(), phones, scope: f.scope.value.trim(), note: f.note.value.trim() };
  const items = [...(V.data.items || [])];
  const i = items.findIndex((x) => x.id === item.id);
  if (i >= 0) items[i] = item; else items.push(item);
  if (await commit(items, "已儲存。")) V.dialog.close();
}
async function remove() {
  const x = V.data.items.find((i) => i.id === V.editing);
  if (!x || !confirm(`刪除「${x.company}」？`)) return;
  if (await commit(V.data.items.filter((i) => i.id !== x.id), "已刪除。")) V.dialog.close();
}
async function move(dir) {
  const items = [...V.data.items];
  const i = items.findIndex((x) => x.id === V.editing);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  await commit(items, dir < 0 ? "已上移。" : "已下移。");
}

export const contactsPage = { id: "contacts", name: "外判商聯絡人", icon: "📞", defaultData, render };
