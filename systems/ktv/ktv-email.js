import { fmtDate } from "../../assets/js/common.js?v=20261006d";
import { adminMail } from "../../assets/js/notify.js?v=20261006d";
import { timeLabel } from "./ktv-common.js?v=20261006d";

/** 寄給管理員的樂Kids TV 通知；kind：new、approved、rejected、cancelled、updated */
export function buildKtvEmail(b, kind, note = "", actor = "") {
  return adminMail({
    tag: "樂Kids TV",
    title: "樂Kids TV預約",
    kind,
    who: b.teacherName,
    actor,
    note,
    path: "systems/ktv/admin.html",
    rows: [
      ["播放日期", fmtDate(b.date)],
      ["時間", timeLabel(b) + (b.kind === "custom" ? "（其他時段）" : "")],
      ["主題", b.topic],
      ["負責老師", b.teacherName],
      ["老師電郵", b.teacherEmail || "—"],
      ["播放模式", b.mode],
      ...(b.remarks ? [["備註", b.remarks]] : []),
    ],
  });
}
