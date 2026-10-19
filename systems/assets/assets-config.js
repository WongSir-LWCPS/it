// 器材資產管理：設定
export const ASSET = {
  coll: "asset_items",
  histColl: "asset_history",
  types: ["iPad", "手提電腦", "桌面電腦", "投影機", "實物投影機", "電子白板", "其他"],
  carts: ["Car1", "Car2", "Car3", "Car4"],   // 課堂 iPad 車（亦會加入資料中出現的其他車）
  mdmSystems: ["ESP MDM", "HKT MDM", "沒有"],
  // 匯入時，「借用人」欄出現這些字眼會當作損壞，狀態設為維修中
  brokenWords: ["損壞", "壞機", "無法充電", "無法啟動", "爆", "維修"],
};

/** 用途 */
export const USAGE = {
  cart:    { label: "課堂 iPad 車", tone: "go" },
  room:    { label: "課室／組別專用", tone: "wait" },
  teacher: { label: "教師長期借用", tone: "go" },
  spare:   { label: "後備／未分配", tone: "muted" },
};

/** 狀態 */
export const STATUS = {
  normal:          { label: "正常", tone: "go" },
  repair:          { label: "維修中", tone: "stop" },
  lost:            { label: "遺失", tone: "stop" },
  pendingWriteOff: { label: "待注銷", tone: "wait" },
  retired:         { label: "已注銷", tone: "muted" },
};

/** 盤點結果 */
export const CHECK = ["正常", "有損壞", "找不到"];

/** 目前學年的開始年份（9 月開始） */
export const currentYearStart = (today = new Date()) => (today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1);
export const yearLabel = (y) => `${String(y).slice(-2)}-${String(y + 1).slice(-2)}`;

/** 位置／使用者，例如「Car1 #05」「7/F(RM702)」「陳大文」 */
export function placeText(d) {
  if (d.usage === "cart") return `${d.cart || "—"}${d.slot ? ` #${d.slot}` : ""}`;
  if (d.usage === "teacher") return d.holder?.name || "可借出";
  return d.location || "—";
}
