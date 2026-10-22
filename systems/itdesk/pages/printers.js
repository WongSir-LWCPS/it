// IT組工作資料：影印機及打印機
// 資料（包括 IP、MAC、登入密碼）不會寫在程式內：第一次使用時由 Excel 匯入，之後在頁面修改，全部以主密碼加密儲存。
import { esc, toast, loadXlsx } from "../../../assets/js/common.js?v=20261022i";

const uid = (p = "p") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const FLOORS = ["地下", "1樓", "2樓", "3樓", "4樓", "5樓", "6樓", "7樓", "其他"];
const floorRank = (f) => { const i = FLOORS.indexOf(f); return i < 0 ? 99 : i; };
const V = { q: "", view: "list", map: null, placing: null, data: null, api: null, dialog: null, reveal: false };

function defaultData() { return { items: [], maps: [] }; }

/** 由房間推斷樓層：G01 → 地下、RM703 → 7樓、校長室 → 地下、圖書館 → 2樓 */
function guessFloor(room, ip) {
  const r = String(room || "").toUpperCase().replace(/\s+/g, "");
  if (/^G\d/.test(r) || /校長室|校務處|校監室|印刷室|油印房|影印室|EO/.test(room || "")) return "地下";
  const m = r.match(/^(?:RM)?(\d)\d{2}/);
  if (m) return `${m[1]}樓`;
  if (/圖書館/.test(room || "")) return "2樓";
  if (/^10\.94\.111\./.test(ip || "")) return "地下";
  return "其他";
}

/* ---------- 版面 ---------- */
function render(box, data, api) {
  V.data = { items: [], maps: [], ...data };
  V.api = api;
  ensureDialog();
  if (V.map && !V.data.maps.some((m) => m.id === V.map)) V.map = null;
  if (!V.map) V.map = V.data.maps[0]?.id || null;
  const hadFocus = document.activeElement?.id === "pr-q";
  const caret = hadFocus ? document.activeElement.selectionStart : null;
  box.innerHTML = `
    <section class="cx-card">
      <header class="cx-head">
        <h2 class="cx-title"><span class="cx-title-icon pr-icon" aria-hidden="true">🖨️</span>影印機及打印機</h2>
        <div class="cx-tools">
          <div class="seg-choice pr-views" role="tablist">
            <label class="seg-opt"><input type="radio" name="pr-view" value="list" ${V.view === "list" ? "checked" : ""}><span>清單</span></label>
            <label class="seg-opt"><input type="radio" name="pr-view" value="map" ${V.view === "map" ? "checked" : ""}><span>位置圖</span></label>
          </div>
          <input id="pr-q" type="search" class="cx-search" placeholder="過濾型號、位置、IP、Toner…" value="${esc(V.q)}" autocomplete="off">
          <button class="btn btn--small" type="button" data-pr-import>匯入 Excel</button>
          <button class="btn btn--small btn--primary" type="button" data-pr-add>＋ 新增</button>
        </div>
      </header>
      <div id="pr-view"></div>
      <footer class="cx-foot" id="pr-foot"></footer>
    </section>
    <input type="file" id="pr-file" accept=".xlsx,.xls" hidden>
    <input type="file" id="pr-map-file" accept="image/*" hidden>`;
  const q = box.querySelector("#pr-q");
  q.addEventListener("input", () => { V.q = q.value; renderView(); });
  if (hadFocus) { q.focus(); try { q.setSelectionRange(caret, caret); } catch { /* 部分瀏覽器不支援 */ } }
  box.querySelectorAll("[name=pr-view]").forEach((r) => r.addEventListener("change", () => { V.view = r.value; V.placing = null; renderView(); }));
  box.querySelector("[data-pr-add]").addEventListener("click", () => openDialog(null));
  box.querySelector("[data-pr-import]").addEventListener("click", () => box.querySelector("#pr-file").click());
  box.querySelector("#pr-file").addEventListener("change", importExcel);
  box.querySelector("#pr-map-file").addEventListener("change", uploadMap);
  box.querySelector("#pr-view").addEventListener("click", onViewClick);
  box.querySelector("#pr-view").addEventListener("change", onViewChange);
  renderView();
}

const matches = (x, q) => !q || [x.model, x.alias, x.floor, x.room, x.toner, x.ip, x.mac, x.login, x.note]
  .some((v) => String(v || "").toLowerCase().includes(q));

function renderView() {
  const q = V.q.trim().toLowerCase();
  const items = V.data.items;
  const list = items.filter((x) => matches(x, q));
  const by = V.api.updatedBy ? `最後更新：${esc(V.api.updatedBy.split("@")[0])}${V.api.updatedAt ? ` ${fmt(V.api.updatedAt)}` : ""}` : "";
  document.querySelector("#pr-foot").innerHTML = `<span>${q ? `顯示 ${list.length} 部（共 ${items.length} 部）` : `共 ${items.length} 部`}</span><span>${by}</span>`;
  if (V.view === "map") { renderMap(list); return; }
  const box = document.querySelector("#pr-view");
  if (!items.length) {
    box.innerHTML = `<div class="pr-empty"><p>還未有影印機資料。</p>
      <p class="hint">按「匯入 Excel」上載影印機資料表（欄位：影印機型號、位置、Toner、IP Address、Mac、Login、Password），或按「＋ 新增」逐部加入。</p></div>`;
    return;
  }
  const floors = [...new Set(list.map((x) => x.floor || "其他"))].sort((a, b) => floorRank(a) - floorRank(b));
  box.innerHTML = `
    <div class="pr-tools">
      <label class="check"><input type="checkbox" data-pr-reveal ${V.reveal ? "checked" : ""}> 顯示密碼</label>
    </div>
    ${list.length ? `
      <div class="table-scroll cx-scroll"><table class="cx-table pr-table" data-no-translate>
        <colgroup>
          <col class="pr-c-model"><col class="pr-c-room"><col class="pr-c-toner"><col class="pr-c-ip"><col class="pr-c-mac">
          <col class="pr-c-login"><col class="pr-c-pw"><col class="pr-c-note"><col class="pr-c-edit">
        </colgroup>
        <thead><tr><th>影印機型號</th><th>位置</th><th>Toner</th><th>IP Address</th><th>Mac</th><th>Login</th><th>Password</th><th>備注</th><th><span class="sr-only">編輯</span></th></tr></thead>
        ${floors.map((f) => {
          const rows = list.filter((x) => (x.floor || "其他") === f).sort((a, b) => String(a.room).localeCompare(String(b.room), "zh-Hant", { numeric: true }));
          return `<tbody>
            <tr class="pr-floor-row"><th colspan="9" scope="rowgroup">${esc(f)} <small>${rows.length} 部</small></th></tr>
            ${rows.map(rowHtml).join("")}
          </tbody>`;
        }).join("")}
      </table></div>` : `<p class="empty pr-pad">沒有符合的影印機。</p>`}
    ${tonerSummary(items)}`;
}

function rowHtml(x) {
  const pw = x.password ? (V.reveal ? esc(x.password) : "••••••") : "";
  return `
    <tr data-id="${x.id}" tabindex="0" title="按一下編輯">
      <td><span class="cx-company">${esc(x.model)}</span>${x.alias ? `<br><small class="pr-alias">${esc(x.alias)}</small>` : ""}</td>
      <td>${esc(x.room || "")}</td>
      <td class="pr-mono">${esc(x.toner || "")}</td>
      <td>${x.ip ? `<a class="pr-ip" href="http://${esc(x.ip)}" target="_blank" rel="noopener noreferrer" title="開啟影印機的網頁管理介面">${esc(x.ip)}</a>` : `<span class="hint">—</span>`}</td>
      <td class="pr-mono">${esc(x.mac || "")}</td>
      <td class="pr-login">${esc(x.login || "")}</td>
      <td class="pr-pwcell">${x.password ? `<span class="pr-pw" data-pw>${pw}</span>
        <button class="icon-mini" type="button" data-pr-peek title="顯示">👁</button>
        <button class="icon-mini" type="button" data-pr-copy title="複製密碼">📋</button>` : ""}</td>
      <td class="cx-note">${esc(x.note || "")}</td>
      <td class="cx-edit"><span aria-hidden="true">✎</span></td>
    </tr>`;
}

/** Toner 統計：方便訂購 */
function tonerSummary(items) {
  const count = {};
  items.forEach((x) => { if (x.toner) count[x.toner] = (count[x.toner] || 0) + 1; });
  const list = Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!list.length) return "";
  return `<div class="pr-toner"><h3>Toner 型號統計</h3><div class="pr-chips" data-no-translate>
    ${list.map(([t, n]) => `<button class="pr-chip" type="button" data-pr-toner="${esc(t)}"><span class="pr-mono">${esc(t)}</span><b>× ${n}</b></button>`).join("")}</div></div>`;
}

/* ---------- 位置圖 ---------- */
function renderMap(list) {
  const box = document.querySelector("#pr-view");
  const maps = V.data.maps;
  const cur = maps.find((m) => m.id === V.map);
  const img = cur ? V.api.extra(`map_${cur.id}`)?.image : null;
  const pins = cur ? list.filter((x) => x.pin?.map === cur.id) : [];
  const unplaced = V.data.items.filter((x) => !x.pin || !maps.some((m) => m.id === x.pin.map));
  box.innerHTML = `
    <div class="pr-map-bar">
      <div class="pr-map-tabs">
        ${maps.map((m) => `<button type="button" class="pr-map-tab${m.id === V.map ? " is-on" : ""}" data-pr-map="${m.id}">${esc(m.name)}</button>`).join("")}
        <button type="button" class="btn btn--small" data-pr-map-add>＋ 上載位置圖</button>
      </div>
      ${cur ? `<div class="pr-map-actions">
        <label class="field field--compact"><span>標示影印機位置</span>
          <select data-pr-place><option value="">選擇影印機，再按位置圖…</option>
            ${V.data.items.map((x) => `<option value="${x.id}" ${V.placing === x.id ? "selected" : ""}>${esc(x.model)}${x.room ? `（${esc(x.room)}）` : ""}${x.pin?.map === cur.id ? " ✓" : ""}</option>`).join("")}
          </select></label>
        <button type="button" class="btn btn--small" data-pr-map-rename>改名</button>
        <button type="button" class="btn btn--small" data-pr-map-replace>更換圖片</button>
        <button type="button" class="btn btn--small btn--stop" data-pr-map-del>刪除位置圖</button>
      </div>` : ""}
    </div>
    ${!maps.length ? `<p class="empty pr-pad">還未有位置圖。按「＋ 上載位置圖」上載各樓層的平面圖（例如地下、7樓），再標示每部影印機的位置。</p>` : ""}
    ${cur ? `
      ${V.placing ? `<p class="pr-placing">請在圖上按影印機的位置。<button type="button" class="link-btn" data-pr-place-cancel>取消</button></p>` : ""}
      <div class="pr-map${V.placing ? " is-placing" : ""}" data-pr-canvas>
        ${img ? `<img src="${img}" alt="${esc(cur.name)} 位置圖" draggable="false">` : `<p class="empty pr-pad">正在載入圖片…</p>`}
        ${pins.map((x) => `
          <button type="button" class="pr-pin" style="left:${x.pin.x}%;top:${x.pin.y}%" data-pr-pin="${x.id}" aria-label="${esc(x.model)}">
            <span class="pr-pin-dot"></span>
            <span class="pr-pin-label" data-no-translate><b>${esc(x.alias || x.model)}</b>${x.ip ? `<br>${esc(x.ip)}` : ""}</span>
          </button>`).join("")}
      </div>
      ${unplaced.length ? `<details class="pr-unplaced"><summary>未標示位置：${unplaced.length} 部</summary>
        <p class="hint" data-no-translate>${unplaced.map((x) => esc(`${x.model}${x.room ? `（${x.room}）` : ""}`)).join("、")}</p></details>` : ""}` : ""}`;
}

function relPos(e, el) {
  const r = el.getBoundingClientRect();
  return { x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 10 };
}

async function onViewClick(e) {
  if (e.target.closest("[data-pr-toner]")) {
    V.q = e.target.closest("[data-pr-toner]").dataset.prToner;
    document.querySelector("#pr-q").value = V.q;
    renderView();
    return;
  }
  if (e.target.closest("[data-pr-map]")) { V.map = e.target.closest("[data-pr-map]").dataset.prMap; V.placing = null; renderView(); return; }
  if (e.target.closest("[data-pr-map-add]")) { V.replacing = null; document.querySelector("#pr-map-file").click(); return; }
  if (e.target.closest("[data-pr-map-replace]")) { V.replacing = V.map; document.querySelector("#pr-map-file").click(); return; }
  if (e.target.closest("[data-pr-map-rename]")) {
    const m = V.data.maps.find((x) => x.id === V.map);
    const name = prompt("位置圖名稱：", m.name);
    if (!name?.trim()) return;
    await commit({ ...V.data, maps: V.data.maps.map((x) => (x.id === m.id ? { ...x, name: name.trim() } : x)) }, "已改名。");
    return;
  }
  if (e.target.closest("[data-pr-map-del]")) {
    const m = V.data.maps.find((x) => x.id === V.map);
    if (!confirm(`刪除位置圖「${m.name}」？圖上的標示會一併移除。`)) return;
    const data = { ...V.data, maps: V.data.maps.filter((x) => x.id !== m.id), items: V.data.items.map((x) => (x.pin?.map === m.id ? { ...x, pin: null } : x)) };
    if (await commit(data, "已刪除位置圖。")) { try { await V.api.removeExtra(`map_${m.id}`); } catch (err) { console.warn(err); } V.map = null; renderView(); }
    return;
  }
  if (e.target.closest("[data-pr-place-cancel]")) { V.placing = null; renderView(); return; }
  const canvas = e.target.closest("[data-pr-canvas]");
  if (canvas && V.placing) {
    const pos = relPos(e, canvas.querySelector("img") || canvas);
    const id = V.placing;
    V.placing = null;
    await commit({ ...V.data, items: V.data.items.map((x) => (x.id === id ? { ...x, pin: { map: V.map, ...pos } } : x)) }, "已標示位置。");
    renderView();
    return;
  }
  const pin = e.target.closest("[data-pr-pin]");
  if (pin) { openDialog(pin.dataset.prPin); return; }
  const tr = e.target.closest("tr[data-id]");
  if (!tr) return;
  const x = V.data.items.find((i) => i.id === tr.dataset.id);
  if (e.target.closest("a")) return;
  if (e.target.closest("[data-pr-peek]")) {
    const span = tr.querySelector("[data-pw]");
    span.textContent = span.textContent === "••••••" ? x.password : "••••••";
    return;
  }
  if (e.target.closest("[data-pr-copy]")) {
    try { await navigator.clipboard.writeText(x.password || ""); toast("已複製密碼。", "success"); } catch { toast("未能複製，請按「顯示」後自行選取。", "error"); }
    return;
  }
  openDialog(x.id);
}
function onViewChange(e) {
  if (e.target.matches("[data-pr-reveal]")) { V.reveal = e.target.checked; renderView(); }
  if (e.target.matches("[data-pr-place]")) { V.placing = e.target.value || null; renderView(); }
}

/** 上載位置圖：縮小並轉為 JPEG，以免超過資料庫每份文件 1MB 的限制 */
async function uploadMap(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  let name = "";
  if (!V.replacing) {
    name = prompt("位置圖名稱（例如：地下、7樓）：", file.name.replace(/\.[^.]+$/, ""));
    if (!name?.trim()) return;
  }
  try {
    const image = await shrinkImage(file);
    const id = V.replacing || uid("m");
    await V.api.saveExtra(`map_${id}`, { image });
    if (!V.replacing) await commit({ ...V.data, maps: [...V.data.maps, { id, name: name.trim() }] }, "已上載位置圖。");
    else toast("已更換圖片。", "success");
    V.map = id;
    V.view = "map";
    renderView();
  } catch (err) {
    toast("未能上載：" + err.message, "error");
  }
}
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const max = 1800;
      if (w > max) { h = Math.round((h * max) / w); w = max; }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let q = 0.85;
      let url = c.toDataURL("image/jpeg", q);
      while (url.length > 600000 && q > 0.4) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
      URL.revokeObjectURL(img.src);
      if (url.length > 700000) reject(new Error("圖片太大，請先裁剪或縮小。"));
      else resolve(url);
    };
    img.onerror = () => reject(new Error("未能讀取圖片。"));
    img.src = URL.createObjectURL(file);
  });
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
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }).map((r) => r.map((v) => String(v ?? "").trim()));
    // 合併儲存格（例如同一位置跨幾行）向下填上相同內容
    for (const m of ws["!merges"] || []) {
      const v = grid[m.s.r]?.[m.s.c] ?? "";
      for (let r = m.s.r + 1; r <= m.e.r; r++) { grid[r] ??= []; if (!grid[r][m.s.c]) grid[r][m.s.c] = v; }
    }
    const hi = grid.findIndex((r) => r.some((c) => /影印機|型號|model/i.test(c)));
    if (hi < 0) throw new Error("找不到「影印機型號」標題。");
    const head = grid[hi];
    const col = (re) => head.findIndex((c) => re.test(c));
    const C = { model: col(/影印機|型號|model/i), room: col(/位置|location|room/i), toner: col(/toner|碳粉/i), ip: col(/ip/i),
      mac: col(/mac/i), login: col(/login|帳戶|user/i), password: col(/pass|密碼/i), note: col(/備註|remark|note/i) };
    const cell = (r, k) => { const v = C[k] >= 0 ? (r[C[k]] || "") : ""; return /^(null|n\/a|-)$/i.test(v) ? "" : v; };
    const items = [];
    for (const r of grid.slice(hi + 1)) {
      const raw = cell(r, "model");
      if (!raw) continue;
      // 括號內是型號（例如「HP打印機(MFP-3103FDW)」）或簡稱（例如「Ricoh P C600 (EO)」「(RM702A)」）
      const m = raw.match(/^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/);
      let model = m ? m[1].trim() : raw;
      let alias = m ? m[2].trim() : "";
      if (m && /^(?=.*\d)[A-Z0-9-]{5,}$/i.test(alias) && !/^RM\d/i.test(alias)) {
        model = `${model.replace(/打印機|影印機|印表機/g, "").trim()} ${alias}`.trim();
        alias = "";
      }
      const room = cell(r, "room");
      const ip = cell(r, "ip");
      // 保留原有的位置圖標示及備註（同一型號及 IP 或位置）
      const old = V.data.items.find((x) => x.model === model && ((ip && x.ip === ip) || (!ip && x.room === room && x.alias === alias)));
      items.push({
        id: old?.id || uid(), model, alias, room, floor: old?.floor || guessFloor(room || alias, ip), toner: cell(r, "toner"), ip,
        mac: cell(r, "mac").toUpperCase(), login: cell(r, "login"), password: cell(r, "password"), note: cell(r, "note") || old?.note || "", pin: old?.pin || null,
      });
    }
    if (!items.length) throw new Error("檔案中沒有影印機資料。");
    const msg = V.data.items.length
      ? `以檔案中的 ${items.length} 部影印機取代現有的 ${V.data.items.length} 部？（相同型號及 IP 的位置圖標示及備註會保留）`
      : `匯入 ${items.length} 部影印機？`;
    if (!confirm(msg)) return;
    await commit({ ...V.data, items }, `已匯入 ${items.length} 部影印機。請檢查各部的樓層是否正確。`);
  } catch (err) {
    console.error(err);
    toast("未能匯入：" + err.message, "error");
  }
}

/* ---------- 新增／編輯 ---------- */
function ensureDialog() {
  if (V.dialog) return;
  const d = document.createElement("dialog");
  d.className = "sheet sheet--wide";
  d.id = "pr-dialog";
  d.setAttribute("aria-labelledby", "pr-dialog-title");
  d.innerHTML = `
    <form id="pr-form" novalidate>
      <div class="dev-head"><h2 id="pr-dialog-title">新增影印機</h2><button class="btn btn--small" type="button" data-pr-close>關閉</button></div>
      <div class="field-row">
        <label class="field"><span>型號</span><input name="model" maxlength="60" required placeholder="例如 Ricoh IM C6000" data-no-translate></label>
        <label class="field"><span>簡稱（選填）</span><input name="alias" maxlength="40" placeholder="例如 影印室、RM702A" data-no-translate></label>
      </div>
      <div class="field-row">
        <label class="field"><span>樓層</span><select name="floor">${FLOORS.map((f) => `<option value="${f}">${f}</option>`).join("")}</select></label>
        <label class="field"><span>位置／房間</span><input name="room" maxlength="40" placeholder="例如 G01、RM702、校長室" data-no-translate></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Toner 型號</span><input name="toner" maxlength="40" data-no-translate></label>
        <label class="field"><span>IP 位址</span><input name="ip" maxlength="40" placeholder="例如 10.94.111.99" inputmode="decimal" data-no-translate></label>
      </div>
      <div class="field-row">
        <label class="field"><span>MAC</span><input name="mac" maxlength="40" data-no-translate></label>
        <label class="field"><span>登入名稱</span><input name="login" maxlength="40" autocomplete="off" data-no-translate></label>
      </div>
      <label class="field"><span>登入密碼</span><span class="secret-input">
        <input name="password" type="password" maxlength="80" autocomplete="new-password" data-no-translate>
        <button class="btn btn--small" type="button" data-pr-toggle>顯示</button></span></label>
      <label class="field"><span>備註（選填）</span><textarea name="note" rows="2" maxlength="300" data-no-translate></textarea></label>
      <p class="hint" id="pr-pin-info"></p>
      <p class="warn" id="pr-warn" hidden></p>
      <div class="actions actions--start cx-actions">
        <button class="btn btn--primary" type="submit">儲存</button>
        <button class="btn btn--small" type="button" data-pr-unpin>移除位置圖標示</button>
        <button class="btn btn--stop" type="button" data-pr-delete>刪除</button>
      </div>
    </form>`;
  document.body.append(d);
  V.dialog = d;
  d.addEventListener("click", async (e) => {
    if (e.target.closest("[data-pr-close]")) d.close();
    if (e.target.closest("[data-pr-toggle]")) {
      const i = d.querySelector("[name=password]");
      i.type = i.type === "password" ? "text" : "password";
      e.target.textContent = i.type === "password" ? "顯示" : "隱藏";
    }
    if (e.target.closest("[data-pr-delete]")) {
      const x = V.data.items.find((i) => i.id === V.editing);
      if (x && confirm(`刪除「${x.model}${x.room ? `（${x.room}）` : ""}」？`)
        && await commit({ ...V.data, items: V.data.items.filter((i) => i.id !== x.id) }, "已刪除。")) d.close();
    }
    if (e.target.closest("[data-pr-unpin]")) {
      if (await commit({ ...V.data, items: V.data.items.map((i) => (i.id === V.editing ? { ...i, pin: null } : i)) }, "已移除標示。")) d.close();
    }
  });
  d.querySelector("#pr-form").addEventListener("submit", (e) => { e.preventDefault(); save(); });
}
function openDialog(id) {
  const x = id ? V.data.items.find((i) => i.id === id) : null;
  V.editing = id;
  const f = V.dialog.querySelector("#pr-form");
  f.reset();
  V.dialog.querySelector("#pr-warn").hidden = true;
  V.dialog.querySelector("#pr-dialog-title").textContent = x ? "編輯影印機" : "新增影印機";
  for (const k of ["model", "alias", "room", "toner", "ip", "mac", "login", "password", "note"]) f[k].value = x?.[k] || "";
  f.floor.value = x?.floor || "地下";
  f.password.type = "password";
  V.dialog.querySelector("[data-pr-toggle]").textContent = "顯示";
  const map = x?.pin ? V.data.maps.find((m) => m.id === x.pin.map) : null;
  V.dialog.querySelector("#pr-pin-info").textContent = map ? `已在「${map.name}」位置圖標示。` : (x ? "未在位置圖標示（可在「位置圖」選擇這部影印機再按圖上位置）。" : "");
  V.dialog.querySelector("[data-pr-delete]").hidden = !x;
  V.dialog.querySelector("[data-pr-unpin]").hidden = !map;
  V.dialog.showModal();
  f.model.focus();
}
async function save() {
  const f = V.dialog.querySelector("#pr-form");
  const warn = (m) => { const w = V.dialog.querySelector("#pr-warn"); w.hidden = !m; w.textContent = m; };
  const v = (k) => f[k].value.trim();
  if (!v("model")) { f.model.focus(); return warn("請填寫型號。"); }
  if (v("ip") && !/^[\d.]+$|^[\w.-]+$/.test(v("ip"))) return warn("IP 位址格式不正確。");
  const old = V.data.items.find((i) => i.id === V.editing);
  const item = { id: V.editing || uid(), model: v("model"), alias: v("alias"), floor: f.floor.value, room: v("room"), toner: v("toner"),
    ip: v("ip"), mac: v("mac").toUpperCase(), login: v("login"), password: f.password.value, note: v("note"), pin: old?.pin || null };
  const items = old ? V.data.items.map((i) => (i.id === item.id ? item : i)) : [...V.data.items, item];
  if (await commit({ ...V.data, items }, "已儲存。")) V.dialog.close();
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

export const printersPage = { id: "printers", name: "影印機", icon: "🖨️", defaultData, render };
