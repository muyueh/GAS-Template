/**
 * Lightweight logger helpers for Apps Script.
 *
 * Apps Script supports `Logger.log` and also `console.log` under V8 runtime.
 */

/**
 * Logs an informational message.
 * @param message Human-readable log message.
 * @param data Optional extra data (will be JSON stringified when possible).
 * @returns Nothing.
 */
export function logInfo(message: string, data?: unknown): void {
  const suffix = data === undefined ? '' : ` | data=${safeJson(data)}`;
  // Logger.log is the most consistent in Apps Script executions.
  Logger.log(`[INFO] ${message}${suffix}`);

  return undefined;
}

/**
 * Logs an error message.
 * @param message Human-readable error message.
 * @param error Optional error value (Error object, string, etc).
 * @returns Nothing.
 */
export function logError(message: string, error?: unknown): void {
  const suffix = error === undefined ? '' : ` | error=${safeJson(error)}`;
  Logger.log(`[ERROR] ${message}${suffix}`);

  return undefined;
}

/**
 * Best-effort JSON stringification that never throws.
 * @param value Any value.
 * @returns A safe string representation.
 */
function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
