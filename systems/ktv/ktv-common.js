// 樂Kids TV：老師頁面及管理頁面共用的工具
import { daysUntil, parseDateId, toDateId } from "../../assets/js/common.js?v=20261007c";
import { KTV } from "./ktv-config.js?v=20261007c";

export const timeLabel = (b) => `${b.start} - ${b.end}`;
export const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const lockIdOf = (date, start) => `${date}_${start.replace(":", "")}`;
export const isActive = (b) => b.status === "pending" || b.status === "approved";
export const regularIndex = (start, end) => KTV.slots.findIndex((s) => s.start === start && s.end === end);
export const KTV_WINDOW = { start: KTV.slots[0].start, end: KTV.slots[KTV.slots.length - 1].end };

export const overlaps = (s1, e1, s2, e2) => toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
export const overlapsKtvWindow = (start, end) => overlaps(start, end, KTV_WINDOW.start, KTV_WINDOW.end);

/** 同一日期、時間重疊的有效預約 */
export function findConflict(bookings, date, start, end, ignoreId = null) {
  return bookings.find((b) => isActive(b) && b.id !== ignoreId && b.date === date && overlaps(start, end, b.start, b.end));
}

/** 最早可預約的日期 */
export function minBookDate() {
  const d = new Date();
  d.setDate(d.getDate() + KTV.cutoffDays);
  return toDateId(d);
}
export const canBook = (date) => daysUntil(date) >= KTV.cutoffDays;

/**
 * 組合時間表：樂Kids TV 播放日 + 其他有預約的日期
 * 每日：{ date, regular, slots: [{start, end, booking}], extras: [booking] }
 */
export function buildDays(regularDates, bookings) {
  const active = bookings.filter(isActive);
  const dates = new Set([...regularDates, ...active.map((b) => b.date)]);
  return [...dates].sort().map((date) => {
    const regular = regularDates.includes(date);
    const list = active.filter((b) => b.date === date);
    const slots = regular
      ? KTV.slots.map((s) => ({ ...s, booking: list.find((b) => b.start === s.start && b.end === s.end) || null }))
      : [];
    const extras = list
      .filter((b) => !regular || regularIndex(b.start, b.end) < 0)
      .sort((a, b) => a.start.localeCompare(b.start));
    return { date, regular, slots, extras };
  });
}

export const sortBookings = (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start);
export { parseDateId };
