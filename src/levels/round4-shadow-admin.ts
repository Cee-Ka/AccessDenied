import { GameLevel } from '../types/engine';

export const round4ShadowAdmin: GameLevel = {
  id: 'round-4',
  roundNumber: 4,
  title: 'Shadow Admin',
  subtitle: 'iam:PassRole & Permission Boundaries',
  category: 'Learn',
  storyBrief:
    'A CI/CD deployment bot needs to deploy Lambda functions. A developer granted it "iam:*" and "lambda:*" so deploys would never fail. If the CI token leaks, an attacker can pass the OrganizationAdminRole to a custom rogue Lambda and gain full AWS root equivalent access!',
  threatIntel:
    'Attacker attempts to call iam:PassRole with arn:aws:iam::111122223333:role/OrganizationAdminRole. You must restrict iam:PassRole to specific worker roles and attach a Permission Boundary.',
  targetBudget: 20,
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'CI/CD pipeline can pass lambda-worker-role to deploy serverless tasks (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Adversary cannot pass OrganizationAdminRole to arbitrary functions.'
    },
    star3Optimal: {
      budgetLimit: 20,
      leastPrivilege: true,
      description: 'Permission boundary attached and iam:PassRole resource strictly scoped.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Inspect CI/CD Bot Policy',
      content: 'Look at the CI/CD Role identity policy. Does it allow `"iam:PassRole"` on `"Resource": "*"`?'
    },
    {
      level: 'root_cause',
      title: 'Scoped PassRole & Boundary',
      content: 'Limit `"iam:PassRole"` strictly to `"Resource": "arn:aws:iam::111122223333:role/lambda-worker-*"` and attach a Permission Boundary preventing admin privilege creation.'
    },
    {
      level: 'solution_diff',
      title: 'Target Policy Solution',
      content: `Update CI/CD Role statement:
{
  "Sid": "RestrictedPassRole",
  "Effect": "Allow",
  "Action": "iam:PassRole",
  "Resource": "arn:aws:iam::111122223333:role/lambda-worker-*"
}`
    }
  ],
  initialNodes: [
    {
      id: 'cicd-bot',
      type: 'iam_user',
      position: { x: 120, y: 180 },
      data: {
        id: 'cicd-bot',
        type: 'iam_user',
        label: 'CI/CD Deployment Bot',
        arn: 'arn:aws:iam::111122223333:user/cicd-bot',
        accountId: '111122223333',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'OverPermissivePassRole',
                Effect: 'Allow',
                Action: ['iam:PassRole', 'lambda:CreateFunction', 'lambda:UpdateFunctionCode'],
                Resource: '*' // DANGEROUS!
              }
            ]
          }
        ]
      }
    },
    {
      id: 'worker-role',
      type: 'iam_role',
      position: { x: 500, y: 140 },
      data: {
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
            Statement: [
              {
                Sid: 'WorkerLogAccess',
                Effect: 'Allow',
                Action: ['logs:CreateLogGroup', 'logs:PutLogEvents'],
                Resource: '*'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'admin-role',
      type: 'iam_role',
      position: { x: 500, y: 320 },
      data: {
        id: 'admin-role',
        type: 'iam_role',
        label: 'OrganizationAdminRole',
        arn: 'arn:aws:iam::111122223333:role/OrganizationAdminRole',
        accountId: '111122223333',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }]
          }
        ]
      }
    }
  ],
  initialEdges: [
    { id: 'e-cicd-worker', source: 'cicd-bot', target: 'worker-role', label: 'Pass Worker Role' },
    { id: 'e-cicd-admin', source: 'cicd-bot', target: 'admin-role', label: 'Pass Admin Role' }
  ],
  packets: [
    {
      id: 'pkt-4-legit-deploy',
      name: 'Deploy Worker Function',
      kind: 'legitimate',
      sourceNodeId: 'cicd-bot',
      targetNodeId: 'worker-role',
      action: 'iam:PassRole',
      resourceArn: 'arn:aws:iam::111122223333:role/lambda-worker-exec',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:user/cicd-bot' },
      expectedOutcome: 'ALLOW',
      description: 'Pipeline passes worker execution role during build'
    },
    {
      id: 'pkt-4-exploit-pass-admin',
      name: 'Privilege Escalation via Admin Role',
      kind: 'exploit',
      sourceNodeId: 'cicd-bot',
      targetNodeId: 'admin-role',
      action: 'iam:PassRole',
      resourceArn: 'arn:aws:iam::111122223333:role/OrganizationAdminRole',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:user/cicd-bot' },
      expectedOutcome: 'DENY',
      description: 'Attacker passes OrganizationAdminRole to backdoor Lambda'
    }
  ]
};
