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

/** 預設 MDM 到期學年（開始年份）：購買學年起計三個學年，例如 21-22 → 2023（即 23-24） */
export const defaultMdmUntil = (batch) => {
  const y = batchStartYear(batch);
  return y == null ? null : y + QEF.mdmIncludedYears - 1;
};

/**
 * MDM 狀態
 * until：MDM 有效至哪個學年（開始年份）；可在 iPad 資料中更新（例如每年續期）
 * state：expired（今年已不包括，需購買）／thisYear（今學年完結時到期）／ok
 */
export function mdmStatus(d, yearStart = currentYearStart()) {
  const until = d.mdmUntil ?? defaultMdmUntil(d.batch);
  if (until == null) return { until: null, label: "—", state: "unknown", text: "—" };
  const label = yearLabel(until);
  const state = until < yearStart ? "expired" : until === yearStart ? "thisYear" : "ok";
  const text = { expired: `已到期（${label}）`, thisYear: `${label} 學年完結時到期`, ok: `有效至 ${label}` }[state];
  return { until, label, state, text };
}
