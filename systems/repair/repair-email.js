import { fmtDate } from "../../assets/js/common.js?v=20261022c";
import { adminMail } from "../../assets/js/notify.js?v=20261022c";

/** 新報告通知 IT組（完成維修不寄電郵） */
export function buildRepairEmail(r) {
  const mail = adminMail({
    tag: "器材損壞",
    title: "電子器材損壞報告",
    kind: "new",
    who: r.teacherName,
    path: "systems/repair/admin.html",
    rows: [
      ["報告老師", r.teacherName],
      ["電郵", r.email],
      ["報告日期", fmtDate(r.date)],
      ["地點", r.location],
      ["損壞的器材", r.device],
      ["損壞情況", r.problem],
    ],
  });
  mail.subject = `【器材損壞】${r.location}：${r.device}（${r.teacherName}）`;
  return mail;
}
