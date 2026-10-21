// IT組工作資料：加密
// 以「主密碼」在瀏覽器內加密（PBKDF2-SHA256 產生 AES-GCM 256 位元金鑰），資料庫只儲存加密後的內容。
// 主密碼及金鑰不會離開瀏覽器，亦不會儲存；遺失主密碼便無法還原資料。

const enc = new TextEncoder();
const dec = new TextDecoder();
export const ITERATIONS = 310000;
const VERIFY_TEXT = "LWCPS-IT-DESK-OK";

const toB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
export const randomB64 = (n) => toB64(crypto.getRandomValues(new Uint8Array(n)));

/** 由主密碼產生金鑰 */
export async function deriveKey(password, saltB64, iterations = ITERATIONS) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

/** 加密任何可轉為 JSON 的資料，回傳 { iv, ct } */
export async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

/** 解密；主密碼錯誤或資料被改動時會拋出錯誤 */
export async function decryptJSON(key, box) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.ct));
  return JSON.parse(dec.decode(pt));
}

/** 建立新的金鑰資料（第一次設定或更改主密碼時） */
export async function newKeyMeta(password) {
  const salt = randomB64(16);
  const key = await deriveKey(password, salt);
  const verify = await encryptJSON(key, VERIFY_TEXT);
  return { key, meta: { salt, iterations: ITERATIONS, verify, version: 1 } };
}

/** 以主密碼解鎖；密碼錯誤時回傳 null */
export async function unlock(password, meta) {
  try {
    const key = await deriveKey(password, meta.salt, meta.iterations || ITERATIONS);
    const text = await decryptJSON(key, meta.verify);
    return text === VERIFY_TEXT ? key : null;
  } catch {
    return null;
  }
}
