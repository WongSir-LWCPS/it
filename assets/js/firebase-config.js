// ============================================================
// IT一站式平台：設定檔
// 部署前請先填寫以下內容（詳見 README.md）
// ============================================================

// 1. Firebase Console > 專案設定 > 一般 > 你的應用程式 > SDK 設定，複製貼上
export const firebaseConfig = {
  apiKey: "AIzaSyDsSiJ6UMW0p3knyNawk9r2D4lP2N0q328",
  authDomain: "lwcps-it.firebaseapp.com",
  projectId: "lwcps-it",
  storageBucket: "lwcps-it.firebasestorage.app",
  messagingSenderId: "879156864286",
  appId: "1:879156864286:web:d3e6b9a766ce820b9cd50f",
};

// 2. 平台設定
export const APP = {
  schoolName: "樂華天主教小學",

  // 只容許學校網域的 Google 帳戶登入。留空 "" 即接受任何 Google 帳戶。
  allowedDomain: "lwcps.edu.hk",

  // 拒絕登入的電郵格式（正規表示式）。
  // 學生帳戶為 s + 數字，例如 s123456@lwcps.edu.hk
  blockedEmailPatterns: [/^s\d+@lwcps\.edu\.hk$/i],
  blockedMessage: "學生帳戶不能使用此平台，請改用教職員帳戶登入。",

  // GitHub Pages 網址（結尾要有 /），會放入通知電郵的連結。
  // 例如 "https://your-account.github.io/it-platform/"
  siteUrl: "",

  // 3. 電郵通知
  email: {
    // "firestore-mail"：使用 Firebase 的 Trigger Email 擴充功能（建議）
    // "emailjs"       ：使用 EmailJS 免費服務
    // "none"          ：不寄電郵
    mode: "firestore-mail",
    collection: "mail",        // Trigger Email 擴充功能監聽的集合名稱
    replyTo: "",               // 老師回覆電郵時寄往的地址，例如 IT組電郵
    emailjs: { serviceId: "", templateId: "", publicKey: "" },
  },
};
