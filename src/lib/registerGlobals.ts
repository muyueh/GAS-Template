import { doGet } from '../features/webapp';
import { onOpen } from '../features/sheetsMenu';
import { helloWorld } from '../features/helloWorld';

/**
 * The global object shape we use to attach Apps Script entrypoints.
 */
type GlobalScope = Record<string, unknown>;

/**
 * Exposes selected functions to the Apps Script global scope.
 *
 * Why this exists:
 * - Apps Script expects trigger/menu entrypoints to be global functions.
 * - Our build bundles TypeScript into a single IIFE (no modules), so we explicitly
 *   attach entrypoints to `globalThis`.
 *
 * @returns {void} Nothing.
 */
export function registerGlobalFunctions(): void {
  const g = globalThis as unknown as GlobalScope;

  // ---- Always-on demo entrypoints (safe to keep) ----
  g.helloWorld = helloWorld;

  // ---- Optional entrypoints (comment out if you don't need them) ----
  g.onOpen = onOpen;
  g.doGet = doGet;

  // Add your own exports here, e.g.:
  // g.runDailyJob = runDailyJob;
}
