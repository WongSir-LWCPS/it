# IT一站式平台

樂華天主教小學 IT組的校內系統平台。網站放在 GitHub Pages，資料存放在 Firebase（Firestore），老師以學校 Google 帳戶登入。

系統：**樂Kids TV 預約系統**、**增加彩色列印限額申請**、**Copilot借用申請**

- 老師：查看播放時間表、預約時段、查看自己的申請及審批結果、取消審批中的申請
- 管理員：審批申請（批准／不批准並以電郵通知老師）、管理播放日期、直接加入已確認的節目、取消已批准的節目

## 檔案結構

```
index.html                  平台首頁（系統清單）
assets/css/style.css        共用樣式
assets/js/firebase-config.js  ← 部署前要填寫
assets/js/common.js         Firebase 初始化、登入、共用工具
assets/js/email.js          電郵通知
assets/js/systems.js        平台系統清單（加入新系統時修改）
systems/ktv/                樂Kids TV 預約系統
  index.html / ktv.js       老師頁面
  admin.html / admin.js     管理及審批頁面
  ktv-config.js             時段、播放模式、截止日數、檔案位置
  ktv-email.js              通知電郵內容
firestore.rules             Firestore 安全規則
```

## 設定步驟

### 1. 建立 Firebase 專案

1. 到 <https://console.firebase.google.com> 建立專案。
2. **Authentication** → 開始使用 → 登入方式 → 啟用 **Google**。
3. **Authentication** → 設定 → 已授權網域 → 加入 `你的帳戶.github.io`。
4. **Firestore Database** → 建立資料庫（正式版模式，地區建議 `asia-east2`（香港））。
5. **專案設定** → 一般 → 你的應用程式 → 新增網頁應用程式，把 `firebaseConfig` 複製到 `assets/js/firebase-config.js`。

### 2. 填寫 `assets/js/firebase-config.js`

- `allowedDomain`：已設定為 `lwcps.edu.hk`，只讓學校帳戶登入。
- `blockedEmailPatterns`：拒絕登入的電郵格式。已設定封鎖學生帳戶（`s` + 數字，例如 `s123456@lwcps.edu.hk`）。如學生帳戶格式改變，請同時修改這裏及 `firestore.rules` 內的 `signedIn()`。
- `siteUrl`：GitHub Pages 網址，結尾要有 `/`。
- `email`：見下面第 5 步。

`firestore.rules` 的 `signedIn()` 在資料庫層面亦做了同樣限制：只接受 `@lwcps.edu.hk`，並拒絕學生帳戶。即使有人繞過網頁，也無法讀取或寫入任何資料。

### 3. 發佈安全規則

在 Firebase Console → Firestore → **規則**，把 `firestore.rules` 的內容貼上並發佈。
（或使用 Firebase CLI：`firebase deploy --only firestore:rules`）

### 4. 加入第一位管理員

Firestore → 開始集合 → 集合 ID：`admins` → 文件 ID：**管理員的電郵（全小楷）**，例如 `it@xxx.edu.hk`，隨意加一個欄位（例如 `name: "IT組"`）。
第一位管理員只需在 Firebase 設定一次。之後由管理員登入平台，在選單的「平台設定」新增或移除管理員即可（只可加入 @lwcps.edu.hk 教職員帳戶，不能移除自己）。

### 5. 設定電郵通知（二選一）

**方法 A：Firebase Trigger Email 擴充功能（建議）**

- 需要把 Firebase 升級為 Blaze（按用量付費）方案；學校用量極少，一般不會產生費用，但建議設定預算警示。
- Firebase Console → Extensions → 安裝 **Trigger Email from Firestore**。
- 集合名稱填 `mail`；SMTP 可使用學校 Gmail／Google Workspace 帳戶（需建立「應用程式密碼」），例如
  `smtps://it@xxx.edu.hk@smtp.gmail.com:465`。
- `firebase-config.js` 設定 `email.mode: "firestore-mail"`。

**方法 B：EmailJS（免費，每月 200 封）**

- 到 <https://www.emailjs.com> 註冊，連接學校 Gmail 為 Email Service。
- 建立 Email Template：收件人 `{{to_email}}`，標題 `{{subject}}`，內容（HTML）`{{{message_html}}}`。
- 把 Service ID、Template ID、Public Key 填入 `email.emailjs`，並設定 `email.mode: "emailjs"`。

### 6. 上載到 GitHub 並啟用 GitHub Pages

1. 建立 repository（例如 `it-platform`），上載所有檔案。
2. Settings → Pages → Source：`Deploy from a branch`，Branch：`main` / `(root)`。
3. 約一分鐘後可在 `https://你的帳戶.github.io/it-platform/` 開啟。

### 7. 開始使用

1. 以管理員帳戶登入 → 樂Kids TV 預約 → 管理及審批 → **匯入**。
2. 在 Google 試算表選「檔案 → 下載 → Microsoft Excel (.xlsx)」，上載整個檔案，選擇學年的工作表（例如 26-27），預覽後按「確認匯入」。所有播放日及已登記的節目會一次過加入。
3. 如有新的播放日，可在「播放日期」加入；用「新增節目」直接加入樂Kids TV時段的節目時，日期亦會自動加入。
4. 把平台網址發給老師。

老師可以：預約樂Kids TV播放日的固定時段，或按「預約其他時段」在其他日子或時間（07:30 至 17:30，每次最長 30 分鐘）申請播放。

## 本機測試

ES module 不能直接用 `file://` 開啟，請用本機伺服器，例如 VS Code 的 Live Server，或：

```
python3 -m http.server 8000
```

## 更新程式後

每次修改 JS／CSS 後，上載到 GitHub 前執行：

```
python3 tools/set-version.py
```

所有檔案的引用會加上新版本號，老師的瀏覽器會自動讀取新版本。

然後在 Firebase Authentication 的已授權網域確認有 `localhost`。

## 加入新系統

1. 在 `systems/` 建立新資料夾，例如 `systems/repair/`，可參考 `systems/ktv/` 的結構。
2. 新頁面引用 `../../assets/css/style.css`，並以 `boot()`（`assets/js/common.js`）處理登入。
3. 在 `assets/js/systems.js` 加入一項，平台首頁便會顯示。
4. 在 `firestore.rules` 為新系統的集合加入規則（建議以系統名稱作集合前綴，例如 `repair_tickets`）。

## 資料結構（樂Kids TV）

| 集合 | 文件 ID | 說明 |
| --- | --- | --- |
| `ktv_settings` | `main` | `regularDates`：樂Kids TV 播放日清單 |
| `ktv_bookings` | 自動 | 節目／申請：`date`、`start`、`end`、`kind`（regular 樂Kids TV時段／custom 其他時段）、`topic`、`teacherName`、`teacherEmail`、`mode`、`remarks`、`status`（pending / approved / rejected / cancelled）、`reviewNote`、`lockId` |
| `ktv_slots` | `2026-10-09_1310` | 時段鎖，防止兩位老師同時預約同一時間 |
| `admins` | 電郵 | 管理員名單 |
| `mail` | 自動 | 電郵佇列（方法 A） |

時段、播放模式、截止日數、其他時段的時間範圍可在 `systems/ktv/ktv-config.js` 修改。

## 增加彩色列印限額申請（systems/print/）

- 老師：申請人名稱預設為登入的 Google 帳戶名稱，亦可選「其他（自行輸入）」並填寫申請人的學校電郵；申請日期為提交當日；登入已驗證身份，毋須簽署。可查看及取消處理中的申請。
- 提交後：申請人收到確認電郵；「平台設定」中勾選「電郵通知」的管理員收到新申請通知。
- 管理員：在「管理及處理」按「已增加限額並通知」或「不批准並通知」；結果寄給申請人，並副本給接收通知的管理員。

| 集合 | 說明 |
| --- | --- |
| `print_requests` | `applicantName`、`date`（提交日）、`remarks`、`email`、`uid`、`status`（pending / approved / rejected / cancelled）、`reviewNote`、`reviewedBy` |
| `settings/notify` | `emails`：接收申請通知的管理員（由「平台設定」自動維護） |

## Copilot借用申請（systems/copilot/）

- 老師：姓名預設為登入名稱；選「其他」時須輸入代號及申請人的學校電郵（Copilot 授權及通知會寄到該電郵，並副本給提交者）。選擇組別/科組（可選「其他」自行輸入）、開始及結束借用日期（最多 14 天，自動計算日數）、用途（可多選，「其他」須說明）。Copilot 會授權給登入的學校電郵。
- 提交後：申請人收到確認電郵；接收通知的管理員收到新申請通知。
- 管理員：「待審批」批准或不批准（結果寄給申請人並副本給管理員）；「借用中」列出已批准的借用及已到期的項目，在 Microsoft 365 收回授權後按「標示為已收回」，系統會通知老師。
- 組別、用途、最多借用日數在 `systems/copilot/copilot-config.js` 修改。

## 學年設定及刪除舊資料（平台設定）

- 「學年設定」：設定目前學年名稱及起訖日期（存於 `settings/schoolYear`）。樂Kids TV「一次過加入整段期間」會以此作預設期間。
- 「刪除舊學年資料」：列出目前學年開始日期之前的樂Kids TV 節目、播放日、彩色列印限額申請及 Copilot 借用申請（以結束日期計）。可先下載 CSV 備份，再輸入「刪除」確認刪除。刪除後不能復原。
