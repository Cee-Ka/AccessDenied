import { describe, it, expect } from 'vitest';
import {
  CORRUPT_BACKUP_KEY,
  LEGACY_STARS_KEY,
  LEGACY_THEME_KEY,
  SAVE_KEY,
  createDefaultSave,
  loadSave,
  serializeBoard,
  writeSave,
} from '../src/persistence/save';
import { isLevelUnlocked, useGameStore } from '../src/store/useGameStore';
import { BlockedStorage, MemoryStorage, freshLevel, runSkipped } from './helpers';
import { PolicyDocument } from '../src/types/engine';
import { STAGE_1_1, STAGE_1_2, STAGE_3_1, STAGE_3_2 } from '../src/levels';

describe('Player progress persistence', () => {
  it('migrates legacy v1 stars and theme without deleting the old keys', () => {
    const storage = new MemoryStorage({
      [LEGACY_STARS_KEY]: JSON.stringify({ [STAGE_3_1.id]: 2, 'round-1': 2 }),
      [LEGACY_THEME_KEY]: 'dark',
    });
    const { save, status } = loadSave(storage);

    expect(status).toBe('ok');
    expect(save.progress.stars).toEqual({ [STAGE_3_1.id]: 2, 'round-1': 2 });
    expect(save.settings.theme).toBe('dark');
    expect(isLevelUnlocked(STAGE_3_2.id, save.progress.stars)).toBe(true);
    // Returning players skip the welcome flow
    expect(save.profile.firstRunCompleted).toBe(true);
    // v2 record written, v1 keys kept for rollback
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).version).toBe(2);
    expect(storage.getItem(LEGACY_STARS_KEY)).not.toBeNull();
  });

  it('starts a brand-new player with a first-run profile', () => {
    const { save } = loadSave(new MemoryStorage());
    expect(save.profile.firstRunCompleted).toBe(false);
    expect(save.profile.lastLevelId).toBeNull();
  });

  it('keeps a corrupt record under a backup key and starts fresh', () => {
    const storage = new MemoryStorage({ [SAVE_KEY]: '{not json' });
    const { save, status, notice } = loadSave(storage);

    expect(status).toBe('ok');
    expect(save.progress.stars).toEqual({});
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{not json');
    expect(notice).toMatch(/could not be read/);
  });

  it('never overwrites a record from a newer app version', () => {
    const future = JSON.stringify({ version: 99, data: 'from the future' });
    const storage = new MemoryStorage({ [SAVE_KEY]: future });
    const { save, status } = loadSave(storage);

    expect(status).toBe('readonly');
    expect(writeSave(save, status, storage)).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(future);
  });

  it('stays playable when storage access throws', () => {
    const { save, status, notice } = loadSave(new BlockedStorage());
    expect(status).toBe('unavailable');
    expect(save.progress.stars).toEqual({});
    expect(notice).toMatch(/will not be saved/);
    expect(writeSave(save, status, new BlockedStorage())).toBe(false);
  });

  it('round-trips a saved board through write and load', () => {
    const storage = new MemoryStorage();
    const lvl = freshLevel(STAGE_1_1.id);
    const save = createDefaultSave();
    save.progress.boards[STAGE_1_1.id] = { levelRevision: 'r1', ...serializeBoard(lvl.nodes, lvl.edges) };
    save.progress.stars = { [STAGE_1_1.id]: 3 };
    save.settings = { theme: 'dark', soundMuted: true, simSpeed: 2 };
    expect(writeSave(save, 'ok', storage)).toBe(true);

    const loaded = loadSave(storage).save;
    expect(loaded.progress.boards[STAGE_1_1.id].nodes.map(n => n.id)).toEqual(lvl.nodes.map(n => n.id));
    expect(loaded.progress.boards[STAGE_1_1.id].edges).toHaveLength(lvl.edges.length);
    expect(loaded.settings).toEqual({ theme: 'dark', soundMuted: true, simSpeed: 2 });
  });

  it('strips simulation state from saved edges', () => {
    const { nodes } = freshLevel(STAGE_1_1.id);
    const board = serializeBoard(nodes, [
      { id: 'e1', source: 'a', target: 'b', data: { isSimulating: true, isExploit: true, returnOutcome: 'deny', isThreat: true } },
    ]);
    expect(board.edges[0].data).toEqual({ isThreat: true });
  });

  it('keeps an edited board when switching levels and back', () => {
    freshLevel(STAGE_1_1.id);
    const doc: PolicyDocument = {
      Version: '2012-10-17',
      Statement: [{ Sid: 'Edited', Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::company-reports/*' }],
    };
    useGameStore.getState().updateNodePolicy('intern-alice', 'identity', 0, doc);
    useGameStore.setState({ starRecords: { [STAGE_1_1.id]: 1 } });
    useGameStore.getState().loadLevel(STAGE_1_2.id);
    useGameStore.getState().loadLevel(STAGE_1_1.id);

    const alice = useGameStore.getState().nodes.find(n => n.id === 'intern-alice')!;
    expect(alice.data.identityPolicies[0].Statement[0].Sid).toBe('Edited');
  });

  it('starts over on a saved board from an older level revision and says so', () => {
    freshLevel(STAGE_1_1.id);
    useGameStore.setState({ starRecords: { [STAGE_1_1.id]: 1 } });
    useGameStore.getState().loadLevel(STAGE_1_2.id);
    const boards = useGameStore.getState().savedBoards;
    useGameStore.setState({ savedBoards: { ...boards, [STAGE_1_1.id]: { ...boards[STAGE_1_1.id], levelRevision: 'stale' } } });
    useGameStore.getState().loadLevel(STAGE_1_1.id);

    expect(useGameStore.getState().toast?.message).toMatch(/older version/);
  });

  it('keeps the best star rating when a later run scores lower', async () => {
    freshLevel(STAGE_1_1.id, { [STAGE_1_1.id]: 3 });
    // Fix connection and policy
    useGameStore.getState().onConnect({ source: 'intern-alice', target: 'company-reports', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodePolicy('intern-alice', 'identity', 0, {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::company-reports/*' }],
    });
    const s = await runSkipped();

    expect(s.lastRunStars).toBeGreaterThanOrEqual(1);
    expect(s.starRecords[STAGE_1_1.id]).toBe(3);
  });

  it('reset all clears progress and reopens the welcome flow', () => {
    freshLevel(STAGE_1_1.id, { [STAGE_1_1.id]: 2 });
    useGameStore.getState().resetCampaignProgress();
    const s = useGameStore.getState();
    expect(s.starRecords).toEqual({});
    expect(s.savedBoards).toEqual({});
    expect(s.profile.firstRunCompleted).toBe(false);
    expect(s.isWelcomeOpen).toBe(true);
  });
});
