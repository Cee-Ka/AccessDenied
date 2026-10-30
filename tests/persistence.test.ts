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

describe('Player progress persistence', () => {
  it('migrates legacy v1 stars and theme without deleting the old keys', () => {
    const storage = new MemoryStorage({
      [LEGACY_STARS_KEY]: JSON.stringify({ 'round-1': 2 }),
      [LEGACY_THEME_KEY]: 'dark',
    });
    const { save, status } = loadSave(storage);

    expect(status).toBe('ok');
    expect(save.progress.stars).toEqual({ 'round-1': 2 });
    expect(save.settings.theme).toBe('dark');
    expect(isLevelUnlocked('round-2', save.progress.stars)).toBe(true);
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
    const lvl = freshLevel('round-0');
    const save = createDefaultSave();
    save.progress.boards['round-0'] = { levelRevision: 'r1', ...serializeBoard(lvl.nodes, lvl.edges) };
    save.progress.stars = { 'round-0': 3 };
    save.settings = { theme: 'dark', soundMuted: true, simSpeed: 2 };
    expect(writeSave(save, 'ok', storage)).toBe(true);

    const loaded = loadSave(storage).save;
    expect(loaded.progress.boards['round-0'].nodes.map(n => n.id)).toEqual(lvl.nodes.map(n => n.id));
    expect(loaded.progress.boards['round-0'].edges).toHaveLength(lvl.edges.length);
    expect(loaded.settings).toEqual({ theme: 'dark', soundMuted: true, simSpeed: 2 });
  });

  it('strips simulation state from saved edges', () => {
    const { nodes } = freshLevel('round-0');
    const board = serializeBoard(nodes, [
      { id: 'e1', source: 'a', target: 'b', data: { isSimulating: true, isExploit: true, returnOutcome: 'deny', isThreat: true } },
    ]);
    expect(board.edges[0].data).toEqual({ isThreat: true });
  });

  it('keeps an edited board when switching levels and back', () => {
    freshLevel('round-0');
    const doc: PolicyDocument = {
      Version: '2012-10-17',
      Statement: [{ Sid: 'Edited', Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::team-photos/*' }],
    };
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, doc);
    useGameStore.getState().loadLevel('round-1');
    useGameStore.getState().loadLevel('round-0');

    const app = useGameStore.getState().nodes.find(n => n.id === 'starter-app')!;
    expect(app.data.identityPolicies[0].Statement[0].Sid).toBe('Edited');
  });

  it('starts over on a saved board from an older level revision and says so', () => {
    freshLevel('round-0');
    useGameStore.getState().loadLevel('round-1');
    const boards = useGameStore.getState().savedBoards;
    useGameStore.setState({ savedBoards: { ...boards, 'round-0': { ...boards['round-0'], levelRevision: 'stale' } } });
    useGameStore.getState().loadLevel('round-0');

    expect(useGameStore.getState().toast?.message).toMatch(/older version/);
  });

  it('keeps the best star rating when a later run scores lower', async () => {
    freshLevel('round-0', { 'round-0': 3 });
    // Fix only the photo app: legit traffic passes, attacks still succeed → 1 star
    useGameStore.getState().onConnect({ source: 'starter-app', target: 'starter-photos', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::team-photos/*' }],
    });
    const s = await runSkipped();

    expect(s.lastRunStars).toBe(1);
    expect(s.starRecords['round-0']).toBe(3);
  });

  it('reset all clears progress and reopens the welcome flow', () => {
    freshLevel('round-0', { 'round-1': 2 });
    useGameStore.getState().resetCampaignProgress();
    const s = useGameStore.getState();
    expect(s.starRecords).toEqual({});
    expect(s.savedBoards).toEqual({});
    expect(s.profile.firstRunCompleted).toBe(false);
    expect(s.isWelcomeOpen).toBe(true);
  });
});
