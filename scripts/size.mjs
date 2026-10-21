#!/usr/bin/env node
// Reports dist/ size against the download budget (CLAUDE.md rule 2, docs/questions.md D30).
// The initial download is what loads before the first house: index.html, every file it names
// and every module those import statically, plus anything not proven lazy (counted as initial, to
// be safe). Chunks reached only through a dynamic `import()` (the dailies, D57) load on first use
// and are reported apart (audit 2026-10-21, DÜŞÜK 2). The /test/ dev build is left out.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: the pathname keeps %20 and %C3%BC, so a project in a folder
// with a space or a non-ASCII letter would not be found (audit 2026-10-21).
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
/** Initial download target (brief §9): procedural art and synthesized sound keep it small. */
const TARGET = 5 * 1024 * 1024;
/** YouTube Playables hard limit for the initial load and for any single file. */
const HARD = 30 * 1024 * 1024;

/** A local file a page names: src="…" or href="…" (no scheme, no protocol-relative link). */
const PAGE_REF = /\b(?:src|href)\s*=\s*["']([^"':]+)["']/g;
/** `import … from "./x.js"`, `import "./x.js"`, `export … from "./x.js"`. */
const STATIC_IMPORT =
  /\b(?:import\s*(?:[\w$*{}\s,]+?\s*from\s*)?|export\s*(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*)["'](\.{1,2}\/[^"']+)["']/g;
/** `import("./x.js")`. */
const DYNAMIC_IMPORT = /\bimport\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push({ path: relative(DIST, p).split('\\').join('/'), size: st.size });
  }
  return out;
}

/** A specifier written in file `from`, as a path relative to dist/. */
function resolve(from, spec) {
  return posix.normalize(posix.join(posix.dirname(from), spec)).replace(/^\.\//, '');
}

function refs(path, pattern) {
  if (!/\.(?:m?js|html)$/.test(path)) return [];
  const text = readFileSync(join(DIST, path), 'utf8');
  return [...text.matchAll(pattern)].map((m) => resolve(path, m[1]));
}

/** Files reachable from `roots` through static imports, skipping those in `stop`. */
function closure(roots, stop = new Set()) {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length > 0) {
    const path = queue.shift();
    if (seen.has(path) || stop.has(path) || !exists.has(path)) continue;
    seen.add(path);
    queue.push(...refs(path, STATIC_IMPORT));
  }
  return seen;
}

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
const kb = (n) => Math.round(n / 1024) + ' KB';

const files = walk(DIST).filter((f) => !f.path.startsWith('test/'));
const exists = new Set(files.map((f) => f.path));
const first = closure(['index.html', ...refs('index.html', PAGE_REF)]);
const lazyRoots = [...first, ...files.map((f) => f.path)].flatMap((p) => refs(p, DYNAMIC_IMPORT));
const lazy = closure(lazyRoots, first);
const initial = files.filter((f) => !lazy.has(f.path));
const later = files.filter((f) => lazy.has(f.path));
const sum = (fs) => fs.reduce((s, f) => s + f.size, 0);
const total = sum(files);
const initialBytes = sum(initial);
const biggest = Math.max(0, ...files.map((f) => f.size));
console.log(`dist (production, ${String(files.length)} files): ${mb(total)}`);
console.log(
  `initial download: ${mb(initialBytes)} in ${String(initial.length)} files (target ${mb(TARGET)}, hard ${mb(HARD)})`,
);
console.log(`lazy, on first use: ${mb(sum(later))} in ${String(later.length)} files`);
for (const f of [...files].sort((a, b) => b.size - a.size).slice(0, 10)) {
  console.log(`  ${kb(f.size).padStart(8)}  ${f.path}${lazy.has(f.path) ? ' (lazy)' : ''}`);
}
if (initialBytes > HARD || biggest > HARD) {
  console.error('size: FAIL (over the 30 MB hard limit)');
  process.exit(1);
}
if (initialBytes > TARGET) console.warn('size: over the 5 MB target');
