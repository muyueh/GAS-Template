const MENU_NAME = '表單產生器';
const MENU_CREATE_FORM = '生成講者回饋表單';

/**
 * Adds a custom menu to a container-bound Spreadsheet when it is opened.
 * Note: This only runs automatically if the Apps Script project is bound to a
 * Google Sheet and the user has authorization.
 * @param _e Apps Script onOpen event.
 * @returns Nothing.
 */
export function onOpen(_e: GoogleAppsScript.Events.SheetsOnOpen): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(MENU_NAME).addItem(MENU_CREATE_FORM, 'generateSpeakerFeedbackForm').addToUi();

  return undefined;
}
