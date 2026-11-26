import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ALL_LEVELS,
  STAGE_1_1,
  STAGE_1_2,
  STAGE_2_1,
  STAGE_2_2,
  STAGE_2_3,
  STAGE_3_1,
  STAGE_3_3,
  STAGE_4_1,
  STAGE_4_2,
  STAGE_4_3,
  STAGE_4_4,
  STAGE_5_1,
  STAGE_5_2,
  STAGE_5_3,
  STAGE_6_1,
} from '../src/levels';
import { evaluatePacket, scoreRun, useGameStore } from '../src/store/useGameStore';
import { evaluateExploitChain } from '../src/engine/exploitChains';
import { evaluateRequest } from '../src/engine/evaluator';
import { matchPattern } from '../src/engine/matcher';
import { validatePolicyDocument } from '../src/persistence/boardFile';
import { CloudNodeData } from '../src/types/engine';
import { freshLevel } from './helpers';

const ALL_UNLOCKED = Object.fromEntries(ALL_LEVELS.map(l => [l.id, 1]));

afterEach(() => {
  vi.useRealTimers();
});

describe('Regression fixes', () => {
  it('spawns level-specific nodes by level id instead of legacy roundNumber', () => {
    // Stage 1.1: adding S3 must NOT spawn Stage 3.1 invoices-bucket or botnet edge
    freshLevel(STAGE_1_1.id);
    useGameStore.getState().addServiceToBoard({ type: 's3', label: 'S3 Bucket', cost: 5 });
    const s1 = useGameStore.getState();
    expect(s1.nodes.some(n => n.id === 'invoices-bucket')).toBe(false);
    expect(s1.edges.some(e => e.id === 'edge-botnet-probe')).toBe(false);

    // Stage 3.1: adding S3 spawns customer-invoices bucket + botnet probe edge
    freshLevel(STAGE_3_1.id, {
      [STAGE_1_1.id]: 1,
      [STAGE_1_2.id]: 1,
      'stage2-1-credential-leak': 1,
      'stage2-2-two-sided-coin': 1,
      'stage2-3-serverless-worker': 1,
    });
    useGameStore.getState().addServiceToBoard({ type: 's3', label: 'S3 Bucket', cost: 5 });
    const s31 = useGameStore.getState();
    expect(s31.nodes.some(n => n.id === 'invoices-bucket')).toBe(true);
    expect(s31.edges.some(e => e.id === 'edge-botnet-probe')).toBe(true);

    // Stage 5.2: adding VPC S3 Endpoint spawns s3-endpoint with s3 gateway config
    freshLevel(STAGE_5_2.id, {
      [STAGE_1_1.id]: 1,
      [STAGE_1_2.id]: 1,
      'stage2-1-credential-leak': 1,
      'stage2-2-two-sided-coin': 1,
      'stage2-3-serverless-worker': 1,
      [STAGE_3_1.id]: 1,
      'stage3-2-cross-account-bridge': 1,
      'stage3-3-silent-lockout': 1,
      'stage4-1-metadata-heist': 1,
      'stage4-2-confused-deputy': 1,
      [STAGE_4_3.id]: 1,
      'stage4-4-tenant-hopping': 1,
      [STAGE_5_1.id]: 1,
    });
    useGameStore.getState().addServiceToBoard({ type: 'vpc_endpoint', label: 'VPC S3 Endpoint', cost: 0 });
    const endpoint = useGameStore.getState().nodes.find(n => n.id === 's3-endpoint');
    expect(endpoint?.data.config?.service).toBe('s3');
    expect(endpoint?.data.config?.endpointType).toBe('gateway');
  });

  it('cancels an active simulation when switching levels so old results cannot leak', async () => {
    vi.useFakeTimers();
    freshLevel(STAGE_1_1.id, { [STAGE_1_1.id]: 1 });

    // Start simulation on Stage 1.1 (will wait on halfDelay timer)
    const runPromise = useGameStore.getState().runSimulation();
    expect(useGameStore.getState().simStatus).toBe('running');

    // Switch to Stage 1.2 while Stage 1.1 simulation is still running
    useGameStore.getState().loadLevel(STAGE_1_2.id);
    expect(useGameStore.getState().currentLevelId).toBe(STAGE_1_2.id);
    expect(useGameStore.getState().simStatus).toBe('idle');

    // Advance timers so any stale timers from Stage 1.1 fire
    await vi.runAllTimersAsync();
    await runPromise;

    const after = useGameStore.getState();
    expect(after.currentLevelId).toBe(STAGE_1_2.id);
    expect(after.simStatus).toBe('idle');
    expect(after.results).toEqual([]);
    expect(after.isCoachModalOpen).toBe(false);
    expect(after.isVictoryModalOpen).toBe(false);
  });

  it('rejects non-string Action or Resource arrays in validatePolicyDocument and guards matchPattern', () => {
    expect(
      validatePolicyDocument(
        { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: 123, Resource: '*' }] },
        'Policy'
      )
    ).toMatch(/"Action"/);

    expect(
      validatePolicyDocument(
        { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: 's3:GetObject', Resource: [null] }] },
        'Policy'
      )
    ).toMatch(/"Resource"/);

    expect(matchPattern(null as unknown as string, 's3:GetObject')).toBe(false);
    expect(matchPattern('s3:*', undefined as unknown as string)).toBe(false);
  });

  it('enforces noWildcardAdmin in scoreRun while allowing boundary/SCP-scoped solutions', () => {
    // Stage 1.1 with unconstrained Action:* Resource:* must NOT get 2 or 3 stars
    const wildcardNodes: CloudNodeData[] = STAGE_1_1.initialNodes.map(n =>
      n.id === 'intern-alice'
        ? {
            ...n.data,
            identityPolicies: [
              { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }] },
            ],
          }
        : n.data
    );
    const s1Edges = [{ source: 'intern-alice', target: 'company-reports' }];
    const s1Results = STAGE_1_1.packets.map(p => evaluatePacket(p, wildcardNodes, s1Edges));
    expect(s1Results.every(r => r.success)).toBe(true);

    const wildcardScore = scoreRun(STAGE_1_1.packets, s1Results, wildcardNodes, STAGE_1_1.targetBudget, STAGE_1_1.criteria);
    expect(wildcardScore.earned).toBe(1);

    // Stage 5.1 has Action:* on dev-experimental-role BUT constrained by permissionBoundary -> still earns 3 stars
    const boundaryNodes: CloudNodeData[] = STAGE_5_1.initialNodes.map(n =>
      n.id === 'dev-experimental-role'
        ? {
            ...n.data,
            permissionBoundary: {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'Boundary',
                  Effect: 'Allow',
                  Action: ['s3:GetObject', 's3:PutObject', 'dynamodb:GetItem', 'dynamodb:PutItem', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                  Resource: '*',
                },
              ],
            },
          }
        : n.data
    );
    const s51Edges = STAGE_5_1.initialEdges.map(e => ({ source: e.source, target: e.target }));
    const s51Results = STAGE_5_1.packets.map(p => evaluatePacket(p, boundaryNodes, s51Edges));
    expect(evaluateExploitChain(STAGE_5_1.packets.find(p => p.kind === 'exploit')!, boundaryNodes).breached).toBe(false);
    expect(scoreRun(STAGE_5_1.packets, s51Results, boundaryNodes, STAGE_5_1.targetBudget, STAGE_5_1.criteria).earned).toBe(3);

    // Stage 5.3 has Action:* inside SCP Deny exemption -> still earns 3 stars
    const s53Edges = [
      { source: 'dr-backup-role', target: 'dr-eu-s3' },
      { source: 'ransom-attacker', target: 'ap-ec2-target' },
    ];
    const s53Nodes: CloudNodeData[] = STAGE_5_3.initialNodes.map(n =>
      n.id === 'dr-backup-role'
        ? {
            ...n.data,
            scpPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'DenyNonPrimaryRegionExceptDR',
                    Effect: 'Deny',
                    Action: '*',
                    Resource: '*',
                    Condition: {
                      StringNotEquals: {
                        'aws:RequestedRegion': 'us-east-1',
                        'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/DRBackupRole',
                      },
                    },
                  },
                ],
              },
            ],
          }
        : n.data
    );
    const s53Results = STAGE_5_3.packets.map(p => evaluatePacket(p, s53Nodes, s53Edges));
    expect(scoreRun(STAGE_5_3.packets, s53Results, s53Nodes, STAGE_5_3.targetBudget, STAGE_5_3.criteria).earned).toBe(3);
  });

  it('solves Stage 4.2 through UI store actions using either ExternalId config or Trust Policy condition', () => {
    // Path A: Config toggle requireExternalId
    freshLevel(STAGE_4_2.id, ALL_UNLOCKED);
    useGameStore.getState().addServiceToBoard({ type: 'iam_role', label: 'IAM Role', cost: 0 });
    useGameStore.getState().onConnect({ source: 'vendor-role', target: 'sales-metrics-s3', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodeConfig('vendor-role', { requireExternalId: 'ac-9841-sec' });
    let s = useGameStore.getState();
    let res = STAGE_4_2.packets.map(p => evaluatePacket(p, s.nodes.map(n => n.data), s.edges.map(e => ({ source: e.source, target: e.target }))));
    expect(scoreRun(STAGE_4_2.packets, res, s.nodes.map(n => n.data), STAGE_4_2.targetBudget, STAGE_4_2.criteria).earned).toBe(3);

    // Path B: Trust Policy JSON Condition with empty config.requireExternalId
    freshLevel(STAGE_4_2.id, ALL_UNLOCKED);
    useGameStore.getState().addServiceToBoard({ type: 'iam_role', label: 'IAM Role', cost: 0 });
    useGameStore.getState().onConnect({ source: 'vendor-role', target: 'sales-metrics-s3', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodePolicy('vendor-role', 'trust', 0, {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'TrustVendorWithExternalId',
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::222233334444:root' },
          Action: 'sts:AssumeRole',
          Condition: { StringEquals: { 'sts:ExternalId': 'ac-9841-sec' } },
        },
      ],
    });
    s = useGameStore.getState();
    res = STAGE_4_2.packets.map(p => evaluatePacket(p, s.nodes.map(n => n.data), s.edges.map(e => ({ source: e.source, target: e.target }))));
    expect(res.every(r => r.success)).toBe(true);
    expect(scoreRun(STAGE_4_2.packets, res, s.nodes.map(n => n.data), STAGE_4_2.targetBudget, STAGE_4_2.criteria).earned).toBe(3);
  });

  it('solves dock-placement levels (3.1, 3.3, 4.1, 4.3, 4.4, 5.2) via UI store actions to 3 stars', () => {
    const scoreCurrent = (lvl: typeof STAGE_3_1) => {
      const s = useGameStore.getState();
      const nodes = s.nodes.map(n => n.data);
      const edges = s.edges.map(e => ({ source: e.source, target: e.target }));
      const results = lvl.packets.map(p => evaluatePacket(p, nodes, edges));
      return scoreRun(lvl.packets, results, nodes, lvl.targetBudget, lvl.criteria).earned;
    };

    // Stage 3.1
    freshLevel(STAGE_3_1.id, ALL_UNLOCKED);
    useGameStore.getState().addServiceToBoard({ type: 's3', label: 'S3 Bucket', cost: 5 });
    useGameStore.getState().onConnect({ source: 'web-server-ec2', target: 'invoices-bucket', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodeConfig('invoices-bucket', { blockPublicAccess: true });
    useGameStore.getState().updateNodePolicy('invoices-bucket', 'resource', 0, {
      Version: '2012-10-17',
      Statement: [{ Sid: 'AllowWeb', Effect: 'Allow', Principal: { AWS: 'arn:aws:iam::111122223333:role/WebServerRole' }, Action: ['s3:GetObject', 's3:PutObject'], Resource: 'arn:aws:s3:::customer-invoices/*' }],
    });
    expect(scoreCurrent(STAGE_3_1)).toBe(3);

    // Stage 3.3
    freshLevel(STAGE_3_3.id, ALL_UNLOCKED);
    useGameStore.getState().addServiceToBoard({ type: 'kms', label: 'KMS Key', cost: 1 });
    useGameStore.getState().onConnect({ source: 'payment-lambda', target: 'payment-cmk', sourceHandle: null, targetHandle: null });
    useGameStore.getState().onConnect({ source: 'rogue-worker', target: 'payment-cmk', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodePolicy('payment-cmk', 'resource', 0, {
      Version: '2012-10-17',
      Statement: [{ Sid: 'EnableRoot', Effect: 'Allow', Principal: { AWS: 'arn:aws:iam::111122223333:root' }, Action: 'kms:*', Resource: '*' }],
    });
    expect(scoreCurrent(STAGE_3_3)).toBe(3);

    // Stage 4.1
    freshLevel(STAGE_4_1.id, ALL_UNLOCKED);
    useGameStore.getState().addServiceToBoard({ type: 'ec2', label: 'EC2 Instance', cost: 15 });
    useGameStore.getState().onConnect({ source: 'preview-ec2', target: 'app-storage-s3', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodeConfig('preview-ec2', { imdsVersion: 'v2', imdsHopLimit: 1 });
    useGameStore.getState().updateNodePolicy('preview-ec2', 'identity', 0, {
      Version: '2012-10-17',
      Statement: [{ Sid: 'Scoped', Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: 'arn:aws:s3:::app-storage/*' }],
    });
    expect(scoreCurrent(STAGE_4_1)).toBe(3);

    // Stage 4.3
    freshLevel(STAGE_4_3.id, ALL_UNLOCKED);
    useGameStore.getState().addServiceToBoard({ type: 'iam_role', label: 'IAM Role', cost: 0 });
    useGameStore.getState().onConnect({ source: 'cicd-bot', target: 'worker-role', sourceHandle: null, targetHandle: null });
    useGameStore.getState().onConnect({ source: 'cicd-bot', target: 'admin-role', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodePolicy('cicd-bot', 'identity', 0, {
      Version: '2012-10-17',
      Statement: [{ Sid: 'ScopedPassRole', Effect: 'Allow', Action: 'iam:PassRole', Resource: 'arn:aws:iam::111122223333:role/lambda-worker-*' }],
    });
    expect(scoreCurrent(STAGE_4_3)).toBe(3);

    // Stage 4.4
    freshLevel(STAGE_4_4.id, ALL_UNLOCKED);
    useGameStore.getState().addServiceToBoard({ type: 'dynamodb', label: 'DynamoDB Table', cost: 10 });
    useGameStore.getState().onConnect({ source: 'tenant-app-lambda', target: 'records-dynamodb', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodePolicy('tenant-app-lambda', 'identity', 0, {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'TenantIsolation',
        Effect: 'Allow',
        Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
        Resource: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
        Condition: { 'ForAllValues:StringEquals': { 'dynamodb:LeadingKeys': ['TENANT#alpha'] } },
      }],
    });
    expect(scoreCurrent(STAGE_4_4)).toBe(3);

    // Stage 5.2
    freshLevel(STAGE_5_2.id, ALL_UNLOCKED);
    useGameStore.getState().removeNodeFromBoard('costly-nat-gw');
    useGameStore.getState().addServiceToBoard({ type: 'vpc_endpoint', label: 'VPC S3 Endpoint', cost: 0 });
    useGameStore.getState().onConnect({ source: 'log-worker-lambda', target: 's3-endpoint', sourceHandle: null, targetHandle: null });
    useGameStore.getState().onConnect({ source: 's3-endpoint', target: 's3-logs-bucket', sourceHandle: null, targetHandle: null });
    expect(scoreCurrent(STAGE_5_2)).toBe(3);
  });

  it('enforces empty trustPolicy Statement: [] as Trust Policy Lockout on EC2 and Lambda', () => {
    // Stage 2.3 initial Lambda has empty trustPolicy Statement: [] -> even with DynamoDB Allow, must deny until trust is set
    const lambdaWithPerms: CloudNodeData[] = STAGE_2_3.initialNodes.map(n =>
      n.id === 'order-lambda'
        ? {
            ...n.data,
            identityPolicies: [
              { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: 'dynamodb:UpdateItem', Resource: '*' }] },
            ],
          }
        : n.data
    );
    const s23Edges = STAGE_2_3.initialEdges.map(e => ({ source: e.source, target: e.target }));
    const res = evaluateRequest(STAGE_2_3.packets[0], lambdaWithPerms, s23Edges);
    expect(res.outcome).toBe('DENY');
    expect(res.failureReason).toContain('Trust Policy');

    // Stage 2.2 cleared trustPolicy Statement: [] must NOT bypass trust check
    const ec2EmptyTrust: CloudNodeData[] = STAGE_2_2.initialNodes.map(n =>
      n.id === 'worker-ec2' ? { ...n.data, trustPolicy: { Version: '2012-10-17', Statement: [] } } : n.data
    );
    const s22Edges = STAGE_2_2.initialEdges.map(e => ({ source: e.source, target: e.target }));
    expect(evaluateRequest(STAGE_2_2.packets[0], ec2EmptyTrust, s22Edges).outcome).toBe('DENY');
  });

  it('fails Stage 2.1 exploit check if leaked-user remains with wildcard keys', () => {
    freshLevel(STAGE_2_1.id, ALL_UNLOCKED);
    useGameStore.getState().onConnect({ source: 'web-server-ec2', target: 'catalog-bucket', sourceHandle: null, targetHandle: null });
    useGameStore.getState().updateNodePolicy('web-server-ec2', 'identity', 0, {
      Version: '2012-10-17',
      Statement: [{ Sid: 'AllowRead', Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::product-catalog-assets/*' }],
    });
    let s = useGameStore.getState();
    let res = STAGE_2_1.packets.map(p => evaluatePacket(p, s.nodes.map(n => n.data), s.edges.map(e => ({ source: e.source, target: e.target }))));
    // Legit works (1 star), but leaked-user still breaches (must NOT get 2 or 3 stars)
    expect(scoreRun(STAGE_2_1.packets, res, s.nodes.map(n => n.data), STAGE_2_1.targetBudget, STAGE_2_1.criteria).earned).toBe(1);

    // Deleting leaked-user blocks the exploit and earns 3 stars
    useGameStore.getState().removeNodeFromBoard('leaked-user');
    s = useGameStore.getState();
    res = STAGE_2_1.packets.map(p => evaluatePacket(p, s.nodes.map(n => n.data), s.edges.map(e => ({ source: e.source, target: e.target }))));
    expect(scoreRun(STAGE_2_1.packets, res, s.nodes.map(n => n.data), STAGE_2_1.targetBudget, STAGE_2_1.criteria).earned).toBe(3);
  });

  it('requires intermediate NAT Gateway or VPC Endpoint to also connect to targetNode', () => {
    freshLevel(STAGE_5_2.id, ALL_UNLOCKED);
    useGameStore.getState().removeNodeFromBoard('costly-nat-gw');
    useGameStore.getState().addServiceToBoard({ type: 'vpc_endpoint', label: 'VPC S3 Endpoint', cost: 0 });
    // Half-wired: lambda -> s3-endpoint ONLY (missing s3-endpoint -> s3-logs-bucket)
    useGameStore.getState().onConnect({ source: 'log-worker-lambda', target: 's3-endpoint', sourceHandle: null, targetHandle: null });
    const s = useGameStore.getState();
    const res = evaluatePacket(
      STAGE_5_2.packets[0],
      s.nodes.map(n => n.data),
      s.edges.map(e => ({ source: e.source, target: e.target }))
    );
    expect(res.outcome).toBe('NETWORK_UNREACHABLE');
    expect(res.success).toBe(false);
  });

  it('IMDSv1 SSRF ignores unrelated IAM roles on board and targets sensitive vault regardless of order', () => {
    const unrelatedRole: CloudNodeData = {
      id: 'unrelated-role',
      type: 'iam_role',
      label: 'EmptyRole',
      arn: 'arn:aws:iam::111122223333:role/EmptyRole',
      accountId: '111122223333',
      monthlyCost: 0,
      config: {},
      identityPolicies: [],
    };
    // Reverse Stage 6.1 nodes so waf-logs-s3 comes BEFORE customer-credit-s3, and prepend unrelatedRole
    const reordered = [unrelatedRole, ...STAGE_6_1.initialNodes.map(n => n.data).reverse()];
    const exploitPacket = STAGE_6_1.packets.find(p => p.kind === 'exploit')!;
    const res = evaluateExploitChain(exploitPacket, reordered);
    expect(res.breached).toBe(true);
    expect(res.explanation).toContain('cust-credit-applications-vault');
  });
});
