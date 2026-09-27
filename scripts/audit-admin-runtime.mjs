import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const adminRoot = join(root, 'src', 'app', 'admin');
const evidencePath = join(root, 'docs', 'admin', 'ADMIN_RUNTIME_AUDIT_2026-09-27.json');
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css']);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function resolveLocalImport(from, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/')
    ? join(root, 'src', specifier.slice(2))
    : resolve(dirname(from), specifier);
  const candidates = extname(base)
    ? [base]
    : [...codeExtensions].map((extension) => `${base}${extension}`).concat([...codeExtensions].map((extension) => join(base, `index${extension}`)));
  return candidates.find((candidate) => existsSync(candidate) && codeExtensions.has(extname(candidate))) ?? null;
}

const routeFiles = walk(adminRoot).filter((path) => /(?:^|[\\/])(?:page|layout)\.(?:tsx?|jsx?)$/.test(path));
const seen = new Set();
const queue = [...routeFiles];
const unresolved = [];
const importPattern = /\bfrom\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

while (queue.length) {
  const path = queue.pop();
  if (seen.has(path)) continue;
  seen.add(path);
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue;
    const target = resolveLocalImport(path, specifier);
    if (target) queue.push(target);
    else unresolved.push({ file: relative(root, path).replaceAll('\\', '/'), specifier });
  }
}

const reachable = [...seen].map((path) => ({
  path,
  relative: relative(root, path).replaceAll('\\', '/'),
  source: readFileSync(path, 'utf8'),
}));
const matches = (pattern) => reachable.flatMap(({ relative: path, source }) => {
  const count = [...source.matchAll(pattern)].length;
  return count ? [{ path, count }] : [];
});
const pending = matches(/<PendingModule\b|\bPendingModule\s*\(/g);
const demoComponents = reachable.filter(({ relative: path }) => /(?:^|\/)(?:demo|fixtures?|mock)(?:\/|\.|-)/i.test(path)).map(({ relative: path }) => path);
const fixtureFallbacks = matches(/(?:from\s*["'][^"']*(?:fixture|mock-data|demo-data)[^"']*["']|\b(?:fixtureFallback|fallbackToDemo|mockData|demoData)\b)/gi);
const localStorageBusiness = matches(/localStorage\.(?:setItem|removeItem|clear)\s*\(/g);
const fakeKpis = matches(/\b(?:fake|mock|demo|sample)[A-Za-z_-]*kpi\b|\b(?:mock|fake|demo)[A-Za-z_-]*stat(?:s|istic)?\b/gi);
const adminStoreMutations = matches(/\buseAdmin\s*\(|\bAdminStoreProvider\b|from\s*["'][^"']*AdminStore["']/g);

const report = {
  generatedAt: new Date().toISOString(),
  routeCount: routeFiles.length,
  reachableSourceCount: reachable.length,
  pendingAdminRouteCount: pending.length,
  reachablePendingModuleCount: pending.length,
  reachableDemoComponentCount: demoComponents.length,
  runtimeFixtureFallbackCount: fixtureFallbacks.reduce((sum, item) => sum + item.count, 0),
  localStorageBusinessDataCount: localStorageBusiness.reduce((sum, item) => sum + item.count, 0),
  fakeKpiCount: fakeKpis.reduce((sum, item) => sum + item.count, 0),
  adminStoreBusinessMutationCount: adminStoreMutations.reduce((sum, item) => sum + item.count, 0),
  reachableDemoComponentFiles: demoComponents,
  evidence: { pending, fixtureFallbacks, localStorageBusiness, fakeKpis, adminStoreMutations },
  unresolvedLocalImports: unresolved,
  routes: routeFiles.map((path) => relative(root, path).replaceAll('\\', '/')).sort(),
  reachableFiles: reachable.map(({ relative: path }) => path).sort(),
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, reachableFiles: report.reachableFiles.length, routes: report.routes.length }, null, 2));
if (unresolved.length || pending.length || demoComponents.length || fixtureFallbacks.length || localStorageBusiness.length || fakeKpis.length || adminStoreMutations.length) process.exitCode = 1;
