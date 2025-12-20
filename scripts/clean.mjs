import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Removes the generated /dist folder.
 *
 * @returns {void} Nothing.
 */
function clean() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');

  rmSync(distDir, { recursive: true, force: true });
}

clean();
