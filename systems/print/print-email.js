import { fmtDate } from "../../assets/js/common.js?v=20261006e";
import { adminMail } from "../../assets/js/notify.js?v=20261006e";
import { PRINT } from "./print-config.js?v=20261006e";

/** 寄給管理員的彩色列印限額通知；kind：new、approved、rejected */
export function buildPrintEmail(r, kind, note = "", actor = "") {
  const email = r.applicantEmail || r.email;
  return adminMail({
    tag: "彩色列印限額",
    title: PRINT.title,
    kind,
    who: r.applicantName,
    actor,
    note,
    path: "systems/print/admin.html",
    rows: [
      ["申請人", r.applicantName],
      ["申請人電郵", email],
      ...(email !== r.email ? [["提交者", r.email]] : []),
      ["申請日期", fmtDate(r.date)],
      ...(r.remarks ? [["備註", r.remarks]] : []),
    ],
  });
}
