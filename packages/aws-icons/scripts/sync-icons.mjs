#!/usr/bin/env node
/**
 * Copy the curated icons from a locally downloaded AWS Architecture Icons
 * package into ../svg/<key>.svg. Never fetches anything: download the zip
 * from https://aws.amazon.com/architecture/icons/ yourself first.
 *
 * Usage:
 *   pnpm --filter @access-denied/aws-icons sync <Asset-Package.zip | extracted-folder>
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const svgDir = resolve(here, '../svg');
const manifestSrc = readFileSync(resolve(here, '../src/manifest.ts'), 'utf8');

const input = process.argv[2];
if (!input) {
  console.error('Usage: sync-icons.mjs <Asset-Package.zip | extracted-folder>');
  process.exit(1);
}

let root = resolve(process.cwd(), input);
let tmp = null;
if (statSync(root).isFile()) {
  tmp = mkdtempSync(join(tmpdir(), 'aws-icons-'));
  execFileSync('unzip', ['-q', root, '-d', tmp]);
  // The official package nests further zips per icon family.
  for (const f of walk(tmp)) {
    if (f.endsWith('.zip')) execFileSync('unzip', ['-q', '-o', f, '-d', join(dirname(f), basename(f, '.zip'))]);
  }
  root = tmp;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

// Parse `key: { ... sources: ['a.svg', 'b.svg'] }` pairs out of manifest.ts.
const entries = [...manifestSrc.matchAll(/^\s{2}(\w+): \{[\s\S]*?sources: \[([^\]]*)\]/gm)].map(m => ({
  key: m[1],
  sources: [...m[2].matchAll(/'([^']+)'/g)].map(s => s[1].toLowerCase()),
}));

const byName = new Map();
for (const f of walk(root)) {
  const name = basename(f).toLowerCase();
  if (name.endsWith('.svg') && !byName.has(name)) byName.set(name, f);
}

const missing = [];
for (const { key, sources } of entries) {
  const hit = sources.map(s => byName.get(s)).find(Boolean);
  if (hit) copyFileSync(hit, join(svgDir, `${key}.svg`));
  else missing.push(`${key} (${sources.join(' | ')})`);
}

const versionMatch = basename(input).match(/(\d{8})/);
if (versionMatch) {
  const notice = resolve(here, '../LICENSE-NOTICE.md');
  const text = readFileSync(notice, 'utf8').replace(/Icon set release: .*/, `Icon set release: Asset-Package_${versionMatch[1]}`);
  writeFileSync(notice, text);
}

if (tmp) rmSync(tmp, { recursive: true, force: true });

console.log(`Synced ${entries.length - missing.length}/${entries.length} icons into ${svgDir}`);
if (missing.length) {
  console.error(`Not found (update the candidate names in src/manifest.ts):\n  ${missing.join('\n  ')}`);
  process.exit(2);
}
