import { GameLevel } from '../types/engine';

export const STAGE_3_2: GameLevel = {
  id: 'stage3-2-cross-account-bridge',
  stage: 3,
  stageLevel: 2,
  stageTitle: 'Stage 3: Dual Authority',
  roundNumber: 7,
  title: 'Cross-Account Bridge',
  subtitle: 'Cross-Account Dual Authorization',
  category: 'Learn',
  storyBrief:
    'Your company operates two AWS accounts: Account A (111122223333, Application Environment running EC2 AppRole) and Account B (444455556666, Central Data Lake S3 bucket analytics-data-lake). The EC2 application in Account A needs to read analytics files from an S3 bucket in Account B.',
  threatIntel:
    'In cross-account access, BOTH the identity policy in the caller account and the resource policy in the destination account must explicitly allow access. Unauthorized external callers must be denied.',
  targetBudget: 25,
  conceptTags: ['cross_account', 'dual_authorization', 'resource_policy', 'identity_policy'],
  twistPager: 'Pager: Analytics data pipeline failed with 403 AccessDenied across account boundary.',
  unlockedServices: ['ec2', 's3', 'iam_role', 'aws_account'],
  newlyUnlockedService: {
    type: 'aws_account',
    name: 'AWS Multi-Account Architecture',
    category: 'Governance & Boundary',
    primer:
      'AWS accounts isolate resources. Accessing resources across accounts requires Dual Authorization: an Allow in the caller identity policy AND an Allow in the destination resource policy.',
    keyConcepts: ['Dual Authorization', 'Cross-Account Access', 'Account Boundaries']
  },
  reportCard: {
    headline: 'Stage 3: Dual Authority — Cross-Account Dual Authorization',
    scenario:
      'An EC2 application in Account A needs to read analytics parquet files from an S3 bucket in Account B. Because this request crosses account boundaries, both sides must explicitly agree: the caller identity policy AND the destination bucket policy.',
    tasks: [
      { step: 1, title: 'Inspect Cross-Account Topology', instruction: 'Examine Account A EC2 (111122223333) and Account B S3 (444455556666).' },
      { step: 2, title: 'Configure Caller Identity Policy', instruction: 'In Account A EC2, grant s3:GetObject on arn:aws:s3:::analytics-data-lake/*.' },
      { step: 3, title: 'Configure Destination Resource Policy', instruction: 'In Account B S3, grant s3:GetObject to Principal arn:aws:iam::111122223333:role/AppRole on arn:aws:s3:::analytics-data-lake/*.' },
      { step: 4, title: 'Simulate', instruction: 'Confirm that legitimate analytics queries succeed (200 OK) and rogue external probes are blocked.' }
    ],
    securityIntel:
      'Single-sided authorization fails across account boundaries. The caller must allow the request out, and the resource must allow the external principal in.',
    budgetNotice: 'Target budget is $25/mo. EC2 instance costs $15/mo base, S3 bucket costs $5/mo ($20/mo total).'
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Account A EC2 successfully reads analytics parquet files from Account B S3 (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Unauthorized external caller receives 403 AccessDenied.'
    },
    star3Optimal: {
      budgetLimit: 25,
      leastPrivilege: true,
      description: 'Monthly cost is $20 or less and Dual Authorization is configured with least privilege.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Remember Dual Authorization',
      content:
        'Cross-account requests require two permissions: the caller identity policy must allow the outbound action, AND the destination resource policy must allow the inbound principal.'
    },
    {
      level: 'root_cause',
      title: 'Missing Either Identity or Resource Policy',
      content:
        'If either Account A EC2 identity policy or Account B S3 bucket policy is missing an Allow statement, IAM defaults to Implicit Deny.'
    },
    {
      level: 'solution_diff',
      title: 'Target Policy Solution',
      content: `In Account A EC2 Identity Policy:
{
  "Sid": "AllowReadDataLake",
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::analytics-data-lake/*"
}

In Account B S3 Resource Policy:
{
  "Sid": "AllowCrossAccountAnalytics",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:role/AppRole" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::analytics-data-lake/*"
}`
    }
  ],
  initialNodes: [
    {
      id: 'account-a-ec2',
      type: 'ec2',
      position: { x: 120, y: 160 },
      essential: true,
      data: {
        id: 'account-a-ec2',
        type: 'ec2',
        label: 'Analytics App EC2',
        arn: 'arn:aws:iam::111122223333:role/AppRole',
        accountId: '111122223333',
        monthlyCost: 15,
        essential: true,
        config: { imdsVersion: 'v2' },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: []
          }
        ]
      }
    },
    {
      id: 'account-b-s3',
      type: 's3',
      position: { x: 500, y: 160 },
      essential: true,
      data: {
        id: 'account-b-s3',
        type: 's3',
        label: 'analytics-data-lake',
        arn: 'arn:aws:s3:::analytics-data-lake',
        accountId: '444455556666',
        monthlyCost: 5,
        essential: true,
        config: { blockPublicAccess: true },
        identityPolicies: [],
        resourcePolicy: {
          Version: '2012-10-17',
          Statement: []
        }
      }
    },
    {
      id: 'unauthorized-caller',
      type: 'external_vendor',
      position: { x: 120, y: 360 },
      data: {
        id: 'unauthorized-caller',
        type: 'external_vendor',
        label: 'Rogue External Role',
        arn: 'arn:aws:iam::999988887777:role/RogueRole',
        accountId: '999988887777',
        monthlyCost: 0,
        config: {},
        identityPolicies: []
      }
    }
  ],
  initialEdges: [
    {
      id: 'e-ec2-s3',
      source: 'account-a-ec2',
      target: 'account-b-s3'
    }
  ],
  packets: [
    {
      id: 'pkt-3-2-analytics-query',
      name: 'Read Analytics Data Lake Parquet',
      kind: 'legitimate',
      sourceNodeId: 'account-a-ec2',
      targetNodeId: 'account-b-s3',
      targetNodeType: 's3',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::analytics-data-lake/2026/metrics.parquet',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/AppRole' },
      expectedOutcome: 'ALLOW',
      description: 'Analytics App reads metrics parquet file across account boundary'
    },
    {
      id: 'pkt-3-2-unauthorized-read',
      name: 'Rogue External Role Read Probe',
      kind: 'exploit',
      sourceNodeId: 'unauthorized-caller',
      targetNodeId: 'account-b-s3',
      targetNodeType: 's3',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::analytics-data-lake/2026/metrics.parquet',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::999988887777:role/RogueRole' },
      expectedOutcome: 'DENY',
      description: 'Unauthorized external account attempts to read data lake without grant'
    }
  ]
};

export const stage32CrossAccountBridge = STAGE_3_2;
export default STAGE_3_2;
