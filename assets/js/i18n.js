// ============================================================
// 中英文切換
// 介面文字以中文撰寫；選用英文時，頁面上的文字會按下面的對照表即時翻譯。
// 老師輸入的內容（節目名稱、老師名稱、備註等）不在對照表內，因此不會被翻譯。
// 新增介面文字時，請在 DICT（完全相同的句子）或 PATTERNS（含變數的句子）加入英文。
// ============================================================

const KEY = "itp-lang";
export const lang = (() => {
  try { return localStorage.getItem(KEY) === "en" ? "en" : "zh"; } catch { return "zh"; }
})();
export const isEn = lang === "en";

export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* 無法儲存時只影響本次 */ }
  location.reload();
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = { 日: "Sun", 一: "Mon", 二: "Tue", 三: "Wed", 四: "Thu", 五: "Fri", 六: "Sat" };
export const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS_EN = MON;

/* ---------- 完全相同的句子 ---------- */
const DICT = {
  // 平台
  "IT一站式平台": "IT One-Stop Platform",
  "樂華天主教小學": "Lok Wah Catholic Primary School",
  "樂華天主教小學 IT組": "Lok Wah Catholic Primary School IT Team",
  "IT組": "IT Team",
  "IT組校內系統": "IT Team School Systems",
  "選擇要使用的系統。IT組加入新系統後，會在下面的清單出現。": "Choose a system. New systems added by the IT Team will appear in this list.",
  "登入 IT一站式平台": "Sign in to the IT One-Stop Platform",
  "請使用學校的 Google 帳戶登入，以使用 IT組的校內系統。": "Please sign in with your school Google account to use the IT Team's school systems.",
  "使用 Google 帳戶登入": "Sign in with Google",
  "登出": "Sign out",
  "管理員": "Admin",
  "系統選單": "Menu",
  "平台首頁": "Home",
  "系統": "Systems",
  "管理": "Admin",
  "平台設定": "Platform Settings",
  "⚙️ 平台設定（管理員名單）": "⚙️ Platform Settings (administrators)",
  "管理及審批": "Manage & Approve",
  "開啟": "Open",
  "載入中…": "Loading…",
  "只限管理員使用": "Administrators only",
  "返回平台首頁": "Back to Home",
  "返回播放時間表": "Back to timetable",
  "返回申請表": "Back to the form",
  "開啟系統選單": "Open menu",
  "關閉選單": "Close menu",
  "選擇時間": "Choose time",
  "開啟月曆": "Open calendar",
  "位置": "Breadcrumb",
  "時": "Hour",
  "分": "Minute",
  "分（請先選時）": "Minute (choose hour first)",
  "上午": "AM",
  "下午": "PM",
  "上午或下午": "AM or PM",
  "時間": "Time",
  "請選擇": "Please choose",
  "請先選開始時間": "Choose a start time first",
  "取消": "Cancel",
  "儲存": "Save",
  "修改": "Edit",
  "移除": "Remove",
  "刪除": "Delete",
  "加入": "Add",
  "預覽": "Preview",
  "提交申請": "Submit",
  "提交中…": "Submitting…",
  "取消申請": "Cancel request",
  "我的申請": "My requests",
  "狀態": "Status",
  "操作": "Actions",
  "全部": "All",
  "全部申請": "All requests",
  "待審批": "Pending",
  "審批中": "Pending",
  "處理中": "Pending",
  "已批准": "Approved",
  "未獲批准": "Not approved",
  "已取消": "Cancelled",
  "已收回": "Returned",
  "已增加限額": "Quota increased",
  "已到期": "Expired",
  "借用中": "On loan",
  "批准": "Approve",
  "不批准": "Reject",
  "處理": "Handled by",
  "已寄通知": "Notified",
  "其他": "Other",
  "其他（自行輸入）": "Other (enter manually)",
  "申請人": "Applicant",
  "申請人名稱": "Applicant name",
  "申請人電郵": "Applicant email",
  "請輸入申請人名稱": "Enter applicant name",
  "申請日期": "Date of request",
  "提交時間": "Submitted",
  "申請時間": "Submitted",
  "備註": "Remarks",
  "備註（選填）": "Remarks (optional)",
  "IT組備註": "IT Team remarks",
  "管理員備註": "Admin remarks",
  "審批備註": "Remarks",
  "電郵": "Email",
  "給老師的回覆（選填，老師可在「我的申請」看到）": "Reply to teacher (optional, shown under “My requests”)",
  "未填寫原因。確定不批准這項申請？": "No reason given. Reject this request?",
  "取消這項申請？": "Cancel this request?",
  "已取消申請。": "Request cancelled.",
  "沒有符合條件的申請。": "No matching requests.",
  "沒有待審批的申請。老師提交的新申請會即時出現在這裏。": "No pending requests. New requests from teachers will appear here immediately.",
  "你還未提交任何申請。": "You have not submitted any requests yet.",
  "尚未設定電郵通知：管理員不會收到電郵。設定方法見 README.md。": "Email notification is not set up: administrators will not receive emails. See README.md.",
  "沒有讀取權限。請確認 Firestore 規則已發佈，並以教職員帳戶登入。": "No permission to read data. Make sure the Firestore rules are published and you are signed in with a staff account.",
  "例如 chantm@lwcps.edu.hk": "e.g. chantm@lwcps.edu.hk",
  "請輸入申請人的學校電郵（@lwcps.edu.hk）。": "Please enter the applicant's school email (@lwcps.edu.hk).",
  "-- --:--": "-- --:--",
  "，審批中": " · pending",
  "圖例": "Legend",
  "節目次序": "Line-up",
  "例如 2026-27": "e.g. 2026-27",

  // 系統名稱及描述
  "樂Kids TV 預約": "Lok Kids TV Booking",
  "樂Kids TV預約": "Lok Kids TV booking",
  "樂Kids TV": "Lok Kids TV",
  "查看每次樂Kids TV的播放時段，申請預約播放，並跟進審批結果。": "View Lok Kids TV broadcast slots, book a slot and follow up on approval.",
  "增加彩色列印限額申請": "Colour Printing Quota Request",
  "申請增加彩色列印限額，IT組處理後會以電郵通知，約需 1 個工作天。": "Request a higher colour printing quota. The IT Team usually handles it within 1 working day.",
  "Copilot借用申請": "Copilot Loan Request",
  "申請借用 Microsoft Copilot，每次最多 14 天，IT組審批後會以電郵通知。": "Borrow Microsoft Copilot for up to 14 days at a time, subject to IT Team approval.",

  // 樂天資訊站
  "樂天資訊站預約": "Info Station Booking",
  "預約大堂電視、大堂資訊站及流動樂天資訊站，顯示活動資訊；可選多個日期。": "Book the lobby TV, lobby kiosk and mobile info stations to show event information. Multiple dates can be chosen.",
  "預約樂天資訊站顯示活動資訊。可同時預約多部器材；活動在不同日子舉行時，可選擇「多個日期」。IT組審批後可在「我的申請」查看結果。": "Book info stations to show event information. You can book several devices at once; for events on different days, choose “Multiple dates”. Check the result under “My requests” after the IT Team reviews it.",
  "樂天資訊站 管理及審批": "Info Station – Manage & Approve",
  "大堂電視": "Lobby TV",
  "大堂資訊站（校務處門口旁）": "Lobby kiosk (next to the General Office)",
  "流動樂天資訊站 1": "Mobile info station 1",
  "流動樂天資訊站 2": "Mobile info station 2",
  "預約器材（可選多部）": "Devices (choose any)",
  "器材": "Devices",
  "活動名稱": "Event name",
  "例如：開放日、聖誕聯歡會": "e.g. Open Day, Christmas party",
  "日期及時間": "Date and time",
  "單一時段": "Single period",
  "多個日期": "Multiple dates",
  "完結日期": "End date",
  "完結時間": "End time",
  "加入日期": "Add date",
  "每日開始時間": "Daily start time",
  "每日完結時間": "Daily end time",
  "顯示資料": "Content to display",
  "可填寫要顯示的文字內容，或資料擺放的位置，例如 O:\\活動\\開放日\\海報.pptx": "Enter the text to display, or where the files are stored, e.g. O:\\Events\\OpenDay\\poster.pptx",
  "例如：禮堂、有蓋操場": "e.g. Hall, covered playground",
  "已預約時段": "Booked times",
  "以下是未來的預約，選擇時間時請避開同一器材已預約的時段。": "Upcoming bookings. Please avoid times already booked for the same device.",
  "暫時沒有預約。": "No bookings yet.",
  "只顯示未完結": "Upcoming only",
  "取消預約": "Cancel booking",
  "請加入最少一個日期。": "Please add at least one date.",
  "請填寫每日開始及完結時間。": "Please fill in the daily start and end times.",
  "完結時間必須遲於開始時間。": "The end time must be later than the start time.",
  "請填寫開始及完結的日期和時間。": "Please fill in the start and end dates and times.",
  "開始日期不能早於今天。": "The start date cannot be earlier than today.",
  "請選擇最少一部器材。": "Please choose at least one device.",
  "請填寫活動名稱。": "Please enter the event name.",
  "請填寫顯示資料，或資料擺放的位置。": "Please enter the content to display, or where the files are stored.",
  "不能選擇已過去的日期。": "Past dates cannot be chosen.",
  "已設為不批准": "Rejected",

  "下一個預約": "Next booking",
  "各器材下一個預約": "Next booking by device",
  "進行中": "In progress",
  "沒有已批准而未完結的預約。": "No approved upcoming bookings.",
  "沒有預約": "No bookings",

  // 系統顯示
  "系統顯示": "System visibility",
  "取消勾選的系統不會在平台首頁及側邊選單向老師顯示，老師亦不能直接開啟。管理員仍可看到並進入已隱藏的系統，方便正式推出前測試。": "Unticked systems are hidden from teachers on the home page and menu, and teachers cannot open them directly. Administrators can still see and open hidden systems for testing before launch.",
  "已隱藏": "Hidden",
  "顯示中": "Visible",
  "此系統暫未開放": "This system is not available yet",
  "IT組暫時隱藏了這個系統。如有需要，請聯絡IT組。": "The IT Team has temporarily hidden this system. Please contact the IT Team if you need it.",

  // iPad
  "iPad借用": "iPad Booking",
  "查看及登記 iPad 車的借用節數。批次、課節、IT組預留及外借記錄由管理員在表內設定。": "View and book iPad carts by period. Administrators manage batches, periods, IT reservations and loans inside the table.",
  "設定 iPad借用": "Set up iPad Booking",
  "平台還未有 iPad 借用資料。你可以把舊的「iPad借用記錄表」（另一個 Firebase 專案）的 iPad 批次、課節、借用記錄、IT組預留及外借記錄一次過匯入；或者使用預設設定，由空白開始。": "There is no iPad booking data on the platform yet. Import the iPad batches, periods, bookings, IT reservations and loans from the old iPad Booking system (a separate Firebase project), or start from the default settings.",
  "從舊系統匯入": "Import from old system",
  "使用預設設定": "Use default settings",
  "正在讀取舊系統…": "Reading old system…",
  "iPad借用尚未設定，請由管理員開啟一次本頁。": "iPad Booking has not been set up yet. An administrator needs to open this page once.",
  "iPad 借用記錄": "iPad bookings",

  // 樂Kids TV：老師頁面
  "播放時間表": "Broadcast timetable",
  "跳到下一次播放": "Jump to next broadcast",
  "隱藏已播放的日期": "Hide past dates",
  "已批准節目": "Approved programme",
  "可預約": "Available",
  "預約其他時段": "Book another time",
  "下一次播放": "Next broadcast",
  "未有安排": "Not scheduled",
  "未有節目": "No programme",
  "沒有節目": "No programme",
  "已截止預約": "Booking closed",
  "預約此時段": "Book this slot",
  "其他時段": "Other time",
  "今天播放": "Today",
  "明天播放": "Tomorrow",
  "正在讀取播放時間表…": "Loading timetable…",
  "預約播放時段": "Book a broadcast slot",
  "預約樂Kids TV時段": "Book a Lok Kids TV slot",
  "主題": "Topic",
  "例如：趣味中文": "e.g. Fun with Chinese",
  "負責老師": "Teacher in charge",
  "播放模式": "Broadcast mode",
  "播片": "Video playback",
  "聲音直播": "Live audio",
  "Camera直播": "Live camera",
  "內容簡介或備註（選填）": "Description or remarks (optional)",
  "例如：需要預留咪高峰、會有學生到廣播室": "e.g. need a microphone; students will come to the studio",
  "提交後，IT組會收到通知；審批結果可在「我的申請」查看。": "The IT Team will be notified. Check the result under “My requests”.",
  "日期": "Date",
  "開始時間": "Start time",
  "結束時間": "End time",
  "播放日期": "Date",
  "已提交申請。審批結果可在下方「我的申請」查看。": "Request submitted. Check the result under “My requests” below.",
  "已取消申請，該時段已重新開放。": "Request cancelled. The slot is open again.",
  "此時段剛有其他老師申請，請選擇另一個時段。": "Another teacher has just requested this slot. Please choose another one.",
  "未能提交：這個時間可能剛被預約。請選擇其他時間。": "Could not submit: this time may have just been booked. Please choose another time.",
  "請填寫主題及負責老師。": "Please fill in the topic and the teacher in charge.",
  "請填寫日期、開始時間及結束時間。": "Please fill in the date, start time and end time.",
  "結束時間必須遲於開始時間。": "The end time must be later than the start time.",
  "這段時間是當日樂Kids TV的播放時間，請關閉此視窗，在時間表直接預約樂Kids TV時段。": "This overlaps the Lok Kids TV broadcast on that day. Please close this window and book a Lok Kids TV slot from the timetable.",
  "你還未提交任何申請。在上面的時間表選擇可預約的時段，或按「預約其他時段」。": "You have not submitted any requests yet. Choose an available slot in the timetable above, or click “Book another time”.",
  "IT組尚未加入播放日期。你仍可按「預約其他時段」申請。": "The IT Team has not added broadcast dates yet. You can still use “Book another time”.",
  "沒有即將播放的日期。取消勾選「隱藏已播放的日期」可查看過往節目。": "No upcoming dates. Untick “Hide past dates” to see past programmes.",
  "時間": "Time",
  "模式": "Mode",

  // 樂Kids TV：管理頁面
  "樂Kids TV 管理及審批": "Lok Kids TV – Manage & Approve",
  "全部節目": "All programmes",
  "匯入": "Import",
  "已批准及審批中": "Approved & pending",
  "只顯示未播放": "Upcoming only",
  "新增節目": "Add programme",
  "修改節目": "Edit programme",
  "樂Kids TV 時段": "Lok Kids TV slot",
  "時段": "Slot",
  "老師電郵（選填）": "Teacher email (optional)",
  "老師電郵": "Teacher email",
  "以電郵通知管理員這次更改": "Email administrators about this change",
  "取消節目": "Cancel programme",
  "播放日已過": "Date passed",
  "這裏是樂Kids TV的固定播放日。老師可以在這些日子預約 13:10 至 13:30 的時段。新增節目或匯入時，如使用樂Kids TV時段，日期會自動加入，不需要先在這裏設定。": "These are the regular Lok Kids TV broadcast days. Teachers can book 13:10–13:30 slots on these days. Dates are added automatically when you add or import programmes in Lok Kids TV slots.",
  "加入一個日期": "Add a date",
  "一次過加入整段期間": "Add a whole period",
  "由": "From",
  "至": "To",
  "逢": "Every",
  "星期一": "Monday",
  "星期二": "Tuesday",
  "星期三": "Wednesday",
  "星期四": "Thursday",
  "星期五": "Friday",
  "星期六": "Saturday",
  "星期日": "Sunday",
  "略過的日期（以逗號分隔，如 16/10/2026, 13/11/2026）": "Dates to skip (comma separated, e.g. 16/10/2026, 13/11/2026)",
  "假期、考試等": "Holidays, exams, etc.",
  "加入所有日期": "Add all dates",
  "還未有樂Kids TV播放日。用上面的表格加入，或到「匯入」上載舊的預約表。": "No Lok Kids TV broadcast days yet. Add them above, or upload the old booking sheet under “Import”.",
  "由 Excel 或 CSV 匯入": "Import from Excel or CSV",
  "支援兩種格式：": "Two formats are supported:",
  "一、舊的「樂Kids TV宣傳時段預約表」：在 Google 試算表選「檔案 → 下載 → Microsoft Excel (.xlsx)」，直接上載整個檔案，再選擇學年的工作表。": "1. The old Lok Kids TV booking sheet: in Google Sheets choose “File → Download → Microsoft Excel (.xlsx)”, upload the whole file and choose the sheet for the school year.",
  "二、一行一個節目的表格，欄位為：日期、開始時間、結束時間、主題、負責老師、老師電郵、播放模式、備註。只填日期的行會加入為樂Kids TV播放日。": "2. A table with one programme per row and the columns 日期, 開始時間, 結束時間, 主題, 負責老師, 老師電郵, 播放模式, 備註. Rows with only a date are added as broadcast days.",
  "下載 CSV 範本": "Download CSV template",
  "檔案（.xlsx、.xls 或 .csv）": "File (.xlsx, .xls or .csv)",
  "工作表": "Sheet",
  "確認匯入": "Confirm import",
  "匯入中…": "Importing…",
  "匯入完成。": "Import complete.",
  "結果": "Result",
  "匯入": "Import",
  "這個檔案的資料已全部在系統內，沒有需要匯入的項目。": "Everything in this file is already in the system. Nothing to import.",
  "這個工作表找不到日期或節目。請確認使用舊預約表，或範本的欄位名稱（日期、開始時間、結束時間、主題、負責老師）。": "No dates or programmes found in this sheet. Use the old booking sheet or the template's column names (日期, 開始時間, 結束時間, 主題, 負責老師).",
  "從播放日移除": "Remove from broadcast days",

  // 彩色列印
  "同事填表後會自動通知IT組，增加彩色列印限額約需 1 個工作天。": "The IT Team is notified automatically. Increasing the colour printing quota takes about 1 working day.",
  "使用登入名稱": "Use my login name",
  "申請日期為提交當日。提交後，IT組會收到通知；處理進度可在「我的申請」查看。": "The request date is the day you submit. The IT Team will be notified; check progress under “My requests”.",
  "例如：需要列印全年級彩色工作紙": "e.g. colour worksheets for the whole level",
  "已提交申請，IT組會盡快處理。可在下方「我的申請」查看進度。": "Request submitted. The IT Team will handle it soon. Check progress under “My requests” below.",
  "請輸入申請人名稱。": "Please enter the applicant name.",
  "彩色列印限額 管理及審批": "Colour Printing Quota – Manage & Approve",

  // Copilot
  "請填寫以下表單以申請借用 Copilot，每次最多可借用 14 天。到期後如需繼續使用，請再次填表續借。": "Fill in this form to borrow Copilot for up to 14 days. To keep using it after it expires, please submit the form again.",
  "您的姓名/代號": "Your name / code",
  "姓名/代號": "Name / code",
  "請輸入姓名或代號": "Enter name or code",
  "所屬組別/科組": "Group / subject panel",
  "組別/科組": "Group / panel",
  "其他組別/科組": "Other group / panel",
  "請輸入組別或科組": "Enter group or panel",
  "開始借用日期": "Loan start date",
  "預計結束借用日期": "Expected end date",
  "用途（可選多項）": "Purpose (choose any)",
  "用途": "Purpose",
  "其他用途": "Other purpose",
  "請說明用途": "Describe the purpose",
  "Copilot 只能授權給學校 Microsoft 帳戶，同事必須使用本校電郵登入 Office。": "Copilot can only be assigned to school Microsoft accounts. Please sign in to Office with your school email.",
  "Copilot 會授權給申請人的學校電郵。提交後，IT組會收到通知；審批結果可在「我的申請」查看。": "Copilot will be assigned to the applicant's school email. The IT Team will be notified; check the result under “My requests”.",
  "借用期間": "Loan period",
  "授權帳戶": "Licensed account",
  "已提交申請，IT組審批後可在下方「我的申請」查看結果。": "Request submitted. Check the result under “My requests” below after the IT Team reviews it.",
  "請輸入姓名或代號。": "Please enter your name or code.",
  "請選擇所屬組別/科組。": "Please choose your group / panel.",
  "請輸入所屬組別/科組。": "Please enter your group / panel.",
  "請填寫開始及結束借用日期。": "Please fill in the loan start and end dates.",
  "開始借用日期不能早於今天。": "The start date cannot be earlier than today.",
  "結束日期不能早於開始日期。": "The end date cannot be earlier than the start date.",
  "請選擇最少一項用途。": "Please choose at least one purpose.",
  "請說明「其他」用途。": "Please describe the “Other” purpose.",
  "Copilot借用 管理及審批": "Copilot Loans – Manage & Approve",
  "已批准的借用。到期後請在 Microsoft 365 管理中心收回授權，再按「標示為已收回」。": "Approved loans. When a loan ends, remove the licence in the Microsoft 365 admin center, then click “Mark as returned”.",
  "標示為已收回": "Mark as returned",
  "目前沒有借用中的 Copilot。": "No Copilot licences are on loan.",
  "製作簡報": "Presentations",
  "製作教案": "Lesson plans",
  "處理文件": "Documents",
  "試用": "Trial",
  // 組別
  "中文": "Chinese", "數學": "Mathematics", "常識": "General Studies", "人文及科學": "Humanities and Science",
  "視藝": "Visual Arts", "音樂": "Music", "體育": "Physical Education", "宗教": "Religious Education",
  "資訊及通訊科技": "ICT", "圖書": "Library", "普通話": "Putonghua",
  "推廣及中小幼聯繫組": "Promotion & School Liaison", "總務組": "General Affairs", "學生事務組": "Student Affairs",
  "課程發展組": "Curriculum Development", "資訊科技組": "IT Team", "價值觀教育組": "Values Education",
  "訓輔組": "Discipline & Guidance", "學生支援組": "Student Support", "活動組": "Activities",
  "升中核心組": "Secondary School Placement", "家教會": "PTA", "校友會": "Alumni Association",

  // 平台設定
  "平台設定": "Platform Settings",
  "電郵通知檢查": "Email notification check",
  "測試電郵收件人": "Test email recipient",
  "寄出測試電郵": "Send test email",
  "正在寄出…": "Sending…",
  "建立時間": "Created",
  "收件人": "Recipients",
  "標題": "Subject",
  "等待擴充功能處理": "Waiting for extension",
  "寄出中": "Sending",
  "重試中": "Retrying",
  "已寄出": "Sent",
  "寄出失敗": "Failed",
  "目前使用 EmailJS 寄出電郵。": "Emails are sent with EmailJS.",
  "已放入電郵佇列，請留意下表的寄送結果（一般在 1 分鐘內更新）。": "Queued. Watch the table below for the result (usually within 1 minute).",
  "未設定電郵通知，無法測試。": "Email notification is not set up, so it cannot be tested.",
  "學年設定": "School year",
  "學年用於整理資料。新學年開始時，先更新學年，再刪除上一個學年的資料。": "The school year is used to organise data. When a new year starts, update it first, then delete last year's data.",
  "學年": "School year",
  "開始日期": "Start date",
  "結束日期": "End date",
  "儲存學年": "Save",
  "刪除舊學年資料": "Delete old school-year data",
  "以下是目前學年開始日期之前的資料。刪除前建議先下載備份。刪除後不能復原。": "Data from before the start of the current school year. Download a backup first – deleted data cannot be recovered.",
  "統計舊學年資料": "Count old data",
  "正在統計…": "Counting…",
  "下載備份（CSV）": "Download backup (CSV)",
  "刪除所選資料": "Delete selected data",
  "刪除中…": "Deleting…",
  "請選擇要刪除的資料。": "Please choose the data to delete.",
  "已刪除所選的舊學年資料。": "The selected old data has been deleted.",
  "樂Kids TV 節目及申請": "Lok Kids TV programmes & requests",
  "樂Kids TV 播放日": "Lok Kids TV broadcast days",
  "管理員可以審批所有系統的申請、管理播放日期、匯入資料，以及在這裏新增或移除管理員。只可加入學校教職員帳戶。「接收電郵通知」可按系統逐項勾選：老師提交申請、以及管理員審批或修改後，平台會寄電郵給勾選了該系統的管理員。平台不會寄電郵給申請的老師，老師可在各系統的「我的申請」查看結果。":
    "Administrators can approve requests in every system, manage broadcast dates, import data and add or remove administrators here. Only school staff accounts can be added. Under “Email notifications”, tick the systems each administrator should hear about: they are emailed when teachers submit requests and after requests are approved or changed. Teachers are never emailed – they see results under “My requests”.",
  "管理員電郵": "Administrator email",
  "名稱（選填）": "Name (optional)",
  "例如 陳老師": "e.g. Ms Chan",
  "加入管理員": "Add administrator",
  "名稱": "Name",
  "接收電郵通知": "Email notifications",
  "加入者": "Added by",
  "加入時間": "Added",
  "你": "You",
  "不能移除自己": "You cannot remove yourself",
  "（Firebase 設定）": "(Firebase setup)",
  "請輸入正確的電郵地址。": "Please enter a valid email address.",
  "學生帳戶不能成為管理員。": "Student accounts cannot be administrators.",
  "最少要保留一位管理員。": "At least one administrator is required.",
  "已移除。": "Removed.",
  "請填寫學年、開始及結束日期。": "Please fill in the school year, start date and end date.",
  "結束日期必須遲於開始日期。": "The end date must be later than the start date.",
};

/* ---------- 含變數的句子（按次序比對，第一個符合的生效） ---------- */
const x = (s) => DICT[s] ?? s;
const wd = (c) => WD[c] || c;
const PATTERNS = [
  // 日期
  [/^(\d{4})年(\d{1,2})月(\d{1,2})日（星期(.)）$/, (y, m, d, w) => `${wd(w)} ${d} ${MON[m - 1]} ${y}`],
  [/^(\d{4})年(\d{1,2})月$/, (y, m) => `${MON[m - 1]} ${y}`],
  [/^(\d{1,2})月(\d{1,2})日$/, (m, d) => `${d} ${MON[m - 1]}`],
  [/^(\d{1,2})日（(.)）$/, (d, w) => `${d} (${wd(w)})`],
  [/^星期(.)，(.+)$/, (w, rest) => `${WEEKDAYS_EN[Object.keys(WD).indexOf(w)]}, ${tr(rest)}`],
  [/^([A-Za-z]+)，(.+)$/, (w, rest) => `${w}, ${tr(rest)}`],
  [/^還有 (\d+) 天$/, (n) => `in ${n} days`],
  [/^移除 ([^？]+)$/, (d) => `Remove ${d}`],
  [/^至 (.+)$/, (d) => `to ${d}`],
  [/^(.+) 至 (.+)（(\d+) 天）$/, (a, b, n) => `${a} – ${b} (${n} days)`],
  [/^(\d+) 天$/, (n) => `${n} day${n === "1" ? "" : "s"}`],
  [/^(.+?)(\d+) 天$/, (pre, n) => `${tr(pre.trim())} ${n} days`],
  // 樂Kids TV
  [/^樂Kids TV 每次播放共 (\d+) 個時段，每段 5 分鐘。.*須在播放日前 (\d+) 天申請。$/,
    (n, d) => `Each Lok Kids TV broadcast has ${n} five-minute slots. Click “Book this slot” to apply, or “Book another time” for other days or times. Check the result under “My requests” below. Requests must be made ${d} days before the broadcast.`],
  [/^用於樂Kids TV播放時間以外的日子或時間。可預約 (.+) 至 (.+)，每次最長 (\d+) 分鐘。$/,
    (a, b, n) => `For days or times outside the Lok Kids TV broadcast. Bookable ${a}–${b}, up to ${n} minutes.`],
  [/^(.+)，審批中$/, (who) => `${who} · pending`],
  [/^播放時間：(.+) 至 (.+)（(\d+) 分鐘）$/, (a, b, n) => `Time: ${a} – ${b} (${n} min)`],
  [/^須在播放日前 (\d+) 天申請，最早可預約 (.+)。$/, (n, d) => `Requests must be made ${n} days ahead. The earliest date is ${d}.`],
  [/^每次最長 (\d+) 分鐘。$/, (n) => `Up to ${n} minutes each time.`],
  [/^時間須在 (.+) 至 (.+) 之間。$/, (a, b) => `The time must be between ${a} and ${b}.`],
  [/^與已有的節目「(.+)」（(.+)）時間重疊，請選擇其他時間。$/, (t, w) => `This overlaps “${t}” (${w}). Please choose another time.`],
  [/^取消 (.+?) (.+?)「(.+)」的申請？$/, (d, t, topic) => `Cancel the request “${topic}” on ${d} ${t}?`],
  [/^預約 (.+) (\d{2}:\d{2})$/, (d, t) => `Book ${d} ${t}`],
  // 時間選擇
  [/^請輸入 (.+) 至 (.+) 之間的時間。$/, (a, b) => `Please enter a time between ${a} and ${b}.`],
  [/^看不懂這個時間/, () => "Time not recognised. Try 08:30, 13:10 or 1:10 pm."],
  [/^結束時間須遲於開始時間，每次最長 (\d+) 分鐘，並在 (.+) 或之前。$/, (n, t) => `The end time must be after the start time, within ${n} minutes, and no later than ${t}.`],
  [/^結束時間必須遲於開始時間，並在(.+)或之前。$/, (t) => `The end time must be after the start time and no later than ${t.trim()}.`],
  [/^(上午|下午) (\d{2}):(\d{2})$/, (p, h, m) => `${h}:${m} ${p === "上午" ? "AM" : "PM"}`],
  // Copilot
  [/^借用日數：(\d+) 天$/, (n) => `Loan period: ${n} days`],
  [/^每次最多可借用 (\d+) 天。$/, (n) => `Up to ${n} days per loan.`],
  [/^每次最多借用 (\d+) 天，請於到期後再次填表續借。$/, (n) => `Loans are limited to ${n} days. Please apply again after it ends.`],
  [/^確認已在 Microsoft 365 收回 (.+)（(.+)）的 Copilot 授權？$/, (n, e) => `Have you removed the Copilot licence of ${n} (${e}) in Microsoft 365?`],
  [/^(\d+) 到期$/, (n) => `${n} expired`],
  // 通用
  [/^使用登入名稱：(.+)$/, (n) => `Use my login name: ${n}`],
  [/^由 (.+) 提交$/, (e) => `submitted by ${e}`],
  [/^你的帳戶（(.+)）未有.*管理員權限。如需權限，請聯絡IT組。$/, (e) => `Your account (${e}) does not have administrator access. Please contact the IT Team.`],
  [/^(.+) 不是學校帳戶。請改用 @(.+) 的帳戶登入。$/, (e, d) => `${e} is not a school account. Please sign in with an @${d} account.`],
  [/^(.+)：學生帳戶不能使用此平台，請改用教職員帳戶登入。$/, (e) => `${e}: student accounts cannot use this platform. Please sign in with a staff account.`],
  [/^未能(讀取|提交|取消|更新|加入|移除|刪除|匯入|登入|寄出|統計資料|讀取資料|讀取你的申請|讀取播放時間表|讀取管理員名單|讀取電郵紀錄|讀取檔案|分析這個工作表|顯示播放時間表)：(.+)$/,
    (_a, msg) => `Something went wrong: ${msg}`],
  [/^已提交申請。(.*)$/, () => "Request submitted."],
  [/^(已批准|已設為不批准|已取消節目|已標示為已增加限額|已標示為已收回|已儲存更改|已加入節目)(。|（(.+)）。?)$/,
    (a, _b, note) => `${{ 已批准: "Approved", 已設為不批准: "Rejected", 已取消節目: "Programme cancelled", 已標示為已增加限額: "Marked as quota increased", 已標示為已收回: "Marked as returned", 已儲存更改: "Changes saved", 已加入節目: "Programme added" }[a]}${note ? ` (${tr(note)})` : "."}`],
  [/^已通知 (\d+) 位管理員$/, (n) => `${n} administrator${n === "1" ? "" : "s"} notified`],
  [/^沒有設定接收通知的管理員$/, () => "no administrators set to receive notifications"],
  [/^未設定電郵通知$/, () => "email notification not set up"],
  [/^通知電郵未能寄出：(.+)$/, (m) => `notification email not sent: ${m}`],
  // 樂Kids TV 管理
  [/^將加入 (\d+) 個樂Kids TV播放日及 (\d+) 個節目(?:；(\d+) 個會略過)?。$/, (a, b, c) => `${a} broadcast days and ${b} programmes will be added${c ? `; ${c} will be skipped` : ""}.`],
  [/^檔案內共 (\d+) 個樂Kids TV播放日(?:（(.+)）)?及 (\d+) 個節目。$/, (a, r, b) => `The file has ${a} broadcast days${r ? ` (${tr(r)})` : ""} and ${b} programmes.`],
  [/^已匯入 (\d+) 個播放日及 (\d+) 個節目。.*$/, (a, b) => `Imported ${a} broadcast days and ${b} programmes.`],
  [/^略過：(.+)$/, (r) => `Skipped: ${r.replace(/^已有「(.+)」$/, "already has “$1”").replace("檔案內時間重疊", "overlaps another row")}`],
  [/^樂Kids TV 播放日（共 (\d+) 天）$/, (n) => `Lok Kids TV broadcast days (${n})`],
  [/^(\d+) 已批准(?:，(\d+) 審批中)?／(\d+)$/, (a, b, n) => `${a} approved${b ? `, ${b} pending` : ""} / ${n}`],
  [/^已加入 (\d+) 個播放日期。$/, (n) => `Added ${n} broadcast dates.`],
  [/^與「(.+)」（(.+)）時間重疊。$/, (t, w) => `Overlaps “${t}” (${w}).`],
  [/^與已批准的「(.+)」（(.+)）時間重疊。$/, (t, w) => `Overlaps the approved “${t}” (${w}).`],
  // 平台設定
  [/^已匯入：(\d+) 個 iPad 批次、(\d+) 項借用記錄。$/, (a, b) => `Imported ${a} iPad batches and ${b} bookings.`],
  [/^已向老師(顯示|隱藏)「(.+)」。$/, (a, n) => `“${x(n)}” is now ${a === "顯示" ? "visible to" : "hidden from"} teachers.`],
  [/^(.+)（已隱藏）$/, (n) => `${x(n)} (hidden)`],
  [/^(.+) 擺放地點$/, (d) => `${x(d)} – location`],
  [/^已選 (\d+) 個日期。$/, (n) => `${n} date${n === "1" ? "" : "s"} selected.`],
  [/^請填寫(.+)的擺放地點。$/, (d) => `Please enter the location of ${x(d)}.`],
  [/^(.+) 在 (.+) 已有預約「(.+)」，請選擇其他時間或器材。$/, (d, w, a) => `${d.split("、").map(x).join(", ")} is already booked for “${a}” at ${w}. Please choose another time or device.`],
  [/^與已批准的「(.+)」（(.+)，(.+)）時間重疊。$/, (a, d, w) => `Overlaps the approved “${a}” (${d.split("、").map(x).join(", ")}, ${w}).`],
  [/^取消「(.+)」的預約？$/, (a) => `Cancel the booking “${a}”?`],
  [/^已取消預約(。|（(.+)）)$/, (_a, n) => `Booking cancelled${n ? ` (${tr(n)})` : "."}`],
  [/^今天 (\d{2}:\d{2}) 開始$/, (t) => `Starts today at ${t}`],
  [/^明天 (\d{2}:\d{2}) 開始$/, (t) => `Starts tomorrow at ${t}`],
  [/^另有 (\d+) 項申請審批中，批准後才會顯示在這裏。$/, (n) => `${n} more request${n === "1" ? " is" : "s are"} pending and will appear here once approved.`],
  [/^擺放地點：(.+)$/, (l) => `Location: ${l}`],
  [/^共 (\d+) 位管理員。$/, (n) => `${n} administrators.`],
  [/^目前學年：(.+)（(.+) 至 (.+)）(，尚未儲存)?$/, (n, a, b, u) => `Current school year: ${n} (${a} – ${b})${u ? ", not saved yet" : ""}`],
  [/^(.+) 學年已於 (.+) 完結，請更新為新學年。$/, (n, d) => `School year ${n} ended on ${d}. Please update to the new school year.`],
  [/^已把目前學年設為 (.+)。$/, (n) => `Current school year set to ${n}.`],
  [/^統計 (.+) 之前的資料數量。$/, (d) => `Count data from before ${d}.`],
  [/^(.+) 之前的資料：$/, (d) => `Data from before ${d}:`],
  [/^沒有 (.+) 之前的資料。$/, (d) => `No data from before ${d}.`],
  [/^(.+)：(\d+) 項$/, (l, n) => `${x(l)}: ${n}`],
  [/^已加入 (.+) 為管理員。.*$/, (e) => `${e} is now an administrator. They can use admin features after refreshing the page.`],
  [/^(.+) 已經是管理員。$/, (e) => `${e} is already an administrator.`],
  [/^只可加入 @(.+) 的學校帳戶。$/, (d) => `Only @${d} school accounts can be added.`],
  [/^移除 (.+) 的管理員權限？$/, (e) => `Remove administrator access for ${e}?`],
  [/^已移除 (.+)。$/, (e) => `Removed ${e}.`],
  [/^(.+) (會|不會)收到「(.+)」的通知。$/, (e, w, s) => `${e} will ${w === "會" ? "" : "not "}receive “${x(s)}” notifications.`],
  [/^目前使用 Firebase「Trigger Email from Firestore」擴充功能/, () => "Emails are sent by the Firebase “Trigger Email from Firestore” extension. The table below shows recent emails and their delivery status."],
  [/^目前未設定電郵通知/, () => "Email notification is not set up (email.mode is \"none\" in firebase-config.js), so no emails will be sent."],
  [/^「(.+)」集合內還沒有電郵。/, () => "No emails yet. Click “Send test email” to try."],
  [/^有電郵超過 2 分鐘仍未處理/, () => "Some emails have waited over 2 minutes: the Trigger Email extension may not be installed or enabled. See README."],
  [/^EmailJS 已接受寄出要求，請檢查 (.+) 的收件匣及垃圾郵件。$/, (e) => `EmailJS accepted the request. Check the inbox and spam folder of ${e}.`],
  [/^副本：(.+)$/, (e) => `cc: ${e}`],
];

/** 翻譯一段文字（中文介面時原樣返回） */
export function tr(text) {
  if (!isEn || text == null) return text;
  const s = String(text);
  const t = s.trim();
  if (!t || !/[\u3400-\u9fff\uff00-\uffef]/.test(t)) return s;
  let out = DICT[t];
  if (out == null) {
    for (const [re, fn] of PATTERNS) {
      const m = t.match(re);
      if (m) { out = fn(...m.slice(1)); break; }
    }
  }
  return out == null ? s : s.replace(t, out);
}
export const t = tr;

/* ---------- 自動翻譯頁面 ---------- */
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
function translateNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const p = node.parentNode;
    if (!p || p.nodeName === "SCRIPT" || p.nodeName === "STYLE" || p.nodeName === "TEXTAREA") return;
    if (p.closest?.("[data-no-translate]")) return;
    const next = tr(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.closest?.("[data-no-translate]")) return;
  for (const a of ATTRS) {
    if (node.hasAttribute?.(a)) {
      const v = node.getAttribute(a);
      const n = tr(v);
      if (n !== v) node.setAttribute(a, n);
    }
  }
  node.childNodes.forEach(translateNode);
}

export function startI18n() {
  document.documentElement.lang = isEn ? "en" : "zh-Hant-HK";
  if (!isEn) return;
  document.title = document.title.replace(/^(.+)｜IT一站式平台$/, (_, a) => `${tr(a)} | IT One-Stop Platform`)
    .replace(/^IT一站式平台｜樂華天主教小學$/, "IT One-Stop Platform | Lok Wah Catholic Primary School");
  translateNode(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") translateNode(m.target);
      else if (m.type === "attributes") translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // 對話框文字
  const { confirm, prompt, alert } = window;
  window.confirm = (m) => confirm.call(window, trLines(m));
  window.prompt = (m, d) => prompt.call(window, trLines(m), d);
  window.alert = (m) => alert.call(window, trLines(m));
}

/** 多行訊息逐行翻譯 */
function trLines(m) {
  return String(m ?? "").split("\n").map((line) => {
    const special = line.match(/^將刪除 (.+) 之前的所選資料，刪除後不能復原。$/);
    if (special) return `Selected data from before ${special[1]} will be deleted and cannot be recovered.`;
    if (/^請輸入「刪除」確認：$/.test(line)) return "Type 刪除 to confirm:";
    if (/^請輸入原因（會寄給老師）：$/.test(line)) return "Reason:";
    const m2 = line.match(/^將加入 (\d+) 個播放日期：$/);
    if (m2) return `${m2[1]} broadcast dates will be added:`;
    const m3 = line.match(/^取消 (.+?) (\d{2}:\d{2} - \d{2}:\d{2})「(.+)」？$/);
    if (m3) return `Cancel “${m3[3]}” on ${m3[1]} ${m3[2]}?`;
    const m4 = line.match(/^刪除播放日期 (.+)？$/);
    if (m4) return `Delete broadcast date ${m4[1]}?`;
    const m5 = line.match(/^(.+) 的備註：$/);
    if (m5) return `Remarks for ${m5[1]}:`;
    return tr(line);
  }).join("\n");
}
