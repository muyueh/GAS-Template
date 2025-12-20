import { logInfo } from '../lib/logger';

/**
 * Appends a row to the active sheet.
 *
 * @param {(string | number | boolean | Date)[]} values - Values to append (one row).
 * @returns {void} Nothing.
 */
export function appendRowToActiveSheet(values: (string | number | boolean | Date)[]): void {
  logInfo('appendRowToActiveSheet()', { valuesCount: values.length });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow(values);
}

/**
 * Gets the active spreadsheet name (container-bound scripts only).
 *
 * @returns {string} Spreadsheet name.
 */
export function getActiveSpreadsheetName(): string {
  logInfo('getActiveSpreadsheetName()');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getName();
}
