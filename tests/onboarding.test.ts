import { describe, it, expect } from 'vitest';
import { isStepComplete, GuideState } from '../src/onboarding/predicates';
import { STAGE_1_1, STAGE_1_2 } from '../src/levels';
import { mapLevelToFlow, useGameStore } from '../src/store/useGameStore';
import { freshLevel } from './helpers';

const steps = STAGE_1_1.onboardingSteps!;
const step = (id: string) => steps.find(s => s.id === id)!;

function baseState(): GuideState {
  const { nodes, edges } = mapLevelToFlow(STAGE_1_1);
  return { nodes, edges, selectedNodeId: null, results: [], simStatus: 'idle' };
}

describe('Guided onboarding', () => {
  it('no action step starts out complete', () => {
    const s = baseState();
    for (const st of steps) expect(isStepComplete(st, s), st.id).toBe(false);
  });

  it('completes selection and connection steps from board state', () => {
    const s = baseState();
    expect(isStepComplete(step('principal'), { ...s, selectedNodeId: 'intern-alice' })).toBe(true);
    expect(isStepComplete(step('resource'), { ...s, selectedNodeId: 'company-reports' })).toBe(true);
    expect(
      isStepComplete(step('connection'), {
        ...s,
        edges: [...s.edges, { id: 'e', source: 'intern-alice', target: 'company-reports' }],
      })
    ).toBe(true);
    // Wrong direction does not count
    expect(
      isStepComplete(step('connection'), {
        ...s,
        edges: [{ id: 'e', source: 'company-reports', target: 'intern-alice' }],
      })
    ).toBe(false);
  });

  it('completes the identity-policy step once Alice has an Allow', () => {
    const s = baseState();
    const nodes = s.nodes.map(n =>
      n.id === 'intern-alice'
        ? {
            ...n,
            data: {
              ...n.data,
              identityPolicies: [
                {
                  Version: '2012-10-17' as const,
                  Statement: [{ Effect: 'Allow' as const, Action: 's3:GetObject', Resource: 'arn:aws:s3:::company-reports/*' }],
                },
              ],
            },
          }
        : n
    );
    expect(isStepComplete(step('identity-policy'), s)).toBe(false);
    expect(isStepComplete(step('identity-policy'), { ...s, nodes })).toBe(true);
  });

  it('completes the simulate step once all requests succeed', () => {
    const s = baseState();
    expect(isStepComplete(step('simulate'), s)).toBe(false);
    expect(
      isStepComplete(step('simulate'), {
        ...s,
        simStatus: 'completed',
        results: [{ packetId: 'p1', success: true, outcome: 'ALLOW', traces: [] }],
      })
    ).toBe(true);
  });

  it('evaluates policyHasDeny predicate correctly', () => {
    const s = baseState();
    const denyStep = {
      id: 'test-deny',
      title: 'Deny check',
      body: 'Check deny',
      completeWhen: { predicate: 'policyHasDeny' as const, args: ['intern-alice'] },
    };
    const nodes = s.nodes.map(n =>
      n.id === 'intern-alice'
        ? {
            ...n,
            data: {
              ...n.data,
              identityPolicies: [
                {
                  Version: '2012-10-17' as const,
                  Statement: [{ Effect: 'Deny' as const, Action: 's3:DeleteObject', Resource: '*' }],
                },
              ],
            },
          }
        : n
    );
    expect(isStepComplete(denyStep, s)).toBe(false);
    expect(isStepComplete(denyStep, { ...s, nodes })).toBe(true);
  });

  it('opens the guide for Stage 1.1 and resumes at the saved step', () => {
    freshLevel(STAGE_1_1.id);
    expect(useGameStore.getState().isGuideOpen).toBe(true);

    useGameStore.getState().setGuideStep(3);
    useGameStore.getState().exitGuide();
    useGameStore.getState().loadLevel(STAGE_1_2.id);
    useGameStore.getState().loadLevel(STAGE_1_1.id);

    expect(useGameStore.getState().onboarding.currentStep[STAGE_1_1.id]).toBe(3);
    expect(useGameStore.getState().isGuideOpen).toBe(true);
  });

  it('does not reopen a completed guide', () => {
    freshLevel(STAGE_1_1.id);
    useGameStore.getState().completeGuide();
    useGameStore.getState().loadLevel(STAGE_1_2.id);
    useGameStore.getState().loadLevel(STAGE_1_1.id);
    expect(useGameStore.getState().isGuideOpen).toBe(false);
  });

  it('welcome "Start" opens Stage 1.1; "Skip" opens Stage 1.1 and stays dismissed', () => {
    useGameStore.getState().resetCampaignProgress();
    useGameStore.getState().completeWelcome({ displayName: '  Ada  ', startTutorial: true });
    let s = useGameStore.getState();
    expect(s.currentLevelId).toBe(STAGE_1_1.id);
    expect(s.profile.displayName).toBe('Ada');
    expect(s.profile.firstRunCompleted).toBe(true);
    expect(s.isWelcomeOpen).toBe(false);
    expect(s.isGuideOpen).toBe(true);

    useGameStore.getState().resetCampaignProgress();
    useGameStore.getState().completeWelcome({ displayName: '', startTutorial: false });
    s = useGameStore.getState();
    expect(s.currentLevelId).toBe(STAGE_1_1.id);
    expect(s.isWelcomeOpen).toBe(false);
  });
});
