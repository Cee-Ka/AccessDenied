import { describe, it, expect } from 'vitest';
import { CONCEPTS, POLICY_TAB_CONCEPT, STAGE_CONCEPT } from '../src/content/concepts';
import { EVALUATION_STAGES, NODE_TYPES } from '../src/types/engine';
import { ALL_LEVELS, SANDBOX_DEFAULT_LEVEL } from '../src/levels';

const REQUIRED = [
  'iam_user', 'iam_role', 'identity_policy', 'resource_policy', 'trust_policy', 'permission_boundary', 'scp',
  'explicit_deny', 'implicit_deny', 'condition_keys', 'vpc_endpoint', 'nat_gw', 'kms_key_policy', 'imdsv2',
  'external_id', 'pass_role',
];

const words = (s: string) => s.trim().split(/\s+/).length;

describe('Concept glossary', () => {
  it('covers every required concept', () => {
    for (const id of REQUIRED) expect(CONCEPTS[id], id).toBeDefined();
  });

  it('has an entry for every service type (and so every dock service)', () => {
    for (const type of NODE_TYPES) expect(CONCEPTS[type], type).toBeDefined();
  });

  it('has an entry for every evaluation trace stage', () => {
    for (const stage of EVALUATION_STAGES) expect(CONCEPTS[STAGE_CONCEPT[stage]], stage).toBeDefined();
  });

  it('has an entry for every inspector policy tab', () => {
    for (const id of Object.values(POLICY_TAB_CONCEPT)) expect(CONCEPTS[id], id).toBeDefined();
  });

  it('resolves every level concept tag and onboarding concept', () => {
    for (const lvl of [...ALL_LEVELS, SANDBOX_DEFAULT_LEVEL]) {
      for (const tag of lvl.conceptTags) expect(CONCEPTS[tag], `${lvl.id}: ${tag}`).toBeDefined();
      for (const step of lvl.onboardingSteps ?? []) {
        if (step.conceptId) expect(CONCEPTS[step.conceptId], `${lvl.id}: ${step.id}`).toBeDefined();
      }
    }
  });

  it('keeps explanations short and plain', () => {
    for (const c of Object.values(CONCEPTS)) {
      expect(words(c.body), c.id).toBeLessThanOrEqual(80);
      expect(c.summary.length, c.id).toBeGreaterThan(0);
      if (c.docsUrl) expect(c.docsUrl).toMatch(/^https:\/\/docs\.aws\.amazon\.com\//);
    }
  });

  it('gives Round 4 and Round 6 the concepts their report cards promise', () => {
    const r4 = ALL_LEVELS.find(l => l.id === 'round-4')!;
    const r6 = ALL_LEVELS.find(l => l.id === 'round-6')!;
    expect(r4.conceptTags).toEqual(expect.arrayContaining(['permission_boundary', 'pass_role']));
    expect(r6.conceptTags).toEqual(expect.arrayContaining(['kms_key_policy', 'secrets_manager']));
  });
});
