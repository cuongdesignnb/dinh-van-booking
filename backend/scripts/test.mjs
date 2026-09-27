import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = resolve(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
const outputRoot = join(backendRoot, 'dist');

function findSpecs(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findSpecs(path);
    return entry.isFile() && entry.name.endsWith('.spec.js') ? [path] : [];
  });
}

const specs = findSpecs(outputRoot).sort();
if (!specs.length) {
  console.error('No compiled backend specs found; run npm run build first.');
  process.exit(1);
}
execFileSync(process.execPath, ['--test', ...specs], { cwd: backendRoot, stdio: 'inherit' });
