// Copilot 借用申請：設定
export const COPILOT = {
  title: "Copilot借用申請",
  intro: "請填寫以下表單以申請借用 Copilot，每次最多可借用 14 天。到期後如需繼續使用，請再次填表續借。",
  notice: "Copilot 只能授權給學校 Microsoft 帳戶，同事必須使用本校電郵登入 Office。",
  maxDays: 14,
  purposes: ["製作簡報", "製作教案", "處理文件", "試用", "其他"],
  groups: [
    "中文", "English", "數學", "常識", "人文及科學", "視藝", "音樂", "體育", "宗教", "資訊及通訊科技", "圖書", "普通話",
    "推廣及中小幼聯繫組", "總務組", "學生事務組", "課程發展組", "資訊科技組", "價值觀教育組",
    "訓輔組", "學生支援組", "活動組", "升中核心組", "家教會", "校友會", "其他",
  ],
};

export const CSTATUS = {
  pending:   { label: "審批中",   tone: "wait" },
  approved:  { label: "已批准",   tone: "go" },
  rejected:  { label: "未獲批准", tone: "stop" },
  cancelled: { label: "已取消",   tone: "muted" },
  returned:  { label: "已收回",   tone: "muted" },
};

/** 借用日數（包括首尾兩日） */
export function loanDays(start, end) {
  if (!start || !end) return 0;
  const [a, b] = [start, end].map((d) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd); });
  return Math.round((b - a) / 86400000) + 1;
}

import { tr, isEn } from "../../assets/js/i18n.js?v=20261008e";

export const purposeText = (r) => (r.purposes || [])
  .map((p) => (p === "其他" && r.otherPurpose ? `${tr("其他")}${isEn ? ": " : "："}${r.otherPurpose}` : tr(p)))
  .join(isEn ? ", " : "、");
