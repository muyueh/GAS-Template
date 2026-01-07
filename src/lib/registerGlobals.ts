import { onOpen } from '../features/sheetsMenu';
import { uiPromptAndSyncUberReceipts } from '../features/uberReceipts';
import { helloScript } from '../features/helloScript';

type Entrypoints = {
  helloScript: typeof helloScript;
  onOpen: typeof onOpen;
  uiPromptAndSyncUberReceipts: typeof uiPromptAndSyncUberReceipts;
};

type GlobalScope = typeof globalThis & {
  __GAS_TEMPLATE__?: Partial<Entrypoints>;
};

/**
 * Exposes selected functions to the Apps Script global scope.
 * Why this exists:
 * - Apps Script expects trigger/menu entrypoints to be global functions.
 * - Our build bundles TypeScript into a single IIFE (no modules), so we explicitly
 *   attach entrypoints to `globalThis`.
 * @returns Nothing.
 */
export function registerGlobalFunctions(): void {
  const g = globalThis as GlobalScope;
  const namespace = g.__GAS_TEMPLATE__ ?? {};

  namespace.helloScript = helloScript;
  namespace.onOpen = onOpen;
  namespace.uiPromptAndSyncUberReceipts = uiPromptAndSyncUberReceipts;

  g.__GAS_TEMPLATE__ = namespace;
  // Add your own exports here, e.g.:
  // g.runDailyJob = runDailyJob;

  return undefined;
}
