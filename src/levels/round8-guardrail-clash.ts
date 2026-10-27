import { GameLevel } from '../types/engine';

export const round8GuardrailClash: GameLevel = {
  id: 'round-8',
  roundNumber: 8,
  title: 'Guardrail Clash',
  subtitle: 'Organizations SCPs vs. Identity Policies',
  category: 'Learn',
  storyBrief:
    'The corporate security team pushed an Organization-level Service Control Policy (SCP) to enforce regional boundaries. The SCP denies all API calls outside us-east-1. Suddenly, the automated Disaster Recovery (DR) backup replication to eu-central-1 begins failing with AccessDenied outages!',
  threatIntel:
    'An adversary simultaneously attempts to create rogue EC2 instances in ap-southeast-1. You must craft an SCP Region Deny guardrail that exempts the DR Backup Role while blocking all unauthorized regions.',
  targetBudget: 45,
  unlockedServices: ['s3', 'iam_role', 'ec2', 'lambda', 'dynamodb', 'kms', 'vpc_endpoint', 'nat_gw'],
  newlyUnlockedService: {
    type: 'iam_role',
    name: 'Organizations Service Control Policies (SCPs)',
    category: 'Governance',
    primer: 'SCPs are organization-level guardrails that centrally control permissions across all member accounts. An SCP explicit deny overrides ALL identity and resource policies, making condition exemptions critical.',
    keyConcepts: ['Service Control Policies', 'aws:RequestedRegion', 'Condition Exemptions']
  },
  reportCard: {
    headline: 'Stage 8: Enterprise Governance — Guardrails vs Identity',
    scenario: 'The security team deployed an SCP denying all API calls outside us-east-1. Suddenly, production Disaster Recovery replication to eu-central-1 breaks with AccessDenied outages. Meanwhile, ransomware actors probe ap-southeast-1 to launch unauthorized crypto miners.',
    tasks: [
      { step: 1, title: 'Analyze Region Guardrail', instruction: 'Inspect the SCP policy attached to the DR Backup Role. Notice the broad Deny on non-US regions.' },
      { step: 2, title: 'Craft Role Exemption', instruction: 'Add a StringNotEquals condition to the SCP Deny statement to exempt the DRBackupRole ARN.' },
      { step: 3, title: 'Verify Mining Block', instruction: 'Ensure unauthorized EC2 instance creation in ap-southeast-1 remains blocked.' },
      { step: 4, title: 'Simulate', instruction: 'Verify Frankfurt DR backup succeeds while the Singapore crypto exploit is denied.' }
    ],
    securityIntel: 'Explicit Deny in an SCP overrides all Allow statements across identity policies, resource policies, and boundaries without exception.',
    budgetNotice: 'Target budget is $45/mo.'
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'DR Backup daemon can replicate snapshots to eu-central-1 (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Adversary crypto miner provisioning in ap-southeast-1 is blocked by SCP.'
    },
    star3Optimal: {
      budgetLimit: 45,
      leastPrivilege: true,
      description: 'SCP uses StringNotEquals on aws:PrincipalArn to exempt the DR role without loosening boundaries.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Inspect the SCP Policy',
      content: 'Click the DR Backup Role and look at its inherited SCP policies. Notice the broad Deny on non-US regions.'
    },
    {
      level: 'root_cause',
      title: 'SCP Explicit Deny Overrides Identity Allow',
      content: 'Even though the DR Backup Role identity policy allows S3 replication to eu-central-1, the SCP explicit deny overrides it because it has no exemption condition.'
    },
    {
      level: 'solution_diff',
      title: 'Target SCP Exemption',
      content: `Add a StringNotEquals condition to the SCP Deny statement to exempt the DR role:
{
  "Sid": "DenyUnapprovedRegionsExceptDR",
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["us-east-1"],
      "aws:PrincipalArn": ["arn:aws:iam::111122223333:role/DRBackupRole"]
    }
  }
}`
    }
  ],
  initialNodes: [
    {
      id: 'dr-backup-role',
      type: 'iam_role',
      position: { x: 120, y: 160 },
      data: {
        id: 'dr-backup-role',
        type: 'iam_role',
        label: 'DR Backup Worker Role',
        arn: 'arn:aws:iam::111122223333:role/DRBackupRole',
        accountId: '111122223333',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AllowCrossRegionS3',
                Effect: 'Allow',
                Action: ['s3:PutObject', 's3:GetObject'],
                Resource: '*'
              }
            ]
          }
        ],
        scpPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'BroadRegionDeny',
                Effect: 'Deny',
                Action: '*',
                Resource: '*',
                Condition: {
                  StringNotEquals: {
                    'aws:RequestedRegion': 'us-east-1'
                    // Missing role exemption condition!
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      id: 'dr-eu-s3',
      type: 's3',
      position: { x: 620, y: 160 },
      data: {
        id: 'dr-eu-s3',
        type: 's3',
        label: 'eu-central-1-backup-vault',
        arn: 'arn:aws:s3:eu-central-1:111122223333:backup-vault',
        accountId: '111122223333',
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: []
      }
    },
    {
      id: 'ransom-attacker',
      type: 'external_vendor',
      position: { x: 120, y: 360 },
      data: {
        id: 'ransom-attacker',
        type: 'external_vendor',
        label: 'Crypto Ransom Attacker',
        arn: 'arn:aws:iam::111122223333:user/compromised-intern',
        accountId: '111122223333',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: 'ec2:RunInstances', Resource: '*' }]
          }
        ],
        scpPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'BroadRegionDeny',
                Effect: 'Deny',
                Action: '*',
                Resource: '*',
                Condition: {
                  StringNotEquals: {
                    'aws:RequestedRegion': 'us-east-1'
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      id: 'ap-ec2-target',
      type: 'ec2',
      position: { x: 620, y: 360 },
      data: {
        id: 'ap-ec2-target',
        type: 'ec2',
        label: 'ap-southeast-1 EC2 Host',
        arn: 'arn:aws:ec2:ap-southeast-1:111122223333:instance/i-crypto',
        accountId: '111122223333',
        monthlyCost: 15,
        config: {},
        identityPolicies: []
      }
    }
  ],
  initialEdges: [
    { id: 'e-dr-s3', source: 'dr-backup-role', target: 'dr-eu-s3', label: 'Cross-Region Replication' },
    { id: 'e-att-ec2', source: 'ransom-attacker', target: 'ap-ec2-target', label: 'Provision Miner' }
  ],
  packets: [
    {
      id: 'pkt-8-dr-replicate',
      name: 'Replicate Snapshot to Frankfurt (eu-central-1)',
      kind: 'legitimate',
      sourceNodeId: 'dr-backup-role',
      targetNodeId: 'dr-eu-s3',
      action: 's3:PutObject',
      resourceArn: 'arn:aws:s3:eu-central-1:111122223333:backup-vault/snapshot.tar.gz',
      context: {
        'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/DRBackupRole',
        'aws:RequestedRegion': 'eu-central-1'
      },
      expectedOutcome: 'ALLOW',
      description: 'DR snapshot replication to secondary European region'
    },
    {
      id: 'pkt-8-exploit-crypto',
      name: 'Crypto Miner Launch in Singapore (ap-southeast-1)',
      kind: 'exploit',
      sourceNodeId: 'ransom-attacker',
      targetNodeId: 'ap-ec2-target',
      action: 'ec2:RunInstances',
      resourceArn: 'arn:aws:ec2:ap-southeast-1:111122223333:instance/i-crypto',
      context: {
        'aws:PrincipalArn': 'arn:aws:iam::111122223333:user/compromised-intern',
        'aws:RequestedRegion': 'ap-southeast-1'
      },
      expectedOutcome: 'DENY',
      description: 'Attacker launches unauthorized GPU instances in foreign region'
    }
  ]
};
