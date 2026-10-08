// 管理員電郵通知
// settings/notify 存放各系統接收通知的管理員：{ emails: [...], ktv: [...], print: [...], copilot: [...] }
// 名單由「平台設定」按每位管理員的勾選自動整理。
import { db, mailLayout, APP } from "./common.js?v=20261008a";
import { SYSTEMS } from "./systems.js?v=20261008a";
import { sendEmail } from "./email.js?v=20261008a";
import {
  collection, doc, getDoc, getDocs, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/** 管理員是否接收某系統的通知（舊資料只有 notify 布林值時，套用到所有系統） */
export const wantsNotify = (admin, sys) => admin.notifySystems?.[sys] ?? (admin.notify !== false);

/** 讀取接收某系統通知的管理員電郵 */
export async function getNotifyEmails(sys) {
  try {
    const data = (await getDoc(doc(db, "settings", "notify"))).data() || {};
    return (sys && data[sys]) || data.emails || [];
  } catch (e) {
    console.warn("未能讀取通知名單", e);
    return [];
  }
}

/**
 * （只限管理員）按管理員名單重新整理通知名單。
 * 可傳入已讀取的管理員名單以免重複讀取；名單沒有改變時不會寫入。
 */
export async function syncNotifyList(admins = null) {
  admins ??= (await getDocs(collection(db, "admins"))).docs.map((d) => ({ email: d.id, ...d.data() }));
  const NOTIFY_SYSTEMS = SYSTEMS.filter((x) => x.notify !== false);
  const data = {};
  for (const s of NOTIFY_SYSTEMS) data[s.id] = admins.filter((a) => wantsNotify(a, s.id)).map((a) => a.email).sort();
  data.emails = [...new Set(NOTIFY_SYSTEMS.flatMap((s) => data[s.id]))].sort();
  const ref = doc(db, "settings", "notify");
  const current = (await getDoc(ref)).data() || {};
  const same = Object.keys(data).every((k) => JSON.stringify(current[k] || []) === JSON.stringify(data[k]));
  if (!same) await setDoc(ref, { ...data, updatedAt: serverTimestamp() });
  return data;
}

/** 寄通知給接收該系統通知的管理員；回傳給用戶看的結果文字 */
export async function notifyAdmins(sys, mail) {
  try {
    const to = await getNotifyEmails(sys);
    if (!to.length) return "沒有設定接收通知的管理員";
    const sent = await sendEmail({ to, ...mail });
    return sent ? `已通知 ${to.length} 位管理員` : "未設定電郵通知";
  } catch (e) {
    console.error(e);
    return `通知電郵未能寄出：${e.message}`;
  }
}

/**
 * 寄給管理員的通知電郵
 * kind：new、approved、rejected、cancelled、returned、updated
 */
export function adminMail({ tag, title, kind, who, rows, note = "", actor = "", path }) {
  const ACTION = {
    new: "新申請", approved: "已批准", rejected: "不批准", cancelled: "已取消", returned: "已收回", updated: "已修改",
  };
  const by = actor || "管理員";
  const LEAD = {
    new: `${who} 提交了${title}，請到平台處理。`,
    approved: `${by} 已批准 ${who} 的${title}。`,
    rejected: `${by} 已不批准 ${who} 的${title}。`,
    cancelled: `${by} 已取消 ${who} 的${title}。`,
    returned: `${by} 已把 ${who} 的${title}標示為已收回。`,
    updated: `${by} 已修改 ${who} 的${title}，最新資料如下。`,
  };
  const { html, text } = mailLayout({
    greet: "IT組管理員：",
    lead: LEAD[kind],
    rows,
    note,
    link: APP.siteUrl && path ? APP.siteUrl + path : "",
    linkText: kind === "new" ? "前往處理" : "查看詳情",
  });
  return { subject: `【${tag}】${ACTION[kind]}：${who}`, html, text };
}
