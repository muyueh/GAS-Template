import { logInfo } from '../lib/logger';

/**
 * Installs a time-driven trigger that runs once per day.
 *
 * Important:
 * - The handler function must be exposed as a global function in Apps Script.
 *   (See src/lib/registerGlobals.ts)
 *
 * @param {string} handlerFunctionName - Name of the global function to run.
 * @param {number} hour - Hour of day in the script's timezone (0-23).
 * @returns {GoogleAppsScript.Script.Trigger} The created trigger.
 */
export function installDailyTrigger(
  handlerFunctionName: string,
  hour: number
): GoogleAppsScript.Script.Trigger {
  logInfo('Installing daily trigger', { handlerFunctionName, hour });

  const trigger = ScriptApp.newTrigger(handlerFunctionName)
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();

  return trigger;
}

/**
 * Deletes all triggers for the current script project.
 *
 * @returns {void} Nothing.
 */
export function deleteAllTriggers(): void {
  logInfo('Deleting all triggers');

  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    ScriptApp.deleteTrigger(t);
  }
}
