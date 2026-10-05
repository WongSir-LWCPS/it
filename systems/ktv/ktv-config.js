// 樂Kids TV 預約系統設定
export const KTV = {
  // 每次播放的時段（次序即時段編號 0、1、2、3）
  slots: ["13:10 - 13:15", "13:15 - 13:20", "13:20 - 13:25", "13:25 - 13:30"],

  // 播放模式
  modes: ["播片", "聲音直播", "Camera直播"],

  // 播放日前多少天截止預約（2 = 最遲在播放日前兩天申請）
  cutoffDays: 2,

  // 批准電郵中提示老師放置檔案的位置
  fileLocation: "O:\\樂KIDSTV\\26-27 樂Kids TV\\播放日期folder",
};

export const STATUS = {
  pending:   { label: "審批中",   tone: "wait" },
  approved:  { label: "已批准",   tone: "go" },
  rejected:  { label: "未獲批准", tone: "stop" },
  cancelled: { label: "已取消",   tone: "muted" },
};
