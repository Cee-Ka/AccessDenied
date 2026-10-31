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
import { evaluateExploitChain } from '../src/engine/exploitChains';
import { CloudNodeData } from '../src/types/engine';
import { evaluatePacket, scoreRun } from '../src/store/useGameStore';

describe('Level Verification Suite: 6-Stage Curriculum', () => {
  it('loads all 16 levels across 6 stages with report cards and progressive metadata', () => {
    expect(ALL_LEVELS.length).toBe(16);
    for (const lvl of ALL_LEVELS) {
      expect(lvl.id).toBeDefined();
      expect(lvl.title).toBeDefined();
      expect(lvl.targetBudget).toBeGreaterThan(0);
      expect(lvl.initialNodes.length).toBeGreaterThan(0);
      expect(lvl.packets.length).toBeGreaterThan(0);
      expect(lvl.reportCard).toBeDefined();
      expect(lvl.reportCard?.tasks.length).toBeGreaterThanOrEqual(3);

      if (lvl.category === 'Learn') {
        expect(lvl.unlockedServices).toBeDefined();
        expect(lvl.unlockedServices!.length).toBeGreaterThan(0);
      }
    }
  });

  describe('Stage 1: Foundations of Access — Core Primitives', () => {
    describe('Level 1.1: Hello Cloud', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_1_1.reportCard).toBeDefined();
        expect(STAGE_1_1.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails legitimate traffic due to missing connection and permissions', () => {
        const nodes = STAGE_1_1.initialNodes.map(n => n.data);
        const edges = STAGE_1_1.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_1_1.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(false);
        const score = scoreRun(STAGE_1_1.packets, results, nodes, STAGE_1_1.targetBudget);
        expect(score.earned).toBe(0);
      });

      it('hardened target 3-star solution passes 100% traffic and stays within budget', () => {
        const nodes: CloudNodeData[] = STAGE_1_1.initialNodes.map(n => {
          if (n.id === 'intern-alice') {
            return {
              ...n.data,
              identityPolicies: [
                {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Sid: 'AllowReportRead',
                      Effect: 'Allow',
                      Action: 's3:GetObject',
                      Resource: 'arn:aws:s3:::company-reports/*',
                    },
                  ],
                },
              ],
            };
          }
          return n.data;
        });

        const edges = [{ source: 'intern-alice', target: 'company-reports' }];
        const results = STAGE_1_1.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const score = scoreRun(STAGE_1_1.packets, results, nodes, STAGE_1_1.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_1_1.targetBudget);
      });
    });

    describe('Level 1.2: The Curious Teammate', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_1_2.reportCard).toBeDefined();
        expect(STAGE_1_2.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state allows payroll exploit through', () => {
        const nodes = STAGE_1_2.initialNodes.map(n => n.data);
        const edges = STAGE_1_2.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_1_2.packets.map(p => evaluatePacket(p, nodes, edges));

        const exploitRes = results.find(r => r.packetId === 'pkt-1-2-read-salary')!;
        expect(exploitRes.outcome).toBe('BREACHED');
        expect(exploitRes.success).toBe(false);
      });

      it('hardened target 3-star solution blocks payroll probe with Explicit Deny', () => {
        const nodes: CloudNodeData[] = STAGE_1_2.initialNodes.map(n => {
          if (n.id === 'intern-alice') {
            return {
              ...n.data,
              identityPolicies: [
                {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Sid: 'AllowReportsRead',
                      Effect: 'Allow',
                      Action: 's3:GetObject',
                      Resource: 'arn:aws:s3:::company-reports/*',
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

        const edges = STAGE_1_2.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_1_2.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const exploitRes = results.find(r => r.packetId === 'pkt-1-2-read-salary')!;
        expect(exploitRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_1_2.packets, results, nodes, STAGE_1_2.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_1_2.targetBudget);
      });
    });
  });

  describe('Stage 2: The Magic Hat — IAM Roles for Compute Services', () => {
    describe('Level 2.1: Credential Leak', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_2_1.reportCard).toBeDefined();
        expect(STAGE_2_1.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails legitimate web server access due to missing role and connection', () => {
        const nodes = STAGE_2_1.initialNodes.map(n => n.data);
        const edges = STAGE_2_1.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_2_1.packets.map(p => evaluatePacket(p, nodes, edges));

        const webRead = results.find(r => r.packetId === 'pkt-2-1-web-read')!;
        expect(webRead.success).toBe(false);
      });

      it('hardened target 3-star solution scopes role to EC2 and eliminates static key breach', () => {
        const remainingNodes: CloudNodeData[] = STAGE_2_1.initialNodes
          .filter(n => n.id !== 'leaked-user')
          .map((n): CloudNodeData => {
            if (n.id === 'web-server-ec2') {
              return {
                ...n.data,
                identityPolicies: [
                  {
                    Version: '2012-10-17',
                    Statement: [
                      {
                        Sid: 'AllowProductCatalogRead',
                        Effect: 'Allow',
                        Action: 's3:GetObject',
                        Resource: 'arn:aws:s3:::product-catalog-assets/*',
                      },
                    ],
                  },
                ],
              };
            }
            return n.data;
          });

        const edges = [
          { source: 'web-server-ec2', target: 'catalog-bucket' },
          { source: 'bot-attacker', target: 'catalog-bucket' },
        ];
        const results = STAGE_2_1.packets.map(p => evaluatePacket(p, remainingNodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const scrapeRes = results.find(r => r.packetId === 'pkt-2-1-bot-scrape')!;
        expect(scrapeRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_2_1.packets, results, remainingNodes, STAGE_2_1.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_2_1.targetBudget);
      });
    });

    describe('Level 2.2: Two-Sided Coin', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_2_2.reportCard).toBeDefined();
        expect(STAGE_2_2.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails EC2 upload due to misconfigured trust policy', () => {
        const nodes = STAGE_2_2.initialNodes.map(n => n.data);
        const edges = STAGE_2_2.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_2_2.packets.map(p => evaluatePacket(p, nodes, edges));

        const uploadRes = results.find(r => r.packetId === 'pkt-2-2-upload')!;
        expect(uploadRes.outcome).toBe('DENY');
        expect(uploadRes.success).toBe(false);
      });

      it('hardened target 3-star solution trusts ec2.amazonaws.com and passes uploads', () => {
        const nodes: CloudNodeData[] = STAGE_2_2.initialNodes.map(n => {
          if (n.id === 'worker-ec2') {
            return {
              ...n.data,
              trustPolicy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'AllowEC2AssumeRole',
                    Effect: 'Allow',
                    Principal: { Service: 'ec2.amazonaws.com' },
                    Action: 'sts:AssumeRole',
                  },
                ],
              },
            };
          }
          return n.data;
        });

        const edges = STAGE_2_2.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_2_2.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const exploitRes = results.find(r => r.packetId === 'pkt-2-2-unauthorized-action')!;
        expect(exploitRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_2_2.packets, results, nodes, STAGE_2_2.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_2_2.targetBudget);
      });
    });

    describe('Level 2.3: Serverless Worker', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_2_3.reportCard).toBeDefined();
        expect(STAGE_2_3.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails DynamoDB update due to empty Lambda execution role', () => {
        const nodes = STAGE_2_3.initialNodes.map(n => n.data);
        const edges = STAGE_2_3.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_2_3.packets.map(p => evaluatePacket(p, nodes, edges));

        const updateRes = results.find(r => r.packetId === 'pkt-2-3-order-update')!;
        expect(updateRes.outcome).toBe('DENY');
        expect(updateRes.success).toBe(false);
      });

      it('hardened target 3-star solution configures Lambda trust and scoped DynamoDB update', () => {
        const nodes: CloudNodeData[] = STAGE_2_3.initialNodes.map(n => {
          if (n.id === 'order-lambda') {
            return {
              ...n.data,
              trustPolicy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'AllowLambdaAssumeRole',
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
                      Sid: 'OrderTableUpdate',
                      Effect: 'Allow',
                      Action: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
                      Resource: 'arn:aws:dynamodb:us-east-1:111122223333:table/OrdersTable',
                    },
                    {
                      Sid: 'CloudWatchLogging',
                      Effect: 'Allow',
                      Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
                      Resource: 'arn:aws:logs:us-east-1:111122223333:log-group:/aws/lambda/OrderProcessor:*',
                    },
                  ],
                },
              ],
            };
          }
          return n.data;
        });

        const edges = STAGE_2_3.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_2_3.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const deleteTableRes = results.find(r => r.packetId === 'pkt-2-3-table-drop')!;
        expect(deleteTableRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_2_3.packets, results, nodes, STAGE_2_3.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_2_3.targetBudget);
      });
    });
  });

  describe('Stage 3: Dual Authority — Identity vs Resource-Based Policies', () => {
    describe('Level 3.1: The Leaky Bucket', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_3_1.reportCard).toBeDefined();
        expect(STAGE_3_1.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails traffic because target bucket is not yet provisioned', () => {
        const nodes = STAGE_3_1.initialNodes.map(n => n.data);
        const edges = STAGE_3_1.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_3_1.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(false);
      });

      it('hardened target 3-star solution provisions S3 bucket with BPA enabled and restricted policy', () => {
        const bucketNode: CloudNodeData = {
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
                Resource: 'arn:aws:s3:::customer-invoices/*',
              },
            ],
          },
        };

        const nodes: CloudNodeData[] = [...STAGE_3_1.initialNodes.map(n => n.data), bucketNode];
        const edges = [{ source: 'web-server-ec2', target: 'invoices-bucket' }];
        const results = STAGE_3_1.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const botRes = results.find(r => r.packetId === 'pkt-1-bot-scrape')!;
        expect(botRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_3_1.packets, results, nodes, STAGE_3_1.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_3_1.targetBudget);
      });
    });

    describe('Level 3.2: Cross-Account Bridge', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_3_2.reportCard).toBeDefined();
        expect(STAGE_3_2.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails cross-account access due to missing dual authorization', () => {
        const nodes = STAGE_3_2.initialNodes.map(n => n.data);
        const edges = STAGE_3_2.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_3_2.packets.map(p => evaluatePacket(p, nodes, edges));

        const analyticsRes = results.find(r => r.packetId === 'pkt-3-2-analytics-query')!;
        expect(analyticsRes.outcome).toBe('DENY');
        expect(analyticsRes.success).toBe(false);
      });

      it('hardened target 3-star solution configures both identity and resource policies', () => {
        const nodes: CloudNodeData[] = STAGE_3_2.initialNodes.map(n => {
          if (n.id === 'account-a-ec2') {
            return {
              ...n.data,
              identityPolicies: [
                {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Sid: 'AllowReadDataLake',
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
                    Sid: 'AllowCrossAccountAnalytics',
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

        const edges = [
          { source: 'account-a-ec2', target: 'account-b-s3' },
          { source: 'unauthorized-caller', target: 'account-b-s3' },
        ];
        const results = STAGE_3_2.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const unauthRes = results.find(r => r.packetId === 'pkt-3-2-unauthorized-read')!;
        expect(unauthRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_3_2.packets, results, nodes, STAGE_3_2.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_3_2.targetBudget);
      });
    });

    describe('Level 3.3: The Silent Lockout', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_3_3.reportCard).toBeDefined();
        expect(STAGE_3_3.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails payment decryption due to KMS root delegation lockout and missing edge', () => {
        const nodes = STAGE_3_3.initialNodes.map(n => n.data);
        const edges = STAGE_3_3.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_3_3.packets.map(p => evaluatePacket(p, nodes, edges));

        const decryptRes = results.find(r => r.packetId === 'pkt-6-legit-decrypt')!;
        expect(decryptRes.success).toBe(false);
      });

      it('hardened target 3-star solution delegates root control and grants processor decrypt', () => {
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
                Resource: '*',
              },
              {
                Sid: 'AllowPaymentProcessorDecrypt',
                Effect: 'Allow',
                Principal: { AWS: 'arn:aws:iam::111122223333:role/PaymentProcessorRole' },
                Action: ['kms:Decrypt', 'kms:GenerateDataKey'],
                Resource: '*',
              },
            ],
          },
        };

        const nodes: CloudNodeData[] = [...STAGE_3_3.initialNodes.map(n => n.data), hardenedKey];
        const edges = [
          { source: 'payment-lambda', target: 'payment-cmk' },
          { source: 'rogue-worker', target: 'payment-cmk' },
        ];
        const results = STAGE_3_3.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const rogueRes = results.find(r => r.packetId === 'pkt-6-exploit-rogue')!;
        expect(rogueRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_3_3.packets, results, nodes, STAGE_3_3.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_3_3.targetBudget);
      });
    });
  });

  describe('Stage 4: Advanced Defense — Privilege Escalation & Exploit Chains', () => {
    describe('Level 4.1: The Metadata Heist', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_4_1.reportCard).toBeDefined();
        expect(STAGE_4_1.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state allows SSRF metadata theft via IMDSv1 when unhardened compute is assembled', () => {
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
              Statement: [{ Effect: 'Allow', Action: 's3:*', Resource: '*' }],
            },
          ],
        };
        const nodes = [...STAGE_4_1.initialNodes.map(n => n.data), imdsv1Ec2];
        const edges = [
          { source: 'ssrf-attacker', target: 'preview-ec2' },
          { source: 'preview-ec2', target: 'app-storage-s3' },
        ];
        const exploitPacket = STAGE_4_1.packets.find(p => p.kind === 'exploit')!;
        const exploitRes = evaluateExploitChain(exploitPacket, nodes, edges);

        expect(exploitRes.breached).toBe(true);
      });

      it('hardened target 3-star solution enforces IMDSv2 and scopes app storage', () => {
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
                  Sid: 'ScopedThumbnailStorage',
                  Effect: 'Allow',
                  Action: ['s3:GetObject', 's3:PutObject'],
                  Resource: 'arn:aws:s3:::app-storage/*',
                },
              ],
            },
          ],
        };

        const nodes: CloudNodeData[] = [...STAGE_4_1.initialNodes.map(n => n.data), hardenedEc2];
        const edges = [
          { source: 'preview-ec2', target: 'app-storage-s3' },
          { source: 'ssrf-attacker', target: 'preview-ec2' },
        ];
        const results = STAGE_4_1.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const exploitPacket = STAGE_4_1.packets.find(p => p.kind === 'exploit')!;
        const exploitRes = evaluateExploitChain(exploitPacket, nodes, edges);
        expect(exploitRes.breached).toBe(false);

        const score = scoreRun(STAGE_4_1.packets, results, nodes, STAGE_4_1.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_4_1.targetBudget);
      });
    });

    describe('Level 4.2: The Confused Deputy', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_4_2.reportCard).toBeDefined();
        expect(STAGE_4_2.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state allows rival tenant confused deputy role assumption when unhardened role is assembled', () => {
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
              Statement: [{ Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: 'arn:aws:s3:::sales-metrics/*' }],
            },
          ],
          trustPolicy: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'TrustVendor',
                Effect: 'Allow',
                Principal: { AWS: 'arn:aws:iam::222233334444:root' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
        };
        const nodes = [...STAGE_4_2.initialNodes.map(n => n.data), insecureRole];
        const edges = [
          { source: 'vendor-saas', target: 'vendor-role' },
          { source: 'vendor-role', target: 'sales-metrics-s3' },
        ];
        const exploitPacket = STAGE_4_2.packets.find(p => p.kind === 'exploit')!;
        const exploitRes = evaluateExploitChain(exploitPacket, nodes, edges);

        expect(exploitRes.breached).toBe(true);
      });

      it('hardened target 3-star solution requires sts:ExternalId condition in trust policy', () => {
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
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['s3:GetObject', 's3:PutObject'],
                  Resource: 'arn:aws:s3:::sales-metrics/*',
                },
              ],
            },
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
                  StringEquals: { 'sts:ExternalId': 'ac-9841-sec' },
                },
              },
            ],
          },
          resourcePolicy: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'TrustVendorWithExternalId',
                Effect: 'Allow',
                Principal: { AWS: 'arn:aws:iam::222233334444:root' },
                Action: 'sts:AssumeRole',
                Resource: 'arn:aws:iam::111122223333:role/VendorAnalyticsRole',
                Condition: {
                  StringEquals: { 'sts:ExternalId': 'ac-9841-sec' },
                },
              },
            ],
          },
        };

        const nodes: CloudNodeData[] = [...STAGE_4_2.initialNodes.map(n => n.data), hardenedRole];
        const edges = [
          { source: 'vendor-saas', target: 'vendor-role' },
          { source: 'vendor-role', target: 'sales-metrics-s3' },
        ];
        const results = STAGE_4_2.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const exploitPacket = STAGE_4_2.packets.find(p => p.kind === 'exploit')!;
        const exploitRes = evaluateExploitChain(exploitPacket, nodes, edges);
        expect(exploitRes.breached).toBe(false);

        const score = scoreRun(STAGE_4_2.packets, results, nodes, STAGE_4_2.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_4_2.targetBudget);
      });
    });

    describe('Level 4.3: Shadow Admin', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_4_3.reportCard).toBeDefined();
        expect(STAGE_4_3.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails deployment because execution role is not yet deployed', () => {
        const nodes = STAGE_4_3.initialNodes.map(n => n.data);
        const edges = STAGE_4_3.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_4_3.packets.map(p => evaluatePacket(p, nodes, edges));

        const deployRes = results.find(r => r.packetId === 'pkt-4-legit-deploy')!;
        expect(deployRes.success).toBe(false);
      });

      it('hardened target 3-star solution scopes PassRole to worker roles', () => {
        const workerNode: CloudNodeData = {
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
              Statement: [{ Effect: 'Allow', Action: ['s3:GetObject', 'logs:*'], Resource: '*' }],
            },
          ],
        };

        const nodes: CloudNodeData[] = [
          ...STAGE_4_3.initialNodes.map((n): CloudNodeData => {
            if (n.id === 'cicd-bot') {
              return {
                ...n.data,
                identityPolicies: [
                  {
                    Version: '2012-10-17',
                    Statement: [
                      {
                        Sid: 'ScopedPassRole',
                        Effect: 'Allow',
                        Action: ['iam:PassRole', 'lambda:CreateFunction', 'lambda:UpdateFunctionCode'],
                        Resource: 'arn:aws:iam::111122223333:role/lambda-worker-*',
                      },
                    ],
                  },
                ],
              };
            }
            return n.data;
          }),
          workerNode,
        ];

        const edges = [
          { source: 'cicd-bot', target: 'worker-role' },
          { source: 'cicd-bot', target: 'admin-role' },
        ];
        const results = STAGE_4_3.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const exploitRes = results.find(r => r.packetId === 'pkt-4-exploit-pass-admin')!;
        expect(exploitRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_4_3.packets, results, nodes, STAGE_4_3.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_4_3.targetBudget);
      });
    });

    describe('Level 4.4: Tenant Hopping', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_4_4.reportCard).toBeDefined();
        expect(STAGE_4_4.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state fails traffic due to missing connection between Lambda and DynamoDB', () => {
        const nodes = STAGE_4_4.initialNodes.map(n => n.data);
        const edges = STAGE_4_4.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_4_4.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(false);
      });

      it('hardened target 3-star solution isolates tenants using dynamodb:LeadingKeys condition', () => {
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

        const nodes: CloudNodeData[] = [
          ...STAGE_4_4.initialNodes.map((n): CloudNodeData => {
            if (n.id === 'tenant-app-lambda') {
              return {
                ...n.data,
                identityPolicies: [
                  {
                    Version: '2012-10-17',
                    Statement: [
                      {
                        Sid: 'TenantPartitionIsolation',
                        Effect: 'Allow',
                        Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
                        Resource: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
                        Condition: {
                          'ForAllValues:StringEquals': {
                            'dynamodb:LeadingKeys': ['TENANT#alpha'],
                          },
                        },
                      },
                    ],
                  },
                ],
              };
            }
            return n.data;
          }),
          dynamoTable,
        ];

        const edges = [{ source: 'tenant-app-lambda', target: 'records-dynamodb' }];
        const results = STAGE_4_4.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const exploitRes = results.find(r => r.packetId === 'pkt-5-exploit-bravo')!;
        expect(exploitRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_4_4.packets, results, nodes, STAGE_4_4.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_4_4.targetBudget);
      });
    });
  });

  describe('Stage 5: Enterprise Governance & Infrastructure Guardrails', () => {
    describe('Level 5.1: The Glass Ceiling', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_5_1.reportCard).toBeDefined();
        expect(STAGE_5_1.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state allows unconstrained experimental role to expand permissions', () => {
        const nodes = STAGE_5_1.initialNodes.map(n => n.data);
        const exploitPacket = STAGE_5_1.packets.find(p => p.kind === 'exploit')!;
        const exploitRes = evaluateExploitChain(exploitPacket, nodes);

        expect(exploitRes.breached).toBe(true);
      });

      it('hardened target 3-star solution clips unauthorized actions using permission boundary', () => {
        const nodes: CloudNodeData[] = STAGE_5_1.initialNodes.map(n => {
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

        const edges = STAGE_5_1.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_5_1.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const exploitPacket = STAGE_5_1.packets.find(p => p.kind === 'exploit')!;
        const exploitRes = evaluateExploitChain(exploitPacket, nodes);
        expect(exploitRes.breached).toBe(false);

        const score = scoreRun(STAGE_5_1.packets, results, nodes, STAGE_5_1.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_5_1.targetBudget);
      });
    });

    describe('Level 5.2: The NAT Gateway Trap', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_5_2.reportCard).toBeDefined();
        expect(STAGE_5_2.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state exceeds budget limit due to costly NAT Gateway ($42/mo > $15/mo)', () => {
        const nodes = STAGE_5_2.initialNodes.map(n => n.data);
        const edges = STAGE_5_2.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_5_2.packets.map(p => evaluatePacket(p, nodes, edges));

        const score = scoreRun(STAGE_5_2.packets, results, nodes, STAGE_5_2.targetBudget);
        expect(score.totalCost).toBeGreaterThan(STAGE_5_2.targetBudget);
        expect(score.earned).toBeLessThan(3);
      });

      it('hardened target 3-star solution replaces NAT with $0 S3 Gateway Endpoint within budget', () => {
        const withoutNat = STAGE_5_2.initialNodes.filter(n => n.id !== 'costly-nat-gw').map(n => n.data);
        const endpointNode: CloudNodeData = {
          id: 's3-endpoint',
          type: 'vpc_endpoint',
          label: 'S3 Gateway Endpoint',
          arn: 'arn:aws:ec2:us-east-1:111122223333:vpc-endpoint/vpce-s3',
          accountId: '111122223333',
          monthlyCost: 0,
          config: { service: 's3', endpointType: 'gateway' },
          identityPolicies: [],
        };
        const nodes = [...withoutNat, endpointNode];
        const edges = [
          { source: 'log-worker-lambda', target: 's3-endpoint' },
          { source: 's3-endpoint', target: 's3-logs-bucket' },
        ];
        const results = STAGE_5_2.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const score = scoreRun(STAGE_5_2.packets, results, nodes, STAGE_5_2.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_5_2.targetBudget);
      });
    });

    describe('Level 5.3: The Organization Shield', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_5_3.reportCard).toBeDefined();
        expect(STAGE_5_3.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial state denies legitimate DR replication due to unexempted regional SCP', () => {
        const nodes = STAGE_5_3.initialNodes.map(n => n.data);
        const edges = STAGE_5_3.initialEdges.map(e => ({ source: e.source, target: e.target }));
        const results = STAGE_5_3.packets.map(p => evaluatePacket(p, nodes, edges));

        const drRes = results.find(r => r.packetId === 'pkt-5-3-dr-replicate')!;
        expect(drRes.success).toBe(false);
      });

      it('hardened target 3-star solution exempts DR role in SCP and blocks unauthorized crypto mining', () => {
        const nodes: CloudNodeData[] = STAGE_5_3.initialNodes.map(n => {
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

        const edges = [
          { source: 'dr-backup-role', target: 'dr-eu-s3' },
          { source: 'ransom-attacker', target: 'ap-ec2-target' },
        ];
        const results = STAGE_5_3.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const cryptoRes = results.find(r => r.packetId === 'pkt-5-3-exploit-crypto')!;
        expect(cryptoRes.outcome).toBe('DENY');

        const score = scoreRun(STAGE_5_3.packets, results, nodes, STAGE_5_3.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_5_3.targetBudget);
      });
    });
  });

  describe('Stage 6: Boss Fight & Real-World Incident', () => {
    describe('Stage 6 Capstone (Level 6.1): The Capital One Incident', () => {
      it('has reportCard with at least 3 tasks', () => {
        expect(STAGE_6_1.reportCard).toBeDefined();
        expect(STAGE_6_1.reportCard!.tasks.length).toBeGreaterThanOrEqual(3);
      });

      it('initial broken state allows SSRF token theft and S3 exfiltration', () => {
        const nodes = STAGE_6_1.initialNodes.map(n => n.data);
        const exploitPacket = STAGE_6_1.packets.find(p => p.kind === 'exploit')!;
        const exploitRes = evaluateExploitChain(exploitPacket, nodes);

        expect(exploitRes.breached).toBe(true);
      });

      it('hardened target 3-star solution enforces IMDSv2, scopes WAF logging, and removes overbroad access', () => {
        const nodes: CloudNodeData[] = STAGE_6_1.initialNodes.map(n => {
          if (n.id === 'waf-ec2') {
            return {
              ...n.data,
              config: { imdsVersion: 'v2', imdsHopLimit: 1 },
              identityPolicies: [
                {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Sid: 'StrictWafLogging',
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

        // WAF only communicates with waf-logs-s3; customer-credit-s3 overbroad edge removed
        const edges = [{ source: 'waf-ec2', target: 'waf-logs-s3' }];
        const results = STAGE_6_1.packets.map(p => evaluatePacket(p, nodes, edges));

        expect(results.every(r => r.success)).toBe(true);
        const exploitPacket = STAGE_6_1.packets.find(p => p.kind === 'exploit')!;
        const exploitRes = evaluateExploitChain(exploitPacket, nodes);
        expect(exploitRes.breached).toBe(false);

        const score = scoreRun(STAGE_6_1.packets, results, nodes, STAGE_6_1.targetBudget);
        expect(score.earned).toBe(3);
        expect(score.totalCost).toBeLessThanOrEqual(STAGE_6_1.targetBudget);
      });
    });
  });
});
