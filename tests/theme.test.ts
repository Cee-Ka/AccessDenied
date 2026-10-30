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

const dark = block('.dark');
const light = block(':root');
const surfaces = ['950', '900', '850', '800', 'box'].map(k => dark[`--color-obsidian-${k}`]);

describe('Dark-cyan theme', () => {
  it('uses #001F1F as the app background', () => {
    expect(dark['--color-obsidian-950'].toUpperCase()).toBe('#001F1F');
  });

  it('keeps no legacy near-black surfaces', () => {
    const values = Object.values(dark).map(v => v.toLowerCase());
    for (const legacy of ['#09090b', '#121215', '#18181b']) expect(values).not.toContain(legacy);
  });

  it('body and muted text meet 4.5:1 on every dark surface', () => {
    for (const s of surfaces) {
      expect(contrast(dark['--color-obsidian-text'], s), s).toBeGreaterThanOrEqual(4.5);
      expect(contrast(dark['--color-obsidian-muted'], s), s).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('borders and status colors meet 3:1 on every dark surface', () => {
    const ui = ['--color-obsidian-border', '--color-exploit', '--color-success', '--color-warning'].map(k => dark[k]);
    for (const color of [...ui, '#ff9900']) {
      for (const s of surfaces) expect(contrast(color, s), `${color} on ${s}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('leaves the light theme unchanged', () => {
    expect(light['--color-obsidian-950']).toBe('#f8fafc');
    expect(light['--color-obsidian-900']).toBe('#ffffff');
    expect(light['--color-obsidian-text']).toBe('#0f172a');
    expect(light['--color-obsidian-muted']).toBe('#64748b');
    expect(light['--color-obsidian-border']).toBe('#e2e8f0');
  });
});
