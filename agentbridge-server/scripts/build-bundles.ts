/**
 * AgentBridge Server — Build Bundles
 * Copies injectable script bundles from src/engine/scripts/ to dist/engine/scripts/.
 *
 * The scripts are raw JS files that get injected via page.evaluate(),
 * so they don't go through TypeScript compilation. We just copy them.
 */

import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const srcDir = resolve(projectRoot, 'src', 'engine', 'scripts');
const distDir = resolve(projectRoot, 'dist', 'engine', 'scripts');

// Ensure output directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy all .js files from src/engine/scripts/ to dist/engine/scripts/
const files = readdirSync(srcDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const src = resolve(srcDir, file);
  const dest = resolve(distDir, file);
  copyFileSync(src, dest);
  console.log(`  ✓ Copied ${file}`);
}

console.log(`\n  ${files.length} bundle(s) copied to dist/engine/scripts/`);
