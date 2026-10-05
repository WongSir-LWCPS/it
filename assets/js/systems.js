// ============================================================
// 平台系統清單
// 加入新系統：在 systems/ 內建立新資料夾，然後在下面加一項。
// ============================================================
export const SYSTEMS = [
  {
    id: "ktv",
    name: "樂Kids TV 預約",
    desc: "查看每次樂Kids TV的播放時段，申請預約播放，並跟進審批結果。",
    href: "systems/ktv/index.html",
    adminHref: "systems/ktv/admin.html",
    icon: "📺",
  },
  {
    id: "print",
    name: "增加彩色列印限額申請",
    desc: "申請增加彩色列印限額，IT組處理後會以電郵通知，約需 1 個工作天。",
    href: "systems/print/index.html",
    adminHref: "systems/print/admin.html",
    icon: "🖨️",
  },
  // 範例：
  // {
  //   id: "repair",
  //   name: "電腦報修",
  //   desc: "報告課室電腦及投影機問題。",
  //   href: "systems/repair/index.html",
  //   adminHref: "systems/repair/admin.html",
  //   icon: "🛠️",
  // },
];
