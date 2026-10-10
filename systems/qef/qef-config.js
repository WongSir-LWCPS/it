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

/** 學年完結日，例如 2026 → 「2027-08-31」 */
export const yearEnd = (yearStart) => `${yearStart + 1}-08-31`;

/** 預設 MDM 到期日：購買學年起計第三個學年完結，例如 21-22 → 2024-08-31 */
export const defaultMdmExpiry = (batch) => {
  const y = batchStartYear(batch);
  return y == null ? null : yearEnd(y + QEF.mdmIncludedYears - 1);
};

/** MDM 到期日（已設定的日期；舊資料的 mdmUntil 學年會轉為該學年完結日；否則按批次計算） */
export const mdmExpiry = (d) => d.mdmExpiry || (d.mdmUntil != null ? yearEnd(d.mdmUntil) : defaultMdmExpiry(d.batch));

/**
 * MDM 狀態（以今天及本學年計算）
 * state：expired（已過期）／thisYear（本學年內到期，需續期）／ok
 */
export function mdmStatus(d, yearStart = currentYearStart(), today = new Date().toISOString().slice(0, 10)) {
  const expiry = mdmExpiry(d);
  if (!expiry) return { expiry: null, state: "unknown", text: "—" };
  const state = expiry < today ? "expired" : expiry < yearEnd(yearStart) ? "thisYear" : "ok";
  const text = { expired: "已過期", thisYear: "本學年內到期", ok: "有效" }[state];
  return { expiry, state, text };
}

/** 某一年加一年，例如 2026-08-31 → 2027-08-31 */
export const addYear = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
