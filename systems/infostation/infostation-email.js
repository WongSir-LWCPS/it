import { fmtDate, isEn } from "../../assets/js/common.js?v=20261008m";
import { adminMail } from "../../assets/js/notify.js?v=20261008m";
import { INFO, deviceWithPlace } from "./infostation-config.js?v=20261008m";

export function slotText(s) {
  return s.startDate === s.endDate
    ? `${fmtDate(s.startDate)} ${s.startTime} - ${s.endTime}`
    : `${fmtDate(s.startDate)} ${s.startTime} ${isEn ? "–" : "至"} ${fmtDate(s.endDate)} ${s.endTime}`;
}

/** 寄給管理員的通知；kind：new、approved、rejected、cancelled */
export function buildInfoEmail(r, kind, note = "", actor = "") {
  const email = r.applicantEmail || r.email;
  return adminMail({
    tag: "樂天資訊站",
    title: INFO.title,
    kind,
    who: r.applicantName,
    actor,
    note,
    path: "systems/infostation/admin.html",
    rows: [
      ["申請人", `${r.applicantName}（${email}）`],
      ["活動名稱", r.activity],
      ["器材", deviceWithPlace(r)],
      ["日期及時間", (r.slots || []).map(slotText).join("\n")],
      ["顯示資料", r.content || "—"],
    ],
  });
}
