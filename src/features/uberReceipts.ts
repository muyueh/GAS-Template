import { getOrCreateFolder, getRootFolder } from './drive';
import { logError, logInfo } from '../lib/logger';

const SHEET_HEADERS = ['車牌', '日期', '時間', '費用', 'PDF 連結網址'] as const;
const SCRIPT_PROPERTY_KEY = 'uberReceiptMessageIds';
const DEFAULT_FOLDER_NAME = 'Uber Receipts';
const DEFAULT_SPREADSHEET_NAME = 'Uber Receipts';

interface UberReceiptRow {
  licensePlate: string;
  date: string;
  time: string;
  fare: string;
  pdfUrl: string;
  messageId: string;
}

/**
 * Fetches Uber receipts from Gmail (last 14 days), converts them to PDF in Drive,
 * and appends summary rows into a Spreadsheet.
 *
 * Columns: 車牌、日期、時間、費用、PDF 連結網址
 *
 * Steps:
 * 1. Search Gmail for Uber receipts newer than 14 days.
 * 2. Convert each message body to PDF and store it in Drive.
 * 3. Append a summary row to the target Sheet (avoid duplicates by Gmail message ID).
 * @returns Nothing.
 */
export function syncUberReceipts(): void {
  logInfo('syncUberReceipts()');

  const messages = findRecentUberMessages();
  if (messages.length === 0) {
    logInfo('No Uber receipts found within 14 days.');
    return;
  }

  const driveFolder = ensureTargetFolder();
  const sheet = ensureTargetSheet(driveFolder);
  const processedIds = loadProcessedMessageIds();

  const timeZone = Session.getScriptTimeZone();
  const newRows: UberReceiptRow[] = [];

  messages.forEach((message) => {
    const messageId = message.getId();
    if (processedIds.has(messageId)) {
      return;
    }

    try {
      const rawDate = message.getDate();
      const sentAt = new Date(rawDate.getTime());
      const date = Utilities.formatDate(sentAt, timeZone, 'yyyy-MM-dd');
      const time = Utilities.formatDate(sentAt, timeZone, 'HH:mm');
      const details = parseReceiptDetails(message);
      const pdfFile = saveMessageAsPdf(message, driveFolder, sentAt);

      newRows.push({
        licensePlate: details.licensePlate,
        date,
        time,
        fare: details.fare,
        pdfUrl: pdfFile.getUrl(),
        messageId
      });

      processedIds.add(messageId);
    } catch (error) {
      logError('Failed to process Uber receipt message.', { messageId, error });
    }
  });

  if (newRows.length === 0) {
    logInfo('No new Uber receipts to record.');
    return;
  }

  appendRows(sheet, newRows);
  persistProcessedMessageIds(processedIds);

  logInfo('syncUberReceipts() completed', { appended: newRows.length });

  return undefined;
}

/**
 * Finds Uber receipt messages in the last 14 days.
 * @returns Messages (one per thread, last message).
 */
function findRecentUberMessages(): GoogleAppsScript.Gmail.GmailMessage[] {
  const query = 'newer_than:14d from:(noreply@uber.com)';
  const threads = GmailApp.search(query);
  const messages: GoogleAppsScript.Gmail.GmailMessage[] = [];

  threads.forEach((thread) => {
    const threadMessages = thread.getMessages();
    messages.push(threadMessages[threadMessages.length - 1]);
  });

  return messages;
}

/**
 * Ensures the Drive folder for storing receipts exists.
 * @returns Target folder.
 */
function ensureTargetFolder(): GoogleAppsScript.Drive.Folder {
  const root = getRootFolder();
  return getOrCreateFolder(root, DEFAULT_FOLDER_NAME);
}

/**
 * Ensures the spreadsheet and header row are ready.
 * @param folder Drive folder to search/create the spreadsheet in.
 * @returns Sheet for appending data.
 */
function ensureTargetSheet(folder: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = findOrCreateSpreadsheet(folder, DEFAULT_SPREADSHEET_NAME);
  const sheet = spreadsheet.getSheets()[0];

  ensureHeaderRow(sheet);

  return sheet;
}

/**
 * Finds or creates the spreadsheet used to store receipt metadata.
 * @param folder Drive folder to place the spreadsheet in.
 * @param name Spreadsheet name.
 * @returns The spreadsheet instance.
 */
function findOrCreateSpreadsheet(
  folder: GoogleAppsScript.Drive.Folder,
  name: string
): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const files = folder.getFilesByName(name);
  if (files.hasNext()) {
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }

  const newSpreadsheet = SpreadsheetApp.create(name);
  const newFile = DriveApp.getFileById(newSpreadsheet.getId());
  folder.addFile(newFile);

  // Keep Drive tidy: remove the file from root if we can.
  try {
    DriveApp.getRootFolder().removeFile(newFile);
  } catch (error) {
    logError('Failed to remove spreadsheet from root folder (non-blocking).', error);
  }

  return newSpreadsheet;
}

/**
 * Writes the header row if it is missing or incorrect.
 * @param sheet Target sheet.
 * @returns Nothing.
 */
function ensureHeaderRow(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
  const current = headerRange.getValues()[0];

  const hasHeader =
    current.filter((value) => String(value).trim().length > 0).length === SHEET_HEADERS.length &&
    SHEET_HEADERS.every((header, index) => current[index] === header);

  if (!hasHeader) {
    headerRange.setValues([Array.from(SHEET_HEADERS)]);
  }

  return undefined;
}

/**
 * Extracts the license plate and fare from a Gmail message body.
 * Falls back to placeholders when data is missing.
 * @param message Gmail message.
 * @returns Receipt details.
 */
function parseReceiptDetails(message: GoogleAppsScript.Gmail.GmailMessage): {
  licensePlate: string;
  fare: string;
} {
  const plainBody = message.getPlainBody();

  const licensePlate =
    plainBody.match(/License Plate:\s*([A-Za-z0-9-]+)/i)?.[1].trim() ??
    plainBody.match(/車牌[:：]\s*([^\n\r]+)/)?.[1].trim() ??
    plainBody.match(/Rental company:\s*([^\n\r]+)/i)?.[1].trim() ??
    '未知';

  const fare =
    plainBody.match(/Total\s+([A-Z]*\$?\s?[\d,.]+(?:\.\d{2})?)/i)?.[1].replace(/\s+/g, '') ?? '未標示';

  return { licensePlate, fare };
}

/**
 * Saves the Gmail message body as a PDF file in Drive.
 * @param message Gmail message to convert.
 * @param folder Destination Drive folder.
 * @param sentAt Message sent time (for filename).
 * @returns Created Drive file.
 */
function saveMessageAsPdf(
  message: GoogleAppsScript.Gmail.GmailMessage,
  folder: GoogleAppsScript.Drive.Folder,
  sentAt: Date
): GoogleAppsScript.Drive.File {
  const safeSubject = message.getSubject().replace(/[\\/:*?"<>|]/g, '_');
  const timeZone = Session.getScriptTimeZone();
  const timestamp = Utilities.formatDate(sentAt, timeZone, 'yyyyMMdd-HHmm');
  const fileName = `Uber-Receipt-${timestamp}-${safeSubject}.pdf`;

  const blob = Utilities.newBlob(message.getBody(), 'text/html', fileName).getAs('application/pdf');
  const file = folder.createFile(blob);
  file.setDescription(`Uber receipt from Gmail message ${message.getId()}`);

  return file;
}

/**
 * Appends data rows to the sheet.
 * @param sheet Target sheet.
 * @param rows Receipt rows to append.
 * @returns Nothing.
 */
function appendRows(sheet: GoogleAppsScript.Spreadsheet.Sheet, rows: UberReceiptRow[]): void {
  const values = rows.map((row) => [row.licensePlate, row.date, row.time, row.fare, row.pdfUrl]);
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, SHEET_HEADERS.length).setValues(values);

  return undefined;
}

/**
 * Loads previously processed Gmail message IDs from script properties.
 * @returns A set of processed IDs.
 */
function loadProcessedMessageIds(): Set<string> {
  const raw = PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTY_KEY);
  if (!raw) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch (error) {
    logError('Failed to parse stored message IDs. Resetting state.', error);
    return new Set();
  }
}

/**
 * Persists processed Gmail message IDs to script properties.
 * @param ids IDs to store.
 * @returns Nothing.
 */
function persistProcessedMessageIds(ids: Set<string>): void {
  const serialized = JSON.stringify(Array.from(ids));
  PropertiesService.getScriptProperties().setProperty(SCRIPT_PROPERTY_KEY, serialized);

  return undefined;
}
