import { describe, it, expect } from 'vitest';
import { ALL_LEVELS } from '../src/levels';
import { evaluateExploitChain } from '../src/engine/exploitChains';
import { evaluateRequest } from '../src/engine/evaluator';
import { round0CloudBasics } from '../src/levels/round0-cloud-basics';
import { round1LeakyBucket } from '../src/levels/round1-leaky-bucket';
import { round2ImdsHeist } from '../src/levels/round2-imds-heist';
import { round3ConfusedDeputy } from '../src/levels/round3-confused-deputy';
import { round4ShadowAdmin } from '../src/levels/round4-shadow-admin';
import { round5TenantHopping } from '../src/levels/round5-tenant-hopping';
import { round6SilentLockout } from '../src/levels/round6-silent-lockout';
import { round7NatGatewayTrap } from '../src/levels/round7-nat-gateway-trap';
import { round8GuardrailClash } from '../src/levels/round8-guardrail-clash';
import { incidentCapitalOne } from '../src/levels/incident-capital-one';
import { CloudNodeData, PolicyDocument } from '../src/types/engine';
import { useGameStore, evaluatePacket, scoreRun } from '../src/store/useGameStore';

describe('Level Verification Suite', () => {
  it('loads all 8 learn levels + incident levels with report cards and progressive service unlocks', () => {
    expect(ALL_LEVELS.length).toBeGreaterThanOrEqual(9);
    for (const lvl of ALL_LEVELS) {
      expect(lvl.id).toBeDefined();
      expect(lvl.title).toBeDefined();
      expect(lvl.targetBudget).toBeGreaterThan(0);
      expect(lvl.initialNodes.length).toBeGreaterThan(0);
      expect(lvl.packets.length).toBeGreaterThan(0);

      if (lvl.category === 'Learn') {
        expect(lvl.reportCard).toBeDefined();
        expect(lvl.reportCard?.tasks.length).toBeGreaterThanOrEqual(3);
        expect(lvl.unlockedServices).toBeDefined();
        expect(lvl.unlockedServices!.length).toBeGreaterThan(0);
      }
    }
  });

  it('enforces progressive service unlocking across rounds', () => {
    const r1 = ALL_LEVELS.find(l => l.id === 'round-1')!;
    const r2 = ALL_LEVELS.find(l => l.id === 'round-2')!;
    const r4 = ALL_LEVELS.find(l => l.id === 'round-4')!;
    const r5 = ALL_LEVELS.find(l => l.id === 'round-5')!;
    const r6 = ALL_LEVELS.find(l => l.id === 'round-6')!;
    const r7 = ALL_LEVELS.find(l => l.id === 'round-7')!;

    expect(r1.unlockedServices).toContain('s3');
    expect(r1.unlockedServices).not.toContain('ec2');

    expect(r2.unlockedServices).toContain('ec2');
    expect(r2.unlockedServices).not.toContain('lambda');

    expect(r4.unlockedServices).toContain('lambda');
    expect(r4.unlockedServices).not.toContain('dynamodb');

    expect(r5.unlockedServices).toContain('dynamodb');
    expect(r5.unlockedServices).not.toContain('kms');

    expect(r6.unlockedServices).toContain('kms');
    expect(r6.unlockedServices).not.toContain('vpc_endpoint');

    expect(r7.unlockedServices).toContain('vpc_endpoint');
  });

  describe('Round 0: Cloud Basics (starter tutorial)', () => {
    const solved = (): { nodes: CloudNodeData[]; edges: Array<{ source: string; target: string }> } => {
      const nodes = round0CloudBasics.initialNodes.map(n => {
        if (n.id === 'starter-app') {
          return {
            ...n.data,
            identityPolicies: [{
              Version: '2012-10-17' as const,
              Statement: [{ Sid: 'ReadPhotos', Effect: 'Allow' as const, Action: 's3:GetObject', Resource: 'arn:aws:s3:::team-photos/*' }],
            }],
          };
        }
        if (n.id === 'starter-photos') {
          return {
            ...n.data,
            resourcePolicy: {
              Version: '2012-10-17' as const,
              Statement: [{
                Sid: 'AppReads', Effect: 'Allow' as const,
                Principal: { AWS: 'arn:aws:iam::111122223333:role/PhotoAppRole' },
                Action: 's3:GetObject', Resource: 'arn:aws:s3:::team-photos/*',
              }],
            },
          };
        }
        if (n.id === 'starter-intern') {
          return {
            ...n.data,
            identityPolicies: [{
              Version: '2012-10-17' as const,
              Statement: [
                ...n.data.identityPolicies[0].Statement,
                { Sid: 'NoDeletes', Effect: 'Deny' as const, Action: 's3:DeleteObject', Resource: '*' },
              ],
            }],
            permissionBoundary: {
              Version: '2012-10-17' as const,
              Statement: [{
                Effect: 'Allow' as const,
                Action: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
                Resource: ['arn:aws:s3:::team-photos', 'arn:aws:s3:::team-photos/*'],
              }],
            },
            scpPolicies: [{
              Version: '2012-10-17' as const,
              Statement: [{ Effect: 'Deny' as const, Action: 's3:PutPublicAccessBlock', Resource: '*' }],
            }],
          };
        }
        return n.data;
      });
      return {
        nodes,
        edges: [
          { source: 'starter-intern', target: 'starter-photos' },
          { source: 'starter-app', target: 'starter-photos' },
        ],
      };
    };

    it('is a Learn level numbered 0 with a guide covering the eight core concepts in order', () => {
      expect(ALL_LEVELS[0].id).toBe('round-0');
      expect(round0CloudBasics.category).toBe('Learn');
      expect(round0CloudBasics.roundNumber).toBe(0);
      const concepts = round0CloudBasics.onboardingSteps!.map(s => s.conceptId).filter(Boolean);
      expect(concepts).toEqual([
        'principal', 'resource', 'connection', 'identity_policy',
        'resource_policy', 'explicit_deny', 'permission_boundary', 'scp',
      ]);
    });

    it('initial state fails legitimate traffic and lets attacks through', () => {
      const nodes = round0CloudBasics.initialNodes.map(n => n.data);
      const edges = round0CloudBasics.initialEdges.map(e => ({ source: e.source, target: e.target }));
      const results = round0CloudBasics.packets.map(p => evaluatePacket(p, nodes, edges));

      const appRead = results[round0CloudBasics.packets.findIndex(p => p.id === 'pkt-0-app-read')];
      expect(appRead.success).toBe(false);
      const del = results[round0CloudBasics.packets.findIndex(p => p.id === 'pkt-0-intern-delete')];
      expect(del.success).toBe(false); // the attack got through
      expect(scoreRun(round0CloudBasics.packets, results, nodes, round0CloudBasics.targetBudget).earned).toBe(0);
    });

    it('target solution passes all workloads, blocks all attacks and stays within budget (3 stars)', () => {
      const { nodes, edges } = solved();
      const results = round0CloudBasics.packets.map(p => evaluatePacket(p, nodes, edges));
      expect(results.every(r => r.success)).toBe(true);

      const score = scoreRun(round0CloudBasics.packets, results, nodes, round0CloudBasics.targetBudget);
      expect(score.earned).toBe(3);
      expect(score.totalCost).toBeLessThanOrEqual(round0CloudBasics.targetBudget);
    });

    it('the permission boundary alone stops the "make public" attack', () => {
      const { nodes, edges } = solved();
      const pkt = round0CloudBasics.packets.find(p => p.id === 'pkt-0-intern-public')!;
      const res = evaluateRequest(pkt, nodes, edges);
      expect(res.outcome).toBe('DENY');
      expect(res.traces.some(t => t.stage === 'PERMISSION_BOUNDARY' && t.status === 'DENIED')).toBe(true);
    });
  });

  describe('Round 1: The Leaky Bucket', () => {
    it('initial canvas starts empty of target S3 storage', () => {
      const nodeIds = round1LeakyBucket.initialNodes.map(n => n.id);
      expect(nodeIds).not.toContain('invoices-bucket');
      expect(nodeIds).toContain('web-server-ec2');
      expect(nodeIds).toContain('botnet-scraper');

      const nodes = round1LeakyBucket.initialNodes.map(n => n.data);
      const exploitPacket = round1LeakyBucket.packets.find(p => p.kind === 'exploit')!;
      const result = evaluateExploitChain(exploitPacket, nodes);
      expect(result.breached).toBe(false);
      expect(result.explanation).toContain('Source or target node not found');
    });

    it('assembled unhardened S3 bucket with open policy allows scraper to breach', () => {
      const brokenBucket: CloudNodeData = {
        id: 'invoices-bucket',
        type: 's3',
        label: 'customer-invoices',
        arn: 'arn:aws:s3:::customer-invoices',
        accountId: '111122223333',
        monthlyCost: 5,
        config: { blockPublicAccess: false },
        identityPolicies: [],
        resourcePolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadInvoices',
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::customer-invoices/*'
            }
          ]
        }
      };
      const nodes = [...round1LeakyBucket.initialNodes.map(n => n.data), brokenBucket];
      const exploitPacket = round1LeakyBucket.packets.find(p => p.kind === 'exploit')!;
      const result = evaluateExploitChain(exploitPacket, nodes);
      expect(result.breached).toBe(true);
    });

    it('hardened state with Block Public Access and role-scoped bucket policy achieves 3 stars', () => {
      const hardenedBucket: CloudNodeData = {
        id: 'invoices-bucket',
        type: 's3',
        label: 'customer-invoices',
        arn: 'arn:aws:s3:::customer-invoices',
        accountId: '111122223333',
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: [],
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

      const edges = [{ source: 'web-server-ec2', target: 'invoices-bucket' }];
      const hardenedNodes: CloudNodeData[] = [...round1LeakyBucket.initialNodes.map(n => n.data), hardenedBucket];

      const legitPackets = round1LeakyBucket.packets.filter(p => p.kind === 'legitimate');
      for (const pkt of legitPackets) {
        const res = evaluateRequest(pkt, hardenedNodes, edges);
        expect(res.outcome).toBe('ALLOW');
      }

      const exploitPacket = round1LeakyBucket.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateExploitChain(exploitPacket, hardenedNodes, edges);
      expect(exploitRes.breached).toBe(false);

      const totalCost = hardenedNodes.reduce((acc, n) => acc + n.monthlyCost, 0);
      expect(totalCost).toBeLessThanOrEqual(round1LeakyBucket.targetBudget);
    });
  });

  describe('Round 2: The Metadata Heist', () => {
    it('initial canvas starts without EC2 compute', () => {
      const nodeIds = round2ImdsHeist.initialNodes.map(n => n.id);
      expect(nodeIds).not.toContain('preview-ec2');
      expect(nodeIds).toContain('ssrf-attacker');
      expect(nodeIds).toContain('app-storage-s3');
    });

    it('assembled unhardened EC2 with IMDSv1 allows SSRF credential extraction', () => {
      const imdsv1Ec2: CloudNodeData = {
        id: 'preview-ec2',
        type: 'ec2',
        label: 'URL Preview EC2',
        arn: 'arn:aws:iam::111122223333:role/PreviewerRole',
        accountId: '111122223333',
        monthlyCost: 15,
        config: { imdsVersion: 'v1', imdsHopLimit: 2 },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: 's3:*', Resource: '*' }]
          }
        ]
      };
      const nodes = [...round2ImdsHeist.initialNodes.map(n => n.data), imdsv1Ec2];
      const edges = [
        { source: 'ssrf-attacker', target: 'preview-ec2' },
        { source: 'preview-ec2', target: 'app-storage-s3' }
      ];
      const exploitPacket = round2ImdsHeist.packets.find(p => p.kind === 'exploit')!;

      const result = evaluateExploitChain(exploitPacket, nodes, edges);
      expect(result.breached).toBe(true);
      expect(result.chainDetected).toBe('IMDS_SSRF');
    });

    it('hardened state with IMDSv2 blocks SSRF token theft', () => {
      const hardenedEc2: CloudNodeData = {
        id: 'preview-ec2',
        type: 'ec2',
        label: 'URL Preview EC2',
        arn: 'arn:aws:iam::111122223333:role/PreviewerRole',
        accountId: '111122223333',
        monthlyCost: 15,
        config: { imdsVersion: 'v2', imdsHopLimit: 1 },
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
      const hardenedNodes: CloudNodeData[] = [...round2ImdsHeist.initialNodes.map(n => n.data), hardenedEc2];
      const edges = [
        { source: 'ssrf-attacker', target: 'preview-ec2' },
        { source: 'preview-ec2', target: 'app-storage-s3' }
      ];

      const legitPacket = round2ImdsHeist.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateRequest(legitPacket, hardenedNodes, edges);
      expect(legitRes.outcome).toBe('ALLOW');

      const exploitPacket = round2ImdsHeist.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateExploitChain(exploitPacket, hardenedNodes, edges);
      expect(exploitRes.breached).toBe(false);

      const totalCost = hardenedNodes.reduce((acc, n) => acc + n.monthlyCost, 0);
      expect(totalCost).toBeLessThanOrEqual(round2ImdsHeist.targetBudget);
    });
  });

  describe('Round 3: The Confused Deputy', () => {
    it('initial canvas starts without cross-account IAM role', () => {
      const nodeIds = round3ConfusedDeputy.initialNodes.map(n => n.id);
      expect(nodeIds).not.toContain('vendor-role');
      expect(nodeIds).toContain('vendor-saas');
      expect(nodeIds).toContain('sales-metrics-s3');
    });

    it('assembled role without ExternalId allows confused deputy assumption', () => {
      const insecureRole: CloudNodeData = {
        id: 'vendor-role',
        type: 'iam_role',
        label: 'VendorAnalyticsRole',
        arn: 'arn:aws:iam::111122223333:role/VendorAnalyticsRole',
        accountId: '111122223333',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: 'arn:aws:s3:::sales-metrics/*' }]
          }
        ],
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'TrustVendor',
              Effect: 'Allow',
              Principal: { AWS: 'arn:aws:iam::222233334444:root' },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      };
      const nodes = [...round3ConfusedDeputy.initialNodes.map(n => n.data), insecureRole];
      const edges = [
        { source: 'vendor-saas', target: 'vendor-role' },
        { source: 'vendor-role', target: 'sales-metrics-s3' }
      ];
      const exploitPacket = round3ConfusedDeputy.packets.find(p => p.kind === 'exploit')!;

      const result = evaluateExploitChain(exploitPacket, nodes, edges);
      expect(result.breached).toBe(true);
      expect(result.chainDetected).toBe('CONFUSED_DEPUTY');
    });

    it('hardened role requiring sts:ExternalId blocks confused deputy attack', () => {
      const hardenedRole: CloudNodeData = {
        id: 'vendor-role',
        type: 'iam_role',
        label: 'VendorAnalyticsRole',
        arn: 'arn:aws:iam::111122223333:role/VendorAnalyticsRole',
        accountId: '111122223333',
        monthlyCost: 0,
        config: { requireExternalId: 'ac-9841-sec' },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: 'arn:aws:s3:::sales-metrics/*' }]
          }
        ],
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'TrustVendorWithExternalId',
              Effect: 'Allow',
              Principal: { AWS: 'arn:aws:iam::222233334444:root' },
              Action: 'sts:AssumeRole',
              Condition: {
                StringEquals: { 'sts:ExternalId': 'ac-9841-sec' }
              }
            }
          ]
        }
      };
      const nodes = [...round3ConfusedDeputy.initialNodes.map(n => n.data), hardenedRole];
      const edges = [
        { source: 'vendor-saas', target: 'vendor-role' },
        { source: 'vendor-role', target: 'sales-metrics-s3' }
      ];

      const legit = round3ConfusedDeputy.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateExploitChain(legit, nodes, edges);
      expect(legitRes.breached).toBe(false);

      const exploit = round3ConfusedDeputy.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateExploitChain(exploit, nodes, edges);
      expect(exploitRes.breached).toBe(false);
    });
  });

  describe('Round 4: Shadow Admin', () => {
    it('initial canvas starts without worker execution role', () => {
      const nodeIds = round4ShadowAdmin.initialNodes.map(n => n.id);
      expect(nodeIds).not.toContain('worker-role');
      expect(nodeIds).toContain('cicd-bot');
      expect(nodeIds).toContain('admin-role');
    });

    it('hardened state restricts PassRole to worker role with permission boundary', () => {
      const workerRole: CloudNodeData = {
        id: 'worker-role',
        type: 'iam_role',
        label: 'lambda-worker-exec',
        arn: 'arn:aws:iam::111122223333:role/lambda-worker-exec',
        accountId: '111122223333',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: ['s3:GetObject'], Resource: '*' }]
          }
        ],
        permissionBoundary: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'BoundaryWorker',
              Effect: 'Allow',
              Action: ['s3:GetObject', 'logs:*'],
              Resource: '*'
            }
          ]
        }
      };

      const hardenedBot: CloudNodeData = {
        ...round4ShadowAdmin.initialNodes.find(n => n.id === 'cicd-bot')!.data,
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'ScopedPassRole',
                Effect: 'Allow',
                Action: ['iam:PassRole'],
                Resource: 'arn:aws:iam::111122223333:role/lambda-worker-exec'
              }
            ]
          }
        ]
      };

      const adminRole = round4ShadowAdmin.initialNodes.find(n => n.id === 'admin-role')!.data;
      const nodes = [hardenedBot, adminRole, workerRole];
      const edges = [{ source: 'cicd-bot', target: 'worker-role' }];

      const legit = round4ShadowAdmin.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateRequest(legit, nodes, edges);
      expect(legitRes.outcome).toBe('ALLOW');

      const exploit = round4ShadowAdmin.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateRequest(exploit, nodes, edges);
      expect(exploitRes.outcome).toBe('DENY');
    });
  });

  describe('Round 5: Tenant Hopping', () => {
    it('initial canvas starts without DynamoDB table', () => {
      const nodeIds = round5TenantHopping.initialNodes.map(n => n.id);
      expect(nodeIds).not.toContain('records-dynamodb');
      expect(nodeIds).toContain('tenant-app-lambda');
    });

    it('hardened policy with dynamodb:LeadingKeys restricts access to calling tenant partition', () => {
      const dynamoTable: CloudNodeData = {
        id: 'records-dynamodb',
        type: 'dynamodb',
        label: 'CustomerRecords',
        arn: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
        accountId: '111122223333',
        monthlyCost: 5,
        config: {},
        identityPolicies: []
      };

      const hardenedLambda: CloudNodeData = {
        ...round5TenantHopping.initialNodes.find(n => n.id === 'tenant-app-lambda')!.data,
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'ScopedLeadingKeys',
                Effect: 'Allow',
                Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
                Resource: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
                Condition: {
                  'ForAllValues:StringEquals': {
                    'dynamodb:LeadingKeys': ['TENANT#alpha']
                  }
                }
              }
            ]
          }
        ]
      };

      const nodes = [hardenedLambda, dynamoTable];
      const edges = [{ source: 'tenant-app-lambda', target: 'records-dynamodb' }];

      const legit = round5TenantHopping.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateRequest(legit, nodes, edges);
      expect(legitRes.outcome).toBe('ALLOW');

      const exploit = round5TenantHopping.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateRequest(exploit, nodes, edges);
      expect(exploitRes.outcome).toBe('DENY');
    });
  });

  describe('Round 6: Silent Lockout', () => {
    it('initial canvas starts without KMS Key', () => {
      const nodeIds = round6SilentLockout.initialNodes.map(n => n.id);
      expect(nodeIds).not.toContain('payment-cmk');
      expect(nodeIds).toContain('payment-lambda');
    });

    it('hardened KMS key policy delegates to root and grants decrypt to payment processor', () => {
      const hardenedKey: CloudNodeData = {
        id: 'payment-cmk',
        type: 'kms',
        label: 'Payments CMK Key',
        arn: 'arn:aws:kms:us-east-1:111122223333:key/cmk-payments',
        accountId: '111122223333',
        monthlyCost: 1,
        config: {},
        identityPolicies: [],
        resourcePolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'EnableRootPermissions',
              Effect: 'Allow',
              Principal: { AWS: 'arn:aws:iam::111122223333:root' },
              Action: 'kms:*',
              Resource: '*'
            },
            {
              Sid: 'AllowPaymentProcessorDecrypt',
              Effect: 'Allow',
              Principal: { AWS: 'arn:aws:iam::111122223333:role/PaymentProcessorRole' },
              Action: ['kms:Decrypt', 'kms:GenerateDataKey'],
              Resource: '*'
            }
          ]
        }
      };

      const nodes = [...round6SilentLockout.initialNodes.map(n => n.data), hardenedKey];
      const edges = [
        { source: 'payment-lambda', target: 'payment-cmk' },
        { source: 'rogue-worker', target: 'payment-cmk' }
      ];

      const legit = round6SilentLockout.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateRequest(legit, nodes, edges);
      expect(legitRes.outcome).toBe('ALLOW');

      const exploit = round6SilentLockout.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateRequest(exploit, nodes, edges);
      expect(exploitRes.outcome).toBe('DENY');
    });
  });

  describe('Round 7: NAT Gateway Trap', () => {
    it('initial canvas starts with costly NAT Gateway exceeding budget', () => {
      const nodeIds = round7NatGatewayTrap.initialNodes.map(n => n.id);
      expect(nodeIds).not.toContain('s3-endpoint');
      expect(nodeIds).toContain('log-worker-lambda');
      expect(nodeIds).toContain('costly-nat-gw');
      expect(nodeIds).toContain('s3-logs-bucket');

      const initialTotalCost = round7NatGatewayTrap.initialNodes.reduce((acc, n) => acc + n.data.monthlyCost, 0);
      expect(initialTotalCost).toBe(42);
      expect(initialTotalCost).toBeGreaterThan(round7NatGatewayTrap.targetBudget);
    });

    it('replacing NAT Gateway with S3 VPC Gateway Endpoint delivers 3-star cost-optimal routing', () => {
      const s3Endpoint: CloudNodeData = {
        id: 's3-endpoint',
        type: 'vpc_endpoint',
        label: 'VPC S3 Gateway Endpoint',
        arn: 'arn:aws:ec2:us-east-1:111122223333:vpc-endpoint/vpce-s3',
        accountId: '111122223333',
        monthlyCost: 0,
        config: { service: 's3', endpointType: 'gateway' },
        identityPolicies: []
      };

      // Player deletes costly-nat-gw and places s3Endpoint
      const nodes = [
        ...round7NatGatewayTrap.initialNodes.filter(n => n.id !== 'costly-nat-gw').map(n => n.data),
        s3Endpoint
      ];
      const edges = [
        { source: 'log-worker-lambda', target: 's3-endpoint' },
        { source: 's3-endpoint', target: 's3-logs-bucket' }
      ];

      const legit = round7NatGatewayTrap.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateRequest(legit, nodes, edges);
      expect(legitRes.outcome).toBe('ALLOW');

      const totalCost = nodes.reduce((acc, n) => acc + n.monthlyCost, 0);
      expect(totalCost).toBe(10);
      expect(totalCost).toBeLessThanOrEqual(round7NatGatewayTrap.targetBudget);
    });
  });

  describe('Round 8: Guardrail Clash', () => {
    it('initial canvas starts with threat probe edge pre-wired while DR backup requires connection wiring', () => {
      expect(round8GuardrailClash.initialEdges).toContainEqual(
        expect.objectContaining({ id: 'edge-ransom-probe', source: 'ransom-attacker', target: 'ap-ec2-target' })
      );
      expect(round8GuardrailClash.initialEdges.some(e => e.source === 'dr-backup-role')).toBe(false);
    });

    it('hardening SCP with role exemption allows DR replication while blocking foreign crypto miners', () => {
      const hardenedBackupRole: CloudNodeData = {
        ...round8GuardrailClash.initialNodes.find(n => n.id === 'dr-backup-role')!.data,
        scpPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'DenyUnapprovedRegionsExceptDR',
                Effect: 'Deny',
                Action: '*',
                Resource: '*',
                Condition: {
                  StringNotEquals: {
                    'aws:RequestedRegion': 'us-east-1',
                    'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/DRBackupRole'
                  }
                }
              }
            ]
          }
        ]
      };

      const otherNodes = round8GuardrailClash.initialNodes
        .filter(n => n.id !== 'dr-backup-role')
        .map(n => n.data);
      const nodes = [hardenedBackupRole, ...otherNodes];
      const edges = [
        { source: 'dr-backup-role', target: 'dr-eu-s3' },
        { source: 'ransom-attacker', target: 'ap-ec2-target' }
      ];

      const legit = round8GuardrailClash.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateRequest(legit, nodes, edges);
      expect(legitRes.outcome).toBe('ALLOW');

      const exploit = round8GuardrailClash.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateRequest(exploit, nodes, edges);
      expect(exploitRes.outcome).toBe('DENY');
    });

    it('supports updating SCP guardrail policies via store updateNodePolicy', () => {
      useGameStore.setState({ starRecords: { 'round-7': 3 } });
      useGameStore.getState().loadLevel('round-8');

      const initialRole = useGameStore.getState().nodes.find(n => n.id === 'dr-backup-role')!;
      expect(initialRole.data.scpPolicies).toBeDefined();
      expect(initialRole.data.scpPolicies?.length).toBe(1);

      const exemptScp: PolicyDocument = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'DenyExceptDR',
            Effect: 'Deny',
            Action: '*',
            Resource: '*',
            Condition: {
              StringNotEquals: {
                'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/DRBackupRole'
              }
            }
          }
        ]
      };

      useGameStore.getState().updateNodePolicy('dr-backup-role', 'scp', 0, exemptScp);

      const updatedRole = useGameStore.getState().nodes.find(n => n.id === 'dr-backup-role')!;
      expect(updatedRole.data.scpPolicies?.[0].Statement[0].Sid).toBe('DenyExceptDR');
    });
  });

  describe('Incident: Capital One SSRF Breach', () => {
    it('initial broken state allows SSRF token theft', () => {
      const nodes = incidentCapitalOne.initialNodes.map(n => n.data);
      const exploitPacket = incidentCapitalOne.packets.find(p => p.kind === 'exploit')!;
      const result = evaluateExploitChain(exploitPacket, nodes);
      expect(result.breached).toBe(true);
    });

    it('hardened state with IMDSv2 blocks token extraction and achieves 3 stars', () => {
      const hardenedNodes: CloudNodeData[] = incidentCapitalOne.initialNodes.map(n => {
        if (n.id === 'waf-ec2') {
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
                    Sid: 'StrictWafLogging',
                    Effect: 'Allow',
                    Action: ['s3:PutObject'],
                    Resource: 'arn:aws:s3:::security-waf-logs/*'
                  }
                ]
              }
            ]
          };
        }
        return n.data;
      });

      const legit = incidentCapitalOne.packets.find(p => p.kind === 'legitimate')!;
      const legitRes = evaluateRequest(legit, hardenedNodes);
      expect(legitRes.outcome).toBe('ALLOW');

      const exploit = incidentCapitalOne.packets.find(p => p.kind === 'exploit')!;
      const exploitRes = evaluateExploitChain(exploit, hardenedNodes);
      expect(exploitRes.breached).toBe(false);

      const totalCost = hardenedNodes.reduce((acc, n) => acc + n.monthlyCost, 0);
      expect(totalCost).toBeLessThanOrEqual(incidentCapitalOne.targetBudget);
    });
  });
});
