import { APP, fmtDate, fmtTimestamp, mailLayout } from "../../assets/js/common.js?v=20261005q";
import { COPILOT, purposeText } from "./copilot-config.js?v=20261005q";

/** kind：received（給申請人）、new（給管理員）、approved、rejected、returned */
export function buildCopilotEmail(r, kind, note = "") {
  const SUBJECT = {
    received: "【Copilot借用】已收到你的申請",
    new: `【Copilot借用】新申請：${r.applicantName}`,
    approved: "【Copilot借用】你的申請已獲批准",
    rejected: "【Copilot借用】你的申請未獲批准",
    returned: "【Copilot借用】借用期已完結",
  };
  const LEAD = {
    received: `我們已收到你的${COPILOT.title}。IT組審批後會再以電郵通知你。`,
    new: `${r.applicantName}（${r.email}）提交了${COPILOT.title}，請到平台審批。`,
    approved: `你的 Copilot 借用申請已獲批准，IT組會把 Copilot 授權給你的學校 Microsoft 帳戶（${r.email}）。請使用本校電郵登入 Office。`,
    rejected: "你的 Copilot 借用申請未獲批准，詳情如下：",
    returned: "你的 Copilot 借用期已完結，授權已收回。如需繼續使用，請再次填表申請。",
  };
  const rows = [
    ["申請人", r.applicantName],
    ["所屬組別/科組", r.group],
    ["借用期間", `${fmtDate(r.startDate)} 至 ${fmtDate(r.endDate)}（${r.days} 天）`],
    ["用途", purposeText(r)],
    ...(r.createdAt?.toDate ? [["提交時間", fmtTimestamp(r.createdAt)]] : []),
  ];
  const isNew = kind === "new";
  const { html, text } = mailLayout({
    greet: isNew ? "IT組管理員：" : `${r.applicantName} 老師：`,
    lead: LEAD[kind],
    rows,
    note,
    link: APP.siteUrl ? `${APP.siteUrl}systems/copilot/${isNew ? "admin" : "index"}.html` : "",
    linkText: isNew ? "前往審批" : "查看申請",
  });
  return { subject: SUBJECT[kind], html, text };
}
