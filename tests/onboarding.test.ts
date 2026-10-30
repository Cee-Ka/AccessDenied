import { describe, it, expect } from 'vitest';
import { isStepComplete, GuideState } from '../src/onboarding/predicates';
import { round0CloudBasics } from '../src/levels/round0-cloud-basics';
import { mapLevelToFlow, useGameStore } from '../src/store/useGameStore';
import { freshLevel } from './helpers';

const steps = round0CloudBasics.onboardingSteps!;
const step = (id: string) => steps.find(s => s.id === id)!;

function baseState(): GuideState {
  const { nodes, edges } = mapLevelToFlow(round0CloudBasics);
  return { nodes, edges, selectedNodeId: null, results: [], simStatus: 'idle' };
}

describe('Guided onboarding', () => {
  it('no action step starts out complete', () => {
    const s = baseState();
    for (const st of steps) expect(isStepComplete(st, s), st.id).toBe(false);
  });

  it('completes selection and connection steps from board state', () => {
    const s = baseState();
    expect(isStepComplete(step('principal'), { ...s, selectedNodeId: 'starter-app' })).toBe(true);
    expect(
      isStepComplete(step('connection'), { ...s, edges: [...s.edges, { id: 'e', source: 'starter-app', target: 'starter-photos' }] })
    ).toBe(true);
    // Wrong direction does not count
    expect(
      isStepComplete(step('connection'), { ...s, edges: [{ id: 'e', source: 'starter-photos', target: 'starter-app' }] })
    ).toBe(false);
  });

  it('completes the explicit-deny step only once the intern has a Deny', () => {
    const s = baseState();
    const nodes = s.nodes.map(n =>
      n.id === 'starter-intern'
        ? {
            ...n,
            data: {
              ...n.data,
              identityPolicies: [{
                Version: '2012-10-17' as const,
                Statement: [{ Effect: 'Deny' as const, Action: 's3:DeleteObject', Resource: '*' }],
              }],
            },
          }
        : n
    );
    expect(isStepComplete(step('explicit-deny'), s)).toBe(false);
    expect(isStepComplete(step('explicit-deny'), { ...s, nodes })).toBe(true);
  });

  it('opens the guide for Round 0 and resumes at the saved step', () => {
    freshLevel('round-0');
    expect(useGameStore.getState().isGuideOpen).toBe(true);

    useGameStore.getState().setGuideStep(3);
    useGameStore.getState().exitGuide();
    useGameStore.getState().loadLevel('round-1');
    useGameStore.getState().loadLevel('round-0');

    expect(useGameStore.getState().onboarding.currentStep['round-0']).toBe(3);
    expect(useGameStore.getState().isGuideOpen).toBe(true);
  });

  it('does not reopen a completed guide', () => {
    freshLevel('round-0');
    useGameStore.getState().completeGuide();
    useGameStore.getState().loadLevel('round-1');
    useGameStore.getState().loadLevel('round-0');
    expect(useGameStore.getState().isGuideOpen).toBe(false);
  });

  it('welcome "Start" opens Round 0; "Skip" opens Round 1 and stays dismissed', () => {
    useGameStore.getState().resetCampaignProgress();
    useGameStore.getState().completeWelcome({ displayName: '  Ada  ', startTutorial: true });
    let s = useGameStore.getState();
    expect(s.currentLevelId).toBe('round-0');
    expect(s.profile.displayName).toBe('Ada');
    expect(s.profile.firstRunCompleted).toBe(true);
    expect(s.isWelcomeOpen).toBe(false);

    useGameStore.getState().resetCampaignProgress();
    useGameStore.getState().completeWelcome({ displayName: '', startTutorial: false });
    s = useGameStore.getState();
    expect(s.currentLevelId).toBe('round-1');
    expect(s.isWelcomeOpen).toBe(false);
  });
});
