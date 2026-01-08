import { logError, logInfo } from '../lib/logger';

const UBER_HEADERS = ['搭乘日期', '搭乘時間', '車號', '價格', 'PDF URL'] as const;
const UBER_ERROR_HEADERS = ['郵件日期', '郵件主旨', '原因', '郵件 ID', '片段'] as const;
const MAX_RUNTIME_MS = 5.4 * 60 * 1000;
const THREAD_PAGE_SIZE = 50;
const WRITE_BATCH_ROWS = 20;
const SAVE_PROGRESS_EVERY_THREADS = 10;

interface ParsedUberReceipt {
  rideDate: string;
  rideTime: string;
  vehicle: string;
  fare: number;
}

type ParseOutcome =
  | { status: 'ok'; parsed: ParsedUberReceipt }
  | { status: 'error'; reason: string };

interface SyncResult {
  sheetName: string;
  errorSheetName: string;
  folderUrl: string;
  appended: number;
  appendedErrors: number;
  skippedDuplicates: number;
  skippedCanceled: number;
  skippedParseFailures: number;
  completed: boolean;
  progress: ProgressState;
}

interface ProgressState {
  offset: number;
  completed: boolean;
  updatedAt: number;
}

/**
 * UI entry point: prompt user for Gmail label name then sync.
 * @returns Nothing.
 */
export function uiPromptAndSyncUberReceipts(): void {
  const ui = SpreadsheetApp.getUi();
  const labelName = promptLabelName_(ui, '匯入/繼續匯入 Uber 收據');
  if (!labelName) {
    return;
  }

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30 * 1000)) {
    ui.alert('目前已有一個匯入作業在執行中，請稍後再試。');
    return;
  }

  try {
    const result = syncUberReceiptsByLabel_(labelName);
    const progress = result.progress;

    const lines = [
      `Gmail 標籤：${labelName}`,
      `寫入分頁：${result.sheetName}`,
      `錯誤分頁：${result.errorSheetName}`,
      `PDF 資料夾：${result.folderUrl}`,
      '',
      `新增：${result.appended}`,
      `寫入（錯誤）：${result.appendedErrors}`,
      `略過（重複）：${result.skippedDuplicates}`,
      `略過（取消）：${result.skippedCanceled}`,
      `略過（解析失敗）：${result.skippedParseFailures}`,
      ''
    ];

    if (result.completed) {
      lines.push('✅ 已完成：此 label 全部 threads 已掃描完畢。');
      lines.push('（下次再執行同 label，會從頭掃；Unique 會避免重複。）');
    } else {
      lines.push('⏳ 尚未完成：本次接近時間上限，已保存進度。');
      lines.push(`下次會從 thread offset = ${progress.offset} 繼續。`);
    }

    ui.alert(
      '匯入結果',
      lines.join('\n'),
      ui.ButtonSet.OK
    );
  } catch (error) {
    logError('Failed to sync Uber receipts.', error);
    ui.alert(
      '匯入失敗',
      String(error instanceof Error ? error.message : error),
      ui.ButtonSet.OK
    );
  } finally {
    lock.releaseLock();
  }

  return undefined;
}

/**
 * UI entry point: prompt user for Gmail label name then show progress.
 * @returns Nothing.
 */
export function uiPromptAndShowProgress(): void {
  const ui = SpreadsheetApp.getUi();
  const labelName = promptLabelName_(ui, '查看 Uber 匯入進度');
  if (!labelName) {
    return;
  }

  const progress = getProgress_(labelName);

  ui.alert(
    '目前進度',
    [
      `Gmail 標籤：${labelName}`,
      `完成狀態：${progress.completed ? '已完成' : '未完成'}`,
      `目前 offset：${progress.offset}`,
      `最後更新：${progress.updatedAt ? new Date(progress.updatedAt).toLocaleString() : '(無)'}`
    ].join('\n'),
    ui.ButtonSet.OK
  );

  return undefined;
}

/**
 * UI entry point: prompt user for Gmail label name then reset progress.
 * @returns Nothing.
 */
export function uiPromptAndResetProgress(): void {
  const ui = SpreadsheetApp.getUi();
  const labelName = promptLabelName_(ui, '重置 Uber 匯入進度');
  if (!labelName) {
    return;
  }

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30 * 1000)) {
    ui.alert('目前已有一個匯入作業在執行中，請稍後再試。');
    return;
  }

  try {
    clearProgress_(labelName);
    ui.alert(`已重置進度：${labelName}\n下次匯入會從頭開始掃描。`);
  } finally {
    lock.releaseLock();
  }

  return undefined;
}

/**
 * Main sync function (no UI).
 * @param labelName Gmail label name (exact).
 * @returns Sync summary.
 */
function syncUberReceiptsByLabel_(labelName: string): SyncResult {
  const startedAt = Date.now();

  const label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    throw new Error(`找不到 Gmail 標籤：${labelName}`);
  }

  const folder = ensureDriveFolderForLabel_(labelName);
  const folderUrl = folder.getUrl();

  const sheet = ensureSheetForLabel_(labelName);
  const sheetName = sheet.getName();
  ensureHeaderRow_(sheet);

  const errorSheet = ensureErrorSheetForLabel_(labelName);
  const errorSheetName = errorSheet.getName();
  ensureErrorHeaderRow_(errorSheet);

  const existingKeys = loadExistingUniqueKeys_(sheet);
  const uniqueKeys = new Set(existingKeys);

  const existingErrorIds = loadExistingErrorIds_(errorSheet);
  const errorIds = new Set(existingErrorIds);

  let appended = 0;
  let appendedErrors = 0;
  let skippedDuplicates = 0;
  let skippedCanceled = 0;
  let skippedParseFailures = 0;

  const pendingRows: (string | number)[][] = [];
  const pendingErrorRows: (string | number)[][] = [];

  const progress = getProgress_(labelName);
  let offset = progress.completed ? 0 : Number(progress.offset || 0);

  while (true) {
    if (isTimeNearlyUp_(startedAt)) {
      flushPendingRows_(sheet, pendingRows);
      flushPendingErrorRows_(errorSheet, pendingErrorRows);
      saveProgress_(labelName, { offset, completed: false });
      const updated = getProgress_(labelName);
      return {
        sheetName,
        errorSheetName,
        folderUrl,
        appended,
        appendedErrors,
        skippedDuplicates,
        skippedCanceled,
        skippedParseFailures,
        completed: false,
        progress: updated
      };
    }

    const threads = label.getThreads(offset, THREAD_PAGE_SIZE);
    if (!threads || threads.length === 0) {
      flushPendingRows_(sheet, pendingRows);
      flushPendingErrorRows_(errorSheet, pendingErrorRows);
      saveProgress_(labelName, { offset: 0, completed: true });
      const updated = getProgress_(labelName);
      return {
        sheetName,
        errorSheetName,
        folderUrl,
        appended,
        appendedErrors,
        skippedDuplicates,
        skippedCanceled,
        skippedParseFailures,
        completed: true,
        progress: updated
      };
    }

    const messages2d = GmailApp.getMessagesForThreads(threads);

    let timeNearlyUp = false;
    for (let i = 0; i < threads.length; i += 1) {
      if (isTimeNearlyUp_(startedAt)) {
        timeNearlyUp = true;
        break;
      }

      let threadCompleted = true;
      const messages = messages2d[i] || [];
      for (const message of messages) {
        if (isTimeNearlyUp_(startedAt)) {
          threadCompleted = false;
          timeNearlyUp = true;
          break;
        }

        if (!isFinalUberReceiptMessage_(message)) {
          continue;
        }

        if (isCanceledReceiptMessage_(message)) {
          skippedCanceled += 1;
          continue;
        }

        const outcome = parseUberReceiptFromMessage_(message);
        if (outcome.status === 'error') {
          skippedParseFailures += 1;
          const messageId = message.getId();
          if (!errorIds.has(messageId)) {
            pendingErrorRows.push(buildErrorRow_(message, outcome.reason));
            errorIds.add(messageId);
            appendedErrors += 1;
            if (pendingErrorRows.length >= WRITE_BATCH_ROWS) {
              flushPendingErrorRows_(errorSheet, pendingErrorRows);
            }
          }
          continue;
        }

        const parsed = outcome.parsed;
        const key = buildUniqueKey_(parsed);
        if (uniqueKeys.has(key)) {
          skippedDuplicates += 1;
          continue;
        }

        const pdfFile = saveReceiptPdf_(message, folder, parsed);
        const pdfUrl = pdfFile.getUrl();

        pendingRows.push([parsed.rideDate, parsed.rideTime, parsed.vehicle, parsed.fare, pdfUrl]);

        uniqueKeys.add(key);
        appended += 1;

        if (pendingRows.length >= WRITE_BATCH_ROWS) {
          flushPendingRows_(sheet, pendingRows);
        }
      }

      if (!threadCompleted) {
        break;
      }

      offset += 1;

      if (offset % SAVE_PROGRESS_EVERY_THREADS === 0) {
        flushPendingRows_(sheet, pendingRows);
        flushPendingErrorRows_(errorSheet, pendingErrorRows);
        saveProgress_(labelName, { offset, completed: false });
      }
    }

    if (timeNearlyUp) {
      flushPendingRows_(sheet, pendingRows);
      flushPendingErrorRows_(errorSheet, pendingErrorRows);
      saveProgress_(labelName, { offset, completed: false });
      const updated = getProgress_(labelName);
      return {
        sheetName,
        errorSheetName,
        folderUrl,
        appended,
        appendedErrors,
        skippedDuplicates,
        skippedCanceled,
        skippedParseFailures,
        completed: false,
        progress: updated
      };
    }
  }
}

/**
 * Flush pending rows to the sheet.
 * @param sheet Target sheet.
 * @param pendingRows Rows to append.
 */
function flushPendingRows_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  pendingRows: (string | number)[][]
): void {
  flushPendingRowsToSheet_(sheet, pendingRows, UBER_HEADERS.length);
}

/**
 * Flush pending error rows to the sheet.
 * @param sheet Target sheet.
 * @param pendingRows Rows to append.
 */
function flushPendingErrorRows_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  pendingRows: (string | number)[][]
): void {
  flushPendingRowsToSheet_(sheet, pendingRows, UBER_ERROR_HEADERS.length);
}

/**
 * Flush pending rows to the target sheet.
 * @param sheet Target sheet.
 * @param pendingRows Rows to append.
 * @param columnCount Column count.
 */
function flushPendingRowsToSheet_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  pendingRows: (string | number)[][],
  columnCount: number
): void {
  if (!pendingRows.length) {
    return;
  }

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, pendingRows.length, columnCount).setValues(pendingRows);
  pendingRows.length = 0;

  try {
    sheet.autoResizeColumns(1, columnCount);
  } catch (error) {
    logInfo('autoResizeColumns failed (non-blocking).', error);
  }

  SpreadsheetApp.flush();
}

/**
 * Build a progress property key for a label.
 * @param labelName Gmail label.
 * @returns Property key.
 */
function progressPropKey_(labelName: string): string {
  const token = Utilities.base64EncodeWebSafe(String(labelName || ''));
  return `UBER_PROGRESS_${token}`;
}

/**
 * Get sync progress from DocumentProperties.
 * @param labelName Gmail label.
 * @returns Progress state.
 */
function getProgress_(labelName: string): ProgressState {
  const props = PropertiesService.getDocumentProperties();
  const key = progressPropKey_(labelName);
  const raw = props.getProperty(key);
  if (!raw) {
    return { offset: 0, completed: false, updatedAt: 0 };
  }

  try {
    const obj = JSON.parse(raw);
    return {
      offset: Number(obj.offset || 0),
      completed: Boolean(obj.completed),
      updatedAt: Number(obj.updatedAt || 0)
    };
  } catch (error) {
    logInfo('Failed to parse progress (resetting).', error);
    return { offset: 0, completed: false, updatedAt: 0 };
  }
}

/**
 * Save sync progress to DocumentProperties.
 * @param labelName Gmail label.
 * @param state Progress state.
 */
function saveProgress_(labelName: string, state: Pick<ProgressState, 'offset' | 'completed'>): void {
  const props = PropertiesService.getDocumentProperties();
  const key = progressPropKey_(labelName);
  const payload: ProgressState = {
    offset: Number(state.offset || 0),
    completed: Boolean(state.completed),
    updatedAt: Date.now()
  };
  props.setProperty(key, JSON.stringify(payload));
}

/**
 * Clear stored progress for a label.
 * @param labelName Gmail label.
 */
function clearProgress_(labelName: string): void {
  const props = PropertiesService.getDocumentProperties();
  const key = progressPropKey_(labelName);
  props.deleteProperty(key);
}

/**
 * Runtime guard.
 * @param startedAt Start timestamp.
 * @returns True if near time limit.
 */
function isTimeNearlyUp_(startedAt: number): boolean {
  return Date.now() - startedAt > MAX_RUNTIME_MS;
}

/**
 * Prompt for Gmail label.
 * @param ui Spreadsheet UI.
 * @param title Prompt title.
 * @returns Label name or null.
 */
function promptLabelName_(ui: GoogleAppsScript.Base.Ui, title: string): string | null {
  const resp = ui.prompt(title, '請輸入 Gmail 標籤名稱（例如 uber202601）', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) {
    return null;
  }

  const labelName = (resp.getResponseText() || '').trim();
  if (!labelName) {
    ui.alert('未輸入標籤名稱，已取消。');
    return null;
  }

  return labelName;
}

/**
 * Create/use Drive folder for label under My Drive root.
 * @param labelName Gmail label name.
 * @returns Drive folder for the label.
 */
function ensureDriveFolderForLabel_(labelName: string): GoogleAppsScript.Drive.Folder {
  const parts = String(labelName)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  let current = DriveApp.getRootFolder();
  const folders = parts.length > 0 ? parts : [labelName];

  folders.forEach((part) => {
    const iter = current.getFoldersByName(part);
    current = iter.hasNext() ? iter.next() : current.createFolder(part);
  });

  return current;
}

/**
 * Create/use sheet tab named as label.
 * @param labelName Gmail label name.
 * @returns Sheet for the label.
 */
function ensureSheetForLabel_(labelName: string): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const desiredName = sanitizeSheetName_(labelName);

  let sheet = spreadsheet.getSheetByName(desiredName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(desiredName);
  }

  return sheet;
}

/**
 * Create/use error sheet tab named as label with suffix.
 * @param labelName Gmail label name.
 * @returns Error sheet for the label.
 */
function ensureErrorSheetForLabel_(labelName: string): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const desiredName = sanitizeSheetName_(`${labelName}_執行錯誤`);

  let sheet = spreadsheet.getSheetByName(desiredName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(desiredName);
  }

  return sheet;
}

/**
 * Ensure header row is correct + set some formatting.
 * @param sheet Sheet to format.
 * @returns Nothing.
 */
function ensureHeaderRow_(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const range = sheet.getRange(1, 1, 1, UBER_HEADERS.length);
  const current = range.getValues()[0];

  const matches = UBER_HEADERS.every((header, index) => String(current[index] || '').trim() === header);

  if (!matches) {
    range.setValues([Array.from(UBER_HEADERS)]);
  }

  sheet.setFrozenRows(1);

  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('B:B').setNumberFormat('@');
  sheet.getRange('C:C').setNumberFormat('@');
  sheet.getRange('D:D').setNumberFormat('0.00');
  sheet.getRange('E:E').setNumberFormat('@');

  return undefined;
}

/**
 * Ensure error header row is correct + set formatting.
 * @param sheet Sheet to format.
 * @returns Nothing.
 */
function ensureErrorHeaderRow_(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const range = sheet.getRange(1, 1, 1, UBER_ERROR_HEADERS.length);
  const current = range.getValues()[0];

  const matches = UBER_ERROR_HEADERS.every((header, index) => String(current[index] || '').trim() === header);

  if (!matches) {
    range.setValues([Array.from(UBER_ERROR_HEADERS)]);
  }

  sheet.setFrozenRows(1);

  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('B:B').setNumberFormat('@');
  sheet.getRange('C:C').setNumberFormat('@');
  sheet.getRange('D:D').setNumberFormat('@');
  sheet.getRange('E:E').setNumberFormat('@');

  return undefined;
}

/**
 * Load existing unique keys from sheet rows.
 * Key = date|time|vehicle|fare(2dp)
 * @param sheet Sheet to read from.
 * @returns Unique key set.
 */
function loadExistingUniqueKeys_(sheet: GoogleAppsScript.Spreadsheet.Sheet): Set<string> {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return new Set();
  }

  const values = sheet.getRange(2, 1, lastRow - 1, UBER_HEADERS.length).getValues();
  const keys = new Set<string>();

  values.forEach((row) => {
    const date = String(row[0] || '').trim();
    const time = String(row[1] || '').trim();
    const vehicle = normalizeVehicle_(String(row[2] || ''));
    const fareKey = formatFareForKey_(row[3]);

    if (!date || !time || !vehicle || !fareKey) {
      return;
    }

    keys.add([date, time, vehicle, fareKey].join('|'));
  });

  return keys;
}

/**
 * Load existing error message ids from sheet rows.
 * @param sheet Sheet to read from.
 * @returns Message id set.
 */
function loadExistingErrorIds_(sheet: GoogleAppsScript.Spreadsheet.Sheet): Set<string> {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return new Set();
  }

  const values = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
  const ids = new Set<string>();

  values.forEach((row) => {
    const id = String(row[0] || '').trim();
    if (id) {
      ids.add(id);
    }
  });

  return ids;
}

/**
 * Parse Uber receipt info from a Gmail message.
 * @param message Gmail message.
 * @returns Parsed receipt outcome.
 */
function parseUberReceiptFromMessage_(
  message: GoogleAppsScript.Gmail.GmailMessage
): ParseOutcome {
  const plain = (message.getPlainBody() || '').replace(/\r\n/g, '\n');
  const html = message.getBody() || '';

  const dt = extractRideDateTime_(plain, html);
  if (!dt) {
    return { status: 'error', reason: '缺少日期/時間' };
  }

  const fare = extractTotalFare_(plain, html);
  if (fare == null || Number.isNaN(fare)) {
    return { status: 'error', reason: '缺少價格' };
  }

  const vehicleRaw = extractVehicle_(plain, html);
  const vehicle = normalizeVehicle_(vehicleRaw || '');
  if (!vehicle) {
    return { status: 'error', reason: '缺少車牌' };
  }

  return {
    status: 'ok',
    parsed: {
      rideDate: dt.rideDate,
      rideTime: dt.rideTime,
      vehicle,
      fare: Number(fare.toFixed(2))
    }
  };
}

/**
 * Build a row for the error sheet.
 * @param message Gmail message.
 * @param reason Failure reason.
 * @returns Row values.
 */
function buildErrorRow_(
  message: GoogleAppsScript.Gmail.GmailMessage,
  reason: string
): (string | number)[] {
  const date = message.getDate();
  const tz = Session.getScriptTimeZone();
  const formatted = Utilities.formatDate(date, tz, 'yyyy-MM-dd HH:mm:ss');
  const subject = message.getSubject() || '';
  const snippet = message.getPlainBody() || message.getBody() || '';
  const trimmedSnippet = String(snippet)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  return [formatted, subject, reason, message.getId(), trimmedSnippet];
}

/**
 * Build unique key: date|time|vehicle|fare(2dp)
 * @param parsed Parsed receipt.
 * @returns Unique key.
 */
function buildUniqueKey_(parsed: ParsedUberReceipt): string {
  return [
    String(parsed.rideDate).trim(),
    String(parsed.rideTime).trim(),
    normalizeVehicle_(parsed.vehicle),
    formatFareForKey_(parsed.fare)
  ].join('|');
}

/**
 * Save message HTML as PDF in folder; reuse if same filename exists.
 * Also sets sharing: anyone with the link can view.
 * @param message Gmail message.
 * @param folder Target Drive folder.
 * @param parsed Parsed receipt.
 * @returns Drive file.
 */
function saveReceiptPdf_(
  message: GoogleAppsScript.Gmail.GmailMessage,
  folder: GoogleAppsScript.Drive.Folder,
  parsed: ParsedUberReceipt
): GoogleAppsScript.Drive.File {
  const fileName = makePdfFileName_(parsed);

  const existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) {
    const file = existing.next();
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (error) {
      logInfo('Failed to update sharing (non-blocking).', error);
    }
    return file;
  }

  const html = message.getBody() || '';
  const blob = Utilities.newBlob(html, MimeType.HTML, fileName).getAs(MimeType.PDF);
  blob.setName(fileName);

  const file = folder.createFile(blob);
  file.setDescription(`Uber receipt PDF from Gmail message ${message.getId()}`);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file;
}

/**
 * Make a deterministic filename from parsed fields.
 * @param parsed Parsed receipt.
 * @returns File name.
 */
function makePdfFileName_(parsed: ParsedUberReceipt): string {
  const date = String(parsed.rideDate).trim();
  const time = String(parsed.rideTime).trim().replace(':', '-');
  const vehicle = normalizeVehicle_(parsed.vehicle).replace(/\s+/g, '');
  const fareKey = formatFareForKey_(parsed.fare);

  const base = `Uber_${date}_${time}_${vehicle}_${fareKey}.pdf`;
  return sanitizeFileName_(base);
}

/**
 * Extract ride date & time from plain body first, fallback to HTML.
 * @param plainBody Plain text body.
 * @param htmlBody Html body.
 * @returns Ride date/time or null.
 */
function extractRideDateTime_(
  plainBody: string,
  htmlBody: string
): { rideDate: string; rideTime: string } | null {
  const text = (plainBody || '').replace(/\r\n/g, '\n');

  const engDateRe =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s+(\d{4})\b/;

  const zhDateRe = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/;

  let rideDate: string | null = null;
  let searchFrom = 0;

  let match = engDateRe.exec(text);
  if (match) {
    const monthNum = monthToNumber_(match[1]);
    if (monthNum == null) {
      return null;
    }
    rideDate = `${match[3]}-${pad2_(monthNum)}-${pad2_(match[2])}`;
    searchFrom = match.index + match[0].length;
  } else {
    match = zhDateRe.exec(text);
    if (match) {
      rideDate = `${match[1]}-${pad2_(match[2])}-${pad2_(match[3])}`;
      searchFrom = match.index + match[0].length;
    }
  }

  if (!rideDate) {
    return extractRideDateTimeFromHtml_(htmlBody || '');
  }

  const tail = text.substring(searchFrom, searchFrom + 300);
  let timeMatch = /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i.exec(tail);
  if (!timeMatch) {
    timeMatch = /\b(\d{1,2}):(\d{2})\b/.exec(tail);
  }

  if (!timeMatch) {
    const tail2 = text.substring(searchFrom);
    timeMatch =
      /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i.exec(tail2) || /\b(\d{1,2}):(\d{2})\b/.exec(tail2);
  }

  if (!timeMatch) {
    return null;
  }

  const rideTime = formatTime_(timeMatch[1], timeMatch[2], timeMatch[3]);
  if (!rideTime) {
    return null;
  }

  return { rideDate, rideTime };
}

/**
 * Fallback date/time extraction from HTML by looking for divs with class="date".
 * @param html Html body.
 * @returns Ride date/time or null.
 */
function extractRideDateTimeFromHtml_(html: string): { rideDate: string; rideTime: string } | null {
  const re = /class(?:=|=3D)"date"[^>]*>([^<]+)</gi;

  const found: string[] = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    const value = String(match[1] || '').trim();
    if (value) {
      found.push(value);
    }
    if (found.length >= 4) {
      break;
    }
  }

  if (found.length < 2) {
    return null;
  }

  const dateStr = found[0];
  const timeStr = found[1];

  const engDateRe =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s+(\d{4})\b/;
  const dateMatch = engDateRe.exec(dateStr);
  if (!dateMatch) {
    return null;
  }

  const monthNum = monthToNumber_(dateMatch[1]);
  if (monthNum == null) {
    return null;
  }
  const rideDate = `${dateMatch[3]}-${pad2_(monthNum)}-${pad2_(dateMatch[2])}`;

  const timeMatch =
    /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i.exec(timeStr) || /\b(\d{1,2}):(\d{2})\b/.exec(timeStr);
  if (!timeMatch) {
    return null;
  }

  const rideTime = formatTime_(timeMatch[1], timeMatch[2], timeMatch[3]);
  if (!rideTime) {
    return null;
  }

  return { rideDate, rideTime };
}

/**
 * Extract total fare number.
 * @param plainBody Plain text body.
 * @param htmlBody Html body.
 * @returns Fare amount or null.
 */
function extractTotalFare_(plainBody: string, htmlBody: string): number | null {
  const text = plainBody || '';

  let match = /\bTotal\s+([A-Z]{0,3}\$|NT\$|HK\$|US\$|SG\$)?\s*([\d,]+(?:\.\d{1,2})?)/i.exec(text);
  if (match) {
    return parseFloat(String(match[2]).replace(/,/g, ''));
  }

  match = /data-testid(?:=|=3D)"total_fare_amount"[^>]*>([^<]+)</i.exec(htmlBody || '');
  if (match) {
    const inner = String(match[1] || '');
    const numberMatch = /([\d,]+(?:\.\d{1,2})?)/.exec(inner);
    if (numberMatch) {
      return parseFloat(String(numberMatch[1]).replace(/,/g, ''));
    }
  }

  match = /Total[^0-9]*([0-9][0-9,]*(?:\.\d{1,2})?)/i.exec(text);
  if (match) {
    return parseFloat(String(match[1]).replace(/,/g, ''));
  }

  return null;
}

/**
 * Extract vehicle id (車號).
 * @param plainBody Plain text body.
 * @param htmlBody Html body.
 * @returns Vehicle string.
 */
function extractVehicle_(plainBody: string, htmlBody: string): string {
  const plainText = (plainBody || '').replace(/\r\n/g, '\n');
  const htmlText = stripHtmlToText_(htmlBody);

  return (
    extractVehicleFromText_(plainText) ||
    extractVehicleFromText_(htmlText) ||
    ''
  );
}

/**
 * Extract vehicle id (車號) from a text blob.
 * @param text Plain text.
 * @returns Vehicle string.
 */
function extractVehicleFromText_(text: string): string {
  const normalized = (text || '').replace(/\r\n/g, '\n');

  let match = /License Plate:\s*([A-Za-z0-9-]+)/i.exec(normalized);
  if (match) {
    return match[1].trim();
  }

  match = /車牌[:：]\s*([^\n\r]+)/.exec(normalized);
  if (match) {
    return String(match[1] || '').trim();
  }

  match = /Rental company:\s*([^\n\r]+)/i.exec(normalized);
  if (match) {
    let line = String(match[1] || '').trim();
    line = line.split(',')[0].trim();
    line = normalizeFullWidth_(line).replace(/臺/g, '台');

    const cityRe =
      /(台北|新北|桃園|基隆|台中|高雄|台南|新竹|嘉義|彰化|南投|宜蘭|花蓮|台東)-[A-Za-z0-9-]+/;
    const cityMatch = cityRe.exec(line);
    if (cityMatch) {
      return cityMatch[0];
    }

    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      return tokens[tokens.length - 1];
    }

    return line;
  }

  return '';
}

/**
 * Check whether the message is a paid Uber receipt email.
 * @param message Gmail message.
 * @returns True if it looks like a final receipt email.
 */
function isFinalUberReceiptMessage_(message: GoogleAppsScript.Gmail.GmailMessage): boolean {
  const plain = message.getPlainBody() || '';
  const html = message.getBody() || '';
  const htmlText = stripHtmlToText_(html);
  const combined = `${plain}\n${htmlText}`.toLowerCase().replace(/\s+/g, ' ').trim();

  const receiptIndicators = [
    'download the receipt in a pdf format',
    'download trip receipt pdf',
    'download trip receipt'
  ];

  const chargeSummaryIndicators = ['this is your charge summary', 'this is not a payment receipt'];
  const isChargeSummary = chargeSummaryIndicators.some((text) => combined.includes(text));
  if (isChargeSummary) {
    return false;
  }

  const hasReceiptDownload = receiptIndicators.some((text) => combined.includes(text));
  if (hasReceiptDownload) {
    return true;
  }

  return true;
}

/**
 * Check whether message is a canceled trip receipt.
 * @param message Gmail message.
 * @returns True if it looks like a canceled receipt.
 */
function isCanceledReceiptMessage_(message: GoogleAppsScript.Gmail.GmailMessage): boolean {
  const plain = message.getPlainBody() || '';
  const html = message.getBody() || '';
  const htmlText = stripHtmlToText_(html);
  const combined = `${plain}\n${htmlText}`.toLowerCase().replace(/\s+/g, ' ').trim();

  const canceledIndicators = [
    'canceled',
    'cancelled',
    'cancellation fee',
    '取消',
    '已取消'
  ];

  return canceledIndicators.some((text) => combined.includes(text));
}

/**
 * Strip HTML to plain-ish text.
 * @param html Html content.
 * @returns Text content.
 */
function stripHtmlToText_(html: string): string {
  if (!html) {
    return '';
  }

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pads a value to 2 digits.
 * @param value Value to pad.
 * @returns Padded string.
 */
function pad2_(value: string | number): string {
  return String(value).padStart(2, '0');
}

/**
 * Converts a month name to month number.
 * @param monthName Month name string.
 * @returns Month number or null.
 */
function monthToNumber_(monthName: string): number | null {
  const key = String(monthName || '').slice(0, 3).toLowerCase();
  const map: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12
  };
  return map[key] ?? null;
}

/**
 * Convert (h, m, AM/PM) to "HH:mm".
 * @param hStr Hour string.
 * @param mStr Minute string.
 * @param ampm Optional AM/PM.
 * @returns Time string.
 */
function formatTime_(hStr: string, mStr: string, ampm?: string): string {
  let hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);

  if (!Number.isNaN(hours) && ampm) {
    const upper = String(ampm).toUpperCase();
    if (upper === 'PM' && hours < 12) {
      hours += 12;
    }
    if (upper === 'AM' && hours === 12) {
      hours = 0;
    }
  }

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return '';
  }

  return `${pad2_(hours)}:${pad2_(minutes)}`;
}

/**
 * Normalize fullwidth digits/letters and hyphens to halfwidth/ascii.
 * @param input Input string.
 * @returns Normalized string.
 */
function normalizeFullWidth_(input: string): string {
  let value = String(input || '');

  value = value.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  value = value.replace(/[Ａ-Ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  value = value.replace(/[ａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  value = value.replace(/[－–—]/g, '-');
  value = value.replace(/\s+/g, ' ').trim();

  return value;
}

/**
 * Vehicle normalization for keys and filenames.
 * @param vehicle Vehicle string.
 * @returns Normalized vehicle.
 */
function normalizeVehicle_(vehicle: string): string {
  let value = normalizeFullWidth_(vehicle || '');
  value = value.replace(/臺/g, '台');
  value = value.replace(/[，,]$/, '');
  value = value.trim();
  return value;
}

/**
 * Fare normalization for unique key.
 * @param fareValue Fare value.
 * @returns Normalized fare string.
 */
function formatFareForKey_(fareValue: number | string): string {
  let numberValue: number;

  if (typeof fareValue === 'number') {
    numberValue = fareValue;
  } else {
    const match = /([\d,]+(?:\.\d{1,2})?)/.exec(String(fareValue || ''));
    if (!match) {
      return '';
    }
    numberValue = parseFloat(String(match[1]).replace(/,/g, ''));
  }

  if (Number.isNaN(numberValue)) {
    return '';
  }

  return Number(numberValue).toFixed(2);
}

/**
 * Sanitize filename for Drive compatibility.
 * @param name File name.
 * @returns Sanitized file name.
 */
function sanitizeFileName_(name: string): string {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

/**
 * Sanitize sheet name (Google Sheets has restrictions).
 * @param name Sheet name.
 * @returns Sanitized sheet name.
 */
function sanitizeSheetName_(name: string): string {
  let value = String(name || '').trim();
  value = value.replace(/[\\/?*[\]:]/g, '_');

  if (value.length > 100) {
    value = value.slice(0, 100);
  }

  if (!value) {
    value = 'UberReceipts';
  }

  return value;
}
