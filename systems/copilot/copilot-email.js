import { fmtDate } from "../../assets/js/common.js?v=20261008e";
import { adminMail } from "../../assets/js/notify.js?v=20261008e";
import { COPILOT, purposeText } from "./copilot-config.js?v=20261008e";

/** 寄給管理員的 Copilot 借用通知；kind：new、approved、rejected、returned */
export function buildCopilotEmail(r, kind, note = "", actor = "") {
  const email = r.applicantEmail || r.email;
  return adminMail({
    tag: "Copilot借用",
    title: COPILOT.title,
    kind,
    who: r.applicantName,
    actor,
    note,
    path: "systems/copilot/admin.html",
    rows: [
      ["申請人", r.applicantName],
      ["授權帳戶", email],
      ...(email !== r.email ? [["提交者", r.email]] : []),
      ["所屬組別/科組", r.group],
      ["借用期間", `${fmtDate(r.startDate)} 至 ${fmtDate(r.endDate)}（${r.days} 天）`],
      ["用途", purposeText(r)],
    ],
  });
}
