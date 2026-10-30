import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../src/index.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const root = block(':root');
const dark = block('.dark');
// Dark inherits anything it does not override (the accent fills).
const themes = {
  light: (k: string) => root[`--neo-${k}`],
  dark: (k: string) => dark[`--neo-${k}`] ?? root[`--neo-${k}`],
};
const ACCENTS = ['orange', 'yellow', 'lilac', 'sky', 'lime', 'coral'];

describe('Squid & Smile palette', () => {
  it('keeps both theme backgrounds', () => {
    expect(themes.light('bg').toLowerCase()).toBe('#f8fafc');
    expect(themes.dark('bg').toUpperCase()).toBe('#001F1F');
  });

  it('uses AWS Squid Ink in light and AWS Sky shadows in dark', () => {
    expect(themes.light('ink').toUpperCase()).toBe('#232F3E');
    expect(themes.light('shadow').toUpperCase()).toBe('#232F3E');
    expect(themes.dark('shadow').toUpperCase()).toBe('#00A1C9');
  });

  it('keeps the accent fills the same in both themes', () => {
    expect(root['--neo-orange'].toUpperCase()).toBe('#FF9900');
    for (const a of ACCENTS) expect(dark[`--neo-${a}`], a).toBeUndefined();
  });

  for (const [name, t] of Object.entries(themes)) {
    describe(`${name} theme contrast`, () => {
      const surfaces = ['bg', 'surface', 'raised'].map(t);

      it('ink on every surface is at least 7:1', () => {
        for (const s of surfaces) expect(contrast(t('ink'), s), s).toBeGreaterThanOrEqual(7);
      });

      it('muted text on every surface is at least 4.5:1', () => {
        for (const s of surfaces) expect(contrast(t('muted'), s), s).toBeGreaterThanOrEqual(4.5);
      });

      it('text on every accent fill is at least 4.5:1', () => {
        for (const a of ACCENTS) expect(contrast(t('on-accent'), t(a)), a).toBeGreaterThanOrEqual(4.5);
      });

      it('shadow and ink borders are at least 3:1 against background and surface', () => {
        for (const s of [t('bg'), t('surface')]) {
          expect(contrast(t('shadow'), s), `shadow on ${s}`).toBeGreaterThanOrEqual(3);
          expect(contrast(t('ink'), s), `ink on ${s}`).toBeGreaterThanOrEqual(3);
        }
      });
    });
  }

  it('keeps no legacy near-black dark surfaces', () => {
    const values = Object.values(dark).map(v => v.toLowerCase());
    for (const legacy of ['#09090b', '#121215', '#18181b']) expect(values).not.toContain(legacy);
  });
});
