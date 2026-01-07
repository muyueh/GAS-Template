import { logInfo } from '../lib/logger';

const MENU_NAME = 'Uber 收據';
const MENU_IMPORT = '匯入 Uber 收據（輸入 Gmail 標籤）';

/**
 * Adds a custom menu to a container-bound Spreadsheet when it is opened.
 * Note: This only runs automatically if the Apps Script project is bound to a
 * Google Sheet and the user has authorization.
 * @param _e Apps Script onOpen event.
 * @returns Nothing.
 */
export function onOpen(_e: GoogleAppsScript.Events.SheetsOnOpen): void {
  logInfo('onOpen() fired - adding custom menu');

  const ui = SpreadsheetApp.getUi();
  ui.createMenu(MENU_NAME).addItem(MENU_IMPORT, 'uiPromptAndSyncUberReceipts').addToUi();

  return undefined;
}
