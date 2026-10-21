#!/usr/bin/env node
// Post-build audit for YouTube Playables (CLAUDE.md rules 1 and 2):
//  - no compressed artefacts (.gz/.br/.zip) in dist/
//  - no external URL in shipped text files other than allowlisted non-network literals
//    (XML namespaces, license comments) and the Playgama Bridge script.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: the pathname keeps %20 and %C3%BC, so a project in a folder
// with a space or a non-ASCII letter would not be found (audit 2026-10-21).
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const TEXT_EXT = new Set(['.js', '.mjs', '.html', '.css', '.json', '.svg', '.txt']);
const FORBIDDEN_EXT = new Set(['.gz', '.br', '.zip']);

// Literals that are not network calls. Keep this list short and explain each entry.
const ALLOW = [
  /^https?:\/\/www\.w3\.org\//, // XML/SVG namespaces inside Phaser
  /^https?:\/\/phaser\.io\/?/, // Phaser banner/license text
  /^https?:\/\/photonstorm\.github\.io\//, // Phaser license text
  /^https?:\/\/github\.com\/(photonstorm|phaserjs)\//, // Phaser license text
  /^https?:\/\/opensource\.org\/licenses\//, // license text
];

// The Playgama Bridge runtime (@playgama/bridge, shipped as playgama-bridge.js by its Vite
// plugin in "local" mode) is the one allowed third-party script (CLAUDE.md rule 1). It embeds
// the hosts of every platform adapter it can run on; on YouTube only the ytgame API is used.
// It is therefore skipped by the URL scan (by file name, so the dev-mode build under dist/test
// is treated the same), while index.html and our own bundle are still scanned.
const SKIP_FILES = new Set(['playgama-bridge.js']);

/** A URL with a scheme. */
const SCHEME_URL = /(?:https?|wss?):\/\/[^\s"'`<>)\\]+/g;
/**
 * A protocol-relative link (`//host.tld/path`), as `src`, `href` or CSS `url()` would load it:
 * two slashes not preceded by a scheme's colon, a word character or a slash, then a host name
 * with a dot. A comment such as `// note` has no host after the slashes.
 */
const PROTOCOL_RELATIVE = /(?<![:\w/\\])\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?=[/:?#"'`\s)]|$)/gi;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST);
const problems = [];
const seen = new Map();

for (const file of files) {
  const rel = relative(DIST, file);
  const ext = extname(file).toLowerCase();
  if (FORBIDDEN_EXT.has(ext)) problems.push(`compressed artefact shipped: ${rel}`);
  if (!TEXT_EXT.has(ext)) continue;
  if (SKIP_FILES.has(basename(rel))) continue;
  const text = readFileSync(file, 'utf8');
  let m;
  while ((m = SCHEME_URL.exec(text)) !== null) {
    const url = m[0];
    if (ALLOW.some((rx) => rx.test(url))) continue;
    const key = `${rel} → ${url}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  // A protocol-relative link loads from another host just the same; no allowlisted literal is one.
  while ((m = PROTOCOL_RELATIVE.exec(text)) !== null) {
    const key = `${rel} → ${m[0]}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
}

for (const [key, count] of seen) problems.push(`external URL (${count}×): ${key}`);

if (problems.length > 0) {
  console.error('audit-dist: FAIL');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
const skipped = [...SKIP_FILES].join(', ');
console.log(
  `audit-dist: OK (${files.length} files, no external URLs outside ${skipped}, ` +
    'no compressed artefacts)',
);
