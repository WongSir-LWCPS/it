import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { APP, db } from "./common.js?v=20261007c";

let emailJsLoading = null;

function loadEmailJs() {
  if (window.emailjs) return Promise.resolve(window.emailjs);
  emailJsLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    s.onload = () => {
      window.emailjs.init({ publicKey: APP.email.emailjs.publicKey });
      resolve(window.emailjs);
    };
    s.onerror = () => reject(new Error("未能載入 EmailJS"));
    document.head.append(s);
  });
  return emailJsLoading;
}

export const emailEnabled = () => ["firestore-mail", "emailjs"].includes(APP.email?.mode);

/**
 * 寄出電郵。to、cc 可以是一個電郵或電郵陣列。
 * 成功排入寄送佇列時回傳 true；未設定電郵或沒有收件人時回傳 false。
 */
export async function sendEmail({ to, cc = [], subject, html, text }) {
  const mode = APP.email?.mode;
  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const ccList = (Array.isArray(cc) ? cc : [cc]).filter((e) => e && !toList.includes(e));
  if (!toList.length) return false;

  if (mode === "firestore-mail") {
    // Firebase「Trigger Email from Firestore」擴充功能會讀取這份文件並寄出電郵
    const mail = { to: toList, message: { subject, html, text }, createdAt: serverTimestamp() };
    if (ccList.length) mail.cc = ccList;
    if (APP.email.replyTo) mail.replyTo = APP.email.replyTo;
    await addDoc(collection(db, APP.email.collection || "mail"), mail);
    return true;
  }

  if (mode === "emailjs") {
    const c = APP.email.emailjs;
    if (!c.serviceId || !c.templateId || !c.publicKey) {
      throw new Error("EmailJS 設定不完整，請在 firebase-config.js 填寫 serviceId、templateId 及 publicKey");
    }
    const ej = await loadEmailJs();
    // 所有收件人放在同一封電郵（以逗號分隔），每次只用 1 個 EmailJS 配額
    await ej.send(c.serviceId, c.templateId, {
      to_email: [...toList, ...ccList].join(", "),
      subject,
      message_html: html,
      message: text,
      reply_to: APP.email.replyTo || "",
    });
    return true;
  }

  return false;
}
