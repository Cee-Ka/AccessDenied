import { describe, it, expect } from 'vitest';
import { isLevelUnlocked, useGameStore } from '../src/store/useGameStore';
import {
  ALL_LEVELS,
  STAGE_1_1,
  STAGE_1_2,
  STAGE_2_1,
  STAGE_2_2,
  STAGE_5_3,
  STAGE_6_1,
} from '../src/levels';

describe('Level Progression & Gating Suite', () => {
  it('Level 1.1 is unlocked by default when no stars are recorded', () => {
    const emptyStars = {};
    expect(isLevelUnlocked(STAGE_1_1.id, emptyStars)).toBe(true);
  });

  it('Higher levels (Level 1.2 to 6.1) are locked when no stars are recorded', () => {
    const emptyStars = {};
    expect(isLevelUnlocked(STAGE_1_2.id, emptyStars)).toBe(false);
    expect(isLevelUnlocked(STAGE_2_1.id, emptyStars)).toBe(false);
    expect(isLevelUnlocked(STAGE_2_2.id, emptyStars)).toBe(false);
    expect(isLevelUnlocked(STAGE_6_1.id, emptyStars)).toBe(false);
  });

  it('Completing Level 1.1 with 1 star unlocks Level 1.2, but Level 2.1 remains locked', () => {
    const stars = { [STAGE_1_1.id]: 1 };
    expect(isLevelUnlocked(STAGE_1_1.id, stars)).toBe(true);
    expect(isLevelUnlocked(STAGE_1_2.id, stars)).toBe(true);
    expect(isLevelUnlocked(STAGE_2_1.id, stars)).toBe(false);
  });

  it('Completing Level 1.1 and Level 1.2 unlocks Level 2.1 sequentially', () => {
    const stars = { [STAGE_1_1.id]: 3, [STAGE_1_2.id]: 1 };
    expect(isLevelUnlocked(STAGE_1_1.id, stars)).toBe(true);
    expect(isLevelUnlocked(STAGE_1_2.id, stars)).toBe(true);
    expect(isLevelUnlocked(STAGE_2_1.id, stars)).toBe(true);
    expect(isLevelUnlocked(STAGE_2_2.id, stars)).toBe(false);
  });

  it('verifies progressive sequential gating across all 16 levels', () => {
    const cumulativeStars: Record<string, number> = {};
    for (let i = 0; i < ALL_LEVELS.length; i++) {
      const current = ALL_LEVELS[i];
      // Current level should be unlocked with stars from all previous levels
      expect(isLevelUnlocked(current.id, cumulativeStars), `${current.id} should be unlocked`).toBe(true);

      // Subsequent levels should remain locked
      if (i + 1 < ALL_LEVELS.length) {
        const next = ALL_LEVELS[i + 1];
        expect(isLevelUnlocked(next.id, cumulativeStars), `${next.id} should be locked before ${current.id} completed`).toBe(false);
      }

      // Record star for current level
      cumulativeStars[current.id] = 1;
    }
  });

  it('Sandbox mode is always unlocked regardless of star progress', () => {
    expect(isLevelUnlocked('sandbox-default', {})).toBe(true);
  });

  it('Capstone Boss Fight (Stage 6.1) unlocks when previous level has at least 1 star', () => {
    expect(isLevelUnlocked(STAGE_6_1.id, {})).toBe(false);
    expect(isLevelUnlocked(STAGE_6_1.id, { [STAGE_5_3.id]: 1 })).toBe(true);
  });

  it('GameStore loadLevel rejects loading locked levels', () => {
    const store = useGameStore.getState();
    store.resetCampaignProgress();

    // Verify initial level is Level 1.1
    expect(useGameStore.getState().currentLevelId).toBe(STAGE_1_1.id);

    // Attempt to load locked Level 1.2
    useGameStore.getState().loadLevel(STAGE_1_2.id);

    // Should still be Level 1.1!
    expect(useGameStore.getState().currentLevelId).toBe(STAGE_1_1.id);
  });

  it('GameStore loadLevel allows loading Level 1.2 once Level 1.1 is completed', () => {
    const store = useGameStore.getState();
    // Simulate completing Level 1.1
    useGameStore.setState({ starRecords: { [STAGE_1_1.id]: 2 } });

    // Now load Level 1.2
    store.loadLevel(STAGE_1_2.id);

    // Should successfully be Level 1.2
    expect(useGameStore.getState().currentLevelId).toBe(STAGE_1_2.id);
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
    store.loadLevel(STAGE_1_1.id);

    // Add a connection edge
    store.addEdgeToBoard({
      id: 'test-custom-edge',
      source: 'intern-alice',
      target: 'company-reports',
      label: 'Test Connection'
    });

    expect(useGameStore.getState().edges.some(e => e.id === 'test-custom-edge')).toBe(true);

    // Remove the edge
    store.removeEdge('test-custom-edge');
    expect(useGameStore.getState().edges.some(e => e.id === 'test-custom-edge')).toBe(false);
  });
});
