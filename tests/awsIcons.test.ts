import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ICON_KEYS, ICON_MANIFEST, iconKeyFor } from '@access-denied/aws-icons';
import { NODE_TYPES } from '../src/types/engine';

const pkgRoot = resolve(__dirname, '../packages/aws-icons');
const svgDir = join(pkgRoot, 'svg');
const syncedSvgs = readdirSync(svgDir).filter(f => f.endsWith('.svg'));
const synced = syncedSvgs.length > 0;

const REMOTE = /(unpkg\.com|jsdelivr\.net|cdnjs|fonts\.googleapis|fonts\.gstatic|awsstatic\.com)/;

describe('AWS icon library', () => {
  it('maps every game node type to a manifest icon', () => {
    for (const type of NODE_TYPES) {
      const key = iconKeyFor(type);
      expect(key, type).toBeDefined();
      expect(ICON_MANIFEST[key!].name.length).toBeGreaterThan(0);
    }
    expect(iconKeyFor('subnet', { privateSubnet: true })).toBe('subnet_private');
    expect(iconKeyFor('subnet')).toBe('subnet_public');
  });

  it('contains only curated icons, not the full AWS set', () => {
    expect(ICON_KEYS.length).toBeLessThanOrEqual(20);
    for (const file of syncedSvgs) {
      expect(ICON_KEYS, file).toContain(file.replace(/\.svg$/, ''));
    }
  });

  it.skipIf(!synced)('has a synced SVG for every manifest entry', () => {
    for (const key of ICON_KEYS) {
      expect(existsSync(join(svgDir, `${key}.svg`)), key).toBe(true);
    }
  });

  it('never loads icons or fonts from a remote host', () => {
    const sources = [
      readFileSync(resolve(__dirname, '../index.html'), 'utf8'),
      readFileSync(join(pkgRoot, 'src/index.tsx'), 'utf8'),
    ];
    for (const src of sources) expect(src).not.toMatch(REMOTE);

    const dist = resolve(__dirname, '../dist');
    if (existsSync(dist)) {
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
      for (const f of walk(dist).filter(f => /\.(html|css|js)$/.test(f))) {
        expect(readFileSync(f, 'utf8'), f).not.toMatch(REMOTE);
      }
    }
  });
});
