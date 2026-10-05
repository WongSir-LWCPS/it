// 樂Kids TV 預約系統設定
export const KTV = {
  // 樂Kids TV 的固定播放時段
  slots: [
    { start: "13:10", end: "13:15" },
    { start: "13:15", end: "13:20" },
    { start: "13:20", end: "13:25" },
    { start: "13:25", end: "13:30" },
  ],

  // 播放模式
  modes: ["播片", "影片直播", "聲音直播", "Camera直播"],

  // 播放日前多少天截止預約（2 = 最遲在播放日前兩天申請）
  cutoffDays: 2,

  // 「其他時段」可預約的時間範圍及最長時間（分鐘）
  customWindow: { from: "07:30", to: "17:30" },
  maxCustomMinutes: 30,

  // 批准電郵中提示老師放置檔案的位置
  fileLocation: "O:\\樂KIDSTV\\26-27 樂Kids TV\\播放日期folder",
};

export const STATUS = {
  pending:   { label: "審批中",   tone: "wait" },
  approved:  { label: "已批准",   tone: "go" },
  rejected:  { label: "未獲批准", tone: "stop" },
  cancelled: { label: "已取消",   tone: "muted" },
};
