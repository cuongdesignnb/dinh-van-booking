// Usage: node scripts/ui-demo/prune-css.mjs [--write] <file.css>...
// Dev tooling: drops selectors whose class names are never referenced from src/**/*.{ts,tsx}.
// A class counts as used when it appears as a token in source, or starts with a dynamic
// prefix such as `sc--${...}`. Rules left with no selector and empty at-rules are removed.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

const args = process.argv.slice(2);
const write = args.includes('--write');
const files = args.filter((a) => a !== '--write');

const sources = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx?|mjs|js)$/.test(name)) sources.push(readFileSync(path, 'utf8'));
  }
})('src');
const text = sources.join('\n');
const tokens = new Set(text.match(/[A-Za-z0-9_-]+/g));
const prefixes = [...text.matchAll(/([A-Za-z0-9_-]+-)\$\{/g)].map((m) => m[1]);
const used = (cls) => tokens.has(cls) || prefixes.some((p) => cls.startsWith(p));

for (const file of files) {
  const root = postcss.parse(readFileSync(file, 'utf8'));
  const dead = [];
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const keep = rule.selectors.filter((sel) => {
      const classes = [...sel.replace(/:(not|is|where|has)\([^)]*\)/g, '').matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
      return classes.every(used);
    });
    if (keep.length === rule.selectors.length) return;
    dead.push(...rule.selectors.filter((s) => !keep.includes(s)));
    if (keep.length) rule.selectors = keep;
    else rule.remove();
  });
  let changed = true;
  while (changed) {
    changed = false;
    root.walkAtRules((at) => {
      if (at.nodes && at.nodes.length === 0) { at.remove(); changed = true; }
    });
  }
  console.log(`${file}: ${dead.length} dead selectors`);
  if (!write) console.log(dead.map((s) => '   ' + s.replace(/\s+/g, ' ')).join('\n'));
  else writeFileSync(file, root.toString().replace(/\n{3,}/g, '\n\n'));
}
