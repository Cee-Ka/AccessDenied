import { describe, it, expect } from 'vitest';
import { evaluateRequest } from '../src/engine/evaluator';
import { evaluateNetworkPath } from '../src/engine/network';
import { round1LeakyBucket } from '../src/levels/round1-leaky-bucket';
import { round0CloudBasics } from '../src/levels/round0-cloud-basics';
import { useGameStore } from '../src/store/useGameStore';
import { CloudNodeData } from '../src/types/engine';
import { freshLevel } from './helpers';

const web: CloudNodeData = round1LeakyBucket.initialNodes.find(n => n.id === 'web-server-ec2')!.data;
const bucket: CloudNodeData = {
  id: 'invoices-bucket',
  type: 's3',
  label: 'customer-invoices',
  arn: 'arn:aws:s3:::customer-invoices',
  accountId: web.accountId,
  monthlyCost: 5,
  config: { blockPublicAccess: true },
  identityPolicies: [],
};

describe('Directional connections', () => {
  it('passes the network stage when the edge points caller → callee', () => {
    const res = evaluateNetworkPath(web, bucket, [web, bucket], 's3:GetObject', `${bucket.arn}/a.pdf`, [
      { source: 'web-server-ec2', target: 'invoices-bucket' },
    ]);
    expect(res.reachable).toBe(true);
  });

  it('fails a reversed edge and explains how to fix it', () => {
    const res = evaluateNetworkPath(web, bucket, [web, bucket], 's3:GetObject', `${bucket.arn}/a.pdf`, [
      { source: 'invoices-bucket', target: 'web-server-ec2' },
    ]);
    expect(res.reachable).toBe(false);
    expect(res.reason).toBe('EDGE_REVERSED');
    expect(res.trace.summary).toMatch(/Reverse direction/);
  });

  it('still lets unwired external actors be evaluated as before', () => {
    const scraper = round1LeakyBucket.initialNodes.find(n => n.data.type === 'external_vendor')!.data;
    const res = evaluateNetworkPath(scraper, bucket, [scraper, bucket], 's3:GetObject', `${bucket.arn}/a.pdf`, []);
    expect(res.reachable).toBe(true);
  });

  it('records the reversed-edge failure in the evaluation trace', () => {
    const nodes = round0CloudBasics.initialNodes.map(n => n.data);
    const pkt = round0CloudBasics.packets.find(p => p.id === 'pkt-0-intern-upload')!;
    const res = evaluateRequest(pkt, nodes, [{ source: 'starter-photos', target: 'starter-intern' }]);
    expect(res.outcome).toBe('NETWORK_UNREACHABLE');
    expect(res.traces[0].summary).toMatch(/Wrong Direction/);
  });

  it('reverses a selected edge in one action, and undo restores it', () => {
    freshLevel('round-0');
    const before = useGameStore.getState().edges[0];
    expect(before).toMatchObject({ source: 'starter-intern', target: 'starter-photos' });

    useGameStore.getState().reverseEdge(before.id);
    expect(useGameStore.getState().edges[0]).toMatchObject({ source: 'starter-photos', target: 'starter-intern' });

    useGameStore.getState().undo();
    expect(useGameStore.getState().edges[0]).toMatchObject({ source: 'starter-intern', target: 'starter-photos' });
  });

  it('ignores a duplicate connection in the same direction', () => {
    freshLevel('round-0');
    const conn = { source: 'starter-intern', target: 'starter-photos', sourceHandle: null, targetHandle: null };
    useGameStore.getState().onConnect(conn);
    expect(useGameStore.getState().edges).toHaveLength(1);
  });
});
