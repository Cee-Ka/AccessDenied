import { GameLevel } from '../types/engine';

export const round3ConfusedDeputy: GameLevel = {
  id: 'round-3',
  roundNumber: 3,
  title: 'The Confused Deputy',
  subtitle: 'Cross-Account Trust & sts:ExternalId',
  category: 'Learn',
  storyBrief:
    'You hired a cloud analytics vendor to parse sales metrics. You created an IAM Role that trusts the vendor\'s AWS account. However, another client of that same vendor figured out your Role ARN and is configuring the vendor app to assume your role!',
  threatIntel:
    'In a Confused Deputy attack, a third party with legitimate trust is tricked by a malicious customer into accessing another customer\'s resources. You must require a unique, unguessable sts:ExternalId.',
  targetBudget: 20,
  unlockedServices: ['s3', 'iam_role', 'ec2'],
  newlyUnlockedService: {
    type: 'iam_role',
    name: 'Cross-Account IAM Roles & ExternalId',
    category: 'Identity',
    primer: 'Cross-account IAM roles allow third-party SaaS vendors to access your resources without sharing API keys. To prevent confused deputy attacks, you must mandate a secret sts:ExternalId condition.',
    keyConcepts: ['AssumeRolePolicyDocument', 'sts:ExternalId', 'Confused Deputy']
  },
  reportCard: {
    headline: 'Stage 3: Vendor Trust & The Confused Deputy',
    scenario: 'You hire a third-party SaaS vendor to analyze sales metrics. The vendor asks for an IAM Role ARN in your account. Without an ExternalId condition in your trust policy, any other client on that SaaS can provide your Role ARN to hijack access to your data.',
    tasks: [
      { step: 1, title: 'Provision Vendor Role', instruction: 'Drag an IAM Role from the left dock onto the canvas and connect it between Analytics SaaS Vendor and sales-metrics.' },
      { step: 2, title: 'Inspect Trust Relationship', instruction: 'Select VendorAnalyticsRole, open the Trust Policy tab, and observe that it allows the vendor account without an ExternalId.' },
      { step: 3, title: 'Require ExternalId', instruction: 'Add an sts:ExternalId condition requiring the secret key "ac-9841-sec" (or configure it in Config).' },
      { step: 4, title: 'Simulate', instruction: 'Verify authorized vendor sync succeeds while the rival tenant probe is rejected.' }
    ],
    securityIntel: 'The Confused Deputy vulnerability occurs when a service with legitimate permissions is manipulated by an unauthorized party into performing actions on their behalf.',
    budgetNotice: 'Target budget is $20/mo. IAM roles incur $0/mo.'
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Vendor analytics daemon can assume role and read sales metrics (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Rival customer assumption attempts without the secret ExternalId are rejected.'
    },
    star3Optimal: {
      budgetLimit: 20,
      leastPrivilege: true,
      description: 'Trust policy has exact sts:ExternalId condition and least-privilege action scoping.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Inspect Role Trust Policy',
      content: 'Click the VendorAnalyticsRole and examine its Trust Policy. Does it require an sts:ExternalId?'
    },
    {
      level: 'root_cause',
      title: 'Missing ExternalId Condition',
      content: 'When granting cross-account access to a multi-tenant SaaS vendor, you must require an `sts:ExternalId` in the condition block to prevent confused deputy exploits.'
    },
    {
      level: 'solution_diff',
      title: 'Target Trust Policy Solution',
      content: `Add requireExternalId: "ac-9841-sec" in the config toggle, or update the Trust Policy:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TrustVendorWithExternalId",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::222233334444:root" },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "ac-9841-sec"
        }
      }
    }
  ]
}`
    }
  ],
  initialNodes: [
    {
      id: 'vendor-saas',
      type: 'external_vendor',
      position: { x: 100, y: 160 },
      data: {
        id: 'vendor-saas',
        type: 'external_vendor',
        label: 'Analytics SaaS Vendor',
        arn: 'arn:aws:iam::222233334444:root',
        accountId: '222233334444',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AssumeClientRole',
                Effect: 'Allow',
                Action: 'sts:AssumeRole',
                Resource: 'arn:aws:iam::111122223333:role/VendorAnalyticsRole'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'sales-metrics-s3',
      type: 's3',
      position: { x: 740, y: 220 },
      data: {
        id: 'sales-metrics-s3',
        type: 's3',
        label: 'sales-metrics',
        arn: 'arn:aws:s3:::sales-metrics',
        accountId: '111122223333',
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: []
      }
    }
  ],
  initialEdges: [],
  packets: [
    {
      id: 'pkt-3-legit-assume',
      name: 'Authorized Vendor Sync',
      kind: 'legitimate',
      sourceNodeId: 'vendor-saas',
      targetNodeId: 'vendor-role',
      action: 'sts:AssumeRole',
      resourceArn: 'arn:aws:iam::111122223333:role/VendorAnalyticsRole',
      context: { 'sts:ExternalId': 'ac-9841-sec' },
      expectedOutcome: 'ALLOW',
      description: 'Vendor sync with valid customer ExternalId'
    },
    {
      id: 'pkt-3-confused-deputy',
      name: 'Rival Tenant Confused Deputy Probe',
      kind: 'exploit',
      sourceNodeId: 'vendor-saas',
      targetNodeId: 'vendor-role',
      action: 'sts:AssumeRole',
      resourceArn: 'arn:aws:iam::111122223333:role/VendorAnalyticsRole',
      context: { 'sts:ExternalId': 'rival-tenant-token-99' },
      expectedOutcome: 'DENY',
      description: 'Adversary customer supplying wrong or forged ExternalId'
    }
  ]
};
