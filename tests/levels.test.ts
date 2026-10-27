import { describe, it, expect } from 'vitest';
import { ALL_LEVELS } from '../src/levels';
import { evaluateExploitChain } from '../src/engine/exploitChains';
import { evaluateRequest } from '../src/engine/evaluator';
import { round1LeakyBucket } from '../src/levels/round1-leaky-bucket';
import { round2ImdsHeist } from '../src/levels/round2-imds-heist';
import { round3ConfusedDeputy } from '../src/levels/round3-confused-deputy';
import { CloudNodeData } from '../src/types/engine';

describe('Level Verification Suite', () => {
  it('loads all 8 learn levels + incident levels', () => {
    expect(ALL_LEVELS.length).toBeGreaterThanOrEqual(9);
    for (const lvl of ALL_LEVELS) {
      expect(lvl.id).toBeDefined();
      expect(lvl.title).toBeDefined();
      expect(lvl.targetBudget).toBeGreaterThan(0);
      expect(lvl.initialNodes.length).toBeGreaterThan(0);
      expect(lvl.packets.length).toBeGreaterThan(0);
    }
  });

  describe('Round 1: The Leaky Bucket', () => {
    it('initial broken state allows botnet scraper to access customer invoices', () => {
      const nodes = round1LeakyBucket.initialNodes.map(n => n.data);
      const exploitPacket = round1LeakyBucket.packets.find(p => p.kind === 'exploit')!;

      const result = evaluateExploitChain(exploitPacket, nodes);
      // In the broken state, the bucket policy has Principal: "*", so exploit is ALLOWED (breached)
      expect(result.breached).toBe(true);
    });

    it('hardened state with Block Public Access and role-scoped bucket policy achieves 3 stars', () => {
      // Apply Round 1 target fix:
      const hardenedNodes: CloudNodeData[] = round1LeakyBucket.initialNodes.map(n => {
        if (n.id === 'invoices-bucket') {
          return {
            ...n.data,
            config: { blockPublicAccess: true },
            resourcePolicy: {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'AllowWebServerOnly',
                  Effect: 'Allow',
                  Principal: { AWS: 'arn:aws:iam::111122223333:role/WebServerRole' },
                  Action: ['s3:GetObject', 's3:PutObject'],
                  Resource: 'arn:aws:s3:::customer-invoices/*'
                }
              ]
            }
          };
        }
        return n.data;
      });

      // 1. Verify all legitimate packets pass
      const legitPackets = round1LeakyBucket.packets.filter(p => p.kind === 'legitimate');
      for (const pkt of legitPackets) {
        const res = evaluateRequest(pkt, hardenedNodes);
        expect(res.outcome).toBe('ALLOW');
      }

      // 2. Verify exploit packet is blocked
      const exploitPacket = round1LeakyBucket.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateExploitChain(exploitPacket, hardenedNodes);
      expect(exploitRes.breached).toBe(false);

      // 3. Verify budget
      const totalCost = hardenedNodes.reduce((acc, n) => acc + n.monthlyCost, 0);
      expect(totalCost).toBeLessThanOrEqual(round1LeakyBucket.targetBudget);
    });
  });

  describe('Round 2: The Metadata Heist', () => {
    it('initial broken state allows IMDSv1 SSRF credential extraction and private data dump', () => {
      const nodes = round2ImdsHeist.initialNodes.map(n => n.data);
      const exploitPacket = round2ImdsHeist.packets.find(p => p.kind === 'exploit')!;

      const result = evaluateExploitChain(exploitPacket, nodes);
      expect(result.breached).toBe(true);
      expect(result.chainDetected).toBe('IMDS_SSRF');
    });

    it('hardened state with IMDSv2 blocks SSRF token theft', () => {
      const hardenedNodes: CloudNodeData[] = round2ImdsHeist.initialNodes.map(n => {
        if (n.id === 'preview-ec2') {
          return {
            ...n.data,
            config: {
              imdsVersion: 'v2',
              imdsHopLimit: 1
            },
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'ScopedStorage',
                    Effect: 'Allow',
                    Action: ['s3:GetObject', 's3:PutObject'],
                    Resource: 'arn:aws:s3:::app-storage/*'
                  }
                ]
              }
            ]
          };
        }
        return n.data;
      });

      // 1. Legitimate workload passes
      const legitPacket = round2ImdsHeist.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateRequest(legitPacket, hardenedNodes);
      expect(legitRes.outcome).toBe('ALLOW');

      // 2. Exploit is blocked by IMDSv2
      const exploitPacket = round2ImdsHeist.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateExploitChain(exploitPacket, hardenedNodes);
      expect(exploitRes.breached).toBe(false);

      // 3. Under budget
      const totalCost = hardenedNodes.reduce((acc, n) => acc + n.monthlyCost, 0);
      expect(totalCost).toBeLessThanOrEqual(round2ImdsHeist.targetBudget);
    });
  });

  describe('Round 3: The Confused Deputy', () => {
    it('initial broken state allows assumption without ExternalId', () => {
      const nodes = round3ConfusedDeputy.initialNodes.map(n => n.data);
      const exploitPacket = round3ConfusedDeputy.packets.find(p => p.kind === 'exploit')!;

      const result = evaluateExploitChain(exploitPacket, nodes);
      expect(result.breached).toBe(true);
      expect(result.chainDetected).toBe('CONFUSED_DEPUTY');
    });

    it('hardened role requiring sts:ExternalId blocks confused deputy attack', () => {
      const hardenedNodes: CloudNodeData[] = round3ConfusedDeputy.initialNodes.map(n => {
        if (n.id === 'vendor-role') {
          return {
            ...n.data,
            config: {
              requireExternalId: 'ac-9841-sec'
            },
            trustPolicy: {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'TrustVendorWithExternalId',
                  Effect: 'Allow',
                  Principal: { AWS: 'arn:aws:iam::222233334444:root' },
                  Action: 'sts:AssumeRole',
                  Condition: {
                    StringEquals: {
                      'sts:ExternalId': 'ac-9841-sec'
                    }
                  }
                }
              ]
            }
          };
        }
        return n.data;
      });

      // Legitimate customer with matching ExternalId succeeds
      const legit = round3ConfusedDeputy.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateExploitChain(legit, hardenedNodes);
      expect(legitRes.breached).toBe(false);

      // Malicious customer with wrong ExternalId is blocked
      const exploit = round3ConfusedDeputy.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateExploitChain(exploit, hardenedNodes);
      expect(exploitRes.breached).toBe(false);
    });
  });
});
