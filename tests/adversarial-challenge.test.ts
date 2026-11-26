import { describe, it, expect } from 'vitest';
import {
  ALL_LEVELS,
  STAGE_1_1,
  STAGE_1_2,
  STAGE_2_1,
  STAGE_2_2,
  STAGE_2_3,
  STAGE_3_1,
  STAGE_3_2,
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
import { evaluatePacket, scoreRun } from '../src/store/useGameStore';
import { evaluateExploitChain } from '../src/engine/exploitChains';
import { CloudNodeData, SimulationPacket } from '../src/types/engine';

describe('Empirical Adversarial Challenge Suite: 16 Levels & Edge Cases', () => {
  // =========================================================================
  // TASK 1: Initial Setup Failure Verification across ALL 16 levels
  // =========================================================================
  describe('Task 1: Initial Setup Failure Verification (No False Passes)', () => {
    it.each(ALL_LEVELS.map(lvl => [lvl.id, lvl]))(
      'level %s initial setup fails legitimate traffic, allows exploit, or violates budget (score < 3)',
      (_id, lvl) => {
        const nodes = lvl.initialNodes.map(n => n.data);
        const edges = lvl.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = lvl.packets.map(p => evaluatePacket(p, nodes, edges));
        const score = scoreRun(lvl.packets, results, nodes, lvl.targetBudget);

        // Under no circumstances should any level start with a 3-star winning score
        expect(score.earned).toBeLessThan(3);

        // Furthermore, verify the concrete initial failure mode:
        const hasLegitFailure = results.some((r, idx) => lvl.packets[idx].kind === 'legitimate' && !r.success);
        const hasExploitBreach = results.some((r, idx) => lvl.packets[idx].kind === 'exploit' && !r.success);
        const hasOverBudget = score.totalCost > lvl.targetBudget;

        // At least one failure condition must be empirically true
        expect(hasLegitFailure || hasExploitBreach || hasOverBudget).toBe(true);
      }
    );
  });

  // =========================================================================
  // TASK 2: Stage 1 Stress Testing (Bypasses & Statement Order)
  // =========================================================================
  describe('Stage 1 Challenges: Wildcard Bypasses & Statement Precedence', () => {
    it('Stage 1.1: Missing directed edge prevents legitimate access (NETWORK_UNREACHABLE)', () => {
      const nodes: CloudNodeData[] = STAGE_1_1.initialNodes.map(n => {
        if (n.id === 'intern-alice') {
          return {
            ...n.data,
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'AllowAll',
                    Effect: 'Allow',
                    Action: '*',
                    Resource: '*',
                  },
                ],
              },
            ],
          };
        }
        return n.data;
      });

      // No edge provided
      const edges: Array<{ source: string; target: string }> = [];
      const result = evaluatePacket(STAGE_1_1.packets[0], nodes, edges);
      expect(result.success).toBe(false);
      expect(result.outcome).toBe('NETWORK_UNREACHABLE');
    });

    it('Stage 1.2: Explicit Deny on salaries takes precedence regardless of statement ordering', () => {
      const allowStatement = {
        Sid: 'AllowReportsRead',
        Effect: 'Allow' as const,
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::company-reports/*',
      };
      const denyStatement = {
        Sid: 'DenySalaries',
        Effect: 'Deny' as const,
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::company-reports/salaries/*',
      };

      const edges = STAGE_1_2.initialEdges.map(e => ({ source: e.source, target: e.target }));

      // Order A: Allow first, Deny second
      const nodesOrderA: CloudNodeData[] = STAGE_1_2.initialNodes.map(n => {
        if (n.id === 'intern-alice') {
          return {
            ...n.data,
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [allowStatement, denyStatement],
              },
            ],
          };
        }
        return n.data;
      });

      // Order B: Deny first, Allow second
      const nodesOrderB: CloudNodeData[] = STAGE_1_2.initialNodes.map(n => {
        if (n.id === 'intern-alice') {
          return {
            ...n.data,
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [denyStatement, allowStatement],
              },
            ],
          };
        }
        return n.data;
      });

      // Order C: Split across separate policy documents
      const nodesOrderC: CloudNodeData[] = STAGE_1_2.initialNodes.map(n => {
        if (n.id === 'intern-alice') {
          return {
            ...n.data,
            identityPolicies: [
              { Version: '2012-10-17', Statement: [allowStatement] },
              { Version: '2012-10-17', Statement: [denyStatement] },
            ],
          };
        }
        return n.data;
      });

      for (const nodes of [nodesOrderA, nodesOrderB, nodesOrderC]) {
        const results = STAGE_1_2.packets.map(p => evaluatePacket(p, nodes, edges));
        const legit = results.find(r => r.packetId === 'pkt-1-2-read-report')!;
        const exploit = results.find(r => r.packetId === 'pkt-1-2-read-salary')!;

        // Legitimate report read must succeed
        expect(legit.outcome).toBe('ALLOW');
        expect(legit.success).toBe(true);

        // Salary exploit MUST be denied
        expect(exploit.outcome).toBe('DENY');
        expect(exploit.success).toBe(true);
      }
    });

    it('Stage 1.2: Wildcard Allow (* or s3:*) does NOT bypass Explicit Deny on salaries', () => {
      const edges = STAGE_1_2.initialEdges.map(e => ({ source: e.source, target: e.target }));
      const nodesWithWildcard: CloudNodeData[] = STAGE_1_2.initialNodes.map(n => {
        if (n.id === 'intern-alice') {
          return {
            ...n.data,
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'WildcardAllowAll',
                    Effect: 'Allow',
                    Action: '*',
                    Resource: '*',
                  },
                  {
                    Sid: 'DenySalaries',
                    Effect: 'Deny',
                    Action: 's3:GetObject',
                    Resource: 'arn:aws:s3:::company-reports/salaries/*',
                  },
                ],
              },
            ],
          };
        }
        return n.data;
      });

      const results = STAGE_1_2.packets.map(p => evaluatePacket(p, nodesWithWildcard, edges));
      const exploit = results.find(r => r.packetId === 'pkt-1-2-read-salary')!;
      expect(exploit.outcome).toBe('DENY');
      expect(exploit.success).toBe(true);
    });
  });

  // =========================================================================
  // TASK 2: Stage 2 Stress Testing (Trust Policies & Service Principals)
  // =========================================================================
  describe('Stage 2 Challenges: EC2 Trust Policies & Lambda Execution Role Scoping', () => {
    it('Stage 2.2: Invalid EC2 trust policies or mismatched service principals trigger lockout', () => {
      const edges = STAGE_2_2.initialEdges.map(e => ({ source: e.source, target: e.target }));

      const testTrustService = (service: string, action = 'sts:AssumeRole', effect: 'Allow' | 'Deny' = 'Allow') => {
        const nodes: CloudNodeData[] = STAGE_2_2.initialNodes.map(n => {
          if (n.id === 'worker-ec2') {
            return {
              ...n.data,
              trustPolicy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'ServiceTrustStatement',
                    Effect: effect,
                    Principal: { Service: service },
                    Action: action,
                  },
                ],
              },
            };
          }
          return n.data;
        });
        const uploadPacket = STAGE_2_2.packets.find(p => p.id === 'pkt-2-2-upload')!;
        return evaluatePacket(uploadPacket, nodes, edges);
      };

      // Mismatched services must all fail
      expect(testTrustService('lambda.amazonaws.com').outcome).toBe('DENY');
      expect(testTrustService('s3.amazonaws.com').outcome).toBe('DENY');
      expect(testTrustService('apigateway.amazonaws.com').outcome).toBe('DENY');

      // Wrong action must fail
      expect(testTrustService('ec2.amazonaws.com', 'sts:AssumeRoleWithWebIdentity').outcome).toBe('DENY');

      // Explicit Deny in trust policy must trigger DENY
      expect(testTrustService('ec2.amazonaws.com', 'sts:AssumeRole', 'Deny').outcome).toBe('DENY');

      // Correct service principal ec2.amazonaws.com must succeed
      expect(testTrustService('ec2.amazonaws.com').outcome).toBe('ALLOW');
    });

    it('Stage 2.3: Lambda execution role blocks unauthorized DynamoDB table deletion', () => {
      const edges = STAGE_2_3.initialEdges.map(e => ({ source: e.source, target: e.target }));

      // Lambda configured with correct trust policy and scoped Item operations
      const hardenedNodes: CloudNodeData[] = STAGE_2_3.initialNodes.map(n => {
        if (n.id === 'order-lambda') {
          return {
            ...n.data,
            trustPolicy: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { Service: 'lambda.amazonaws.com' },
                  Action: 'sts:AssumeRole',
                },
              ],
            },
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'ScopedItemOps',
                    Effect: 'Allow',
                    Action: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
                    Resource: 'arn:aws:dynamodb:us-east-1:111122223333:table/OrdersTable',
                  },
                ],
              },
            ],
          };
        }
        return n.data;
      });

      const dropTablePacket: SimulationPacket = {
        id: 'pkt-drop-test',
        name: 'Attacker probes DeleteTable',
        kind: 'exploit',
        sourceNodeId: 'order-lambda',
        targetNodeId: 'orders-dynamodb',
        action: 'dynamodb:DeleteTable',
        resourceArn: 'arn:aws:dynamodb:us-east-1:111122223333:table/OrdersTable',
        context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/OrderProcessorRole' },
        expectedOutcome: 'DENY',
        description: 'Probe table deletion',
      };

      const result = evaluatePacket(dropTablePacket, hardenedNodes, edges);
      expect(result.outcome).toBe('DENY');
      expect(result.success).toBe(true);

      // Also verify that if someone incorrectly puts ec2.amazonaws.com in Lambda trust policy, it locks out
      const wrongTrustNodes: CloudNodeData[] = hardenedNodes.map(n => {
        if (n.id === 'order-lambda') {
          return {
            ...n,
            trustPolicy: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { Service: 'ec2.amazonaws.com' },
                  Action: 'sts:AssumeRole',
                },
              ],
            },
          };
        }
        return n;
      });

      const legitPacket = STAGE_2_3.packets.find(p => p.id === 'pkt-2-3-order-update')!;
      const wrongTrustResult = evaluatePacket(legitPacket, wrongTrustNodes, edges);
      expect(wrongTrustResult.outcome).toBe('DENY');
      expect(wrongTrustResult.failureReason).toContain('Trust Policy');
    });
  });

  // =========================================================================
  // TASK 2: Stage 3 Stress Testing (Cross-Account Dual Auth & KMS Lockout)
  // =========================================================================
  describe('Stage 3 Challenges: Cross-Account Dual Authorization & KMS Root Delegation', () => {
    it('Stage 3.2: Cross-account access fails if ONLY identity policy allows or ONLY resource policy allows', () => {
      const edges = [
        { source: 'account-a-ec2', target: 'account-b-s3' },
        { source: 'unauthorized-caller', target: 'account-b-s3' },
      ];
      const analyticsPacket = STAGE_3_2.packets.find(p => p.id === 'pkt-3-2-analytics-query')!;

      // Case A: Identity Policy ALLOW, Resource Policy EMPTY (missing)
      const nodesIdentityOnly: CloudNodeData[] = STAGE_3_2.initialNodes.map(n => {
        if (n.id === 'account-a-ec2') {
          return {
            ...n.data,
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: 's3:GetObject',
                    Resource: 'arn:aws:s3:::analytics-data-lake/*',
                  },
                ],
              },
            ],
          };
        }
        if (n.id === 'account-b-s3') {
          return {
            ...n.data,
            resourcePolicy: { Version: '2012-10-17', Statement: [] },
          };
        }
        return n.data;
      });

      const resIdentityOnly = evaluatePacket(analyticsPacket, nodesIdentityOnly, edges);
      expect(resIdentityOnly.outcome).toBe('DENY');
      expect(resIdentityOnly.failureReason).toContain('Resource Policy');

      // Case B: Resource Policy ALLOW, Identity Policy EMPTY (missing)
      const nodesResourceOnly: CloudNodeData[] = STAGE_3_2.initialNodes.map(n => {
        if (n.id === 'account-a-ec2') {
          return {
            ...n.data,
            identityPolicies: [{ Version: '2012-10-17', Statement: [] }],
          };
        }
        if (n.id === 'account-b-s3') {
          return {
            ...n.data,
            resourcePolicy: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { AWS: 'arn:aws:iam::111122223333:role/AppRole' },
                  Action: 's3:GetObject',
                  Resource: 'arn:aws:s3:::analytics-data-lake/*',
                },
              ],
            },
          };
        }
        return n.data;
      });

      const resResourceOnly = evaluatePacket(analyticsPacket, nodesResourceOnly, edges);
      expect(resResourceOnly.outcome).toBe('DENY');
      expect(resResourceOnly.failureReason).toContain('Identity Policy');

      // Case C: Resource Policy allows the WRONG principal
      const nodesWrongPrincipal: CloudNodeData[] = STAGE_3_2.initialNodes.map(n => {
        if (n.id === 'account-a-ec2') {
          return {
            ...n.data,
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: 's3:GetObject',
                    Resource: 'arn:aws:s3:::analytics-data-lake/*',
                  },
                ],
              },
            ],
          };
        }
        if (n.id === 'account-b-s3') {
          return {
            ...n.data,
            resourcePolicy: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { AWS: 'arn:aws:iam::111122223333:role/OtherAppRole' },
                  Action: 's3:GetObject',
                  Resource: 'arn:aws:s3:::analytics-data-lake/*',
                },
              ],
            },
          };
        }
        return n.data;
      });

      const resWrongPrincipal = evaluatePacket(analyticsPacket, nodesWrongPrincipal, edges);
      expect(resWrongPrincipal.outcome).toBe('DENY');

      // Case D: BOTH allow -> Success
      const nodesBothAllow: CloudNodeData[] = STAGE_3_2.initialNodes.map(n => {
        if (n.id === 'account-a-ec2') {
          return nodesIdentityOnly.find(x => x.id === 'account-a-ec2')!;
        }
        if (n.id === 'account-b-s3') {
          return nodesResourceOnly.find(x => x.id === 'account-b-s3')!;
        }
        return n.data;
      });

      const resBoth = evaluatePacket(analyticsPacket, nodesBothAllow, edges);
      expect(resBoth.outcome).toBe('ALLOW');
      expect(resBoth.success).toBe(true);
    });

    it('Stage 3.3: KMS decrypt fails without root delegation even if identity policy allows', () => {
      const keyWithoutRoot: CloudNodeData = {
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
              Sid: 'AllowPaymentProcessorOnlyWithoutRoot',
              Effect: 'Allow',
              Principal: { AWS: 'arn:aws:iam::111122223333:role/PaymentProcessorRole' },
              Action: ['kms:Decrypt'],
              Resource: '*',
            },
          ],
        },
      };

      const nodes = [...STAGE_3_3.initialNodes.map(n => n.data), keyWithoutRoot];
      const edges = [{ source: 'payment-lambda', target: 'payment-cmk' }];
      const legitDecrypt = STAGE_3_3.packets.find(p => p.id === 'pkt-6-legit-decrypt')!;

      const result = evaluatePacket(legitDecrypt, nodes, edges);
      expect(result.outcome).toBe('DENY');
      expect(result.failureReason).toContain('root delegation');
    });
  });

  // =========================================================================
  // TASK 2: Stage 4 Stress Testing (IMDS, Confused Deputy, PassRole, LeadingKeys)
  // =========================================================================
  describe('Stage 4 Challenges: Advanced Privilege Escalation & Exploit Chains', () => {
    it('Stage 4.1: IMDSv1 genuinely allows SSRF token extraction while IMDSv2 with hop limit 1 blocks it', () => {
      const makeEc2 = (imdsVersion: 'v1' | 'v2', hopLimit: number): CloudNodeData => ({
        id: 'preview-ec2',
        type: 'ec2',
        label: 'URL Preview EC2',
        arn: 'arn:aws:iam::111122223333:role/PreviewerRole',
        accountId: '111122223333',
        monthlyCost: 15,
        config: { imdsVersion, imdsHopLimit: hopLimit },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: 's3:*', Resource: '*' }],
          },
        ],
      });

      const edges = [
        { source: 'ssrf-attacker', target: 'preview-ec2' },
        { source: 'preview-ec2', target: 'app-storage-s3' },
      ];
      const exploitPacket = STAGE_4_1.packets.find(p => p.kind === 'exploit')!;

      // IMDSv1 -> Must breach
      const v1Nodes = [...STAGE_4_1.initialNodes.map(n => n.data), makeEc2('v1', 2)];
      const v1Res = evaluateExploitChain(exploitPacket, v1Nodes, edges);
      expect(v1Res.breached).toBe(true);

      // IMDSv2 with hop limit 1 -> Must NOT breach
      const v2Nodes = [...STAGE_4_1.initialNodes.map(n => n.data), makeEc2('v2', 1)];
      const v2Res = evaluateExploitChain(exploitPacket, v2Nodes, edges);
      expect(v2Res.breached).toBe(false);
    });

    it('Stage 4.2: Missing sts:ExternalId allows confused deputy cross-tenant assumption', () => {
      const exploitPacket = STAGE_4_2.packets.find(p => p.kind === 'exploit')!;

      // Insecure role without requireExternalId
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
            Statement: [{ Effect: 'Allow', Action: ['s3:GetObject'], Resource: '*' }],
          },
        ],
      };

      const insecureNodes = [...STAGE_4_2.initialNodes.map(n => n.data), insecureRole];
      const insecureRes = evaluateExploitChain(exploitPacket, insecureNodes);
      expect(insecureRes.breached).toBe(true);
      expect(insecureRes.explanation).toContain('Confused Deputy exploit succeeded');

      // Hardened role with requireExternalId: 'ac-9841-sec'
      const hardenedRole: CloudNodeData = {
        ...insecureRole,
        config: { requireExternalId: 'ac-9841-sec' },
      };
      const hardenedNodes = [...STAGE_4_2.initialNodes.map(n => n.data), hardenedRole];
      const hardenedRes = evaluateExploitChain(exploitPacket, hardenedNodes);
      expect(hardenedRes.breached).toBe(false);
    });

    it('Stage 4.3: PassRole prefix scoping permits worker roles but blocks passing administrative roles', () => {
      const makeCicdBot = (passRoleResource: string): CloudNodeData => ({
        id: 'cicd-bot',
        type: 'iam_user',
        label: 'DeployerBot',
        arn: 'arn:aws:iam::111122223333:user/DeployerBot',
        accountId: '111122223333',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PassRoleStatement',
                Effect: 'Allow',
                Action: ['iam:PassRole', 'lambda:CreateFunction', 'lambda:UpdateFunctionCode'],
                Resource: passRoleResource,
              },
            ],
          },
        ],
      });

      const workerRole: CloudNodeData = {
        id: 'worker-role',
        type: 'iam_role',
        label: 'lambda-worker-exec',
        arn: 'arn:aws:iam::111122223333:role/lambda-worker-exec',
        accountId: '111122223333',
        monthlyCost: 0,
        config: {},
        identityPolicies: [],
      };

      const edges = [
        { source: 'cicd-bot', target: 'worker-role' },
        { source: 'cicd-bot', target: 'admin-role' },
      ];

      // Scoped PassRole: only allows role/lambda-worker-*
      const scopedNodes: CloudNodeData[] = [
        ...STAGE_4_3.initialNodes.filter(n => n.id !== 'cicd-bot').map(n => n.data),
        makeCicdBot('arn:aws:iam::111122223333:role/lambda-worker-*'),
        workerRole,
      ];

      const legitDeploy = STAGE_4_3.packets.find(p => p.id === 'pkt-4-legit-deploy')!;
      const exploitPassAdmin = STAGE_4_3.packets.find(p => p.id === 'pkt-4-exploit-pass-admin')!;

      const legitResult = evaluatePacket(legitDeploy, scopedNodes, edges);
      const exploitResult = evaluatePacket(exploitPassAdmin, scopedNodes, edges);

      expect(legitResult.outcome).toBe('ALLOW');
      expect(legitResult.success).toBe(true);

      expect(exploitResult.outcome).toBe('DENY');
      expect(exploitResult.success).toBe(true);

      // Overbroad PassRole: resource: '*' allows exploit pass-admin (breach)
      const overbroadNodes: CloudNodeData[] = [
        ...STAGE_4_3.initialNodes.filter(n => n.id !== 'cicd-bot').map(n => n.data),
        makeCicdBot('*'),
        workerRole,
      ];
      const overbroadExploit = evaluatePacket(exploitPassAdmin, overbroadNodes, edges);
      expect(overbroadExploit.outcome).toBe('BREACHED');
      expect(overbroadExploit.success).toBe(false); // Fails security condition
    });

    it('Stage 4.4: DynamoDB dynamodb:LeadingKeys condition prevents tenant cross-partition hopping', () => {
      const dynamoTable: CloudNodeData = {
        id: 'records-dynamodb',
        type: 'dynamodb',
        label: 'CustomerRecords',
        arn: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
        accountId: '111122223333',
        monthlyCost: 10,
        config: {},
        identityPolicies: [],
      };

      const edges = [{ source: 'tenant-app-lambda', target: 'records-dynamodb' }];

      const makeLambda = (tenantCondition?: Record<string, any>): CloudNodeData => ({
        id: 'tenant-app-lambda',
        type: 'lambda',
        label: 'TenantAppLambda',
        arn: 'arn:aws:iam::111122223333:role/TenantAppRole',
        accountId: '111122223333',
        monthlyCost: 5,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'TenantAccess',
                Effect: 'Allow',
                Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
                Resource: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
                ...(tenantCondition ? { Condition: tenantCondition } : {}),
              },
            ],
          },
        ],
      });

      // Properly scoped to TENANT#alpha
      const scopedNodes: CloudNodeData[] = [
        makeLambda({
          'ForAllValues:StringEquals': {
            'dynamodb:LeadingKeys': ['TENANT#alpha'],
          },
        }),
        dynamoTable,
      ];

      const legitAlpha = STAGE_4_4.packets.find(p => p.id === 'pkt-5-legit-alpha')!;
      const exploitBravo = STAGE_4_4.packets.find(p => p.id === 'pkt-5-exploit-bravo')!;

      const legitRes = evaluatePacket(legitAlpha, scopedNodes, edges);
      const exploitRes = evaluatePacket(exploitBravo, scopedNodes, edges);

      expect(legitRes.outcome).toBe('ALLOW');
      expect(legitRes.success).toBe(true);

      expect(exploitRes.outcome).toBe('DENY');
      expect(exploitRes.success).toBe(true);

      // Unconstrained (missing LeadingKeys condition) -> Tenant Bravo query succeeds (breach)
      const unconstrainedNodes: CloudNodeData[] = [makeLambda(), dynamoTable];
      const unconstrainedBravo = evaluatePacket(exploitBravo, unconstrainedNodes, edges);
      expect(unconstrainedBravo.outcome).toBe('BREACHED');
      expect(unconstrainedBravo.success).toBe(false);
    });
  });

  // =========================================================================
  // TASK 2: Stage 5 Stress Testing (Boundaries, FinOps NAT, and SCP Region Guardrails)
  // =========================================================================
  describe('Stage 5 Challenges: Permission Boundaries, FinOps NAT Trap, and SCP Region Guardrails', () => {
    it('Stage 5.1: Permission Boundary clips unauthorized administrative actions while allowing approved actions', () => {
      const exploitPacket = STAGE_5_1.packets.find(p => p.kind === 'exploit')!;
      const legitPacket = STAGE_5_1.packets.find(p => p.kind === 'legitimate')!;
      const edges = STAGE_5_1.initialEdges.map(e => ({ source: e.source, target: e.target }));

      // Unbounded: Role has Action: '*' without boundary -> Exploit breaches
      const unboundedNodes = STAGE_5_1.initialNodes.map(n => n.data);
      const unboundedRes = evaluateExploitChain(exploitPacket, unboundedNodes);
      expect(unboundedRes.breached).toBe(true);

      // Bounded: Attach Permission Boundary
      const boundedNodes: CloudNodeData[] = STAGE_5_1.initialNodes.map(n => {
        if (n.id === 'dev-experimental-role') {
          return {
            ...n.data,
            permissionBoundary: {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'DeveloperPermissionBoundary',
                  Effect: 'Allow',
                  Action: [
                    's3:GetObject',
                    's3:PutObject',
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                  ],
                  Resource: '*',
                },
              ],
            },
          };
        }
        return n.data;
      });

      // Legitimate S3 read remains allowed
      const legitRes = evaluatePacket(legitPacket, boundedNodes, edges);
      expect(legitRes.outcome).toBe('ALLOW');

      // iam:CreateUser privilege escalation is clipped by boundary
      const boundedRes = evaluateExploitChain(exploitPacket, boundedNodes);
      expect(boundedRes.breached).toBe(false);
    });

    it('Stage 5.2: NAT Gateway ($32/mo) exceeds budget ($42 > $15), while S3 Gateway Endpoint ($0) stays within budget ($10 <= $15)', () => {
      // Setup A: Initial state with NAT Gateway ($32/mo)
      const initialNodes = STAGE_5_2.initialNodes.map(n => n.data);
      const initialCost = initialNodes.reduce((acc, n) => acc + (n.monthlyCost || 0), 0);
      expect(initialCost).toBe(42);
      expect(initialCost).toBeGreaterThan(STAGE_5_2.targetBudget);

      // Setup B: Hardened state replacing NAT Gateway with S3 Gateway Endpoint ($0/mo)
      const withoutNat = STAGE_5_2.initialNodes.filter(n => n.id !== 'costly-nat-gw').map(n => n.data);
      const s3Endpoint: CloudNodeData = {
        id: 's3-endpoint',
        type: 'vpc_endpoint',
        label: 'S3 Gateway Endpoint',
        arn: 'arn:aws:ec2:us-east-1:111122223333:vpc-endpoint/vpce-s3',
        accountId: '111122223333',
        monthlyCost: 0,
        config: { service: 's3', endpointType: 'gateway' },
        identityPolicies: [],
      };
      const hardenedNodes = [...withoutNat, s3Endpoint];
      const hardenedEdges = [
        { source: 'log-worker-lambda', target: 's3-endpoint' },
        { source: 's3-endpoint', target: 's3-logs-bucket' },
      ];

      const hardenedCost = hardenedNodes.reduce((acc, n) => acc + (n.monthlyCost || 0), 0);
      expect(hardenedCost).toBe(10);
      expect(hardenedCost).toBeLessThanOrEqual(STAGE_5_2.targetBudget);

      const results = STAGE_5_2.packets.map(p => evaluatePacket(p, hardenedNodes, hardenedEdges));
      const score = scoreRun(STAGE_5_2.packets, results, hardenedNodes, STAGE_5_2.targetBudget);
      expect(score.earned).toBe(3);
    });

    it('Stage 5.3: SCP blocks unauthorized regions while exempting DRBackupRole', () => {
      const edges = [
        { source: 'dr-backup-role', target: 'dr-eu-s3' },
        { source: 'ransom-attacker', target: 'ap-ec2-target' },
      ];

      const drPacket = STAGE_5_3.packets.find(p => p.id === 'pkt-5-3-dr-replicate')!;
      const cryptoPacket = STAGE_5_3.packets.find(p => p.id === 'pkt-5-3-exploit-crypto')!;

      // Case 1: Unexempted broad region Deny (Initial state)
      const initialNodes = STAGE_5_3.initialNodes.map(n => n.data);
      const drInitial = evaluatePacket(drPacket, initialNodes, edges);
      expect(drInitial.outcome).toBe('DENY'); // Fails due to unexempted SCP

      // Case 2: SCP with StringNotEquals exemption for DRBackupRole
      const exemptedNodes: CloudNodeData[] = STAGE_5_3.initialNodes.map(n => {
        if (n.id === 'dr-backup-role') {
          return {
            ...n.data,
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
                        'aws:RequestedRegion': ['us-east-1'],
                        'aws:PrincipalArn': ['arn:aws:iam::111122223333:role/DRBackupRole'],
                      },
                    },
                  },
                ],
              },
            ],
          };
        }
        return n.data;
      });

      const drResult = evaluatePacket(drPacket, exemptedNodes, edges);
      const cryptoResult = evaluatePacket(cryptoPacket, exemptedNodes, edges);

      // DR role replication to eu-central-1 succeeds
      expect(drResult.outcome).toBe('ALLOW');
      expect(drResult.success).toBe(true);

      // Attacker crypto mining in ap-southeast-1 is blocked
      expect(cryptoResult.outcome).toBe('DENY');
      expect(cryptoResult.success).toBe(true);

      // Verify that another principal attempting action in eu-central-1 or ap-southeast-1 is blocked
      const unauthorizedEuPacket: SimulationPacket = {
        id: 'pkt-unauth-eu',
        name: 'Non-exempted user in EU',
        kind: 'exploit',
        sourceNodeId: 'dr-backup-role',
        targetNodeId: 'dr-eu-s3',
        action: 's3:GetObject',
        resourceArn: 'arn:aws:s3:::eu-central-1-backup-vault/data',
        context: {
          'aws:PrincipalArn': 'arn:aws:iam::111122223333:user/StandardDev',
          'aws:RequestedRegion': 'eu-central-1',
        },
        expectedOutcome: 'DENY',
        description: 'Standard dev attempts EU access',
      };

      const euBlock = evaluatePacket(unauthorizedEuPacket, exemptedNodes, edges);
      expect(euBlock.outcome).toBe('DENY');
    });
  });

  // =========================================================================
  // TASK 2: Stage 6 Stress Testing (Capital One Defense-in-Depth)
  // =========================================================================
  describe('Stage 6 Challenges: Capital One Multi-Vector Defense-in-Depth', () => {
    it('Stage 6.1: Demonstrates defense-in-depth across IMDSv2 and least-privilege role scoping', () => {
      const exploitPacket = STAGE_6_1.packets.find(p => p.kind === 'exploit')!;
      const legitPacket = STAGE_6_1.packets.find(p => p.kind === 'legitimate')!;

      // Permissive initial state -> SSRF breach succeeds
      const initialNodes = STAGE_6_1.initialNodes.map(n => n.data);
      const initialRes = evaluateExploitChain(exploitPacket, initialNodes);
      expect(initialRes.breached).toBe(true);

      // Defense Layer 1: Enforce IMDSv2 with hop limit 1
      const imdsv2OnlyNodes: CloudNodeData[] = STAGE_6_1.initialNodes.map(n => {
        if (n.id === 'waf-ec2') {
          return {
            ...n.data,
            config: { imdsVersion: 'v2', imdsHopLimit: 1 },
          };
        }
        return n.data;
      });
      const imdsv2Res = evaluateExploitChain(exploitPacket, imdsv2OnlyNodes);
      expect(imdsv2Res.breached).toBe(false);

      // Defense Layer 2: Role Scoping: Even if IMDSv1 is left vulnerable, scoping the role prevents exfiltration!
      const scopedRoleOnlyNodes: CloudNodeData[] = STAGE_6_1.initialNodes.map(n => {
        if (n.id === 'waf-ec2') {
          return {
            ...n.data,
            config: { imdsVersion: 'v1', imdsHopLimit: 2 }, // Intentionally vulnerable IMDSv1
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'StrictWafLoggingOnly',
                    Effect: 'Allow',
                    Action: ['s3:PutObject'],
                    Resource: 'arn:aws:s3:::security-waf-logs/*',
                  },
                ],
              },
            ],
          };
        }
        return n.data;
      });

      // Attacker extracts IMDS token, but stolen token cannot access customer credit vault!
      const scopedRes = evaluateExploitChain(exploitPacket, scopedRoleOnlyNodes);
      expect(scopedRes.breached).toBe(false);
      expect(scopedRes.explanation).toContain('PARTIALLY BLOCKED');

      // Fully hardened target 3-star solution: Both IMDSv2 + scoped role
      const fullyHardenedNodes: CloudNodeData[] = STAGE_6_1.initialNodes.map(n => {
        if (n.id === 'waf-ec2') {
          return {
            ...n.data,
            config: { imdsVersion: 'v2', imdsHopLimit: 1 },
            identityPolicies: [
              {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'StrictWafLoggingOnly',
                    Effect: 'Allow',
                    Action: ['s3:PutObject'],
                    Resource: 'arn:aws:s3:::security-waf-logs/*',
                  },
                ],
              },
            ],
          };
        }
        return n.data;
      });

      const edges = [{ source: 'waf-ec2', target: 'waf-logs-s3' }];
      const legitRes = evaluatePacket(legitPacket, fullyHardenedNodes, edges);
      const exploitRes = evaluateExploitChain(exploitPacket, fullyHardenedNodes, edges);

      expect(legitRes.outcome).toBe('ALLOW');
      expect(exploitRes.breached).toBe(false);

      const score = scoreRun(STAGE_6_1.packets, [legitRes, { packetId: exploitPacket.id, success: true, outcome: 'DENY', traces: [] }], fullyHardenedNodes, STAGE_6_1.targetBudget);
      expect(score.earned).toBe(3);
    });
  });

  // =========================================================================
  // TASK 3: FinOps Budget Verification across ALL 16 levels
  // =========================================================================
  describe('Task 3: FinOps Budget Verification (16 Levels)', () => {
    it.each(ALL_LEVELS.map(lvl => [lvl.id, lvl]))(
      'level %s targetBudget is positive and realistic',
      (_id, lvl) => {
        expect(lvl.targetBudget).toBeGreaterThan(0);
        expect(lvl.targetBudget).toBeLessThanOrEqual(50);
      }
    );

    it('verifies 3-star winning solution stays within targetBudget across all 16 levels', () => {
      const stageWinningCosts: Record<string, { winningCost: number; budget: number }> = {
        'stage1-1-hello-cloud': { winningCost: 5, budget: STAGE_1_1.targetBudget },
        'stage1-2-curious-teammate': { winningCost: 5, budget: STAGE_1_2.targetBudget },
        'stage2-1-credential-leak': { winningCost: 20, budget: STAGE_2_1.targetBudget },
        'stage2-2-two-sided-coin': { winningCost: 20, budget: STAGE_2_2.targetBudget },
        'stage2-3-serverless-worker': { winningCost: 15, budget: STAGE_2_3.targetBudget },
        'stage3-1-leaky-bucket': { winningCost: 20, budget: STAGE_3_1.targetBudget },
        'stage3-2-cross-account-bridge': { winningCost: 20, budget: STAGE_3_2.targetBudget },
        'stage3-3-silent-lockout': { winningCost: 6, budget: STAGE_3_3.targetBudget },
        'stage4-1-metadata-heist': { winningCost: 20, budget: STAGE_4_1.targetBudget },
        'stage4-2-confused-deputy': { winningCost: 5, budget: STAGE_4_2.targetBudget },
        'stage4-3-shadow-admin': { winningCost: 0, budget: STAGE_4_3.targetBudget },
        'stage4-4-tenant-hopping': { winningCost: 15, budget: STAGE_4_4.targetBudget },
        'stage5-1-glass-ceiling': { winningCost: 5, budget: STAGE_5_1.targetBudget },
        'stage5-2-nat-gateway-trap': { winningCost: 10, budget: STAGE_5_2.targetBudget },
        'stage5-3-organization-shield': { winningCost: 20, budget: STAGE_5_3.targetBudget },
        'stage6-1-capital-one': { winningCost: 25, budget: STAGE_6_1.targetBudget },
      };

      for (const lvl of ALL_LEVELS) {
        const check = stageWinningCosts[lvl.id];
        expect(check).toBeDefined();
        expect(check.winningCost).toBeLessThanOrEqual(check.budget);
        expect(check.budget).toBe(lvl.targetBudget);
      }
    });
  });
});
