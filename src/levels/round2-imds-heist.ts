import { GameLevel } from '../types/engine';

export const round2ImdsHeist: GameLevel = {
  id: 'round-2',
  roundNumber: 2,
  title: 'The Metadata Heist',
  subtitle: 'EC2 IMDSv2 & Least Privilege',
  category: 'Learn',
  storyBrief:
    'Your team deployed an EC2-based URL preview service. The instance profile was given AmazonS3FullAccess (* on *) to "avoid permission friction", and runs with legacy IMDSv1. An attacker discovers an SSRF vulnerability in the URL previewer!',
  threatIntel:
    'Attacker sends a crafted HTTP request pointing to 169.254.169.254/latest/meta-data/iam/security-credentials/. If IMDSv1 is active, they will dump temporary credentials and exfiltrate private financial data from S3.',
  targetBudget: 25,
  conceptTags: ['imdsv2', 'ssrf', 'least_privilege'],
  twistPager: "Pager: Unusual S3 reads from the preview service, from an IP we don't own.",
  unlockedServices: ['s3', 'iam_role', 'ec2'],
  newlyUnlockedService: {
    type: 'ec2',
    name: 'Amazon EC2 (Elastic Compute Cloud)',
    category: 'Compute',
    primer: 'Amazon EC2 provides virtual servers in the cloud. Instances use the Instance Metadata Service (IMDS). Always mandate IMDSv2 to prevent SSRF credential theft.',
    keyConcepts: ['IMDSv1 vs IMDSv2', 'Instance Profiles', 'Hop Limit']
  },
  reportCard: {
    headline: 'Stage 2: Compute & Metadata Security — EC2 & IMDSv2',
    scenario: 'Your application needs a URL preview generator. You deploy an EC2 instance to fetch webpages and save thumbnails into app-storage. However, an attacker attempts an SSRF exploit targeting the metadata IP (169.254.169.254) to steal temporary instance role credentials and exfiltrate your confidential-vault bucket.',
    tasks: [
      { step: 1, title: 'Deploy Preview Compute', instruction: 'Drag an EC2 Instance from the left dock onto the canvas and wire connection lines to app-storage.' },
      { step: 2, title: 'Upgrade to IMDSv2', instruction: 'Select the EC2 instance, switch Metadata Service from IMDSv1 to IMDSv2, and set Hop Limit to 1.' },
      { step: 3, title: 'Enforce Least Privilege', instruction: 'In the EC2 Identity Policy tab, replace over-permissive s3:* on * with a scoped policy allowing only app-storage/*.' },
      { step: 4, title: 'Simulate', instruction: 'Verify legitimate thumbnail saves succeed while the SSRF token extraction probe is blocked.' }
    ],
    securityIntel: 'IMDSv1 is vulnerable to simple HTTP GET SSRF. IMDSv2 mandates a PUT session token header that SSRF proxies cannot forge.',
    budgetNotice: 'Target budget is $25/mo. EC2 instance costs $15/mo base + $10/mo for two storage buckets.'
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'URL previewer can store preview thumbnails in app-storage S3 bucket (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'IMDSv2 blocks SSRF token theft and instance role cannot access restricted buckets.'
    },
    star3Optimal: {
      budgetLimit: 25,
      leastPrivilege: true,
      description: 'Instance role is strictly scoped to app-storage and IMDS hop limit is set to 1.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Upgrade EC2 Metadata Service',
      content: 'Select the EC2 instance and switch the Metadata Service toggle from IMDSv1 to IMDSv2.'
    },
    {
      level: 'root_cause',
      title: 'Wildcard S3 Access',
      content: 'The EC2 role has `"Action": "s3:*", "Resource": "*"`. Even if IMDSv2 blocks simple SSRF, over-permissive policies violate least privilege. Restrict the policy strictly to `arn:aws:s3:::app-storage/*`.'
    },
    {
      level: 'solution_diff',
      title: 'Target Policy Solution',
      content: `1. In EC2 Inspector toggle: IMDS Version = v2, Hop Limit = 1.
2. In EC2 Identity Policy:
{
  "Sid": "ScopedThumbnailStorage",
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::app-storage/*"
}`
    }
  ],
  initialNodes: [
    {
      id: 'ssrf-attacker',
      type: 'external_vendor',
      position: { x: 100, y: 160 },
      data: {
        id: 'ssrf-attacker',
        type: 'external_vendor',
        label: 'SSRF Attacker',
        arn: 'arn:aws:iam::999999999999:root',
        accountId: '999999999999',
        monthlyCost: 0,
        config: {},
        identityPolicies: []
      }
    },
    {
      id: 'app-storage-s3',
      type: 's3',
      position: { x: 680, y: 140 },
      data: {
        id: 'app-storage-s3',
        type: 's3',
        label: 'app-storage',
        arn: 'arn:aws:s3:::app-storage',
        accountId: '111122223333',
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: []
      }
    },
    {
      id: 'confidential-vault-s3',
      type: 's3',
      position: { x: 680, y: 340 },
      data: {
        id: 'confidential-vault-s3',
        type: 's3',
        label: 'confidential-vault',
        arn: 'arn:aws:s3:::confidential-vault',
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
      id: 'pkt-2-thumb-save',
      name: 'Save Webpage Preview',
      kind: 'legitimate',
      sourceNodeId: 'preview-ec2',
      targetNodeId: 'app-storage-s3',
      action: 's3:PutObject',
      resourceArn: 'arn:aws:s3:::app-storage/previews/site.png',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/PreviewerRole' },
      expectedOutcome: 'ALLOW',
      description: 'Legitimate preview generation and caching'
    },
    {
      id: 'pkt-2-ssrf-probe',
      name: 'SSRF Token Steal Probe',
      kind: 'exploit',
      sourceNodeId: 'ssrf-attacker',
      targetNodeId: 'preview-ec2',
      action: 'ec2:GetMetadataToken/ssrf',
      resourceArn: 'arn:aws:ec2:us-east-1:111122223333:instance/*',
      context: { 'aws:PrincipalIsPublic': true },
      expectedOutcome: 'DENY',
      description: 'Attacker probes 169.254.169.254 to steal temporary instance role credentials'
    }
  ]
};
