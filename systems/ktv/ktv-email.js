import { APP, esc, fmtDate } from "../../assets/js/common.js";
import { KTV } from "./ktv-config.js";

const SUBJECT = {
  approved: "【樂Kids TV】你的播放預約已獲批准",
  rejected: "【樂Kids TV】你的播放預約未獲批准",
  cancelled: "【樂Kids TV】你的節目已被取消",
};

const LEAD = {
  approved: "你的樂Kids TV播放預約已獲批准，詳情如下：",
  rejected: "你的樂Kids TV播放預約未獲批准，詳情如下：",
  cancelled: "你已獲批准的樂Kids TV節目已被取消，詳情如下：",
};

/** 為審批結果建立電郵內容 */
export function buildKtvEmail(b, status, note = "") {
  const rows = [
    ["播放日期", fmtDate(b.sessionId)],
    ["時段", b.slotLabel],
    ["主題", b.topic],
    ["負責老師", b.teacherName],
    ["播放模式", b.mode],
  ];
  const link = APP.siteUrl ? `${APP.siteUrl}systems/ktv/index.html` : "";
  const fileTip = status === "approved"
    ? `請於播放前與IT老師確認，並把相關PPT／影片放於以下位置的播放日期資料夾內：\n${KTV.fileLocation}`
    : "";

  const text = [
    `${b.teacherName} 老師：`,
    "",
    LEAD[status],
    ...rows.map(([k, v]) => `${k}：${v}`),
    note ? `\n管理員備註：${note}` : "",
    fileTip ? `\n${fileTip}` : "",
    link ? `\n查看播放時間表：${link}` : "",
    "",
    `${APP.schoolName} IT組`,
  ].join("\n");

  const html = `
  <div style="font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;color:#1B2550;line-height:1.7;max-width:560px">
    <p>${esc(b.teacherName)} 老師：</p>
    <p>${esc(LEAD[status])}</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:6px 12px;background:#F3F5FA;width:96px;white-space:nowrap">${esc(k)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #DCE1EC">${esc(v)}</td>
        </tr>`).join("")}
    </table>
    ${note ? `<p><strong>管理員備註：</strong>${esc(note)}</p>` : ""}
    ${fileTip ? `<p style="padding:12px;background:#FFF6D6;border-radius:8px">${esc(fileTip).replace(/\n/g, "<br>")}</p>` : ""}
    ${link ? `<p><a href="${esc(link)}">查看播放時間表</a></p>` : ""}
    <p>${esc(APP.schoolName)} IT組</p>
  </div>`;

  return { subject: SUBJECT[status], html, text };
}
