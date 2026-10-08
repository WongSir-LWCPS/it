// QEF iPad管理：設定
export const QEF = {
  // 購買學年起計，包括 MDM 的學年數（之後每年需購買 MDM）
  mdmIncludedYears: 3,
  mdmSystems: ["ESP MDM", "HKT MDM"],
  // 歸還原因
  returnReasons: ["已歸還", "畢業", "退學", "轉校", "放棄不借用", "沒有取機"],
  // 檢查結果
  checkOptions: ["已檢查正常", "壞", "遺失", "無"],
};

export const STATUS = {
  loaned:    { label: "借出中",   tone: "go" },
  available: { label: "可借出",   tone: "wait" },
  repair:    { label: "維修中",   tone: "stop" },
  lost:      { label: "遺失",     tone: "stop" },
  retired:   { label: "已註銷",   tone: "muted" },
};

/** 「21-22」→ 2021 */
export const batchStartYear = (batch) => {
  const m = String(batch || "").match(/^(\d{2})-\d{2}/);
  return m ? 2000 + Number(m[1]) : null;
};
/** 2026 → 「26-27」 */
export const yearLabel = (y) => `${String(y).slice(-2)}-${String(y + 1).slice(-2)}`;

/** 目前學年的開始年份（9 月開始） */
export function currentYearStart(today = new Date()) {
  return today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
}

/** MDM 狀態：已包括至哪一年，或需每年購買 */
export function mdmStatus(batch, yearStart = currentYearStart()) {
  const y = batchStartYear(batch);
  if (y == null) return { paid: false, text: "—" };
  const lastIncluded = y + QEF.mdmIncludedYears - 1;
  if (yearStart <= lastIncluded) return { paid: false, text: `已包括（至 ${yearLabel(lastIncluded)}）` };
  return { paid: true, text: `需每年購買（自 ${yearLabel(lastIncluded + 1)} 起）` };
}
