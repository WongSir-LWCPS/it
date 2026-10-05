import { APP, esc, fmtDate, fmtTimestamp } from "../../assets/js/common.js?v=20261005o";
import { PRINT } from "./print-config.js?v=20261005o";

const LINKS = {
  applicant: "systems/print/index.html",
  admin: "systems/print/admin.html",
};

/**
 * kind：
 *   received  寄給申請人：已收到申請
 *   new       寄給管理員：有新申請
 *   approved / rejected  審批結果（寄給申請人，副本給管理員）
 */
export function buildPrintEmail(r, kind, note = "") {
  const SUBJECT = {
    received: "【彩色列印限額】已收到你的申請",
    new: `【彩色列印限額】新申請：${r.applicantName}`,
    approved: "【彩色列印限額】已為你增加彩色列印限額",
    rejected: "【彩色列印限額】你的申請未獲批准",
  };
  const LEAD = {
    received: `我們已收到你的${PRINT.title}。IT組處理後會再以電郵通知你，一般約需 1 個工作天。`,
    new: `${r.applicantName}（${r.email}）提交了${PRINT.title}，請到平台處理。`,
    approved: "IT組已為你增加彩色列印限額，詳情如下：",
    rejected: "你的增加彩色列印限額申請未獲批准，詳情如下：",
  };
  const greet = kind === "new" ? "IT組管理員：" : `${r.applicantName} 老師：`;
  const rows = [
    ["申請人", r.applicantName],
    ["申請日期", fmtDate(r.date)],
    ...(r.remarks ? [["備註", r.remarks]] : []),
    ...(r.createdAt?.toDate ? [["提交時間", fmtTimestamp(r.createdAt)]] : []),
  ];
  const linkPath = kind === "new" ? LINKS.admin : LINKS.applicant;
  const link = APP.siteUrl ? APP.siteUrl + linkPath : "";

  const text = [
    greet, "", LEAD[kind],
    ...rows.map(([k, v]) => `${k}：${v}`),
    note ? `\nIT組備註：${note}` : "",
    link ? `\n${kind === "new" ? "前往處理" : "查看申請"}：${link}` : "",
    "", `${APP.schoolName} IT組`,
  ].join("\n");

  const html = `
  <div style="font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;color:#1B2550;line-height:1.7;max-width:560px">
    <p>${esc(greet)}</p>
    <p>${esc(LEAD[kind])}</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:6px 12px;background:#F3F5FA;width:96px;white-space:nowrap">${esc(k)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #DCE1EC">${esc(v)}</td>
        </tr>`).join("")}
    </table>
    ${note ? `<p><strong>IT組備註：</strong>${esc(note)}</p>` : ""}
    ${link ? `<p><a href="${esc(link)}">${kind === "new" ? "前往處理" : "查看申請"}</a></p>` : ""}
    <p>${esc(APP.schoolName)} IT組</p>
  </div>`;
  return { subject: SUBJECT[kind], html, text };
}
