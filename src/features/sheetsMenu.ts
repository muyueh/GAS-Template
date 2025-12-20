import { logInfo } from '../lib/logger';

/**
 * Adds a custom menu to a container-bound Spreadsheet when it is opened.
 *
 * Note: This only runs automatically if the Apps Script project is bound to a
 * Google Sheet and the user has authorization.
 *
 * @param {GoogleAppsScript.Events.SheetsOnOpen} _e - Apps Script onOpen event.
 * @returns {void} Nothing.
 */
export function onOpen(_e: GoogleAppsScript.Events.SheetsOnOpen): void {
  logInfo('onOpen() fired - adding custom menu');

  const ui = SpreadsheetApp.getUi();
  ui.createMenu('GAS Template')
    .addItem('Hello World', 'helloWorld')
    .addToUi();
}
