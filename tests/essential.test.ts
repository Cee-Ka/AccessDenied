import { describe, it, expect } from 'vitest';
import { mapLevelToFlow, useGameStore } from '../src/store/useGameStore';
import { ALL_LEVELS, STAGE_1_1, STAGE_5_2 } from '../src/levels';
import { freshLevel } from './helpers';

const node = (id: string) => useGameStore.getState().nodes.find(n => n.id === id);

describe('Essential node protection', () => {
  it('marks starting nodes essential by default and honors opt-outs', () => {
    const r1 = mapLevelToFlow(STAGE_1_1);
    expect(r1.nodes.every(n => n.data.essential && n.deletable === false)).toBe(true);

    const r5 = mapLevelToFlow(STAGE_5_2);
    const nat = r5.nodes.find(n => n.id === 'costly-nat-gw')!;
    expect(nat.data.essential).toBe(false);
    expect(nat.deletable).toBe(true);
  });

  it('blocks keyboard/canvas deletion of an essential node and explains why', () => {
    freshLevel(STAGE_1_1.id);
    useGameStore.getState().onNodesChange([{ type: 'remove', id: 'intern-alice' }]);
    expect(node('intern-alice')).toBeDefined();
    expect(useGameStore.getState().toast?.message).toMatch(/intern-alice.*required/);
  });

  it('blocks the inspector delete path', () => {
    freshLevel(STAGE_1_1.id);
    useGameStore.getState().removeNodeFromBoard('company-reports');
    expect(node('company-reports')).toBeDefined();
  });

  it('deletes only the player-added node in a mixed selection', () => {
    freshLevel(STAGE_1_1.id);
    useGameStore.getState().addServiceToBoard({ type: 's3', label: 'S3 Bucket', cost: 5 });
    const added = useGameStore.getState().nodes.find(n => !n.data.essential)!;
    expect(added.data.essential).toBe(false);

    useGameStore.getState().onNodesChange([
      { type: 'remove', id: 'intern-alice' },
      { type: 'remove', id: added.id },
    ]);

    expect(node(added.id)).toBeUndefined();
    expect(node('intern-alice')).toBeDefined();
    expect(useGameStore.getState().toast?.message).toMatch(/intern-alice/);
  });

  it('lets the player delete a node the level opted out (Stage 5.2 NAT Gateway)', () => {
    const stars: Record<string, number> = {};
    for (const lvl of ALL_LEVELS) {
      if (lvl.id === STAGE_5_2.id) break;
      stars[lvl.id] = 1;
    }
    freshLevel(STAGE_5_2.id, stars);
    useGameStore.getState().removeNodeFromBoard('costly-nat-gw');
    expect(node('costly-nat-gw')).toBeUndefined();
    expect(useGameStore.getState().edges.some(e => e.source === 'costly-nat-gw' || e.target === 'costly-nat-gw')).toBe(false);
  });

  it('keeps essential nodes editable', () => {
    freshLevel(STAGE_1_1.id);
    useGameStore.getState().updateNodeConfig('company-reports', { blockPublicAccess: false });
    useGameStore.getState().updateNodePolicy('company-reports', 'resource', 0, {
      Version: '2012-10-17',
      Statement: [{ Sid: 'Edited', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: '*' }],
    });
    expect(node('company-reports')!.data.config.blockPublicAccess).toBe(false);
    expect(node('company-reports')!.data.resourcePolicy?.Statement[0].Sid).toBe('Edited');
  });

  it('lets the player delete added edges', () => {
    freshLevel(STAGE_1_1.id);
    useGameStore.getState().addEdgeToBoard({
      id: 'edge-alice-reports',
      source: 'intern-alice',
      target: 'company-reports',
    });
    expect(useGameStore.getState().edges.some(e => e.id === 'edge-alice-reports')).toBe(true);

    useGameStore.getState().removeEdge('edge-alice-reports');
    expect(useGameStore.getState().edges.some(e => e.id === 'edge-alice-reports')).toBe(false);
  });

  it('restores essential nodes missing from an imported board', () => {
    freshLevel(STAGE_1_1.id);
    const file = JSON.parse(useGameStore.getState().exportBoard());
    file.nodes = file.nodes.filter((n: { id: string }) => n.id !== 'intern-alice');

    expect(useGameStore.getState().importBoard(JSON.stringify(file))).toBe(true);
    expect(node('intern-alice')?.data.essential).toBe(true);
    expect(useGameStore.getState().toast?.message).toMatch(/Restored required node: intern-alice/);
  });

  it('cannot strip the essential flag through an import', () => {
    freshLevel(STAGE_1_1.id);
    const file = JSON.parse(useGameStore.getState().exportBoard());
    file.nodes = file.nodes.map((n: { data: Record<string, unknown> }) => ({ ...n, data: { ...n.data, essential: false }, deletable: true }));
    useGameStore.getState().importBoard(JSON.stringify(file));

    expect(node('intern-alice')?.data.essential).toBe(true);
    expect(node('intern-alice')?.deletable).toBe(false);
  });
});
