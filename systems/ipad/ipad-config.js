// iPad借用記錄表：設定
// 舊系統（獨立的 Firebase 專案）設定，只用於第一次把舊資料匯入平台。
export const LEGACY_FIREBASE = {
  apiKey: "AIzaSyCmilDf-GhBHkrEuBkaitAWUfZzIqskNKY",
  authDomain: "lwcps-ipad-booking.firebaseapp.com",
  projectId: "lwcps-ipad-booking",
  storageBucket: "lwcps-ipad-booking.firebasestorage.app",
  messagingSenderId: "1065888924348",
  appId: "1:1065888924348:web:432c68b60ce22f975d06b9",
};
export const LEGACY_DOC = ["ipadBooking", "state"];

// 資料在平台 Firestore 的位置
export const IPAD_DOC = ["ipad", "state"];
