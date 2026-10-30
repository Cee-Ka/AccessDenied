import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(__dirname, '../src/components');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
  });
const files = walk(root).map(p => ({ path: p.replace(`${root}/`, ''), src: readFileSync(p, 'utf8') }));

const BANNED: Array<[string, RegExp]> = [
  ['gradient fill', /\bbg-gradient-/],
  ['backdrop blur', /\bbackdrop-blur/],
  ['blurred colored shadow', /\bshadow-[a-z]+-\d{2,3}\//],
  ['soft large radius', /\brounded-(xl|2xl|3xl)\b/],
  ['legacy obsidian token', /obsidian-/],
  ['legacy brand token', /\bbrand-(orange|vivid|hover|subtle|glow)\b/],
  ['raw Tailwind palette color', /\b(bg|text|border|fill|ring)-(zinc|slate|gray|rose|red|emerald|green|amber|orange|sky|violet)-\d{2,3}\b/],
  ['raw hex color', /#[0-9a-fA-F]{6}\b/],
];

describe('Neobrutalism style guard', () => {
  for (const [label, pattern] of BANNED) {
    it(`no component uses ${label}`, () => {
      const offenders = files.filter(f => pattern.test(f.src)).map(f => f.path);
      expect(offenders).toEqual([]);
    });
  }

  // Translucent tints (bg-neo-lilac/40) keep theme ink, so only solid fills need the scope.
  it('every solid accent fill in a class string also sets the on-accent scope', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const m of f.src.matchAll(/(['"`])([^'"`\n]*?(?<![\w:-])bg-neo-(?:orange|yellow|lilac|sky|lime|coral)(?![\w/-])[^'"`\n]*)\1/g)) {
        if (!/\bneo-on-accent\b/.test(m[2])) offenders.push(`${f.path}: ${m[2].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
