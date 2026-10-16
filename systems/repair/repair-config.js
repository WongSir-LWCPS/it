// 電子器材損壞報告：設定
export const REPAIR = {
  title: "電子器材損壞報告",
  coll: "repair_reports",
  // 填表時的建議選項（老師亦可自行輸入）
  locations: ["電腦室", "禮堂", "圖書館", "音樂室", "視藝室", "常識室", "教員室", "校務處", "樂Kids TV 室", "操場"],
  devices: ["投影機", "電腦", "手提電腦", "實物投影機", "喇叭", "咪高峰", "電子白板", "電視", "iPad", "打印機", "網絡／Wi-Fi"],
};

export const RSTATUS = {
  open: { label: "跟進中", tone: "wait" },
  done: { label: "已完成維修", tone: "go" },
};

/** 只保留登入名稱的中文部分，例如「陳大文 Chan Tai Man」→「陳大文」 */
export function chineseName(user) {
  const name = (user?.displayName || "").trim();
  return name.replace(/[A-Za-z][A-Za-z.'\- ]*/g, "").replace(/\s+/g, " ").trim() || name || user?.email?.split("@")[0] || "";
}
