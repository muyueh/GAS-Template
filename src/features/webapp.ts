import { logInfo } from '../lib/logger';

/**
 * Web App GET handler.
 *
 * If you deploy this script as a Web App, Apps Script will call `doGet`.
 *
 * @param {GoogleAppsScript.Events.DoGet} e - The GET request event.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} An HTML response.
 */
export function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  logInfo('doGet()', { parameters: e?.parameter ?? {} });

  // Uses dist/index.html (copied from src/ui/index.html by the build script).
  const html = HtmlService.createHtmlOutputFromFile('index');
  html.setTitle('GAS Template Web App');
  return html;
}
