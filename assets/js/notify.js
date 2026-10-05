// 管理員通知名單：存於 settings/notify（emails 陣列）
// 老師提交申請時，通知電郵會寄給這個名單。名單由「平台設定」維護。
import { db } from "./common.js?v=20261005s";
import {
  collection, doc, getDoc, getDocs, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/** 讀取接收通知的管理員電郵 */
export async function getNotifyEmails() {
  try {
    const snap = await getDoc(doc(db, "settings", "notify"));
    return snap.data()?.emails || [];
  } catch (e) {
    console.warn("未能讀取通知名單", e);
    return [];
  }
}

/** （只限管理員）按管理員名單重新整理通知名單 */
export async function syncNotifyList() {
  const snap = await getDocs(collection(db, "admins"));
  const emails = snap.docs.filter((d) => d.data().notify !== false).map((d) => d.id).sort();
  await setDoc(doc(db, "settings", "notify"), { emails, updatedAt: serverTimestamp() });
  return emails;
}
