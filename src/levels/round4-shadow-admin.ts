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
  unlockedServices: ['s3', 'iam_role', 'ec2', 'lambda'],
  newlyUnlockedService: {
    type: 'iam_role',
    name: 'IAM Execution Roles & Boundaries',
    category: 'Identity & Governance',
    primer: 'Lambda execution roles require iam:PassRole permissions. To prevent privilege escalation, always restrict iam:PassRole to specific worker roles and attach Permission Boundaries.',
    keyConcepts: ['iam:PassRole', 'Execution Roles', 'Permission Boundaries']
  },
  reportCard: {
    headline: 'Stage 4: Serverless Delegation — iam:PassRole & Boundaries',
    scenario: 'A CI/CD deployment bot deploys serverless functions. A developer granted it broad iam:PassRole on * so it could pass any role. If the CI token leaks, an attacker can pass OrganizationAdminRole to a custom function and take over the AWS organization.',
    tasks: [
      { step: 1, title: 'Deploy Execution Role', instruction: 'Drag an IAM Execution Role from the left dock onto the canvas and connect it to CI/CD Deployment Bot.' },
      { step: 2, title: 'Inspect CI/CD Bot Policy', instruction: 'Examine the CI/CD bot identity policy. Notice "iam:PassRole" on "*".' },
      { step: 3, title: 'Scope PassRole Resource', instruction: 'Restrict "iam:PassRole" resource strictly to "arn:aws:iam::111122223333:role/lambda-worker-*".' },
      { step: 4, title: 'Attach Permission Boundary', instruction: 'Ensure the developer identity cannot escalate permissions beyond worker duties.' },
      { step: 5, title: 'Simulate', instruction: 'Verify worker deployment succeeds while passing admin roles is blocked.' }
    ],
    securityIntel: 'The iam:PassRole privilege allows an identity to grant another role to an AWS service. Without resource scoping, it is one of the most common cloud privilege escalation vectors.',
    budgetNotice: 'Target budget is $20/mo. Lambda costs $5/mo base.'
  },
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
  initialEdges: [],
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
