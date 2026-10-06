function appMain(env){
env = env || {};
'use strict';

/* ===================== i18n ===================== */
var STORAGE_LANG = 'ipadbooking_lang_v1';
var MONTH_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var WD_FULL_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var WD_SHORT_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var WD_MF_EN = {1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri'};

var I18N = {
  zh: {
    appTitleSuffix: 'iPad借用記錄表',
    loansAriaLabel: 'iPad外借記錄',
    settingsAriaLabel: '設定',
    langToggleAriaLabel: 'Switch to English',
    readonlyBanner: '目前為唯讀檢視，變更暫時無法儲存',
    prevWeek: '上一週', prevDay: '上一日',
    today: '今日', selectDate: '選擇日期',
    nextWeek: '下一週', nextDay: '下一日',
    viewWeek: '週', viewDay: '日',
    periodCol: '節數',
    icyReservedTag: 'IT組預留',
    slotClosedTitle: '此節未開放借用',
    unitsSuffix: '部',
    noNotes: '沒有備註',
    editBooking: '編輯借用記錄', newBooking: '新增借用記錄',
    nonSchoolDay: '非上課日',
    classLabel: '借用班別',
    otherClassLabel: '其他班別／名稱',
    enterClassPlaceholder: '請輸入班別或名稱',
    teacherLabel: '教師簡稱',
    teacherPlaceholder: '例：陳Sir',
    periodsLabel: '借用節數',
    selectIpadBatchLabel: '選擇 iPad 批次',
    occupiedSuffix: '（已佔用）',
    qtyLabel: 'iPad 租借數量',
    qtyHintPrefix: '上限：', qtyHintSuffix: ' 部（已選批次總數量）',
    colorLabel: '顏色標記', changeColor: '換色',
    notesLabel: '備註', optionalPlaceholder: '選填',
    deleteBtn: '刪除', cancelBtn: '取消',
    saveChanges: '儲存變更', confirmBooking: '確認借用',
    otherOption: '其他',
    icyReservationTitle: 'IT組預留',
    classShort: '班別',
    cycleWeekLabel: '循環日 / 週次',
    parityAll: '每週', parityOdd: '單週', parityEven: '雙週',
    periodsShort: '課節',
    ipadBatchLabel: 'iPad 批次',
    durationLabel: '期間',
    dateRangeSep: ' 至 ',
    reservationHint: '如需修改或取消此預留，請於「設定 → IT組預留」中刪除。',
    closeBtn: '關閉',
    settingsPasswordTitle: '系統設定',
    enterPasswordHint: '請輸入設定密碼以繼續',
    wrongPassword: '密碼錯誤，請重試。',
    confirmBtn: '確定',
    tabIpad: 'iPad設備', tabPeriod: '課節設定', tabReservation: 'IT組預留', tabClear: '清除記錄',
    settingsCenterTitle: '系統設定中心',
    batchCode: '批次代號', nameLabel: '名稱', qtyShort: '數量',
    ipadNotePlaceholder: '例：PROCREATE (19部)',
    ipadSettingsTitle: 'iPad 設備設定',
    ipadSettingsDesc: '設定各批 iPad 的名稱、備註及數量；備註會在頁首標籤中以提示形式顯示。',
    addIpadBatch: '＋ 新增 iPad 批次',
    periodSettingsTitle: '課節設定',
    periodSettingsDescPre: '可按住左側 ', periodSettingsDescPost: ' 進行上下拖放來修改次序；勾選適用星期，並設定分類與是否開放借用。',
    addPeriod: '＋ 新增課節',
    categoryNormal: '正常借用', categoryBreak: '小息/午膳',
    openLabel: '開放',
    newPeriodDefaultName: '新課節',
    periodFallbackPrefix: '課節',
    periodNamePlaceholder: '中文名稱',
    periodNameEnPlaceholder: '英文名稱（選填）',
    reservationSettingsTitle: 'IT組預留設定',
    reservationSettingsDesc: '設定 IT 組在指定循環日、課節長期佔用的 iPad 批次（例如 ICT 課堂、課外活動、樂天學滿FUN 等），教師將無法於該時段借用。',
    calendarLabelField: '月曆顯示名稱',
    calendarLabelPlaceholder: '選填，預設顯示「IT組預留」',
    startDate: '開始日期', endDate: '結束日期',
    weekLabel: '週次', cycleDayLabel: '循環日',
    otherNameLabel: '其他名稱',
    addReservationBtn: '＋ 加入預留',
    updateReservationBtn: '更新預留',
    editBtn: '編輯',
    tempRentBtn: '臨時租用（取代預留）',
    tempRentTag: '臨時',
    newTempRentTitle: '新增臨時租用記錄',
    editTempRentTitle: '編輯臨時租用記錄',
    tempRentHint: '管理員專用：此臨時租用只會取代這一天的 IT組預留，刪除此記錄後預留會自動恢復。',
    toastTempRentAdded: '已新增臨時租用記錄',
    noReservations: '目前沒有已設定的 IT組預留。',
    noteInlinePrefix: '　備註：',
    clearSettingsTitle: '預約記錄清除',
    clearSettingsDesc: '清除指定日期之前的所有借用記錄（不影響 IT組預留設定）。此操作無法復原。',
    clearBeforeLabel: '清除此日期之前的記錄',
    clearRecordsBtn: '清除記錄',
    newLoanTitle: '新增外借記錄',
    loanDesc: '供 IT 組登記教師／學生短期借用個別 iPad（如借用 1-2 天），方便每日點算；租用者歸還後請按右方垃圾桶圖示刪除該筆記錄。',
    ipadIdLabel: 'iPad 編號', ipadIdPlaceholder: '例如：C1-07',
    borrowerNameLabel: '借用人姓名', borrowerNamePlaceholder: '例如：陳老師 / 陳小明',
    classIfApplicable: '班別（如適用）', classOptionalPlaceholder: '選填，例如：4A',
    borrowDateLabel: '借用日期', dueDateLabel: '預計歸還日期',
    loanNoteLabel: '借用原因／備註',
    addLoanBtn: '＋ 新增外借記錄',
    currentLoansTitle: '外借中列表',
    currentlyOnLoan: '目前外借中：',
    overdueCountLabel: '　已逾期：',
    overdueTag: '已逾期',
    returnDeleteTitle: '已歸還，刪除記錄',
    borrowedPrefix: '借用：', duePrefix: '　預計歸還：', notePrefix: '備註：',
    noLoans: '目前沒有外借中的 iPad。',
    confirmActionTitle: '確認操作',
    toastReadonlyNoSave: '目前為唯讀檢視，變更不會儲存',
    toastSaveFailed: '儲存失敗：', toastPleaseRetry: '請重試',
    toastReadonlyNoAdd: '唯讀檢視，無法新增',
    confirmDeleteBooking: '確定要刪除這筆借用記錄嗎？',
    toastBookingUpdated: '已更新借用記錄', toastBookingAdded: '已新增借用記錄',
    toastBookingDeleted: '已刪除借用記錄',
    errNeedPeriod: '請至少選擇一個借用節數。',
    errNeedIpad: '請至少選擇一批 iPad。',
    errNeedTeacher: '請輸入教師簡稱。',
    errNeedClassName: '請輸入班別或名稱。',
    errNeedQtyMin: '請輸入至少 1 的租借數量。',
    errQtyExceedPrefix: '租借數量不能超過所選批次的總數量上限（', errQtyExceedSuffix: ' 部）。',
    toastSavedIpadSettings: '已儲存 iPad 設定',
    toastSavedPeriodSettings: '已儲存課節設定',
    confirmDeleteReservation: '確定要刪除此 IT組預留嗎？',
    errNeedDates: '請輸入有效的開始及結束日期',
    errNeedPeriodRes: '請至少選擇一個課節',
    errNeedIpadRes: '請至少選擇一批 iPad',
    toastReservationAdded: '已加入 IT組預留',
    toastReservationUpdated: '已更新預留',
    errPickDate: '請選擇日期',
    confirmClearRecordsPrefix: '確定要清除 ', confirmClearRecordsSuffix: ' 之前的所有借用記錄嗎？此操作無法復原。',
    toastRecordsCleared: '已清除記錄',
    errNeedIpadId: '請輸入 iPad 編號',
    errNeedBorrowerName: '請輸入借用人姓名',
    errNeedLoanDates: '請輸入有效的借用及預計歸還日期',
    errIpadAlreadyLoanedPrefix: '此 iPad（', errIpadAlreadyLoanedSuffix: '）目前已在外借中，請先確認是否已歸還',
    toastLoanAdded: '已新增外借記錄',
    adminOnly: '只限平台管理員使用。如需權限，請聯絡IT組。',
    notInitialized: '系統尚未設定，請由管理員開啟一次本頁。',
    confirmDeleteLoan: '確定此 iPad 已歸還，要刪除這筆外借記錄嗎？',
    toastConnLost: '連線中斷，將自動重試：',
    toastDbConnFail: '無法連接資料庫，請檢查 Firebase 設定：',
    toastClearFailed: '清除失敗：',
    toastSaveFailedNetwork: '儲存失敗，請檢查網路連線：'
  },
  en: {
    appTitleSuffix: 'iPad Booking System',
    loansAriaLabel: 'iPad Loan Records',
    settingsAriaLabel: 'Settings',
    langToggleAriaLabel: '切換至中文',
    readonlyBanner: 'Read-only view — changes cannot be saved right now',
    prevWeek: 'Previous Week', prevDay: 'Previous Day',
    today: 'Today', selectDate: 'Select Date',
    nextWeek: 'Next Week', nextDay: 'Next Day',
    viewWeek: 'Week', viewDay: 'Day',
    periodCol: 'Period',
    icyReservedTag: 'IT Reserved',
    slotClosedTitle: 'This period is not open for booking',
    unitsSuffix: ' units',
    noNotes: 'No notes',
    editBooking: 'Edit Booking', newBooking: 'New Booking',
    nonSchoolDay: 'Non-school day',
    classLabel: 'Class',
    otherClassLabel: 'Other Class / Name',
    enterClassPlaceholder: 'Enter class or name',
    teacherLabel: 'Teacher',
    teacherPlaceholder: 'e.g. Mr. Chan',
    periodsLabel: 'Periods',
    selectIpadBatchLabel: 'Select iPad Batch',
    occupiedSuffix: ' (In use)',
    qtyLabel: 'Number of iPads',
    qtyHintPrefix: 'Max: ', qtyHintSuffix: ' units (total of selected batches)',
    colorLabel: 'Color Tag', changeColor: 'Change Color',
    notesLabel: 'Notes', optionalPlaceholder: 'Optional',
    deleteBtn: 'Delete', cancelBtn: 'Cancel',
    saveChanges: 'Save Changes', confirmBooking: 'Confirm Booking',
    otherOption: 'Other',
    icyReservationTitle: 'IT Team Reservation',
    classShort: 'Class',
    cycleWeekLabel: 'Cycle Day / Week',
    parityAll: 'Every week', parityOdd: 'Odd weeks', parityEven: 'Even weeks',
    periodsShort: 'Periods',
    ipadBatchLabel: 'iPad Batch',
    durationLabel: 'Duration',
    dateRangeSep: ' to ',
    reservationHint: 'To modify or cancel this reservation, delete it under Settings → IT Team Reservations.',
    closeBtn: 'Close',
    settingsPasswordTitle: 'System Settings',
    enterPasswordHint: 'Please enter the settings password to continue',
    wrongPassword: 'Incorrect password, please try again.',
    confirmBtn: 'Confirm',
    tabIpad: 'iPad Devices', tabPeriod: 'Period Settings', tabReservation: 'IT Team Reservations', tabClear: 'Clear Records',
    settingsCenterTitle: 'Settings Center',
    batchCode: 'Batch Code', nameLabel: 'Name', qtyShort: 'Quantity',
    ipadNotePlaceholder: 'e.g. PROCREATE (19 units)',
    ipadSettingsTitle: 'iPad Device Settings',
    ipadSettingsDesc: "Configure each iPad batch's name, notes, and quantity; notes appear as a tooltip in the header.",
    addIpadBatch: '+ Add iPad Batch',
    periodSettingsTitle: 'Period Settings',
    periodSettingsDescPre: 'Hold the ', periodSettingsDescPost: ' handle on the left to reorder; check the applicable weekdays and set the category and booking availability.',
    addPeriod: '+ Add Period',
    categoryNormal: 'Normal', categoryBreak: 'Break/Lunch',
    openLabel: 'Open',
    newPeriodDefaultName: 'New Period',
    periodFallbackPrefix: 'Period',
    periodNamePlaceholder: 'Chinese name',
    periodNameEnPlaceholder: 'English name (optional)',
    reservationSettingsTitle: 'IT Team Reservation Settings',
    reservationSettingsDesc: "Set which iPad batches the IT team permanently reserves on a given cycle day and period (e.g. ICT lessons, extracurricular activities, FunLearn Time); teachers won't be able to book them during that time.",
    calendarLabelField: 'Calendar Display Name',
    calendarLabelPlaceholder: 'Optional — defaults to "IT Reserved"',
    startDate: 'Start Date', endDate: 'End Date',
    weekLabel: 'Week', cycleDayLabel: 'Cycle Day',
    otherNameLabel: 'Other Name',
    addReservationBtn: '+ Add Reservation',
    updateReservationBtn: 'Update Reservation',
    editBtn: 'Edit',
    tempRentBtn: 'Temporary Rental (replace reservation)',
    tempRentTag: 'Temp',
    newTempRentTitle: 'New Temporary Rental',
    editTempRentTitle: 'Edit Temporary Rental',
    tempRentHint: 'Admin only: this temporary rental replaces the IT team reservation for this date only. Delete it and the reservation is restored automatically.',
    toastTempRentAdded: 'Temporary rental added',
    noReservations: 'No IT team reservations set.',
    noteInlinePrefix: ' Note: ',
    clearSettingsTitle: 'Clear Booking Records',
    clearSettingsDesc: 'Delete all booking records before a given date (does not affect IT team reservations). This cannot be undone.',
    clearBeforeLabel: 'Clear records before this date',
    clearRecordsBtn: 'Clear Records',
    newLoanTitle: 'New Loan Record',
    loanDesc: 'For IT staff to log short-term individual iPad loans to teachers or students (e.g. 1–2 days) for daily stock-taking; delete the record via the trash icon once returned.',
    ipadIdLabel: 'iPad ID', ipadIdPlaceholder: 'e.g. C1-07',
    borrowerNameLabel: 'Borrower Name', borrowerNamePlaceholder: 'e.g. Teacher / Student name',
    classIfApplicable: 'Class (if applicable)', classOptionalPlaceholder: 'Optional, e.g. 4A',
    borrowDateLabel: 'Borrow Date', dueDateLabel: 'Expected Return Date',
    loanNoteLabel: 'Reason / Notes',
    addLoanBtn: '+ Add Loan Record',
    currentLoansTitle: 'Current Loans',
    currentlyOnLoan: 'Currently on loan: ',
    overdueCountLabel: ' Overdue: ',
    overdueTag: 'Overdue',
    returnDeleteTitle: 'Returned — delete record',
    borrowedPrefix: 'Borrowed: ', duePrefix: ' Due: ', notePrefix: 'Note: ',
    noLoans: 'No iPads currently on loan.',
    confirmActionTitle: 'Confirm Action',
    toastReadonlyNoSave: 'Currently read-only, changes were not saved',
    toastSaveFailed: 'Save failed: ', toastPleaseRetry: 'Please try again',
    toastReadonlyNoAdd: 'Read-only view, cannot add new records',
    confirmDeleteBooking: 'Are you sure you want to delete this booking?',
    toastBookingUpdated: 'Booking updated', toastBookingAdded: 'Booking added',
    toastBookingDeleted: 'Booking deleted',
    errNeedPeriod: 'Please select at least one period.',
    errNeedIpad: 'Please select at least one iPad batch.',
    errNeedTeacher: "Please enter the teacher's name.",
    errNeedClassName: 'Please enter a class or name.',
    errNeedQtyMin: 'Please enter a quantity of at least 1.',
    errQtyExceedPrefix: "Quantity cannot exceed the selected batches' total (", errQtyExceedSuffix: ' units).',
    toastSavedIpadSettings: 'iPad settings saved',
    toastSavedPeriodSettings: 'Period settings saved',
    confirmDeleteReservation: 'Are you sure you want to delete this IT team reservation?',
    errNeedDates: 'Please enter valid start and end dates',
    errNeedPeriodRes: 'Please select at least one period',
    errNeedIpadRes: 'Please select at least one iPad batch',
    toastReservationAdded: 'IT team reservation added',
    toastReservationUpdated: 'Reservation updated',
    errPickDate: 'Please select a date',
    confirmClearRecordsPrefix: 'Are you sure you want to clear all booking records before ', confirmClearRecordsSuffix: '? This cannot be undone.',
    toastRecordsCleared: 'Records cleared',
    errNeedIpadId: 'Please enter the iPad ID',
    errNeedBorrowerName: "Please enter the borrower's name",
    errNeedLoanDates: 'Please enter valid borrow and return dates',
    errIpadAlreadyLoanedPrefix: 'This iPad (', errIpadAlreadyLoanedSuffix: ') is currently on loan — please confirm it has been returned first',
    toastLoanAdded: 'Loan record added',
    adminOnly: 'Platform administrators only. Please contact the IT Team.',
    notInitialized: 'The system has not been set up yet. An administrator needs to open this page once.',
    confirmDeleteLoan: 'Confirm this iPad has been returned and delete this loan record?',
    toastConnLost: 'Connection lost, retrying automatically: ',
    toastDbConnFail: 'Unable to connect to the database, please check the Firebase configuration: ',
    toastClearFailed: 'Clear failed: ',
    toastSaveFailedNetwork: 'Save failed, please check your network connection: '
  }
};
function t(key){ var d = I18N[ui.lang] || I18N.zh; return (key in d) ? d[key] : (I18N.zh[key] || key); }

/* ===================== constants ===================== */
var STORAGE_VIEWPREF = 'ipadbooking_viewpref_v1';
var WD_ZH = ['日','一','二','三','四','五','六'];
var GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 13.5a7.97 7.97 0 0 0 0-3l2-1.4-2-3.4-2.3.9a8 8 0 0 0-2.6-1.5L14 2h-4l-.5 2.6a8 8 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.4a7.97 7.97 0 0 0 0 3l-2 1.4 2 3.4 2.3-.9c.77.66 1.65 1.17 2.6 1.5L10 22h4l.5-2.6a8 8 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.4Z"/></svg>';
var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';
var CAL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
var CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
var TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13"/></svg>';
var DRAG_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';
var LOAN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="3" width="10" height="15" rx="1.6"/><path d="M9 15.5h2"/><path d="M15 9h2.5a1.5 1.5 0 0 1 1.5 1.5V19a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-1"/></svg>';
var GLOBE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9Z"/></svg>';
var EDIT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

/* ===================== state ===================== */
var STATE = defaultState();
var isReadOnly = true; /* becomes false once Firestore connects successfully */
var dragIndex = null;
var fsDocRef = null; /* Firestore document reference; must be declared before init() runs connectFirestore() */

var ui = {
  mode: null,
  lang: 'zh',
  anchor: todayISO(),
  tooltipIpad: null,
  modal: null,
  confirm: null,
  settingsOpen: false,
  settingsAuthed: !!env.isAdmin,   /* 以平台管理員身份取代設定密碼 */
  settingsTab: 'ipad',
  datepickerOpen: false,
  datepickerMonth: null,
  loansOpen: false
};

/* ===================== boot ===================== */
init();

function init(){
  try {
    var vp = localStorage.getItem(STORAGE_VIEWPREF);
    if (vp === 'week' || vp === 'day') ui.mode = vp;
  } catch (e) {}
  if (!ui.mode) ui.mode = (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) ? 'day' : 'week';
  ui.lang = env.lang === 'en' ? 'en' : 'zh';   /* 語言跟隨 IT一站式平台 */
  ui.datepickerMonth = { y: parseISO(ui.anchor).getFullYear(), m: parseISO(ui.anchor).getMonth() };

  ensureSkeleton();
  renderAll();
  bindGlobalEvents();
  connectFirestore();
}

function toggleLang(){
  ui.lang = (ui.lang === 'zh') ? 'en' : 'zh';
  try { localStorage.setItem(STORAGE_LANG, ui.lang); } catch (e) {}
  closeTransientUI();
  renderAll();
  if (ui.settingsOpen) renderSettingsRoot();
  if (ui.loansOpen) renderLoansRoot();
}

function ensureSkeleton(){
  if (!document.getElementById('modal-root')) { var m=document.createElement('div'); m.id='modal-root'; document.body.appendChild(m); }
  if (!document.getElementById('confirm-root')) { var c=document.createElement('div'); c.id='confirm-root'; document.body.appendChild(c); }
  if (!document.getElementById('settings-root')) { var s=document.createElement('div'); s.id='settings-root'; document.body.appendChild(s); }
  if (!document.getElementById('loans-root')) { var ln=document.createElement('div'); ln.id='loans-root'; document.body.appendChild(ln); }
  if (!document.getElementById('datepicker-root')) { var d=document.createElement('div'); d.id='datepicker-root'; document.body.appendChild(d); }
  if (!document.getElementById('toast-root')) { var t=document.createElement('div'); t.id='toast-root'; document.body.appendChild(t); }
}

/* Seed configuration baked into the static page: school name, iPad batches,
   period timetable, class list and the full school-calendar lookup. This is
   only used (a) for the very first paint before Firestore responds, and
   (b) to seed the shared Firestore document the very first time it is ever
   created. After that, ipads/periods/bookings/reservations are always read
   live from Firestore so every device sees the same data. */
function defaultState(){
  return {"version": 1, "meta": {"schoolName": "樂華天主教小學", "settingsPassword": "535800", "schoolNameEn": "Lok Wah Catholic Primary School"}, "ipads": [{"id": "ip1", "code": "C1", "name": "Car1", "qty": 34, "note": ""}, {"id": "ip2", "code": "C2", "name": "Car2", "qty": 30, "note": "PROCREATE (19部)"}, {"id": "ip3", "code": "C3", "name": "Car3", "qty": 27, "note": "RAKUGAKIAR (28部)、GIMKIT"}, {"id": "ip4", "code": "C4", "name": "Car4", "qty": 40, "note": "PAPER BLOOM"}], "periods": [{"id": "pd1", "name": "班主任課", "start": "08:10", "end": "08:25", "days": [1, 2, 3, 4, 5], "category": "normal", "open": false, "nameEn": "Form Period"}, {"id": "pd2", "name": "第1節", "start": "08:25", "end": "09:00", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "Period 1"}, {"id": "pd3", "name": "第2節", "start": "09:00", "end": "09:35", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "Period 2"}, {"id": "pd4", "name": "第3節", "start": "09:35", "end": "10:10", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "Period 3"}, {"id": "pd5", "name": "小息一", "start": "10:10", "end": "10:25", "days": [1, 2, 3, 4, 5], "category": "break", "open": true, "nameEn": "Recess 1"}, {"id": "pd6", "name": "第4節", "start": "10:25", "end": "11:00", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "Period 4"}, {"id": "pd7", "name": "第5節", "start": "11:00", "end": "11:35", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "Period 5"}, {"id": "pd8", "name": "小息二", "start": "11:35", "end": "11:50", "days": [1, 2, 3, 4, 5], "category": "break", "open": true, "nameEn": "Recess 2"}, {"id": "pd9", "name": "第6節", "start": "11:50", "end": "12:25", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "Period 6"}, {"id": "pd10", "name": "第7節", "start": "12:25", "end": "13:00", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "Period 7"}, {"id": "pd11", "name": "午膳", "start": "13:00", "end": "13:30", "days": [1, 2, 3, 4, 5], "category": "break", "open": true, "nameEn": "Lunch"}, {"id": "pd12", "name": "小息三", "start": "13:30", "end": "14:00", "days": [1, 2, 3, 4, 5], "category": "break", "open": true, "nameEn": "Recess 3"}, {"id": "pd13", "name": "第8節", "start": "14:00", "end": "14:35", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "Period 8"}, {"id": "pd14", "name": "樂天學滿FUN", "start": "14:35", "end": "15:20", "days": [1, 2, 3, 4, 5], "category": "normal", "open": true, "nameEn": "FunLearn Time"}], "classes": ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "3A", "3B", "3C", "3D", "4A", "4B", "4C", "4D", "4E", "5A", "5B", "5C", "5D", "5E", "6A", "6B", "6C", "6D"], "calendar": {"2026-09-01": {"l": "S", "n": "DAY S｜特別活動日：開學日；開學週（半天上課）"}, "2026-09-02": {"l": "S", "n": "DAY S｜特別活動日：開學週（半天上課）"}, "2026-09-03": {"l": "S", "n": "DAY S｜特別活動日：開學週（半天上課）"}, "2026-09-04": {"l": "Day 1", "w": 1}, "2026-09-07": {"l": "Day 2", "w": 1}, "2026-09-08": {"l": "Day 3", "w": 1}, "2026-09-09": {"l": "Day 4", "w": 1}, "2026-09-10": {"l": "Day 5", "w": 1}, "2026-09-11": {"l": "Day 6", "w": 1}, "2026-09-15": {"l": "Day 1", "w": 2}, "2026-09-16": {"l": "Day 2", "w": 2}, "2026-09-17": {"l": "Day 3", "w": 2}, "2026-09-18": {"l": "Day 4", "w": 2}, "2026-09-21": {"l": "Day 5", "w": 2}, "2026-09-22": {"l": "Day 6", "w": 2}, "2026-09-23": {"l": "Day 1", "w": 3}, "2026-09-24": {"l": "Day 2", "w": 3}, "2026-09-25": {"l": "Day 3", "w": 3}, "2026-09-28": {"l": "Day 4", "w": 3}, "2026-09-29": {"l": "Day 5", "w": 3}, "2026-09-30": {"l": "Day 6", "w": 3}, "2026-10-02": {"l": "Day 1", "w": 4}, "2026-10-05": {"l": "Day 2", "w": 4}, "2026-10-06": {"l": "Day 3", "w": 4}, "2026-10-07": {"l": "Day 4", "w": 4}, "2026-10-08": {"l": "Day 5", "w": 4}, "2026-10-09": {"l": "Day 6", "w": 4}, "2026-10-12": {"l": "Day 1", "w": 5}, "2026-10-13": {"l": "Day 2", "w": 5}, "2026-10-14": {"l": "Day 3", "w": 5}, "2026-10-15": {"l": "Day 4", "w": 5}, "2026-10-16": {"l": "S", "n": "DAY S｜特別活動日：旅行日"}, "2026-10-20": {"l": "Day 5", "w": 5}, "2026-10-21": {"l": "Day 6", "w": 5}, "2026-10-22": {"l": "Day 1", "w": 6}, "2026-10-23": {"l": "Day 2", "w": 6}, "2026-10-26": {"l": "Day 3", "w": 6}, "2026-10-27": {"l": "Day 4", "w": 6}, "2026-10-28": {"l": "Day 5", "w": 6}, "2026-10-29": {"l": "Day 6", "w": 6}, "2026-10-30": {"l": "Day 1", "w": 7}, "2026-11-02": {"l": "Day 2", "w": 7}, "2026-11-03": {"l": "Day 3", "w": 7}, "2026-11-04": {"l": "Day 4", "w": 7}, "2026-11-05": {"l": "Day 5", "w": 7}, "2026-11-06": {"l": "Day 6", "w": 7}, "2026-11-09": {"l": "Day 1", "w": 8}, "2026-11-10": {"l": "Day 2", "w": 8}, "2026-11-11": {"l": "Day 3", "w": 8}, "2026-11-12": {"l": "E", "n": "DAY E｜考試日：小一模擬評估、小二至小五考試；小六考試"}, "2026-11-13": {"l": "Day 4", "w": 8}, "2026-11-16": {"l": "E", "n": "DAY E｜考試日：小一模擬評估、小二至小五考試；小六考試"}, "2026-11-17": {"l": "Day 5", "w": 8}, "2026-11-18": {"l": "Day 6", "w": 8}, "2026-11-19": {"l": "Day 1", "w": 9}, "2026-11-20": {"l": "S", "n": "DAY S｜特別活動日：STEAM Day；同根同心（P.6，20–21/11）"}, "2026-11-23": {"l": "Day 2", "w": 9}, "2026-11-24": {"l": "Day 3", "w": 9}, "2026-11-25": {"l": "Day 4", "w": 9}, "2026-11-26": {"l": "Day 5", "w": 9}, "2026-11-27": {"l": "TD", "n": "DAY TD｜教師專業發展日：教師專業發展日【學生假期】"}, "2026-11-30": {"l": "Day 6", "w": 9}, "2026-12-01": {"l": "Day 1", "w": 10}, "2026-12-02": {"l": "Day 2", "w": 10}, "2026-12-03": {"l": "Day 3", "w": 10}, "2026-12-04": {"l": "Day 4", "w": 10}, "2026-12-07": {"l": "Day 5", "w": 10}, "2026-12-08": {"l": "Day 6", "w": 10}, "2026-12-09": {"l": "Day 1", "w": 11}, "2026-12-10": {"l": "Day 2", "w": 11}, "2026-12-11": {"l": "Day 3", "w": 11}, "2026-12-12": {"l": "S", "n": "DAY S｜特別活動日：開放日；姊妹學校交流（P.5）"}, "2026-12-14": {"l": "Day 4", "w": 11}, "2026-12-15": {"l": "Day 5", "w": 11}, "2026-12-16": {"l": "Day 6", "w": 11}, "2026-12-17": {"l": "Day 1", "w": 12}, "2026-12-18": {"l": "Day 2", "w": 12}, "2026-12-21": {"l": "Day 3", "w": 12}, "2026-12-22": {"l": "S", "n": "DAY S｜特別活動日：慶祝聖誕"}, "2027-01-04": {"l": "Day 4", "w": 12}, "2027-01-05": {"l": "Day 5", "w": 12}, "2027-01-06": {"l": "Day 6", "w": 12}, "2027-01-07": {"l": "Day 1", "w": 13}, "2027-01-08": {"l": "Day 2", "w": 13}, "2027-01-11": {"l": "TD", "n": "DAY TD｜教師專業發展日：教師專業發展日【學生假期】"}, "2027-01-12": {"l": "S", "n": "DAY S｜特別活動日：特別活動日"}, "2027-01-13": {"l": "Day 3", "w": 13}, "2027-01-14": {"l": "Day 4", "w": 13}, "2027-01-15": {"l": "Day 5", "w": 13}, "2027-01-18": {"l": "Day 6", "w": 13}, "2027-01-19": {"l": "Day 1", "w": 14}, "2027-01-20": {"l": "Day 2", "w": 14}, "2027-01-21": {"l": "Day 3", "w": 14}, "2027-01-22": {"l": "Day 4", "w": 14}, "2027-01-25": {"l": "Day 5", "w": 14}, "2027-01-26": {"l": "Day 6", "w": 14}, "2027-01-27": {"l": "Day 1", "w": 15}, "2027-01-28": {"l": "Day 2", "w": 15}, "2027-01-29": {"l": "S", "n": "DAY S｜特別活動日：中華文化日（半天上課）"}, "2027-02-01": {"l": "Day 3", "w": 15}, "2027-02-02": {"l": "Day 4", "w": 15}, "2027-02-15": {"l": "Day 5", "w": 15}, "2027-02-16": {"l": "Day 6", "w": 15}, "2027-02-17": {"l": "Day 1", "w": 16}, "2027-02-18": {"l": "Day 2", "w": 16}, "2027-02-19": {"l": "S", "n": "DAY S｜特別活動日：校運會"}, "2027-02-22": {"l": "Day 3", "w": 16}, "2027-02-23": {"l": "Day 4", "w": 16}, "2027-02-24": {"l": "Day 5", "w": 16}, "2027-02-25": {"l": "Day 6", "w": 16}, "2027-02-26": {"l": "Day 1", "w": 17}, "2027-03-01": {"l": "Day 2", "w": 17}, "2027-03-02": {"l": "Day 3", "w": 17}, "2027-03-03": {"l": "Day 4", "w": 17}, "2027-03-04": {"l": "E", "n": "DAY E｜考試日：小一至小六考試"}, "2027-03-05": {"l": "E", "n": "DAY E｜考試日：小一至小六考試；全港小學田徑比賽"}, "2027-03-08": {"l": "E", "n": "DAY E｜考試日：小一至小六考試"}, "2027-03-09": {"l": "E", "n": "DAY E｜考試日：小一至小六考試"}, "2027-03-10": {"l": "S", "n": "DAY S｜特別活動日：專題研習（P.1–5）、教育營（P.6）；姊妹學校交流（P.4）"}, "2027-03-11": {"l": "S", "n": "DAY S｜特別活動日：專題研習（P.1–5）、教育營（P.6）"}, "2027-03-12": {"l": "S", "n": "DAY S｜特別活動日：專題研習（P.1–5）、教育營（P.6）；教區聯校運動會"}, "2027-03-15": {"l": "Day 5", "w": 17}, "2027-03-16": {"l": "Day 6", "w": 17}, "2027-03-17": {"l": "Day 1", "w": 18}, "2027-03-18": {"l": "Day 2", "w": 18}, "2027-03-19": {"l": "Day 3", "w": 18}, "2027-03-22": {"l": "Day 4", "w": 18}, "2027-03-23": {"l": "Day 5", "w": 18}, "2027-03-24": {"l": "Day 6", "w": 18}, "2027-03-25": {"l": "Day 1", "w": 19}, "2027-04-06": {"l": "TD", "n": "DAY TD｜教師專業發展日：教師專業發展日【學生假期】"}, "2027-04-07": {"l": "Day 2", "w": 19}, "2027-04-08": {"l": "Day 3", "w": 19}, "2027-04-09": {"l": "Day 4", "w": 19}, "2027-04-12": {"l": "Day 5", "w": 19}, "2027-04-13": {"l": "Day 6", "w": 19}, "2027-04-14": {"l": "Day 1", "w": 20}, "2027-04-15": {"l": "Day 2", "w": 20}, "2027-04-16": {"l": "Day 3", "w": 20}, "2027-04-19": {"l": "Day 4", "w": 20}, "2027-04-20": {"l": "Day 5", "w": 20}, "2027-04-21": {"l": "Day 6", "w": 20}, "2027-04-22": {"l": "Day 1", "w": 21}, "2027-04-23": {"l": "S", "n": "DAY S｜特別活動日：世界閱讀日"}, "2027-04-26": {"l": "Day 2", "w": 21}, "2027-04-27": {"l": "Day 3", "w": 21}, "2027-04-28": {"l": "Day 4", "w": 21}, "2027-04-29": {"l": "Day 5", "w": 21}, "2027-04-30": {"l": "Day 6", "w": 21}, "2027-05-03": {"l": "Day 1", "w": 22}, "2027-05-04": {"l": "Day 2", "w": 22}, "2027-05-05": {"l": "Day 3", "w": 22}, "2027-05-06": {"l": "Day 4", "w": 22}, "2027-05-07": {"l": "S", "n": "DAY S｜特別活動日：彩排日（半天上課）"}, "2027-05-08": {"l": "S", "n": "DAY S｜特別活動日：學藝展才華"}, "2027-05-11": {"l": "Day 5", "w": 22}, "2027-05-12": {"l": "Day 6", "w": 22}, "2027-05-14": {"l": "Day 1", "w": 23}, "2027-05-17": {"l": "Day 2", "w": 23}, "2027-05-18": {"l": "Day 3", "w": 23}, "2027-05-19": {"l": "Day 4", "w": 23}, "2027-05-20": {"l": "Day 5", "w": 23}, "2027-05-21": {"l": "Day 6", "w": 23}, "2027-05-24": {"l": "Day 1", "w": 24}, "2027-05-25": {"l": "Day 2", "w": 24}, "2027-05-26": {"l": "Day 3", "w": 24}, "2027-05-27": {"l": "Day 4", "w": 24}, "2027-05-28": {"l": "Day 5", "w": 24}, "2027-05-31": {"l": "Day 6", "w": 24}, "2027-06-01": {"l": "Day 1", "w": 25}, "2027-06-02": {"l": "Day 2", "w": 25}, "2027-06-03": {"l": "E", "n": "DAY E｜考試日：小一至小六考試"}, "2027-06-04": {"l": "E", "n": "DAY E｜考試日：小一至小六考試"}, "2027-06-07": {"l": "E", "n": "DAY E｜考試日：小一至小六考試"}, "2027-06-08": {"l": "E", "n": "DAY E｜考試日：小一至小六考試"}, "2027-06-10": {"l": "Day 3", "w": 25}, "2027-06-11": {"l": "Day 4", "w": 25}, "2027-06-14": {"l": "Day 5", "w": 25}, "2027-06-15": {"l": "Day 6", "w": 25}, "2027-06-16": {"l": "Day 1", "w": 26}, "2027-06-17": {"l": "Day 2", "w": 26}, "2027-06-18": {"l": "Day 3", "w": 26}, "2027-06-21": {"l": "Day 4", "w": 26}, "2027-06-22": {"l": "Day 5", "w": 26}, "2027-06-23": {"l": "Day 6", "w": 26}, "2027-06-24": {"l": "Day 1", "w": 27}, "2027-06-25": {"l": "S", "n": "DAY S｜特別活動日：師生朝聖日"}, "2027-06-28": {"l": "Day 2", "w": 27}, "2027-06-29": {"l": "Day 3", "w": 27}, "2027-06-30": {"l": "Day 4", "w": 27}, "2027-07-02": {"l": "S", "n": "DAY S｜特別活動日：小六畢業典禮"}, "2027-07-05": {"l": "Day 5", "w": 27}, "2027-07-06": {"l": "Day 6", "w": 27}, "2027-07-07": {"l": "Day 1", "w": 28}, "2027-07-08": {"l": "S", "n": "DAY S｜特別活動日：結業禮"}, "2027-07-09": {"l": "S", "n": "DAY S｜特別活動日：校本活動日"}}, "bookings": [], "reservations": [], "loans": []};
}

/* ===================== realtime sync (Firebase Firestore) ===================== */

var lastSnapshotSig = null;
/* 資料經由 IT一站式平台（已登入的 Firebase）讀寫：env.store 由 systems/ipad/ipad.js 提供 */
function connectFirestore(){
  var store = env.store;
  if (!store) {
    isReadOnly = true;
    renderAll();
    showToast(t('toastDbConnFail'));
    return;
  }
  fsDocRef = store;
  store.get().then(function(data){
    if (!data) {
      if (!env.isAdmin) throw new Error(t('notInitialized'));
      return store.create({ ipads: STATE.ipads, periods: STATE.periods, bookings: {}, reservations: {}, loans: {} });
    }
  }).then(function(){
    isReadOnly = false;
    store.subscribe(function(data){
      if (!data) return;
      if (data.ipads) STATE.ipads = data.ipads;
      if (data.periods) STATE.periods = data.periods;
      var sig = JSON.stringify([data.ipads, data.periods, data.bookings, data.reservations, data.loans]);
      if (sig === lastSnapshotSig) return; /* nothing actually changed — skip re-render */
      lastSnapshotSig = sig;
      STATE.bookings = mapToArray(data.bookings);
      STATE.reservations = mapToArray(data.reservations);
      STATE.loans = mapToArray(data.loans);
      STATE.updatedAt = Date.now();
      renderAll({ keepModal: true });
    }, function(err){
      showToast(t('toastConnLost') + (err && err.message ? err.message : ''));
    });
  }).catch(function(err){
    isReadOnly = true;
    renderAll();
    showToast(t('toastDbConnFail') + (err && err.message ? err.message : ''));
  });
}

function mapToArray(m){
  return m ? Object.keys(m).map(function(k){ return m[k]; }) : [];
}

function applyAction(state, action){
  switch (action.kind) {
    case 'upsertGroup':
      state.bookings = state.bookings.filter(function(g){ return g.id !== action.group.id; });
      state.bookings.push(action.group);
      break;
    case 'deleteGroup':
      state.bookings = state.bookings.filter(function(g){ return g.id !== action.id; });
      break;
    case 'saveIpads':
      state.ipads = action.ipads;
      break;
    case 'savePeriods':
      state.periods = action.periods;
      break;
    case 'addReservation':
      state.reservations.push(action.reservation);
      break;
    case 'updateReservation':
      state.reservations = state.reservations.map(function(r){ return r.id === action.reservation.id ? action.reservation : r; });
      break;
    case 'deleteReservation':
      state.reservations = state.reservations.filter(function(r){ return r.id !== action.id; });
      break;
    case 'clearBefore':
      state.bookings = state.bookings.filter(function(g){ return g.date >= action.date; });
      break;
    case 'addLoan':
      if (!state.loans) state.loans = [];
      state.loans.push(action.loan);
      break;
    case 'deleteLoan':
      state.loans = (state.loans||[]).filter(function(l){ return l.id !== action.id; });
      break;
  }
  state.updatedAt = Date.now();
}

function doAction(action){
  applyAction(STATE, action);
  renderAll();
  syncAction(action);
}

function syncAction(action){
  if (!fsDocRef) { return; } /* offline fallback: change already applied locally above */
  if (action.kind === 'clearBefore') {
    fsDocRef.get().then(function(data){
      data = data || {};
      var bookings = data.bookings || {};
      var upd = {};
      Object.keys(bookings).forEach(function(id){
        if (bookings[id].date < action.date) upd['bookings.' + id] = fsDocRef.del();
      });
      if (Object.keys(upd).length) return fsDocRef.update(upd);
    }).catch(function(err){ showToast(t('toastClearFailed') + (err && err.message ? err.message : '')); });
    return;
  }
  var upd = {};
  switch (action.kind) {
    case 'upsertGroup': upd['bookings.' + action.group.id] = action.group; break;
    case 'deleteGroup': upd['bookings.' + action.id] = fsDocRef.del(); break;
    case 'saveIpads': upd.ipads = action.ipads; break;
    case 'savePeriods': upd.periods = action.periods; break;
    case 'addReservation': upd['reservations.' + action.reservation.id] = action.reservation; break;
    case 'updateReservation': upd['reservations.' + action.reservation.id] = action.reservation; break;
    case 'deleteReservation': upd['reservations.' + action.id] = fsDocRef.del(); break;
    case 'addLoan': upd['loans.' + action.loan.id] = action.loan; break;
    case 'deleteLoan': upd['loans.' + action.id] = fsDocRef.del(); break;
    default: return;
  }
  fsDocRef.update(upd).catch(function(err){
    showToast(t('toastSaveFailedNetwork') + (err && err.message ? err.message : ''));
  });
}

/* ===================== date helpers ===================== */
function pad2(n){ return n < 10 ? '0' + n : '' + n; }
function isoOf(y,m,d){ return y + '-' + pad2(m) + '-' + pad2(d); }
function todayISO(){ var d = new Date(); return isoOf(d.getFullYear(), d.getMonth()+1, d.getDate()); }
function parseISO(iso){ var p = iso.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function addDays(iso, n){ var d = parseISO(iso); d.setDate(d.getDate()+n); return isoOf(d.getFullYear(), d.getMonth()+1, d.getDate()); }
function weekdayOf(iso){ return parseISO(iso).getDay(); }
function mondayOf(iso){ var wd = weekdayOf(iso); var diff = (wd === 0) ? -6 : (1 - wd); return addDays(iso, diff); }
function fmtDayHead(iso){ var d = parseISO(iso); return (d.getMonth()+1) + '/' + d.getDate(); }
function weekdayFull(wd){ return ui.lang==='en' ? WD_FULL_EN[wd] : ('星期' + WD_ZH[wd]); }
function fmtFullDate(iso){
  var d = parseISO(iso);
  if (ui.lang === 'en') {
    return MONTH_EN[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' (' + WD_FULL_EN[d.getDay()] + ')';
  }
  return d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日（星期' + WD_ZH[d.getDay()] + '）';
}

function visibleDates(){
  if (ui.mode === 'day') return [ui.anchor];
  var mon = mondayOf(ui.anchor);
  var arr = [mon];
  for (var i=1;i<5;i++) arr.push(addDays(mon,i));
  var sat = addDays(mon,5);
  if (STATE.calendar[sat]) arr.push(sat);
  return arr;
}

function fmtRangeTitle(){
  var dates = visibleDates();
  var first = parseISO(dates[0]), last = parseISO(dates[dates.length-1]);
  if (ui.lang === 'en') {
    if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
      return MONTH_EN[first.getMonth()] + ' ' + first.getFullYear();
    }
    return MONTH_EN[first.getMonth()] + '–' + MONTH_EN[last.getMonth()] + ' ' + first.getFullYear();
  }
  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
    return first.getFullYear() + '年' + (first.getMonth()+1) + '月';
  }
  return first.getFullYear() + '年' + (first.getMonth()+1) + '月–' + (last.getMonth()+1) + '月';
}

/* ===================== misc utils ===================== */
function uid(prefix){ return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function sumIpadQty(ids){
  var sum = 0;
  (ids||[]).forEach(function(id){
    var ip = STATE.ipads.filter(function(x){ return x.id === id; })[0];
    if (ip) sum += (+ip.qty || 0);
  });
  return sum;
}
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function debounce(fn, ms){ var t; return function(){ var a=arguments,ctx=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(ctx,a); }, ms); }; }

function hslToHex(h,s,l){
  s/=100; l/=100;
  var c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2, r=0,g=0,b=0;
  if(h<60){r=c;g=x;b=0;} else if(h<120){r=x;g=c;b=0;} else if(h<180){r=0;g=c;b=x;}
  else if(h<240){r=0;g=x;b=c;} else if(h<300){r=x;g=0;b=c;} else {r=c;g=0;b=x;}
  var R=Math.round((r+m)*255), G=Math.round((g+m)*255), B=Math.round((b+m)*255);
  return '#' + [R,G,B].map(function(v){ var h2=v.toString(16); return h2.length<2?'0'+h2:h2; }).join('');
}
function randomColor(){ return hslToHex(Math.floor(Math.random()*360), 62, 68); }
function contrastTextColor(hex){
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  var lum=(0.299*r+0.587*g+0.114*b)/255;
  return lum > 0.62 ? '#1c2024' : '#ffffff';
}

/* ===================== data lookups ===================== */
function findGroup(dISO, periodId, ipadId){
  for (var i=0;i<STATE.bookings.length;i++){
    var g = STATE.bookings[i];
    if (g.date===dISO && g.periodIds.indexOf(periodId)>=0 && g.ipadIds.indexOf(ipadId)>=0) return g;
  }
  return null;
}
function findReservation(dISO, periodId, ipadId){
  var info = STATE.calendar[dISO];
  if (!info) return null;
  for (var i=0;i<STATE.reservations.length;i++){
    var r = STATE.reservations[i];
    if (dISO < r.startDate || dISO > r.endDate) continue;
    if (r.day !== info.l) continue;
    if (r.periodIds.indexOf(periodId) < 0) continue;
    if (r.ipadIds.indexOf(ipadId) < 0) continue;
    if (r.weekParity === 'all') return r;
    if (info.w == null) continue;
    var odd = (info.w % 2 === 1);
    if (r.weekParity === 'odd' ? odd : !odd) return r;
  }
  return null;
}
function dayTagHtml(info){
  if (!info) return '';
  if (info.l.indexOf('Day') === 0) return '<span class="daytag day" title="' + escapeHtml(info.n||'') + '">' + escapeHtml(info.l) + '</span>';
  var cls = info.l.toLowerCase();
  return '<span class="daytag ' + cls + '" title="' + escapeHtml(info.n||'') + '">' + escapeHtml(info.l) + '</span>';
}
function schoolNameDisplay(){
  return (ui.lang === 'en' && STATE.meta.schoolNameEn) ? STATE.meta.schoolNameEn : STATE.meta.schoolName;
}
function periodName(p){
  return (ui.lang === 'en' && p.nameEn) ? p.nameEn : p.name;
}

/* ===================== render: shell ===================== */
function renderAll(opts){
  renderShell();
  /* opts.keepModal: used by background realtime-sync re-renders so an open
     modal (e.g. the password box or a half-filled booking form) is not torn
     down and rebuilt — that wiped typed input and replayed the open animation. */
  var mr = document.getElementById('modal-root');
  if (!(opts && opts.keepModal && ui.modal && mr && mr.firstChild)) renderModalRoot();
  renderConfirmOverlay();
  renderDatePickerRoot();
  try { document.title = schoolNameDisplay() + ' – ' + t('appTitleSuffix'); } catch(e){}
}

function renderShell(){
  var html = renderAppbar() +
    (isReadOnly ? '<div class="readonly-banner">' + escapeHtml(t('readonlyBanner')) + '</div>' : '') +
    renderToolbar() +
    '<div class="grid-wrap">' + renderGrid() + '</div>';
  document.getElementById('app').innerHTML = html;
}

function renderAppbar(){
  var otherLangLabel = ui.lang === 'zh' ? 'EN' : '中文';
  return '<div class="appbar">' +
    '<div class="appbar-side left"></div>' +
    '<div class="appbar-title">' + escapeHtml(schoolNameDisplay()) + ' – ' + escapeHtml(t('appTitleSuffix')) + '</div>' +
    '<div class="appbar-side right">' + (env.isAdmin ? '<button class="icon-btn" data-act="open-loans" aria-label="' + escapeHtml(t('loansAriaLabel')) + '">' + LOAN_SVG + '</button><button class="icon-btn" data-act="open-settings" aria-label="' + escapeHtml(t('settingsAriaLabel')) + '">' + GEAR_SVG + '</button>' : '') + '</div>' +
    '</div>';
}
function tooltipHtml(ip){
  var qtyTxt = ui.lang==='en' ? ('(' + ip.qty + t('unitsSuffix') + ')') : ('（' + ip.qty + t('unitsSuffix') + '）');
  var txt = ip.name + qtyTxt + (ip.note ? '：' + ip.note : '：' + t('noNotes'));
  return '<span class="tooltip-pop">' + escapeHtml(txt) + '</span>';
}

function renderToolbar(){
  var isDay = ui.mode === 'day';
  return '<div class="toolbar">' +
    '<div class="toolbar-nav">' +
      '<button class="btn-round" data-act="nav-prev" aria-label="' + escapeHtml(isDay?t('prevDay'):t('prevWeek')) + '">' + CHEV_L + '</button>' +
      '<button class="btn small" data-act="nav-today">' + escapeHtml(t('today')) + '</button>' +
      '<button class="btn-round" data-act="nav-datepicker" aria-label="' + escapeHtml(t('selectDate')) + '">' + CAL_SVG + '</button>' +
      '<button class="btn-round" data-act="nav-next" aria-label="' + escapeHtml(isDay?t('nextDay'):t('nextWeek')) + '">' + CHEV_R + '</button>' +
    '</div>' +
    '<div class="toolbar-title">' + fmtRangeTitle() + '</div>' +
    '<div class="seg">' +
      '<button class="' + (ui.mode==='week'?'active':'') + '" data-act="view-week">' + escapeHtml(t('viewWeek')) + '</button>' +
      '<button class="' + (ui.mode==='day'?'active':'') + '" data-act="view-day">' + escapeHtml(t('viewDay')) + '</button>' +
    '</div>' +
    '</div>';
}

/* ===================== render: grid ===================== */
function renderGrid(){
  var dates = visibleDates();
  var periods = STATE.periods;
  var ipads = STATE.ipads;
  var nIpads = ipads.length || 1;
  var totalCols = dates.length * nIpads;
  var gridMinWidth = 92 + totalCols * 46;
  var html = '<div class="grid' + (ui.mode==='day'?' day-mode':'') + '" style="grid-template-columns:92px repeat(' + totalCols + ',minmax(46px,1fr));min-width:' + gridMinWidth + 'px;">';
  html += '<div class="cell head-corner" style="grid-row:span 2;">' + escapeHtml(t('periodCol')) + '</div>';
  dates.forEach(function(dISO, idx){
    var info = STATE.calendar[dISO];
    var wd = weekdayOf(dISO);
    var isToday = dISO === todayISO();
    var lastDate = idx === dates.length - 1;
    var cls = 'head-day' + (isToday?' is-today':'') + (!info?' nonschool':'') + (!lastDate?' daybreak':'');
    html += '<div class="cell ' + cls + '" style="grid-column:span ' + nIpads + ';">' +
      '<span class="wd">' + escapeHtml(weekdayFull(wd)) + '</span>' +
      '<span class="dnum mono">' + fmtDayHead(dISO) + '</span>' +
      dayTagHtml(info) +
      '</div>';
  });
  dates.forEach(function(dISO, idx){
    var lastDate = idx === dates.length - 1;
    ipads.forEach(function(ip, j){
      var brk = (!lastDate && j === nIpads-1) ? ' daybreak' : '';
      var key = dISO + '::' + ip.id;
      var open = ui.tooltipIpad === key;
      html += '<div class="cell head-ipad' + brk + (open?' is-open':'') + '" data-act="toggle-chip" data-ipad="' + ip.id + '" data-date="' + dISO + '">' +
        escapeHtml(ip.code) + '<span class="head-ipad-qty"> (' + ip.qty + ')</span>' +
        (open ? tooltipHtml(ip) : '') + '</div>';
    });
  });
  periods.forEach(function(p){
    html += '<div class="cell period-label' + (p.category==='break'?' is-break':'') + '">' +
      '<span class="pname">' + escapeHtml(periodName(p)) + '</span>' +
      '<span class="ptime mono">' + p.start + '-' + p.end + '</span></div>';
    dates.forEach(function(dISO, idx){
      html += renderDayPeriodCells(dISO, p, idx === dates.length - 1, nIpads);
    });
  });
  html += '</div>';
  return html;
}

function renderDayPeriodCells(dISO, period, lastDate, nIpads){
  var wd = weekdayOf(dISO);
  var applicable = period.days.indexOf(wd) >= 0 || wd === 6;
  if (!applicable) {
    var ecls = 'cell daycell' + (!lastDate?' daybreak':'');
    return '<div class="' + ecls + '" style="grid-column:span ' + nIpads + ';"></div>';
  }
  var isBreak = period.category === 'break';
  var html = '';
  STATE.ipads.forEach(function(ip, j){
    var cls = 'cell daycell' + (isBreak ? ' daycell-break' : '') + ((!lastDate && j === nIpads-1) ? ' daybreak' : '');
    html += '<div class="' + cls + '">' + renderIpadSlot(dISO, period, ip) + '</div>';
  });
  return html;
}

function renderIpadSlot(dISO, period, ip){
  var g = findGroup(dISO, period.id, ip.id);
  if (g) {
    var label = (g.className === '其他') ? (g.otherClass || t('otherOption')) : g.className;
    var labelWithQty = label + '(' + (+g.qty || 0) + ')';
    var textColor = contrastTextColor(g.color);
    return '<div class="slot filled' + (g.temp?' temp':'') + '" style="background:' + g.color + ';color:' + textColor + ';" data-act="open-group" data-group="' + g.id + '">' +
      (g.temp ? '<span class="slot-temp-tag">' + escapeHtml(t('tempRentTag')) + '</span>' : '') +
      '<span class="slot-title">' + escapeHtml(labelWithQty) + '</span>' +
      '<span class="slot-title2">' + escapeHtml(g.teacher) + '</span>' +
      (g.note ? '<span class="slot-note">' + escapeHtml(g.note) + '</span>' : '') +
      '</div>';
  }
  var r = findReservation(dISO, period.id, ip.id);
  if (r) {
    var rlabel = (r.className === '其他') ? (r.otherClass || t('otherOption')) : r.className;
    var rCalLabel = r.calendarLabel || t('icyReservedTag');
    return '<div class="slot reserved" data-act="open-reservation" data-res="' + r.id + '" data-date="' + dISO + '" data-period="' + period.id + '" data-ipad="' + ip.id + '">' +
      '<span class="slot-title slot-lock">' + escapeHtml(rCalLabel) + '</span><span class="slot-note">' + escapeHtml(rlabel) + '</span>' +
      '</div>';
  }
  if (!period.open) {
    return '<div class="slot closed" title="' + escapeHtml(t('slotClosedTitle')) + '"></div>';
  }
  return '<div class="slot empty" data-act="open-slot" data-date="' + dISO + '" data-period="' + period.id + '" data-ipad="' + ip.id + '"></div>';
}

/* ===================== navigation ===================== */
function closeTransientUI(){ ui.datepickerOpen = false; ui.tooltipIpad = null; }
function navPrev(){ ui.anchor = addDays(ui.anchor, ui.mode==='day'?-1:-7); closeTransientUI(); renderAll(); }
function navNext(){ ui.anchor = addDays(ui.anchor, ui.mode==='day'?1:7); closeTransientUI(); renderAll(); }
function navToday(){ ui.anchor = todayISO(); closeTransientUI(); renderAll(); }
function setMode(m){ ui.mode = m; try{ localStorage.setItem(STORAGE_VIEWPREF, m); }catch(e){} closeTransientUI(); renderAll(); }

/* ===================== modal: generic ===================== */
function closeModal(){ ui.modal = null; renderModalRoot(); }
function renderModalRoot(){
  var root = document.getElementById('modal-root');
  if (!ui.modal) { root.innerHTML = ''; return; }
  if (ui.modal.type === 'booking') root.innerHTML = bookingModalHtml(ui.modal);
  else if (ui.modal.type === 'reservationInfo') root.innerHTML = reservationInfoHtml(ui.modal);
  else if (ui.modal.type === 'password') root.innerHTML = passwordModalHtml(ui.modal);
  else root.innerHTML = '';
}

function askConfirm(message, onYes, danger){
  ui.confirm = { message: message, onYes: onYes, danger: !!danger };
  renderConfirmOverlay();
}
function renderConfirmOverlay(){
  var root = document.getElementById('confirm-root');
  if (!ui.confirm) { root.innerHTML = ''; return; }
  root.innerHTML = '<div class="modal-backdrop" style="z-index:150;" data-backdrop="confirm-no">' +
    '<div class="modal fixed-light" style="max-width:360px;" data-stop="1">' +
      '<div class="modal-body" style="padding-top:22px;"><p style="margin:0 0 8px;font-weight:800;font-family:var(--font-display);font-size:16px;">' + escapeHtml(t('confirmActionTitle')) + '</p>' +
      '<p style="color:var(--grid-text-muted);font-size:13px;margin:0;">' + escapeHtml(ui.confirm.message) + '</p></div>' +
      '<div class="modal-foot"><button class="btn ghost" data-act="confirm-no">' + escapeHtml(t('cancelBtn')) + '</button><button class="btn ' + (ui.confirm.danger?'danger':'primary') + '" data-act="confirm-yes">' + escapeHtml(t('confirmBtn')) + '</button></div>' +
    '</div></div>';
}

/* ===================== modal: booking form ===================== */
function openBookingModal(opts){
  var editing = !!opts.groupId;
  var group = editing ? STATE.bookings.filter(function(g){ return g.id===opts.groupId; })[0] : null;
  ui.modal = {
    type:'booking', editing: editing, groupId: editing ? group.id : null,
    temp: editing ? !!group.temp : !!opts.temp,
    date: editing ? group.date : opts.date,
    selPeriods: editing ? group.periodIds.slice() : (opts.periodId ? [opts.periodId] : []),
    selIpads: editing ? group.ipadIds.slice() : (opts.ipadId ? [opts.ipadId] : []),
    className: editing ? group.className : (STATE.classes[0]||''),
    otherClass: editing ? (group.otherClass||'') : '',
    teacher: editing ? group.teacher : '',
    note: editing ? (group.note||'') : '',
    qty: editing ? group.qty : sumIpadQty(opts.ipadId ? [opts.ipadId] : []),
    color: editing ? group.color : randomColor(),
    error: null
  };
  renderModalRoot();
}

function syncBookingFieldsFromDOM(){
  var m = ui.modal; if (!m || m.type!=='booking') return;
  var elClass = document.getElementById('f-class'), elOther = document.getElementById('f-other'),
      elTeacher = document.getElementById('f-teacher'), elNote = document.getElementById('f-note'), elQty = document.getElementById('f-qty');
  if (elClass) m.className = elClass.value;
  if (elOther) m.otherClass = elOther.value;
  if (elTeacher) m.teacher = elTeacher.value;
  if (elNote) m.note = elNote.value;
  if (elQty) m.qty = +elQty.value || 0;
  var periodBoxes = document.querySelectorAll('[data-role="period-check"]');
  m.selPeriods = Array.prototype.filter.call(periodBoxes, function(b){ return b.checked; }).map(function(b){ return b.value; });
  var ipadBoxes = document.querySelectorAll('[data-role="ipad-check"]');
  m.selIpads = Array.prototype.filter.call(ipadBoxes, function(b){ return b.checked && !b.disabled; }).map(function(b){ return b.value; });
}

function ipadCheckboxesHtml(m){
  return STATE.ipads.map(function(ip){
    var checked = m.selIpads.indexOf(ip.id) >= 0;
    var blocked = !m.temp && m.selPeriods.some(function(pid){ var r = findReservation(m.date, pid, ip.id); return !!r; });
    var occupied = m.selPeriods.some(function(pid){ var g = findGroup(m.date, pid, ip.id); return g && g.id !== m.groupId; });
    var disabled = (blocked || occupied) && !checked;
    return '<label class="check-pill' + (checked?' checked':'') + (disabled?' disabled':'') + '">' +
      '<input type="checkbox" data-role="ipad-check" value="' + ip.id + '" ' + (checked?'checked':'') + (disabled?' disabled':'') + '/>' +
      escapeHtml(ip.code) + '(' + ip.qty + ')' + (disabled ? escapeHtml(t('occupiedSuffix')) : '') + '</label>';
  }).join('');
}
function bookingModalHtml(m){
  var info = STATE.calendar[m.date];
  var wd = weekdayOf(m.date);
  var dateLabel = fmtFullDate(m.date) + (info ? '　' + info.l : '　' + t('nonSchoolDay'));
  var availablePeriods = STATE.periods.filter(function(p){ return p.days.indexOf(wd)>=0 || wd===6; });
  var periodsHtml = availablePeriods.map(function(p){
    var checked = m.selPeriods.indexOf(p.id) >= 0;
    var disabled = !p.open && !checked;
    return '<label class="check-pill' + (checked?' checked':'') + (disabled?' disabled':'') + '">' +
      '<input type="checkbox" data-role="period-check" value="' + p.id + '" ' + (checked?'checked':'') + (disabled?' disabled':'') + '/>' +
      escapeHtml(periodName(p)) + '</label>';
  }).join('');
  var ipadsHtml = ipadCheckboxesHtml(m);
  var classOptions = STATE.classes.map(function(c){
    return '<option value="' + escapeHtml(c) + '"' + (m.className===c?' selected':'') + '>' + escapeHtml(c) + '</option>';
  }).join('') + '<option value="其他"' + (m.className==='其他'?' selected':'') + '>' + escapeHtml(t('otherOption')) + '</option>';
  var qtyCap = sumIpadQty(m.selIpads);

  return '<div class="modal-backdrop" data-backdrop="close-modal">' +
    '<div class="modal fixed-light" data-stop="1">' +
      '<div class="modal-head"><div><h2>' + escapeHtml(m.temp ? (m.editing?t('editTempRentTitle'):t('newTempRentTitle')) : (m.editing?t('editBooking'):t('newBooking'))) + '</h2><div class="sub">' + dateLabel + '</div></div>' +
        '<button class="icon-btn modal-close" data-act="close-modal">' + CLOSE_SVG + '</button></div>' +
      '<div class="modal-body">' +
        '<div class="two-col">' +
          '<div class="field"><label>' + escapeHtml(t('classLabel')) + '</label><select class="input" id="f-class" data-act-change="class-change">' + classOptions + '</select></div>' +
          '<div class="field" id="f-otherwrap" style="' + (m.className==='其他'?'':'display:none;') + '"><label>' + escapeHtml(t('otherClassLabel')) + '</label>' +
            '<input class="input" id="f-other" value="' + escapeHtml(m.otherClass) + '" placeholder="' + escapeHtml(t('enterClassPlaceholder')) + '"/></div>' +
        '</div>' +
        '<div class="field"><label>' + escapeHtml(t('teacherLabel')) + '</label><input class="input" id="f-teacher" value="' + escapeHtml(m.teacher) + '" placeholder="' + escapeHtml(t('teacherPlaceholder')) + '"/></div>' +
        '<div class="field"><label>' + escapeHtml(t('periodsLabel')) + '</label><div class="check-grid" data-act-change="period-change">' + periodsHtml + '</div></div>' +
        '<div class="field"><label>' + escapeHtml(t('selectIpadBatchLabel')) + '</label><div class="check-grid" id="ipad-checkboxes">' + ipadsHtml + '</div></div>' +
        '<div class="two-col">' +
          '<div class="field"><label>' + escapeHtml(t('qtyLabel')) + '</label><input class="input" type="number" min="0" max="' + qtyCap + '" data-max="' + qtyCap + '" id="f-qty" value="' + m.qty + '"/>' +
            '<div class="hint">' + escapeHtml(t('qtyHintPrefix')) + qtyCap + escapeHtml(t('qtyHintSuffix')) + '</div></div>' +
          '<div class="field"><label>' + escapeHtml(t('colorLabel')) + '</label><div style="display:flex;align-items:center;gap:8px;padding-top:6px;">' +
            '<span class="color-dot" style="background:' + m.color + ';width:22px;height:22px;"></span>' +
            '<button type="button" class="btn small" data-act="reroll-color">' + escapeHtml(t('changeColor')) + '</button></div></div>' +
        '</div>' +
        '<div class="field"><label>' + escapeHtml(t('notesLabel')) + '</label><textarea class="input" id="f-note" placeholder="' + escapeHtml(t('optionalPlaceholder')) + '">' + escapeHtml(m.note) + '</textarea></div>' +
        (m.temp ? '<div class="hint">' + escapeHtml(t('tempRentHint')) + '</div>' : '') +
        (m.error ? '<div class="msg-error">' + escapeHtml(m.error) + '</div>' : '') +
      '</div>' +
      '<div class="modal-foot">' +
        (m.editing ? '<button class="btn danger" data-act="delete-booking">' + escapeHtml(t('deleteBtn')) + '</button>' : '') +
        '<span class="spacer"></span>' +
        '<button class="btn ghost" data-act="close-modal">' + escapeHtml(t('cancelBtn')) + '</button>' +
        '<button class="btn primary" data-act="save-booking">' + escapeHtml(m.editing?t('saveChanges'):t('confirmBooking')) + '</button>' +
      '</div>' +
    '</div></div>';
}

function submitBooking(){
  syncBookingFieldsFromDOM();
  var m = ui.modal;
  m.error = null;
  var qtyCap = sumIpadQty(m.selIpads);
  var qtyVal = Math.floor(+m.qty || 0);
  if (!m.selPeriods.length) m.error = t('errNeedPeriod');
  else if (!m.selIpads.length) m.error = t('errNeedIpad');
  else if (!m.teacher.trim()) m.error = t('errNeedTeacher');
  else if (m.className==='其他' && !m.otherClass.trim()) m.error = t('errNeedClassName');
  else if (qtyVal < 1) m.error = t('errNeedQtyMin');
  else if (qtyVal > qtyCap) m.error = t('errQtyExceedPrefix') + qtyCap + t('errQtyExceedSuffix');
  if (m.error) { renderModalRoot(); return; }
  var group = {
    id: m.editing ? m.groupId : uid('bk_'),
    date: m.date, periodIds: m.selPeriods.slice(), ipadIds: m.selIpads.slice(),
    className: m.className, otherClass: m.otherClass.trim(), teacher: m.teacher.trim(),
    note: m.note.trim(), qty: qtyVal, color: m.color,
    createdAt: m.editing ? undefined : Date.now(), updatedAt: Date.now()
  };
  if (m.temp) group.temp = true;
  if (m.editing) {
    var old = STATE.bookings.filter(function(g){ return g.id===m.groupId; })[0];
    group.createdAt = old ? old.createdAt : Date.now();
  }
  closeModal();
  doAction({ kind:'upsertGroup', group: group });
  showToast(m.editing ? t('toastBookingUpdated') : (m.temp ? t('toastTempRentAdded') : t('toastBookingAdded')));
}

function deleteBookingConfirmed(){
  var id = ui.modal.groupId;
  closeModal();
  doAction({ kind:'deleteGroup', id: id });
  showToast(t('toastBookingDeleted'));
}

/* ===================== modal: reservation info ===================== */
function reservationInfoHtml(m){
  var r = m.reservation;
  var periods = r.periodIds.map(function(pid){ var p = STATE.periods.filter(function(x){return x.id===pid;})[0]; return p?periodName(p):pid; }).join('、');
  var ipads = r.ipadIds.map(function(iid){ var ip = STATE.ipads.filter(function(x){return x.id===iid;})[0]; return ip?ip.code:iid; }).join('、');
  var cls = r.className==='其他' ? (r.otherClass||t('otherOption')) : r.className;
  var parityLabel = r.weekParity==='all' ? t('parityAll') : (r.weekParity==='odd' ? t('parityOdd') : t('parityEven'));
  var calLabel = r.calendarLabel || t('icyReservedTag');
  return '<div class="modal-backdrop" data-backdrop="close-modal">' +
    '<div class="modal fixed-light" data-stop="1">' +
      '<div class="modal-head"><h2>' + escapeHtml(calLabel) + '</h2><button class="icon-btn modal-close" data-act="close-modal">' + CLOSE_SVG + '</button></div>' +
      '<div class="modal-body">' +
        '<div class="field"><label>' + escapeHtml(t('classShort')) + '</label><div>' + escapeHtml(cls) + '</div></div>' +
        '<div class="field"><label>' + escapeHtml(t('cycleWeekLabel')) + '</label><div>' + escapeHtml(r.day) + '　（' + escapeHtml(parityLabel) + '）</div></div>' +
        '<div class="field"><label>' + escapeHtml(t('periodsShort')) + '</label><div>' + escapeHtml(periods) + '</div></div>' +
        '<div class="field"><label>' + escapeHtml(t('ipadBatchLabel')) + '</label><div>' + escapeHtml(ipads) + '</div></div>' +
        '<div class="field"><label>' + escapeHtml(t('durationLabel')) + '</label><div>' + escapeHtml(r.startDate) + escapeHtml(t('dateRangeSep')) + escapeHtml(r.endDate) + '</div></div>' +
        (r.note ? '<div class="field"><label>' + escapeHtml(t('notesLabel')) + '</label><div>' + escapeHtml(r.note) + '</div></div>' : '') +
        '<div class="hint">' + escapeHtml(t('reservationHint')) + '</div>' +
      '</div>' +
      '<div class="modal-foot">' + (isReadOnly || !m.date || !env.isAdmin ? '' : '<button class="btn" data-act="temp-rent">' + escapeHtml(t('tempRentBtn')) + '</button><span class="spacer"></span>') + '<button class="btn primary" data-act="close-modal">' + escapeHtml(t('closeBtn')) + '</button></div>' +
    '</div></div>';
}
/* Admin-only: replace this reservation (for this one date/period/iPad) with a
   temporary rental booking. Needs the settings password if not yet unlocked. */
function startTempRent(){
  var m = ui.modal; if (!m || m.type!=='reservationInfo') return;
  var slot = { date:m.date, periodId:m.periodId, ipadId:m.ipadId, temp:true };
  if (ui.settingsAuthed) { openBookingModal(slot); return; }
  showToast(t('adminOnly'));
}

/* ===================== modal: password gate ===================== */
function openPasswordGate(target){ ui.tooltipIpad=null; renderShell(); ui.modal = { type:'password', error:false, target: target||'settings' }; renderModalRoot(); setTimeout(function(){ var el=document.getElementById('pw-input'); if(el) el.focus(); },30); }
function passwordModalHtml(m){
  var titleTxt = m.target === 'loans' ? t('loansAriaLabel') : t('settingsPasswordTitle');
  return '<div class="modal-backdrop" data-backdrop="close-modal">' +
    '<div class="modal pw-modal fixed-light" data-stop="1">' +
      '<div class="modal-body">' +
        '<div class="lock-icon">' + LOCK_SVG + '</div>' +
        '<h2 style="margin:0 0 4px;">' + escapeHtml(titleTxt) + '</h2>' +
        '<p style="color:var(--grid-text-muted);font-size:12.5px;margin:0 0 14px;">' + escapeHtml(t('enterPasswordHint')) + '</p>' +
        '<input class="pw-input' + (m.error?' shake':'') + '" id="pw-input" type="password" inputmode="numeric" maxlength="12" placeholder="••••••"/>' +
        (m.error ? '<div class="msg-error">' + escapeHtml(t('wrongPassword')) + '</div>' : '') +
      '</div>' +
      '<div class="modal-foot"><button class="btn ghost" data-act="close-modal">' + escapeHtml(t('cancelBtn')) + '</button><button class="btn primary" data-act="submit-password">' + escapeHtml(t('confirmBtn')) + '</button></div>' +
    '</div></div>';
}
function submitPassword(){
  var el = document.getElementById('pw-input');
  var val = el ? el.value : '';
  if (val === STATE.meta.settingsPassword) {
    var target = ui.modal.target || 'settings';
    var pending = ui.modal.pending;
    ui.settingsAuthed = true;
    closeModal();
    if (target === 'temprent' && pending) { openBookingModal(pending); }
    else if (target === 'loans') { openLoansPanel(); }
    else { ui.settingsOpen = true; ui.settingsTab = 'ipad'; renderSettingsRoot(); }
  } else {
    ui.modal.error = true; renderModalRoot();
    setTimeout(function(){ var e2=document.getElementById('pw-input'); if(e2){ e2.value=''; e2.focus(); } }, 10);
  }
}

/* ===================== settings ===================== */
var draftIpads = null;
var draftPeriods = null;
var editingReservationId = null;

function openSettings(){
  closeTransientUI(); renderShell();
  if (ui.settingsAuthed) { ui.settingsOpen = true; ui.settingsTab='ipad'; renderSettingsRoot(); }
  else showToast(t('adminOnly'));
}
function closeSettings(){ ui.settingsOpen = false; draftIpads = null; draftPeriods = null; editingReservationId = null; document.getElementById('settings-root').innerHTML=''; renderShell(); }
function switchSettingsTab(tab){ ui.settingsTab = tab; if(tab==='ipad') draftIpads=null; if(tab==='period') draftPeriods=null; editingReservationId=null; renderSettingsRoot(); }

function renderSettingsRoot(){
  var root = document.getElementById('settings-root');
  if (!ui.settingsOpen) { root.innerHTML = ''; return; }
  var tabs = [ ['ipad',t('tabIpad')], ['period',t('tabPeriod')], ['reservation',t('tabReservation')], ['clear',t('tabClear')] ];
  var side = tabs.map(function(t2){
    return '<button class="' + (ui.settingsTab===t2[0]?'active':'') + '" data-act="settings-tab" data-tab="' + t2[0] + '">' + escapeHtml(t2[1]) + '</button>';
  }).join('');
  var content = '';
  if (ui.settingsTab==='ipad') content = settingsIpadHtml();
  else if (ui.settingsTab==='period') content = settingsPeriodHtml();
  else if (ui.settingsTab==='reservation') content = settingsReservationHtml();
  else if (ui.settingsTab==='clear') content = settingsClearHtml();

  root.innerHTML = '<div class="settings-shell fixed-light">' +
    '<div class="settings-topbar"><div class="brand"><span class="brand-icon">' + GEAR_SVG + '</span>' + escapeHtml(t('settingsCenterTitle')) + '</div>' +
      '<button class="icon-btn" data-act="close-settings">' + CLOSE_SVG + '</button></div>' +
    '<div class="settings-main">' +
      '<div class="settings-side">' + side + '</div>' +
      '<div class="settings-content" id="settings-content">' + content + '</div>' +
    '</div>' +
    '</div>';
}

/* ---- iPad settings ---- */
function settingsIpadHtml(){
  if (!draftIpads) draftIpads = STATE.ipads.map(function(x){ return Object.assign({}, x); });
  var cards = draftIpads.map(function(ip, idx){
    return '<div class="ipad-card" data-idx="' + idx + '">' +
      '<div class="row"><label>' + escapeHtml(t('batchCode')) + '</label><input class="row-input name" style="width:80px" data-f="code" value="' + escapeHtml(ip.code) + '"/>' +
      '<label>' + escapeHtml(t('nameLabel')) + '</label><input class="row-input name" data-f="name" value="' + escapeHtml(ip.name) + '"/>' +
      '<label>' + escapeHtml(t('qtyShort')) + '</label><input class="row-input" type="number" min="0" style="width:70px" data-f="qty" value="' + ip.qty + '"/>' +
      '<button type="button" class="icon-only-btn" data-act="remove-ipad" data-idx="' + idx + '" title="' + escapeHtml(t('deleteBtn')) + '">' + TRASH_SVG + '</button></div>' +
      '<div class="row"><label>' + escapeHtml(t('notesLabel')) + '</label><input class="row-input grow" data-f="note" value="' + escapeHtml(ip.note) + '" placeholder="' + escapeHtml(t('ipadNotePlaceholder')) + '"/></div>' +
      '</div>';
  }).join('');
  return '<h3>' + escapeHtml(t('ipadSettingsTitle')) + '</h3><div class="settings-desc">' + escapeHtml(t('ipadSettingsDesc')) + '</div>' +
    '<div id="ipad-list">' + cards + '</div>' +
    '<button type="button" class="add-row-btn" data-act="add-ipad">' + escapeHtml(t('addIpadBatch')) + '</button>' +
    '<div class="divider"></div>' +
    '<button class="btn primary" data-act="save-ipads">' + escapeHtml(t('saveChanges')) + '</button>';
}
function collectIpadsFromDOM(){
  var cards = document.querySelectorAll('#ipad-list .ipad-card');
  return Array.prototype.map.call(cards, function(card, i){
    var old = draftIpads[+card.getAttribute('data-idx')] || {};
    return {
      id: old.id || uid('ip_'),
      code: card.querySelector('[data-f="code"]').value.trim() || ('C'+(i+1)),
      name: card.querySelector('[data-f="name"]').value.trim() || ('Car'+(i+1)),
      qty: Math.max(0, +card.querySelector('[data-f="qty"]').value || 0),
      note: card.querySelector('[data-f="note"]').value.trim()
    };
  });
}

/* ---- Period settings ---- */
var WD_KEYS = [1,2,3,4,5];
var WD_LABEL = {1:'一',2:'二',3:'三',4:'四',5:'五'};
function settingsPeriodHtml(){
  if (!draftPeriods) draftPeriods = STATE.periods.map(function(x){ return Object.assign({}, x, { days:x.days.slice() }); });
  var rows = draftPeriods.map(function(p, idx){ return periodRowHtml(p, idx); }).join('');
  return '<h3>' + escapeHtml(t('periodSettingsTitle')) + '</h3>' +
    '<div class="settings-desc">' + escapeHtml(t('periodSettingsDescPre')) + DRAG_SVG + escapeHtml(t('periodSettingsDescPost')) + '</div>' +
    '<div id="period-list">' + rows + '</div>' +
    '<button type="button" class="add-row-btn" data-act="add-period">' + escapeHtml(t('addPeriod')) + '</button>' +
    '<div class="divider"></div>' +
    '<button class="btn primary" data-act="save-periods">' + escapeHtml(t('saveChanges')) + '</button>';
}
function periodRowHtml(p, idx){
  var wdLabels = ui.lang==='en' ? WD_MF_EN : WD_LABEL;
  var wd = WD_KEYS.map(function(k){
    var checked = p.days.indexOf(k)>=0;
    return '<label><input type="checkbox" data-f="day" data-day="' + k + '" ' + (checked?'checked':'') + '/><span>' + wdLabels[k] + '</span></label>';
  }).join('');
  return '<div class="setting-row" draggable="false" data-drag-idx="' + idx + '">' +
    '<span class="drag-handle">' + DRAG_SVG + '</span>' +
    '<input class="row-input time" data-f="time" value="' + p.start + '-' + p.end + '" placeholder="08:25-08:55"/>' +
    '<input class="row-input name" data-f="name" value="' + escapeHtml(p.name) + '" placeholder="' + escapeHtml(t('periodNamePlaceholder')) + '"/>' +
    '<input class="row-input name-en" data-f="nameEn" value="' + escapeHtml(p.nameEn||'') + '" placeholder="' + escapeHtml(t('periodNameEnPlaceholder')) + '"/>' +
    '<div class="wd-check">' + wd + '</div>' +
    '<select class="row-input" data-f="category">' +
      '<option value="normal"' + (p.category==='normal'?' selected':'') + '>' + escapeHtml(t('categoryNormal')) + '</option>' +
      '<option value="break"' + (p.category==='break'?' selected':'') + '>' + escapeHtml(t('categoryBreak')) + '</option>' +
    '</select>' +
    '<label class="switch"><input type="checkbox" data-f="open" ' + (p.open?'checked':'') + '/>' + escapeHtml(t('openLabel')) + '</label>' +
    '<button type="button" class="icon-only-btn" data-act="remove-period" data-idx="' + idx + '" title="' + escapeHtml(t('deleteBtn')) + '">' + TRASH_SVG + '</button>' +
    '</div>';
}
function collectPeriodsFromDOM(){
  var rows = document.querySelectorAll('#period-list .setting-row');
  return Array.prototype.map.call(rows, function(row, i){
    var oldIdx = +row.getAttribute('data-drag-idx');
    var old = draftPeriods[oldIdx] || {};
    var timeVal = row.querySelector('[data-f="time"]').value.trim();
    var parts = timeVal.split('-');
    var start = (parts[0]||'').trim() || '00:00';
    var end = (parts[1]||'').trim() || start;
    var days = Array.prototype.filter.call(row.querySelectorAll('[data-f="day"]'), function(cb){ return cb.checked; }).map(function(cb){ return +cb.getAttribute('data-day'); });
    return {
      id: old.id || uid('pd_'),
      name: row.querySelector('[data-f="name"]').value.trim() || (t('periodFallbackPrefix')+(i+1)),
      nameEn: row.querySelector('[data-f="nameEn"]').value.trim(),
      start: start, end: end, days: days,
      category: row.querySelector('[data-f="category"]').value,
      open: row.querySelector('[data-f="open"]').checked
    };
  });
}

/* ---- Reservation settings ---- */
function settingsReservationHtml(){
  var normalPeriods = STATE.periods.filter(function(p){ return p.category==='normal'; });
  var editing = editingReservationId ? STATE.reservations.filter(function(r){return r.id===editingReservationId;})[0] : null;
  var periodBoxes = normalPeriods.map(function(p){
    var checked = (editing && editing.periodIds.indexOf(p.id)!==-1) ? ' checked' : '';
    return '<label class="check-pill"><input type="checkbox" data-f="res-period" value="' + p.id + '"' + checked + '/>' + escapeHtml(periodName(p)) + '</label>';
  }).join('');
  var ipadBoxes = STATE.ipads.map(function(ip){
    var checked = (editing && editing.ipadIds.indexOf(ip.id)!==-1) ? ' checked' : '';
    return '<label class="check-pill"><input type="checkbox" data-f="res-ipad" value="' + ip.id + '"' + checked + '/>' + escapeHtml(ip.code) + '</label>';
  }).join('');
  var classOptions = STATE.classes.map(function(c){ return '<option value="' + escapeHtml(c) + '"' + (editing && editing.className===c?' selected':'') + '>' + escapeHtml(c) + '</option>'; }).join('') + '<option value="其他"' + (editing && editing.className==='其他'?' selected':'') + '>' + escapeHtml(t('otherOption')) + '</option>';
  var dayOptions = [1,2,3,4,5,6].map(function(n){ var v = 'Day ' + n; return '<option value="' + v + '"' + (editing && editing.day===v?' selected':'') + '>' + v + '</option>'; }).join('');
  var list = STATE.reservations.map(function(r){
    var periods = r.periodIds.map(function(pid){ var p=STATE.periods.filter(function(x){return x.id===pid;})[0]; return p?periodName(p):pid; }).join('、');
    var ipads = r.ipadIds.map(function(iid){ var ip=STATE.ipads.filter(function(x){return x.id===iid;})[0]; return ip?ip.code:iid; }).join('、');
    var cls = r.className==='其他' ? (r.otherClass||t('otherOption')) : r.className;
    var parity = r.weekParity==='all'?t('parityAll'):(r.weekParity==='odd'?t('parityOdd'):t('parityEven'));
    var calLabel = r.calendarLabel || t('icyReservedTag');
    return '<div class="res-item' + (editingReservationId===r.id?' editing':'') + '"><div class="info"><span class="tag accent">' + escapeHtml(calLabel) + '</span><span class="tag">' + escapeHtml(r.day) + '</span><span class="tag">' + escapeHtml(parity) + '</span><b>' + escapeHtml(cls) + '</b>　' + escapeHtml(periods) + '　' + escapeHtml(ipads) +
      '<br/><span style="color:var(--text-muted)">' + escapeHtml(r.startDate) + escapeHtml(t('dateRangeSep')) + escapeHtml(r.endDate) + (r.note? escapeHtml(t('noteInlinePrefix'))+escapeHtml(r.note):'') + '</span></div>' +
      '<button type="button" class="icon-only-btn" data-act="edit-reservation" data-id="' + r.id + '" title="' + escapeHtml(t('editBtn')) + '">' + EDIT_SVG + '</button>' +
      '<button type="button" class="icon-only-btn" data-act="remove-reservation" data-id="' + r.id + '" title="' + escapeHtml(t('deleteBtn')) + '">' + TRASH_SVG + '</button></div>';
  }).join('') || '<div class="settings-desc">' + escapeHtml(t('noReservations')) + '</div>';

  return '<h3>' + escapeHtml(t('reservationSettingsTitle')) + '</h3><div class="settings-desc">' + escapeHtml(t('reservationSettingsDesc')) + '</div>' +
    '<div class="two-col">' +
      '<div class="field"><label>' + escapeHtml(t('startDate')) + '</label><input class="input" type="date" id="res-start" value="' + (editing?escapeHtml(editing.startDate):'') + '"/></div>' +
      '<div class="field"><label>' + escapeHtml(t('endDate')) + '</label><input class="input" type="date" id="res-end" value="' + (editing?escapeHtml(editing.endDate):'') + '"/></div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="field"><label>' + escapeHtml(t('weekLabel')) + '</label><select class="input" id="res-parity"><option value="all"' + (editing&&editing.weekParity==='all'?' selected':'') + '>' + escapeHtml(t('parityAll')) + '</option><option value="odd"' + (editing&&editing.weekParity==='odd'?' selected':'') + '>' + escapeHtml(t('parityOdd')) + '</option><option value="even"' + (editing&&editing.weekParity==='even'?' selected':'') + '>' + escapeHtml(t('parityEven')) + '</option></select></div>' +
      '<div class="field"><label>' + escapeHtml(t('cycleDayLabel')) + '</label><select class="input" id="res-day">' + dayOptions + '</select></div>' +
    '</div>' +
    '<div class="field"><label>' + escapeHtml(t('periodsShort')) + '</label><div class="check-grid">' + periodBoxes + '</div></div>' +
    '<div class="field"><label>' + escapeHtml(t('ipadBatchLabel')) + '</label><div class="check-grid">' + ipadBoxes + '</div></div>' +
    '<div class="two-col">' +
      '<div class="field"><label>' + escapeHtml(t('classShort')) + '</label><select class="input" id="res-class">' + classOptions + '</select></div>' +
      '<div class="field" id="res-otherwrap" style="display:' + ((editing && editing.className==='其他') ? '' : 'none') + ';"><label>' + escapeHtml(t('otherNameLabel')) + '</label><input class="input" id="res-other" value="' + (editing?escapeHtml(editing.otherClass||''):'') + '"/></div>' +
    '</div>' +
    '<div class="field"><label>' + escapeHtml(t('calendarLabelField')) + '</label><input class="input" id="res-cal-label" placeholder="' + escapeHtml(t('calendarLabelPlaceholder')) + '" value="' + (editing?escapeHtml(editing.calendarLabel||''):'') + '"/></div>' +
    '<div class="field"><label>' + escapeHtml(t('notesLabel')) + '</label><input class="input" id="res-note" placeholder="' + escapeHtml(t('optionalPlaceholder')) + '" value="' + (editing?escapeHtml(editing.note||''):'') + '"/></div>' +
    '<button class="btn primary" data-act="add-reservation">' + escapeHtml(editing ? t('updateReservationBtn') : t('addReservationBtn')) + '</button>' +
    (editing ? ' <button type="button" class="btn ghost" data-act="cancel-edit-reservation">' + escapeHtml(t('cancelBtn')) + '</button>' : '') +
    '<div class="res-list">' + list + '</div>';
}
function submitReservation(){
  var start = document.getElementById('res-start').value;
  var end = document.getElementById('res-end').value;
  var parity = document.getElementById('res-parity').value;
  var day = document.getElementById('res-day').value;
  var periodIds = Array.prototype.filter.call(document.querySelectorAll('[data-f="res-period"]'), function(cb){return cb.checked;}).map(function(cb){return cb.value;});
  var ipadIds = Array.prototype.filter.call(document.querySelectorAll('[data-f="res-ipad"]'), function(cb){return cb.checked;}).map(function(cb){return cb.value;});
  var className = document.getElementById('res-class').value;
  var otherClass = document.getElementById('res-other').value.trim();
  var calendarLabel = document.getElementById('res-cal-label').value.trim();
  var note = document.getElementById('res-note').value.trim();
  if (!start || !end || start > end) { showToast(t('errNeedDates')); return; }
  if (!periodIds.length) { showToast(t('errNeedPeriodRes')); return; }
  if (!ipadIds.length) { showToast(t('errNeedIpadRes')); return; }
  if (editingReservationId) {
    var existing = STATE.reservations.filter(function(r){return r.id===editingReservationId;})[0];
    doAction({ kind:'updateReservation', reservation:{ id:editingReservationId, startDate:start, endDate:end, weekParity:parity, day:day, periodIds:periodIds, ipadIds:ipadIds, className:className, otherClass:otherClass, calendarLabel:calendarLabel, note:note, createdAt: existing?existing.createdAt:Date.now() } });
    editingReservationId = null;
    renderSettingsRoot();
    showToast(t('toastReservationUpdated'));
  } else {
    doAction({ kind:'addReservation', reservation:{ id:uid('rs_'), startDate:start, endDate:end, weekParity:parity, day:day, periodIds:periodIds, ipadIds:ipadIds, className:className, otherClass:otherClass, calendarLabel:calendarLabel, note:note, createdAt:Date.now() } });
    renderSettingsRoot();
    showToast(t('toastReservationAdded'));
  }
}

/* ---- Clear records settings ---- */
function settingsClearHtml(){
  return '<h3>' + escapeHtml(t('clearSettingsTitle')) + '</h3><div class="settings-desc">' + escapeHtml(t('clearSettingsDesc')) + '</div>' +
    '<div class="clear-panel">' +
      '<div class="field"><label>' + escapeHtml(t('clearBeforeLabel')) + '</label><input class="input" type="date" id="clear-before"/></div>' +
      '<button class="btn danger" data-act="do-clear">' + escapeHtml(t('clearRecordsBtn')) + '</button>' +
    '</div>';
}
function triggerClear(){
  var val = document.getElementById('clear-before').value;
  if (!val) { showToast(t('errPickDate')); return; }
  askConfirm(t('confirmClearRecordsPrefix') + val + t('confirmClearRecordsSuffix'), function(){
    doAction({ kind:'clearBefore', date: val });
    showToast(t('toastRecordsCleared'));
  }, true);
}

/* ===================== iPad 外借記錄（IT組點算用） ===================== */
function loanLabelTaken(label, excludeId){
  var norm = (label||'').trim().toLowerCase();
  return (STATE.loans||[]).some(function(l){
    return l.id !== excludeId && (l.ipadLabel||'').trim().toLowerCase() === norm;
  });
}

function openLoans(){
  closeTransientUI(); renderShell();
  if (ui.settingsAuthed) { openLoansPanel(); }
  else { showToast(t('adminOnly')); }
}
function openLoansPanel(){ ui.loansOpen = true; renderLoansRoot(); }
function closeLoans(){ ui.loansOpen = false; document.getElementById('loans-root').innerHTML=''; renderShell(); }

function renderLoansRoot(){
  var root = document.getElementById('loans-root');
  if (!ui.loansOpen) { root.innerHTML = ''; return; }
  root.innerHTML = '<div class="settings-shell fixed-light">' +
    '<div class="settings-topbar"><div class="brand"><span class="brand-icon">' + LOAN_SVG + '</span>' + escapeHtml(t('loansAriaLabel')) + '</div>' +
      '<button class="icon-btn" data-act="close-loans">' + CLOSE_SVG + '</button></div>' +
    '<div class="settings-main">' +
      '<div class="settings-content" id="loans-content" style="flex:1;">' + loansPanelHtml() + '</div>' +
    '</div>' +
  '</div>';
}

function loansPanelHtml(){
  var today = todayISO();
  var loans = (STATE.loans||[]).slice().sort(function(a,b){ return (a.dueDate||'').localeCompare(b.dueDate||''); });
  var overdueCount = loans.filter(function(l){ return l.dueDate && l.dueDate < today; }).length;

  var list = loans.map(function(l){
    var overdue = l.dueDate && l.dueDate < today;
    var who = escapeHtml(l.borrowerName) + (l.className ? '　<span class="tag">' + escapeHtml(l.className) + '</span>' : '');
    var ipadLabel = l.ipadLabel || (function(){ var ip = STATE.ipads.filter(function(x){return x.id===l.ipadId;})[0]; return ip ? ip.code + '-' + pad2(+l.unitNo||0) : ''; })();
    return '<div class="res-item' + (overdue?' overdue':'') + '"><div class="info">' +
      '<span class="tag">' + escapeHtml(ipadLabel) + '</span>' +
      (overdue ? '<span class="tag danger">' + escapeHtml(t('overdueTag')) + '</span>' : '') +
      '<b>' + who + '</b>' +
      '<br/><span class="info-muted">' + escapeHtml(t('borrowedPrefix')) + escapeHtml(l.borrowDate) + escapeHtml(t('duePrefix')) + escapeHtml(l.dueDate) + '</span>' +
      (l.note ? '<br/><span class="info-muted">' + escapeHtml(t('notePrefix')) + escapeHtml(l.note) + '</span>' : '') +
    '</div>' +
    '<button type="button" class="icon-only-btn" data-act="remove-loan" data-id="' + l.id + '" title="' + escapeHtml(t('returnDeleteTitle')) + '">' + TRASH_SVG + '</button></div>';
  }).join('') || '<div class="settings-desc">' + escapeHtml(t('noLoans')) + '</div>';

  var summary = escapeHtml(t('currentlyOnLoan')) + '<b>' + loans.length + '</b>' + escapeHtml(t('unitsSuffix')) + (overdueCount ? escapeHtml(t('overdueCountLabel')) + '<span class="text-danger">' + overdueCount + escapeHtml(t('unitsSuffix')) + '</span>' : '');

  return '<h3>' + escapeHtml(t('newLoanTitle')) + '</h3>' +
    '<div class="settings-desc">' + escapeHtml(t('loanDesc')) + '</div>' +
    '<div class="field"><label>' + escapeHtml(t('ipadIdLabel')) + '</label><input class="input" id="ln-ipad" placeholder="' + escapeHtml(t('ipadIdPlaceholder')) + '"/></div>' +
    '<div class="two-col">' +
      '<div class="field"><label>' + escapeHtml(t('borrowerNameLabel')) + '</label><input class="input" id="ln-name" placeholder="' + escapeHtml(t('borrowerNamePlaceholder')) + '"/></div>' +
      '<div class="field"><label>' + escapeHtml(t('classIfApplicable')) + '</label><input class="input" id="ln-class" placeholder="' + escapeHtml(t('classOptionalPlaceholder')) + '"/></div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="field"><label>' + escapeHtml(t('borrowDateLabel')) + '</label><input class="input" type="date" id="ln-borrow-date" value="' + today + '"/></div>' +
      '<div class="field"><label>' + escapeHtml(t('dueDateLabel')) + '</label><input class="input" type="date" id="ln-due-date" value="' + addDays(today,1) + '"/></div>' +
    '</div>' +
    '<div class="field"><label>' + escapeHtml(t('loanNoteLabel')) + '</label><input class="input" id="ln-note" placeholder="' + escapeHtml(t('optionalPlaceholder')) + '"/></div>' +
    '<button class="btn primary" data-act="add-loan">' + escapeHtml(t('addLoanBtn')) + '</button>' +
    '<div class="divider"></div>' +
    '<h3>' + escapeHtml(t('currentLoansTitle')) + '</h3>' +
    '<div class="settings-desc">' + summary + '</div>' +
    '<div class="res-list">' + list + '</div>';
}

function submitLoan(){
  var ipadLabel = document.getElementById('ln-ipad').value.trim();
  var borrowerName = document.getElementById('ln-name').value.trim();
  var className = document.getElementById('ln-class').value.trim();
  var borrowDate = document.getElementById('ln-borrow-date').value;
  var dueDate = document.getElementById('ln-due-date').value;
  var note = document.getElementById('ln-note').value.trim();

  if (!ipadLabel) { showToast(t('errNeedIpadId')); return; }
  if (!borrowerName) { showToast(t('errNeedBorrowerName')); return; }
  if (!borrowDate || !dueDate || dueDate < borrowDate) { showToast(t('errNeedLoanDates')); return; }
  if (loanLabelTaken(ipadLabel)) { showToast(t('errIpadAlreadyLoanedPrefix') + ipadLabel + t('errIpadAlreadyLoanedSuffix')); return; }

  doAction({ kind:'addLoan', loan:{
    id: uid('ln_'), ipadLabel: ipadLabel,
    borrowerName: borrowerName, className: className,
    borrowDate: borrowDate, dueDate: dueDate, note: note, createdAt: Date.now()
  }});
  renderLoansRoot();
  showToast(t('toastLoanAdded'));
}

/* ===================== date picker popover ===================== */
function toggleDatepicker(){
  ui.datepickerOpen = !ui.datepickerOpen;
  if (ui.datepickerOpen) ui.datepickerMonth = { y: parseISO(ui.anchor).getFullYear(), m: parseISO(ui.anchor).getMonth() };
  renderDatePickerRoot();
}
function renderDatePickerRoot(){
  var root = document.getElementById('datepicker-root');
  if (!ui.datepickerOpen) { root.innerHTML=''; return; }
  var y = ui.datepickerMonth.y, m = ui.datepickerMonth.m;
  var first = new Date(y, m, 1);
  var startWd = first.getDay();
  var daysInMonth = new Date(y, m+1, 0).getDate();
  var wdShort = ui.lang==='en' ? WD_SHORT_EN : WD_ZH;
  var cells = '';
  for (var i=0;i<7;i++) cells += '<div class="wd">' + wdShort[i] + '</div>';
  for (var b=0;b<startWd;b++) cells += '<div class="dcell muted"></div>';
  var today = todayISO();
  for (var d=1; d<=daysInMonth; d++){
    var iso = isoOf(y, m+1, d);
    var has = !!STATE.calendar[iso];
    var cls = 'dcell' + (iso===today?' today':'') + (iso===ui.anchor?' selected':'');
    cells += '<div class="' + cls + '" data-act="pick-date" data-date="' + iso + '">' + d + (has?'<span class="tag-dot"></span>':'') + '</div>';
  }
  var monthLabel = ui.lang==='en' ? (MONTH_EN[m] + ' ' + y) : (y + '年' + (m+1) + '月');
  root.innerHTML = '<div class="datepop">' +
    '<div class="datepop-head"><button class="icon-only-btn" data-act="dp-prev-month">' + CHEV_L + '</button>' +
    '<span>' + monthLabel + '</span>' +
    '<button class="icon-only-btn" data-act="dp-next-month">' + CHEV_R + '</button></div>' +
    '<div class="datepop-grid">' + cells + '</div>' +
    '</div>';
  positionDatepop();
}
function positionDatepop(){
  var pop = document.querySelector('.datepop');
  var btn = document.querySelector('[data-act="nav-datepicker"]');
  if (!pop || !btn) return;
  if (window.innerWidth <= 520) { pop.style.left=''; pop.style.top=''; pop.style.transform=''; return; }
  var r = btn.getBoundingClientRect();
  var popWidth = pop.offsetWidth || 280;
  var left = r.left;
  var maxLeft = window.innerWidth - popWidth - 8;
  if (left > maxLeft) left = Math.max(8, maxLeft);
  pop.style.left = left + 'px';
  pop.style.top = (r.bottom + 8) + 'px';
  pop.style.transform = 'none';
}

/* ===================== toast ===================== */
var toastTimer = null;
function showToast(msg){
  var root = document.getElementById('toast-root');
  root.innerHTML = '<div class="toast">' + escapeHtml(msg) + '</div>';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ root.innerHTML=''; }, 2600);
}

/* ===================== global events ===================== */
function bindGlobalEvents(){
  document.addEventListener('click', function(e){
    var backdrop = e.target.closest ? e.target.closest('[data-backdrop]') : null;
    if (backdrop && e.target === backdrop) {
      var act0 = backdrop.getAttribute('data-backdrop');
      if (act0 === 'close-modal') { closeModal(); return; }
      if (act0 === 'confirm-no') { ui.confirm=null; renderConfirmOverlay(); return; }
    }
    var targetEl = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!targetEl) {
      if (ui.datepickerOpen && !e.target.closest('.datepop') && !e.target.closest('[data-act="nav-datepicker"]')) { ui.datepickerOpen=false; renderDatePickerRoot(); }
      if (ui.tooltipIpad && !e.target.closest('.head-ipad')) { ui.tooltipIpad=null; renderShell(); }
      return;
    }
    var act = targetEl.getAttribute('data-act');
    switch (act) {
      case 'nav-prev': navPrev(); break;
      case 'nav-next': navNext(); break;
      case 'nav-today': navToday(); break;
      case 'nav-datepicker': toggleDatepicker(); break;
      case 'view-week': setMode('week'); break;
      case 'view-day': setMode('day'); break;
      case 'toggle-lang': toggleLang(); break;
      case 'toggle-chip':
        var chipKey = targetEl.getAttribute('data-date') + '::' + targetEl.getAttribute('data-ipad');
        ui.tooltipIpad = (ui.tooltipIpad === chipKey) ? null : chipKey;
        renderShell(); break;
      case 'open-settings': openSettings(); break;
      case 'close-settings': closeSettings(); break;
      case 'settings-tab': switchSettingsTab(targetEl.getAttribute('data-tab')); break;
      case 'open-slot':
        if (isReadOnly) { showToast(t('toastReadonlyNoAdd')); break; }
        openBookingModal({ date:targetEl.getAttribute('data-date'), periodId:targetEl.getAttribute('data-period'), ipadId:targetEl.getAttribute('data-ipad') }); break;
      case 'open-group':
        openBookingModal({ groupId:targetEl.getAttribute('data-group') }); break;
      case 'open-reservation':
        var res = STATE.reservations.filter(function(r){ return r.id===targetEl.getAttribute('data-res'); })[0];
        if (res) { ui.modal = { type:'reservationInfo', reservation: res, date:targetEl.getAttribute('data-date'), periodId:targetEl.getAttribute('data-period'), ipadId:targetEl.getAttribute('data-ipad') }; renderModalRoot(); } break;
      case 'temp-rent': startTempRent(); break;
      case 'close-modal': closeModal(); break;
      case 'save-booking': if(!isReadOnly) submitBooking(); break;
      case 'delete-booking':
        askConfirm(t('confirmDeleteBooking'), deleteBookingConfirmed, true); break;
      case 'reroll-color': syncBookingFieldsFromDOM(); ui.modal.color = randomColor(); renderModalRoot(); break;
      case 'submit-password': submitPassword(); break;
      case 'confirm-yes': var fn = ui.confirm && ui.confirm.onYes; ui.confirm=null; renderConfirmOverlay(); if(fn) fn(); break;
      case 'confirm-no': ui.confirm=null; renderConfirmOverlay(); break;
      case 'pick-date':
        ui.anchor = targetEl.getAttribute('data-date'); ui.datepickerOpen=false; renderAll(); break;
      case 'dp-prev-month':
        ui.datepickerMonth.m--; if(ui.datepickerMonth.m<0){ui.datepickerMonth.m=11;ui.datepickerMonth.y--;} renderDatePickerRoot(); break;
      case 'dp-next-month':
        ui.datepickerMonth.m++; if(ui.datepickerMonth.m>11){ui.datepickerMonth.m=0;ui.datepickerMonth.y++;} renderDatePickerRoot(); break;
      case 'add-ipad':
        draftIpads = draftIpads || STATE.ipads.map(function(x){return Object.assign({},x);});
        draftIpads.push({ id:'', code:'C'+(draftIpads.length+1), name:'Car'+(draftIpads.length+1), qty:0, note:'' });
        renderSettingsRoot(); break;
      case 'remove-ipad':
        draftIpads.splice(+targetEl.getAttribute('data-idx'), 1); renderSettingsRoot(); break;
      case 'save-ipads':
        var newIpads = collectIpadsFromDOM(); draftIpads=null;
        doAction({ kind:'saveIpads', ipads:newIpads }); renderSettingsRoot(); showToast(t('toastSavedIpadSettings')); break;
      case 'add-period':
        draftPeriods = draftPeriods || STATE.periods.map(function(x){return Object.assign({},x,{days:x.days.slice()});});
        draftPeriods.push({ id:'', name:t('newPeriodDefaultName'), start:'00:00', end:'00:00', days:[1,2,3,4,5], category:'normal', open:true });
        renderSettingsRoot(); break;
      case 'remove-period':
        draftPeriods.splice(+targetEl.getAttribute('data-idx'), 1); renderSettingsRoot(); break;
      case 'save-periods':
        var newPeriods = collectPeriodsFromDOM(); draftPeriods=null;
        doAction({ kind:'savePeriods', periods:newPeriods }); renderSettingsRoot(); showToast(t('toastSavedPeriodSettings')); break;
      case 'add-reservation': submitReservation(); break;
      case 'edit-reservation':
        editingReservationId = targetEl.getAttribute('data-id');
        renderSettingsRoot();
        break;
      case 'cancel-edit-reservation':
        editingReservationId = null;
        renderSettingsRoot();
        break;
      case 'remove-reservation':
        var rid = targetEl.getAttribute('data-id');
        askConfirm(t('confirmDeleteReservation'), function(){ if(editingReservationId===rid) editingReservationId=null; doAction({kind:'deleteReservation', id:rid}); renderSettingsRoot(); }, true);
        break;
      case 'do-clear': triggerClear(); break;
      case 'open-loans': openLoans(); break;
      case 'close-loans': closeLoans(); break;
      case 'add-loan': submitLoan(); break;
      case 'remove-loan':
        var lid = targetEl.getAttribute('data-id');
        askConfirm(t('confirmDeleteLoan'), function(){ doAction({kind:'deleteLoan', id:lid}); renderLoansRoot(); }, true);
        break;
    }
  });

  document.addEventListener('change', function(e){
    var el = e.target;
    if (el.id === 'f-class') {
      syncBookingFieldsFromDOM();
      var wrap = document.getElementById('f-otherwrap');
      if (wrap) wrap.style.display = (el.value === '其他') ? '' : 'none';
    } else if (el.getAttribute && el.getAttribute('data-role') === 'period-check') {
      var lbl0 = el.closest ? el.closest('label') : null;
      if (lbl0) lbl0.classList.toggle('checked', el.checked);
      syncBookingFieldsFromDOM();
      var m0 = ui.modal;
      if (m0 && m0.type === 'booking') {
        var ipadContainer = document.getElementById('ipad-checkboxes');
        if (ipadContainer) ipadContainer.innerHTML = ipadCheckboxesHtml(m0);
      }
    } else if (el.getAttribute && el.getAttribute('data-role') === 'ipad-check') {
      var lbl1 = el.closest ? el.closest('label') : null;
      if (lbl1) lbl1.classList.toggle('checked', el.checked);
      syncBookingFieldsFromDOM();
      var m = ui.modal;
      if (m && m.type === 'booking') {
        m.qty = sumIpadQty(m.selIpads);
        var elQty = document.getElementById('f-qty');
        if (elQty) {
          elQty.value = m.qty;
          elQty.setAttribute('max', m.qty);
          elQty.setAttribute('data-max', m.qty);
        }
        var hintEl = elQty ? elQty.parentNode.querySelector('.hint') : null;
        if (hintEl) hintEl.textContent = t('qtyHintPrefix') + m.qty + t('qtyHintSuffix');
      }
    } else if (el.id === 'res-class') {
      var w2 = document.getElementById('res-otherwrap');
      if (w2) w2.style.display = (el.value === '其他') ? '' : 'none';
    }
  });

  document.addEventListener('input', function(e){
    var el = e.target;
    if (el && el.id === 'f-qty') {
      var max = +el.getAttribute('data-max') || 0;
      var v = +el.value;
      if (el.value !== '' && v > max) el.value = max;
    }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && ui.modal && ui.modal.type === 'password') { submitPassword(); }
    if (e.key === 'Escape') {
      if (ui.confirm) { ui.confirm=null; renderConfirmOverlay(); }
      else if (ui.modal) { closeModal(); }
      else if (ui.datepickerOpen) { ui.datepickerOpen=false; renderDatePickerRoot(); }
      else if (ui.settingsOpen) { closeSettings(); }
      else if (ui.loansOpen) { closeLoans(); }
    }
  });

  /* Dragging a period row is only allowed when the drag is started from the
     六點 drag-handle icon — otherwise clicking/selecting text inside the
     row's inputs (e.g. the time field) too easily triggers an accidental
     HTML5 drag, which re-renders the whole list from draftPeriods and
     discards any unsaved edit the user was mid-typing. The row itself
     stays draggable="false" until a mousedown/touchstart on its handle
     flips it on; it is flipped back off as soon as the drag/gesture ends. */
  function armRowDrag(e){
    var handle = e.target.closest && e.target.closest('.drag-handle');
    if (!handle) return;
    var row = handle.closest('.setting-row[data-drag-idx]');
    if (row) row.setAttribute('draggable', 'true');
  }
  function disarmAllRowDrag(){
    Array.prototype.forEach.call(document.querySelectorAll('.setting-row[data-drag-idx]'), function(row){
      row.setAttribute('draggable', 'false');
    });
  }
  document.addEventListener('mousedown', armRowDrag);
  document.addEventListener('touchstart', armRowDrag, {passive:true});
  document.addEventListener('mouseup', disarmAllRowDrag);
  document.addEventListener('touchend', disarmAllRowDrag);

  document.addEventListener('dragstart', function(e){
    var row = e.target.closest && e.target.closest('.setting-row[data-drag-idx]');
    if (!row) return;
    dragIndex = +row.getAttribute('data-drag-idx');
    row.classList.add('dragging');
  });
  document.addEventListener('dragend', function(e){
    var row = e.target.closest && e.target.closest('.setting-row');
    if (row) row.classList.remove('dragging');
    disarmAllRowDrag();
  });
  document.addEventListener('dragover', function(e){
    if (e.target.closest && e.target.closest('#period-list')) e.preventDefault();
  });
  document.addEventListener('drop', function(e){
    var row = e.target.closest && e.target.closest('.setting-row[data-drag-idx]');
    if (!row || dragIndex == null) return;
    e.preventDefault();
    var targetIdx = +row.getAttribute('data-drag-idx');
    if (targetIdx === dragIndex) return;
    var moved = draftPeriods.splice(dragIndex, 1)[0];
    draftPeriods.splice(targetIdx, 0, moved);
    dragIndex = null;
    renderSettingsRoot();
  });

  window.addEventListener('resize', debounce(function(){}, 200));
}

}
