import { doGet } from '../features/webapp';
import { onOpen } from '../features/sheetsMenu';
import { helloWorld } from '../features/helloWorld';
import { createQuestionTypeShowcase, createTenQuestionForm } from '../features/formBuilder';
import { createSlidesFeatureShowcase } from '../features/slidesShowcase';
import { createSheetsComponentShowcase } from '../features/sheetsComponentsShowcase';
import { syncUberReceipts } from '../features/uberReceipts';

type Entrypoints = {
  helloWorld: typeof helloWorld;
  createQuestionTypeShowcase: typeof createQuestionTypeShowcase;
  createTenQuestionForm: typeof createTenQuestionForm;
  createSlidesFeatureShowcase: typeof createSlidesFeatureShowcase;
  createSheetsComponentShowcase: typeof createSheetsComponentShowcase;
  syncUberReceipts: typeof syncUberReceipts;
  onOpen: typeof onOpen;
  doGet: typeof doGet;
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

  // ---- Always-on demo entrypoints (safe to keep) ----
  namespace.helloWorld = helloWorld;
  namespace.createQuestionTypeShowcase = createQuestionTypeShowcase;
  namespace.createTenQuestionForm = createTenQuestionForm;
  namespace.createSlidesFeatureShowcase = createSlidesFeatureShowcase;
  namespace.createSheetsComponentShowcase = createSheetsComponentShowcase;
  namespace.syncUberReceipts = syncUberReceipts;

  // ---- Optional entrypoints (comment out if you don't need them) ----
  namespace.onOpen = onOpen;
  namespace.doGet = doGet;

  g.__GAS_TEMPLATE__ = namespace;
  // Add your own exports here, e.g.:
  // g.runDailyJob = runDailyJob;

  return undefined;
}
