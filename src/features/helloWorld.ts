import { logError, logInfo } from '../lib/logger';

/**
 * Returns a friendly message for demo / smoke testing.
 * @returns A hello-world message.
 */
function buildHelloWorldMessage(): string {
  const now = new Date();
  return `Hello from Apps Script 👋 (built at ${now.toISOString()})`;
}

/**
 * Demo entrypoint you can run from the Apps Script editor or from a custom menu.
 * - Logs a message
 * - Tries to show an alert if the script is container-bound to a Spreadsheet
 * @returns Nothing.
 */
export function helloWorld(): void {
  const message = buildHelloWorldMessage();
  logInfo('helloWorld()', { message });

  // If this project is container-bound (e.g., Google Sheets), show an alert.
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (err) {
    // Standalone scripts won't have Spreadsheet UI available.
    logError('Unable to show Spreadsheet UI alert (standalone project?)', err);
  }

  return undefined;
}
