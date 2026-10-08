// ============================================================
// 平台系統清單
// 加入新系統：在 systems/ 內建立新資料夾，然後在下面加一項。
// ============================================================
export const SYSTEMS = [
  {
    id: "ipad",
    name: "iPad借用",
    desc: "查看及登記 iPad 車的借用節數。批次、課節、IT組預留及外借記錄由管理員在表內設定。",
    href: "systems/ipad/index.html",
    adminHref: "systems/ipad/index.html?admin=1",
    icon: "📱",
    notify: false,   // 不寄電郵通知
  },
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
  {
    id: "copilot",
    name: "Copilot借用申請",
    desc: "申請借用 Microsoft Copilot，每次最多 14 天，IT組審批後會以電郵通知。",
    href: "systems/copilot/index.html",
    adminHref: "systems/copilot/admin.html",
    icon: "🤖",
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
  {
    id: "infostation",
    name: "樂天資訊站預約",
    desc: "預約大堂電視、大堂資訊站及流動樂天資訊站，顯示活動資訊；可選多個日期。",
    href: "systems/infostation/index.html",
    adminHref: "systems/infostation/admin.html",
    icon: "🖥️",
  },
  {
    id: "qef",
    name: "QEF iPad管理",
    desc: "（只限IT組）管理學校 QEF iPad 的資料、借出及歸還記錄、狀態及 MDM。",
    href: "systems/qef/index.html",
    icon: "🗂️",
    adminOnly: true,  // 只限平台管理員（IT組）
    notify: false,
  },
];
