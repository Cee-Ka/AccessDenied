import { describe, it, expect } from 'vitest';
import { evaluatePacket, useGameStore } from '../src/store/useGameStore';
import { HISTORY_LIMIT } from '../src/store/history';
import { PolicyDocument } from '../src/types/engine';
import { freshLevel, runSkipped } from './helpers';

const doc = (sid: string): PolicyDocument => ({
  Version: '2012-10-17',
  Statement: [{ Sid: sid, Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::team-photos/*' }],
});
const appPolicySid = () =>
  useGameStore.getState().nodes.find(n => n.id === 'starter-app')!.data.identityPolicies[0].Statement[0]?.Sid;

describe('Gameplay controls', () => {
  it('undoes and redoes a policy edit', () => {
    freshLevel('round-0');
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, doc('First'));
    expect(appPolicySid()).toBe('First');

    useGameStore.getState().undo();
    expect(appPolicySid()).toBeUndefined();

    useGameStore.getState().redo();
    expect(appPolicySid()).toBe('First');
  });

  it('collapses rapid typing in one policy into a single undo step', () => {
    freshLevel('round-0');
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, doc('A'));
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, doc('AB'));
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, doc('ABC'));
    useGameStore.getState().undo();
    expect(appPolicySid()).toBeUndefined();
  });

  it('undoes and redoes adding an edge', () => {
    freshLevel('round-0');
    const conn = { source: 'starter-app', target: 'starter-photos', sourceHandle: null, targetHandle: null };
    useGameStore.getState().onConnect(conn);
    expect(useGameStore.getState().edges).toHaveLength(2);

    useGameStore.getState().undo();
    expect(useGameStore.getState().edges).toHaveLength(1);

    useGameStore.getState().redo();
    expect(useGameStore.getState().edges.some(e => e.source === 'starter-app' && e.target === 'starter-photos')).toBe(true);
  });

  it('caps history and clears it when the level changes', () => {
    freshLevel('round-0');
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      useGameStore.getState().updateNodeConfig('starter-photos', { [`k${i}`]: true } as never);
    }
    expect(useGameStore.getState().history.past.length).toBe(HISTORY_LIMIT);
    useGameStore.getState().loadLevel('round-1');
    expect(useGameStore.getState().history.past).toHaveLength(0);
  });

  it('disables undo while a simulation is running', () => {
    freshLevel('round-0');
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, doc('Kept'));
    useGameStore.setState({ simStatus: 'running' });
    useGameStore.getState().undo();
    expect(appPolicySid()).toBe('Kept');
    useGameStore.setState({ simStatus: 'idle' });
  });

  it('skip-to-end gives the same results as evaluating every packet', async () => {
    const s0 = freshLevel('round-0');
    const expected = s0.currentLevel.packets.map(p =>
      evaluatePacket(p, s0.nodes.map(n => n.data), s0.edges.map(e => ({ source: e.source, target: e.target })))
    );
    const s = await runSkipped();

    expect(s.simStatus).toBe('completed');
    expect(s.results.map(r => [r.packetId, r.success, r.outcome])).toEqual(expected.map(r => [r.packetId, r.success, r.outcome]));
    expect(s.edges.every(e => !e.data?.isSimulating)).toBe(true);
    expect(s.resultsCurrent).toBe(true);
  });

  it('marks results stale after a board edit', async () => {
    freshLevel('round-0');
    await runSkipped();
    expect(useGameStore.getState().resultsCurrent).toBe(true);
    useGameStore.getState().updateNodeConfig('starter-photos', { blockPublicAccess: false });
    expect(useGameStore.getState().resultsCurrent).toBe(false);
  });

  it('shows the twist pager: sticky the first time, auto-hiding after', async () => {
    freshLevel('round-0');
    await runSkipped();
    expect(useGameStore.getState().twistBanner?.sticky).toBe(true);
    useGameStore.getState().dismissTwist();
    await runSkipped();
    expect(useGameStore.getState().twistBanner?.sticky).toBe(false);
  });

  it('round-trips a board through export and import', () => {
    freshLevel('round-0');
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, doc('Exported'));
    useGameStore.getState().onConnect({ source: 'starter-app', target: 'starter-photos', sourceHandle: null, targetHandle: null });
    const file = useGameStore.getState().exportBoard();

    useGameStore.getState().resetCurrentLevel();
    expect(appPolicySid()).toBeUndefined();

    expect(useGameStore.getState().importBoard(file)).toBe(true);
    expect(appPolicySid()).toBe('Exported');
    expect(useGameStore.getState().edges).toHaveLength(2);
  });

  it('rejects a board file for a different level and leaves the board alone', () => {
    freshLevel('round-0');
    const file = JSON.parse(useGameStore.getState().exportBoard());
    file.levelId = 'round-3';
    const before = useGameStore.getState().nodes;

    expect(useGameStore.getState().importBoard(JSON.stringify(file))).toBe(false);
    expect(useGameStore.getState().toast?.message).toMatch(/round-3/);
    expect(useGameStore.getState().nodes).toBe(before);
  });

  it('rejects a board file with an invalid Effect and names the statement', () => {
    freshLevel('round-0');
    const file = JSON.parse(useGameStore.getState().exportBoard());
    file.nodes[0].data.identityPolicies = [
      { Version: '2012-10-17', Statement: [{ Sid: 'Bad', Effect: 'Permit', Action: 's3:*', Resource: '*' }] },
    ];

    expect(useGameStore.getState().importBoard(JSON.stringify(file))).toBe(false);
    expect(useGameStore.getState().toast?.message).toMatch(/Statement\[0\].*'Bad'.*Permit/);
  });

  it('start over resets the board but keeps stars', () => {
    freshLevel('round-0', { 'round-0': 2 });
    useGameStore.getState().updateNodePolicy('starter-app', 'identity', 0, doc('Gone'));
    useGameStore.getState().resetCurrentLevel();

    expect(appPolicySid()).toBeUndefined();
    expect(useGameStore.getState().starRecords['round-0']).toBe(2);
    expect(useGameStore.getState().history.past).toHaveLength(0);
  });
});
