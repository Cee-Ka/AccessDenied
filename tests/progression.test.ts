import { describe, it, expect } from 'vitest';
import { isLevelUnlocked, useGameStore } from '../src/store/useGameStore';
import { ALL_LEVELS } from '../src/levels';

describe('Level Progression & Gating Suite', () => {
  it('Round 1 is unlocked by default when no stars are recorded', () => {
    const emptyStars = {};
    expect(isLevelUnlocked('round-1', emptyStars)).toBe(true);
  });

  it('Higher rounds (Round 2-8) are locked when no stars are recorded', () => {
    const emptyStars = {};
    expect(isLevelUnlocked('round-2', emptyStars)).toBe(false);
    expect(isLevelUnlocked('round-3', emptyStars)).toBe(false);
    expect(isLevelUnlocked('round-4', emptyStars)).toBe(false);
    expect(isLevelUnlocked('round-8', emptyStars)).toBe(false);
  });

  it('Completing Round 1 with 1 star unlocks Round 2, but Round 3 remains locked', () => {
    const stars = { 'round-1': 1 };
    expect(isLevelUnlocked('round-1', stars)).toBe(true);
    expect(isLevelUnlocked('round-2', stars)).toBe(true);
    expect(isLevelUnlocked('round-3', stars)).toBe(false);
  });

  it('Completing Round 1 and Round 2 unlocks Round 3 sequentially', () => {
    const stars = { 'round-1': 3, 'round-2': 1 };
    expect(isLevelUnlocked('round-1', stars)).toBe(true);
    expect(isLevelUnlocked('round-2', stars)).toBe(true);
    expect(isLevelUnlocked('round-3', stars)).toBe(true);
    expect(isLevelUnlocked('round-4', stars)).toBe(false);
  });

  it('Round 0 (tutorial) is always unlocked and does not gate Round 1', () => {
    expect(isLevelUnlocked('round-0', {})).toBe(true);
    expect(isLevelUnlocked('round-1', {})).toBe(true);
    // Rounds 2+ keep their one-star-on-the-previous-round gating
    expect(isLevelUnlocked('round-2', { 'round-0': 3 })).toBe(false);
  });

  it('Sandbox mode is always unlocked regardless of star progress', () => {
    expect(isLevelUnlocked('sandbox-default', {})).toBe(true);
  });

  it('First incident level is unlocked initially, but second incident is locked until first is passed', () => {
    const incidents = ALL_LEVELS.filter(l => l.category === 'Incidents');
    if (incidents.length >= 1) {
      expect(isLevelUnlocked(incidents[0].id, {})).toBe(true);
    }
    if (incidents.length >= 2) {
      expect(isLevelUnlocked(incidents[1].id, {})).toBe(false);
      expect(isLevelUnlocked(incidents[1].id, { [incidents[0].id]: 1 })).toBe(true);
    }
  });

  it('GameStore loadLevel rejects loading locked levels', () => {
    const store = useGameStore.getState();
    store.resetCampaignProgress();

    // Verify initial level is round-1
    expect(useGameStore.getState().currentLevelId).toBe('round-1');

    // Attempt to load locked round-2
    useGameStore.getState().loadLevel('round-2');

    // Should still be round-1!
    expect(useGameStore.getState().currentLevelId).toBe('round-1');
  });

  it('GameStore loadLevel allows loading round-2 once round-1 is completed', () => {
    const store = useGameStore.getState();
    // Simulate completing round 1
    useGameStore.setState({ starRecords: { 'round-1': 2 } });

    // Now load round-2
    store.loadLevel('round-2');

    // Should successfully be round-2
    expect(useGameStore.getState().currentLevelId).toBe('round-2');
  });

  it('GameStore supports toggling between light and dark mode', () => {
    const store = useGameStore.getState();
    store.setTheme('light');
    expect(useGameStore.getState().theme).toBe('light');

    store.toggleTheme();
    expect(useGameStore.getState().theme).toBe('dark');

    store.toggleTheme();
    expect(useGameStore.getState().theme).toBe('light');
  });

  it('GameStore supports adding and removing edges on the canvas board', () => {
    const store = useGameStore.getState();
    store.loadLevel('round-1');

    // Add a connection edge
    store.addEdgeToBoard({
      id: 'test-custom-edge',
      source: 'web-server-ec2',
      target: 'invoices-bucket',
      label: 'Test Connection'
    });

    expect(useGameStore.getState().edges.some(e => e.id === 'test-custom-edge')).toBe(true);

    // Remove the edge
    store.removeEdge('test-custom-edge');
    expect(useGameStore.getState().edges.some(e => e.id === 'test-custom-edge')).toBe(false);
  });
});
