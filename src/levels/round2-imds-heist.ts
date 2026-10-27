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
      id: 'preview-ec2',
      type: 'ec2',
      position: { x: 380, y: 220 },
      data: {
        id: 'preview-ec2',
        type: 'ec2',
        label: 'URL Preview EC2',
        arn: 'arn:aws:iam::111122223333:role/PreviewerRole',
        accountId: '111122223333',
        monthlyCost: 15,
        config: {
          imdsVersion: 'v1', // VULNERABLE!
          imdsHopLimit: 2
        },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'OverPermissiveS3',
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        ]
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
  initialEdges: [
    {
      id: 'e-att-ec2',
      source: 'ssrf-attacker',
      target: 'preview-ec2',
      label: 'SSRF Exploit Payload'
    },
    {
      id: 'e-ec2-storage',
      source: 'preview-ec2',
      target: 'app-storage-s3',
      label: 'Store Thumbnails'
    },
    {
      id: 'e-ec2-vault',
      source: 'preview-ec2',
      target: 'confidential-vault-s3',
      label: 'Unauthorized Dump'
    }
  ],
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
