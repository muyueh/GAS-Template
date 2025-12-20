import { logInfo } from '../lib/logger';

/**
 * Appends a row to the active sheet.
 * @param values Values to append (one row).
 * @returns Nothing.
 */
export function appendRowToActiveSheet(values: (string | number | boolean | Date)[]): void {
  logInfo('appendRowToActiveSheet()', { valuesCount: values.length });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow(values);

  return undefined;
}

/**
 * Gets the active spreadsheet name (container-bound scripts only).
 * @returns Spreadsheet name.
 */
export function getActiveSpreadsheetName(): string {
  logInfo('getActiveSpreadsheetName()');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getName();
}
