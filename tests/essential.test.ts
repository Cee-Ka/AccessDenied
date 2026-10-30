import { describe, it, expect } from 'vitest';
import { mapLevelToFlow, useGameStore } from '../src/store/useGameStore';
import { round0CloudBasics } from '../src/levels/round0-cloud-basics';
import { round7NatGatewayTrap } from '../src/levels/round7-nat-gateway-trap';
import { freshLevel } from './helpers';

const node = (id: string) => useGameStore.getState().nodes.find(n => n.id === id);

describe('Essential node protection', () => {
  it('marks starting nodes essential by default and honors opt-outs', () => {
    const r0 = mapLevelToFlow(round0CloudBasics);
    expect(r0.nodes.every(n => n.data.essential && n.deletable === false)).toBe(true);

    const r7 = mapLevelToFlow(round7NatGatewayTrap);
    const nat = r7.nodes.find(n => n.id === 'costly-nat-gw')!;
    expect(nat.data.essential).toBe(false);
    expect(nat.deletable).toBe(true);
  });

  it('blocks keyboard/canvas deletion of an essential node and explains why', () => {
    freshLevel('round-0');
    useGameStore.getState().onNodesChange([{ type: 'remove', id: 'starter-app' }]);
    expect(node('starter-app')).toBeDefined();
    expect(useGameStore.getState().toast?.message).toMatch(/PhotoAppRole.*required/);
  });

  it('blocks the inspector delete path', () => {
    freshLevel('round-0');
    useGameStore.getState().removeNodeFromBoard('starter-photos');
    expect(node('starter-photos')).toBeDefined();
  });

  it('deletes only the player-added node in a mixed selection', () => {
    freshLevel('round-0');
    useGameStore.getState().addServiceToBoard({ type: 's3', label: 'S3 Bucket', cost: 5 });
    const added = useGameStore.getState().nodes.find(n => !n.data.essential)!;
    expect(added.data.essential).toBe(false);

    useGameStore.getState().onNodesChange([
      { type: 'remove', id: 'starter-app' },
      { type: 'remove', id: added.id },
    ]);

    expect(node(added.id)).toBeUndefined();
    expect(node('starter-app')).toBeDefined();
    expect(useGameStore.getState().toast?.message).toMatch(/PhotoAppRole/);
  });

  it('lets the player delete a node the level opted out (Round 7 NAT Gateway)', () => {
    freshLevel('round-7', { 'round-1': 1, 'round-2': 1, 'round-3': 1, 'round-4': 1, 'round-5': 1, 'round-6': 1 });
    useGameStore.getState().removeNodeFromBoard('costly-nat-gw');
    expect(node('costly-nat-gw')).toBeUndefined();
    expect(useGameStore.getState().edges.some(e => e.source === 'costly-nat-gw' || e.target === 'costly-nat-gw')).toBe(false);
  });

  it('keeps essential nodes editable', () => {
    freshLevel('round-0');
    useGameStore.getState().updateNodeConfig('starter-photos', { blockPublicAccess: false });
    useGameStore.getState().updateNodePolicy('starter-photos', 'resource', 0, {
      Version: '2012-10-17',
      Statement: [{ Sid: 'Edited', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: '*' }],
    });
    expect(node('starter-photos')!.data.config.blockPublicAccess).toBe(false);
    expect(node('starter-photos')!.data.resourcePolicy?.Statement[0].Sid).toBe('Edited');
  });

  it('lets the player delete starting edges', () => {
    freshLevel('round-0');
    useGameStore.getState().removeEdge('edge-intern-photos');
    expect(useGameStore.getState().edges).toHaveLength(0);
  });

  it('restores essential nodes missing from an imported board', () => {
    freshLevel('round-0');
    const file = JSON.parse(useGameStore.getState().exportBoard());
    file.nodes = file.nodes.filter((n: { id: string }) => n.id !== 'starter-intern');

    expect(useGameStore.getState().importBoard(JSON.stringify(file))).toBe(true);
    expect(node('starter-intern')?.data.essential).toBe(true);
    expect(useGameStore.getState().toast?.message).toMatch(/Restored required node: intern-dev/);
  });

  it('cannot strip the essential flag through an import', () => {
    freshLevel('round-0');
    const file = JSON.parse(useGameStore.getState().exportBoard());
    file.nodes = file.nodes.map((n: { data: Record<string, unknown> }) => ({ ...n, data: { ...n.data, essential: false }, deletable: true }));
    useGameStore.getState().importBoard(JSON.stringify(file));

    expect(node('starter-app')?.data.essential).toBe(true);
    expect(node('starter-app')?.deletable).toBe(false);
  });
});
