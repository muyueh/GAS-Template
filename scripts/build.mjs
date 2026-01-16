/* global console, process */
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const entrypointWrappers = [
  '',
  '/**',
  ' * Apps Script entrypoints (top-level wrappers).',
  ' * 這些必須是全域 function 宣告，Apps Script 才能發現/呼叫。',
  ' */',
  'function helloScript() {',
  '  return globalThis.__GAS_TEMPLATE__.helloScript();',
  '}',
  'function onOpen(e) {',
  '  return globalThis.__GAS_TEMPLATE__.onOpen(e);',
  '}',
  'function generateSpeakerFeedbackForm() {',
  '  return globalThis.__GAS_TEMPLATE__.generateSpeakerFeedbackForm();',
  '}',
  'function uiPromptAndSyncUberReceipts() {',
  '  return globalThis.__GAS_TEMPLATE__.uiPromptAndSyncUberReceipts();',
  '}',
  'function uiPromptAndShowProgress() {',
  '  return globalThis.__GAS_TEMPLATE__.uiPromptAndShowProgress();',
  '}',
  'function uiPromptAndResetProgress() {',
  '  return globalThis.__GAS_TEMPLATE__.uiPromptAndResetProgress();',
  '}',
  ''
].join('\n');

/**
 * Recursively copies files from one directory to another.
 * @param fromDir Source directory path.
 * @param toDir Destination directory path.
 * @param shouldCopyFile Predicate to decide which files to copy.
 * @returns Nothing.
 */
function copyDir(fromDir, toDir, shouldCopyFile) {
  mkdirSync(toDir, { recursive: true });
  for (const name of readdirSync(fromDir)) {
    const from = path.join(fromDir, name);
    const to = path.join(toDir, name);
    const st = statSync(from);

    if (st.isDirectory()) {
      copyDir(from, to, shouldCopyFile);
      continue;
    }

    if (shouldCopyFile(name)) {
      cpSync(from, to);
    }
  }

  return undefined;
}

/**
 * Builds TypeScript sources into Apps Script compatible JavaScript under /dist.
 *
 * Output:
 * - dist/Code.js (bundled JS, no modules)
 * - dist/appsscript.json (manifest)
 * - dist/*.html (optional UI files from src/ui)
 * @returns Resolves when build is complete.
 */
async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(__dirname, '..');
  const srcDir = path.join(projectRoot, 'src');
  const distDir = path.join(projectRoot, 'dist');

  // Clean dist
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  // Bundle TS -> JS for Apps Script
  await build({
    entryPoints: [path.join(srcDir, 'index.ts')],
    bundle: true,
    platform: 'neutral',
    format: 'iife',
    target: 'es2021',
    outfile: path.join(distDir, 'Code.js'),
    tsconfig: path.join(projectRoot, 'tsconfig.json'),
    sourcemap: false,
    minify: false,
    footer: { js: entrypointWrappers }
  });

  // Copy Apps Script manifest
  const manifestSrc = path.join(projectRoot, 'appsscript.json');
  if (!existsSync(manifestSrc)) {
    throw new Error('Missing appsscript.json at repo root.');
  }
  cpSync(manifestSrc, path.join(distDir, 'appsscript.json'));

  // Copy optional HTML files (src/ui/*.html) into dist root
  const uiDir = path.join(srcDir, 'ui');
  if (existsSync(uiDir)) {
    copyDir(uiDir, distDir, (name) => name.endsWith('.html'));
  }

  return undefined;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
