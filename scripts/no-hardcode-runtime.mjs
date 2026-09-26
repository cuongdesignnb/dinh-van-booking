import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'docs', 'data-audit', 'no-hardcode-report.json');
const roots = ['src/app', 'src/components', 'src/lib', 'src/config'];
const ignored = new Set(['node_modules', '.next', 'dist', '__tests__', 'test', 'tests']);
const patterns = [
  { kind: 'fixture-import', re: /@\/data\/(?:stays|combos|destinations|reviews|home-fixtures|admin)/ },
  { kind: 'browser-admin-store', re: /dvb:admin|localStorage/ },
  { kind: 'demo-runtime-branch', re: /(?:readParam\([^)]*['"]demo['"]|demo-preview|fixture-error|buildAdminData)/ },
  { kind: 'demo-flag', re: /isDemo\s*:\s*true/ },
];

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return /\.(tsx?|mjs)$/.test(entry.name) ? [path] : [];
  });
}

const findings = [];
for (const rootPath of roots.flatMap((path) => filesUnder(join(root, path)))) {
  const lines = readFileSync(rootPath, 'utf8').split(/\r?\n/);
  const relativePath = relative(root, rootPath).replaceAll('\\', '/');
  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      if (!pattern.re.test(line)) continue;
      const typeOnlyFixtureImport =
        pattern.kind === 'fixture-import' && /^\s*import\s+type\b/.test(line);
      const guestPreference =
        pattern.kind === 'browser-admin-store' && relativePath === 'src/lib/favorites.ts';
      const legacyAdmin =
        relativePath.startsWith('src/components/admin/') || relativePath.startsWith('src/lib/admin/');
      const classification = typeOnlyFixtureImport
        ? 'type-only-review'
        : guestPreference
          ? 'allowed-guest-preference'
          : legacyAdmin
            ? 'legacy-admin-review'
            : /admin|fixture|data\/(?:stays|combos|destinations|reviews)/.test(relativePath)
              ? 'legacy-or-allowed-review'
              : 'runtime-review';
      findings.push({
        file: relativePath,
        line: index + 1,
        kind: pattern.kind,
        classification,
        scope: typeOnlyFixtureImport
          ? 'runtime-type-only'
          : guestPreference
            ? 'guest-ui-preference'
            : legacyAdmin
              ? 'legacy-admin-or-compatibility'
              : 'runtime',
        disposition: typeOnlyFixtureImport
          ? 'allowed: erased type import; no runtime fixture dependency'
          : guestPreference
            ? 'allowed: local ID preference only; no PII or business record'
            : legacyAdmin
              ? 'blocker: replace legacy fixture screen with authenticated API/DB flow before production'
              : 'blocker: review and remove from production runtime',
        evidence: typeOnlyFixtureImport
          ? 'import type is erased by the TypeScript build'
          : guestPreference
            ? 'favorites module stores IDs only'
            : legacyAdmin
              ? 'legacy admin module still imports fixture clock/data'
              : 'pattern hit in a scanned runtime root',
        excerpt: line.trim().slice(0, 240),
      });
    }
  });
}

let baseSha = 'unknown';
try {
  baseSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
} catch {
  // The report is still useful outside a git checkout.
}

const report = {
  generatedAt: new Date().toISOString(),
  baseSha,
  policy: 'Runtime public/admin paths must not read commercial fixture records or browser-persisted business data.',
  scannedRoots: roots,
  findingCount: findings.length,
  findings,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log('wrote ' + relative(root, output) + ' (' + findings.length + ' findings)');
