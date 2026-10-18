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

1. Firebase Console → 左下角「Upgrade」→ 升級為 **Blaze**（按用量付費）方案。學校用量極少，一般不會產生費用，建議同時在 Google Cloud 設定預算警示（例如 HK$10）。
2. Firebase Console → **Extensions** → 搜尋 **Trigger Email from Firestore** → Install。
3. 安裝時填寫：
   - **Email documents collection**：`mail`
   - **SMTP connection URI**：
     - 學校 Gmail／Google Workspace：`smtps://it@lwcps.edu.hk@smtp.gmail.com:465`
     - Microsoft 365／Outlook：`smtp://it@lwcps.edu.hk@smtp.office365.com:587`
   - **SMTP password**：該帳戶的密碼。Gmail 須先在 Google 帳戶開啟兩步驗證，再建立「應用程式密碼」；Microsoft 365 須由管理員為該帳戶開啟「SMTP AUTH」。
   - **Default FROM address**：例如 `IT組 <it@lwcps.edu.hk>`
4. 安裝完成（約 3–5 分鐘）後，到平台「平台設定 → 電郵通知檢查」按「寄出測試電郵」。下表會顯示「已寄出」或錯誤原因。

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

## 電郵通知對象

平台只會寄電郵給管理員，不會寄給申請的老師；老師在各系統的「我的申請」查看審批結果。
在「平台設定 → 管理員」可為每位管理員逐個系統勾選「接收電郵通知」。老師提交申請時，以及管理員批准、不批准、修改、取消或收回後，勾選了該系統的管理員都會收到電郵。

## 中英文切換

頁首右上角的「EN／中文」按鈕可切換語言，選擇會記在該瀏覽器。

- 介面文字以中文撰寫，英文版由 `assets/js/i18n.js` 按對照表即時翻譯。
- 老師輸入的內容（樂Kids TV 節目名稱、老師名稱、備註、代號等）不會翻譯。
- 寄給管理員的通知電郵維持中文。
- 新增或修改介面文字時，請在 `i18n.js` 的 `DICT`（完全相同的句子）或 `PATTERNS`（含數字、日期等變數的句子）加入英文，否則英文版會顯示中文原文。
- 如某段文字不應翻譯，可在元素加上 `data-no-translate`。

## iPad借用（systems/ipad/）

由原本獨立的「iPad借用記錄表」整合而成，介面及操作與舊版相同，以 iframe 顯示於平台內：

- `index.html`／`ipad.js`：平台頁面，負責登入、語言及 Firestore 讀寫。
- `app.html`／`app.js`／`app.css`：原有的借用表（已改為經平台讀寫資料）。
- `ipad-config.js`：舊系統的 Firebase 設定（只用於第一次匯入）及資料位置。

變更：
- 不再使用設定密碼。iPad 設定、課節、IT組預留、外借記錄及臨時租借只限平台管理員：表頭的「管理及審批」按鈕及外借圖示只向管理員顯示；首頁及側邊選單的「管理及審批」會直接開啟系統設定中心（`index.html?admin=1`）。
- 新增借用時，「教師簡稱」預設為登入名稱（去除英文名，例如「黃榮耀Wong Wing Yiu」→「黃榮耀」）。
- 不寄電郵通知（`systems.js` 中 `notify: false`），平台設定的通知勾選不會列出此系統。
- 顏色已改為平台風格（白色表頭、深藍 #1B2550 為強調色），並取消深色模式。
- 語言跟隨平台右上角的 EN／中文。
- 資料存於平台 Firestore 的 `ipad/state` 文件。老師只可新增／修改借用記錄（`bookings`），其他設定只限管理員。
- 第一次由管理員開啟時，可選擇「從舊系統匯入」或「使用預設設定」。之後在「管理及審批 → 匯入舊資料」可隨時重新匯入（會覆蓋平台上所有 iPad 資料），方便平台正式推出前與仍在使用的舊系統同步。
- 「平台設定 → 刪除舊學年資料」包括 iPad 借用記錄。
- 校曆（Day 1–6、特別活動日）仍寫在 `app.js` 的 `defaultState()`，新學年需更新。

## 系統顯示（平台設定）

「平台設定 → 系統顯示」可逐個系統勾選是否向老師顯示（存於 `settings/systems` 的 `hidden` 陣列）。
已隱藏的系統不會在首頁及側邊選單向老師顯示，老師直接開啟網址會看到「此系統暫未開放」。管理員仍可看到（標示「已隱藏」）及進入，方便測試。

## 樂天資訊站預約（systems/infostation/）

- 器材：大堂電視、大堂資訊站（校務處門口旁）、流動樂天資訊站 1、2（可同時選多部）。選了流動樂天資訊站才須填寫擺放地點。
- 日期及時間：「單一時段」（開始日期時間至完結日期時間，可跨日）或「多個日期」（加入多個日期，每日相同的開始及完結時間）。
- 顯示資料：可填寫文字內容，或資料擺放的位置（path）。
- 提交時會檢查同一器材是否已有預約（審批中或已批准）的重疊時段；老師頁面亦列出所有未來的預約。
- 管理員頁面頂部的「下一個預約」顯示最快開始（或正在進行）的已批准預約，連同器材、擺放地點及顯示資料，方便IT組預先設置；下方再按器材各列出下一個預約，每分鐘自動更新。
- 管理員：「待審批」批准／不批准（顯示與已批准預約的衝突）；「全部申請」可取消已批准的預約。通知寄給在「平台設定」勾選了此系統的管理員。
- 器材名稱、時間範圍在 `systems/infostation/infostation-config.js` 修改。

| 集合 | 說明 |
| --- | --- |
| `infostation_bookings` | `devices`、`locations`、`activity`、`content`、`slots`（`startDate`、`startTime`、`endDate`、`endTime`）、`firstDate`、`lastDate`、`status` 等 |

## QEF iPad管理（systems/qef/）—— 第一階段

只限平台管理員（IT組）：首頁及側邊選單不會向老師顯示（`systems.js` 中 `adminOnly: true`），Firestore 規則亦只容許管理員讀寫。

- 統計：總數、借出中、可借出、維修中、遺失、已註銷。
- iPad 清單：可按 Label、機序號、學生姓名、STRN、班別搜尋，按狀態、批次、MDM 篩選，並匯出 CSV。
- 詳細資料：借出（STRN、姓名、班別、學號、日期）、歸還（原因及機身／Pencil／保護套檢查，有問題自動轉為維修中）、更改狀態、編輯資料，以及完整歷史記錄。
- 盤點：每學年初使用。選擇盤點學年後，逐行選擇機身及 Apple Pencil 的結果（保護套不用檢查；沒有配對 Pencil 的 iPad 預設為「無」），再剔選「完成」；亦可在「快速盤點」輸入或掃描 Label／機序號後按 Enter，即以「已檢查正常」完成。進度列顯示已盤點、未盤點及有問題數量，可篩選未盤點／已盤點／有問題，並匯出盤點結果。記錄存於 `stocktakes.y<學年開始年份>`。
- 申請記錄（分頁，`qef-applicants.js`）：保存各學年向教育局回覆的狀態（A 繼續借用／B 仍在校但已歸還／C 已歸還可再借出／D 已歸還需更換；歷年資料已於初期匯入）。「教育局借用情況回覆」選擇回覆學年後，可逐一選擇狀態（即時儲存）、按 iPad 借用情況自動建議（現正借用→A；已歸還→C；歸還的 iPad 現時維修中／待注銷→D；其餘沿用上年 C／D／B），再匯出教育局格式的 CSV。亦可匯入教育局提供的申請者名單（STRN、姓名、申請年份及年級，如「P1 (2021/22)」），按學年及年級顯示各年申請人，並列出該學生現時或以往借用的 QEF iPad。「檢查新申請者」可貼上 STRN（支援 S805490(A) 等格式）或上載名單，選擇申請學年後檢查之前 3 個學年內是否曾申請（紅色標示），亦會顯示 3 年前的申請及沒有記錄的學生。
- 新增 iPad：Label 自動續編，批次預設為目前學年。
- MDM 管理（分頁）：選擇學年，顯示該年需要續期、已續期、未續期、包括期內的數量及續期進度，以及「各批次 MDM 狀況」（每批數量、購買時包括 MDM 至、未到期／需續期、各類數量；按一下即只顯示該批次）。清單可按需續期／已續期／包括期內、批次、MDM 系統篩選；剔選 iPad（可全選）後輸入「續期後到期日」及備註（如訂單編號），按「標示為已續期」即批量更新；「取消續期」會改回續期前的到期日。MDM 到期日預設為購買學年起計第三個學年的 8 月 31 日（`qef-config.js` 的 `mdmIncludedYears`），到期日早於所選學年完結的 iPad 列為需續期。詳細資料亦可「續期一年」或在編輯資料中修改。
- 排序：iPad 清單、盤點、MDM 管理的表頭均可按一下排序，再按一下反序。
- Excel 更新（分頁）：下載更新範本（現有資料），在 Excel 修改後上載，預覽每部 iPad 的改動後確認。以 Label 對應；留空不更改；持有者留空＝歸還，更改持有者＝歸還及借出（自動更新借用者記錄），只改班別／學號／STRN＝更新學生資料（例如升班）；新 Label 會新增 iPad。
- 借用者記錄：每部 iPad 列出歷年借用學生（學年、姓名、STRN、班別學號、結果），同一學生連續學年合併為一行。歷年記錄已於初期由舊點算表匯入；之後在平台借出、歸還、Excel 更新及更正持有者資料都會自動更新。搜尋亦會找到以往借用者。

| 集合 | 說明 |
| --- | --- |
| `qef_devices` | 文件 ID = Label（如 i136）：`serial`、`batch`、`mdm`、`mdmExpiry`（MDM 到期日）、`mdmLastRenewal`、`holderLog`（借用者記錄）、`pencilLabel`、`pencilSerial`、`status`（loaned／available／repair／lost／pendingWriteOff 待注銷／retired 已注銷）、`writeOffYear`（注銷學年）、`holder`、`lastHolder`、`check`、`note` |
| `qef_applicants` | 文件 ID = STRN_申請學年開始年份：`strn`、`name`、`level`、`yearStart`、`statuses`（`y2025: { code, text, no }` 等各學年回覆） |
| `qef_history` | 每次借出、歸還、更改狀態、編輯、新增、匯入的記錄（不可修改或刪除） |

稍後階段：新學年 STRN 升班、借用申請分配及輪候、年度點算、MDM 購買記錄、年度報告。

## 電子器材損壞報告（systems/repair/）

- 老師：填寫地點、損壞的器材及損壞情況；報告日期（提交當日）及老師名稱（登入名稱的中文部分）自動填入。提交後以電郵通知IT組（「平台設定」可選擇接收通知的管理員）。老師可在「我的報告」查看狀態、完成維修日期及IT組跟進情況。
- 管理員（管理及跟進）：「未完成維修」及「已完成維修」兩個分頁均以表格顯示，一行代表一個報告；可直接在表內填寫損壞分析（例如哪個零件損壞，只在管理頁面顯示）及跟進情況（老師可看到），勾選「已完成維修」並填寫完成維修日期（預設今天），再按「儲存」。完成維修不會寄出電郵。可搜尋及匯出 CSV。
- 地點清單（下拉選單，另設「其他」自行輸入）及器材的建議選項可在 `systems/repair/repair-config.js` 修改。

| 集合 | 欄位 |
| --- | --- |
| `repair_reports` | `teacherName`、`email`、`uid`、`date`（報告日期）、`location`、`device`、`problem`、`status`（open 跟進中／done 已完成維修）、`doneDate`、`analysis`（損壞分析）、`followUp`、`followUpBy`、`followUpAt` |

## 頁面分頁及其他（2026-10-18 更新）

- 電子器材損壞報告、樂天資訊站預約、Copilot借用申請、增加彩色列印限額申請、樂Kids TV預約：老師頁面分為兩個分頁，第一個是申請表／時間表，第二個是「我的申請」（電子器材損壞報告為「我的報告」）。網址加上 `#mine` 可直接打開第二個分頁。分頁由 `assets/js/common.js` 的 `showTab()` 處理（分頁列加上 `data-auto-tabs`）。
- 樂天資訊站預約的老師頁面有三個分頁：預約、已預約時段、我的申請。
- 樂天資訊站「管理及審批」→「開放器材」：勾選開放給老師預約的器材，設定存於 `settings/infostation`（`closedDevices`：暫停預約的器材 ID）。暫停的器材不會在預約表格出現，已提交的預約不受影響。
- iPad借用：工具列新增「列表」檢視，以表格列出預約，可選「只顯示我的預約」及「顯示已過去的預約」，並可搜尋（老師、班別、備註）及按 iPad、班別、日期範圍篩選，按「查看」打開該預約。新預約會記錄預約者電郵（`email`），舊預約以老師名稱判斷是否屬於自己。
- 申請人／報告老師：各系統以輸入方塊顯示，預設為登入名稱的中文部分（`common.js` 的 `chineseName()`，例如「黃榮耀 Wong Wing Yiu」→「黃榮耀」），可自行修改。申請人電郵一律為登入帳戶的電郵。
- 管理員：首頁「管理及審批」按鈕及側邊選單會以紅色數字顯示各系統未處理的數量（樂Kids TV、彩色列印、Copilot、樂天資訊站為「審批中」，電子器材損壞報告為「跟進中」），每 2 分鐘及回到頁面時更新。設定見 `assets/js/systems.js` 各系統的 `pending`。
- QEF iPad管理已加入英文版。匯出的 CSV 及 Excel 更新範本仍使用中文欄名及狀態，方便匯入。
