// 樂天資訊站預約：設定
import { tr, isEn } from "../../assets/js/i18n.js?v=20261008j";

export const INFO = {
  title: "樂天資訊站預約",
  intro: "預約樂天資訊站顯示活動資訊。可同時預約多部器材；活動在不同日子舉行時，可選擇「多個日期」。IT組審批後可在「我的申請」查看結果。",
  // mobile: true 的器材需要填寫擺放地點
  devices: [
    { id: "lobbyTv", name: "大堂電視" },
    { id: "lobbyKiosk", name: "大堂資訊站（校務處門口旁）" },
    { id: "mobile1", name: "流動樂天資訊站 1", mobile: true },
    { id: "mobile2", name: "流動樂天資訊站 2", mobile: true },
  ],
  timeFrom: "07:00",
  timeTo: "22:00",
};

export const ISTATUS = {
  pending:   { label: "審批中",   tone: "wait" },
  approved:  { label: "已批准",   tone: "go" },
  rejected:  { label: "未獲批准", tone: "stop" },
  cancelled: { label: "已取消",   tone: "muted" },
};

export const deviceName = (id) => tr(INFO.devices.find((d) => d.id === id)?.name || id);
export const deviceList = (r) => (r.devices || []).map(deviceName).join(isEn ? ", " : "、");

/** 器材及擺放地點，例如「流動樂天資訊站 1（禮堂）」 */
export const deviceWithPlace = (r) => (r.devices || []).map((id) => {
  const place = r.locations?.[id];
  return place ? `${deviceName(id)}${isEn ? ` (${place})` : `（${place}）`}` : deviceName(id);
}).join(isEn ? "; " : "；");

export const slotStart = (s) => `${s.startDate}T${s.startTime}`;
export const slotEnd = (s) => `${s.endDate}T${s.endTime}`;
export const isActive = (r) => r.status === "pending" || r.status === "approved";

/** 找出與已有預約重疊的時段（同一器材、時間重疊） */
export function findClashes(bookings, devices, slots, ignoreId = null) {
  const out = [];
  for (const b of bookings) {
    if (!isActive(b) || b.id === ignoreId) continue;
    const shared = (b.devices || []).filter((d) => devices.includes(d));
    if (!shared.length) continue;
    for (const s of slots) {
      for (const o of b.slots || []) {
        if (slotStart(s) < slotEnd(o) && slotStart(o) < slotEnd(s)) out.push({ booking: b, slot: o, devices: shared });
      }
    }
  }
  return out;
}
