import { GameLevel } from '../types/engine';

export const STAGE_5_1: GameLevel = {
  id: 'stage5-1-glass-ceiling',
  stage: 5,
  stageLevel: 1,
  stageTitle: 'Stage 5: Enterprise Governance & Guardrails',
  roundNumber: 13,
  title: 'The Glass Ceiling',
  subtitle: 'IAM Permission Boundaries',
  category: 'Learn',
  storyBrief:
    'You want to empower developers to create IAM roles and Lambda functions for experiments without waiting days for security tickets. But how do you prevent developers from granting themselves AdministratorAccess?',
  threatIntel:
    'An IAM Permission Boundary sets the maximum allowable permissions an identity can possess. Even if an identity policy grants Action: "*", actions outside the boundary are clipped and implicitly denied.',
  targetBudget: 20,
  conceptTags: ['permission_boundary', 'least_privilege', 'iam_role'],
  twistPager: 'Pager: Security audit alerted on developer attempting to attach AdministratorAccess to an experimental role.',
  unlockedServices: ['iam_user', 'iam_role', 'lambda', 's3'],
  newlyUnlockedService: {
    type: 'iam_role',
    name: 'IAM Permission Boundaries',
    category: 'Governance',
    primer:
      'A permission boundary sets the maximum allowable permissions that an IAM entity can have. It is an advanced guardrail that delegates administration safely without risk of privilege escalation.',
    keyConcepts: ['Permission Boundary', 'Delegated Administration', 'Privilege Escalation Defense']
  },
  reportCard: {
    headline: 'Stage 5: Enterprise Governance — Permission Boundaries',
    scenario:
      'You want to empower developers to create IAM roles for experiments. However, an unconstrained role allows escalating privileges to full administrator access. Attach a permission boundary to set an unbreakable ceiling.',
    tasks: [
      {
        step: 1,
        title: 'Inspect Developer Role',
        instruction: 'Select dev-lambda-runner and notice its broad identity policy Action: "*", Resource: "*".'
      },
      {
        step: 2,
        title: 'Attach Permission Boundary',
        instruction: 'Attach a DeveloperBoundary permission boundary policy allowing only s3, dynamodb, and logs.'
      },
      {
        step: 3,
        title: 'Guard Role Creation',
        instruction: 'Update DevAlice user policy to require the DeveloperBoundary on any role creation.'
      },
      {
        step: 4,
        title: 'Simulate',
        instruction: 'Verify legitimate S3 test read succeeds (200 OK) while unauthorized IAM escalation is clipped (403).'
      }
    ],
    securityIntel:
      'A permission boundary does not grant permissions by itself; it acts as an upper limit. Even with AdministratorAccess attached, actions outside the boundary fail.',
    budgetNotice: 'Target budget is $20/mo. Infrastructure costs $5/mo, well within budget.'
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Dev experimental role can read sample test fixtures from S3 (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Unauthorized privilege escalation attempts are clipped by permission boundary.'
    },
    star3Optimal: {
      budgetLimit: 20,
      leastPrivilege: true,
      description: 'Monthly cost is within $20 budget and boundary is tightly scoped.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Inspect dev-lambda-runner Role',
      content:
        'Look at dev-lambda-runner. It has a broad identity policy with Action: "*". Attach a Permission Boundary to restrict maximum permissions.'
    },
    {
      level: 'root_cause',
      title: 'Missing Permission Boundary',
      content:
        'Without a permission boundary, any role created by developers can escalate to full administrative access. Attach a boundary allowing only S3, DynamoDB, and CloudWatch Logs.'
    },
    {
      level: 'solution_diff',
      title: 'Target Boundary Policy',
      content: `Attach DeveloperBoundary to dev-lambda-runner:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DeveloperPermissionBoundary",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}`
    }
  ],
  initialNodes: [
    {
      id: 'dev-user',
      type: 'iam_user',
      position: { x: 120, y: 220 },
      essential: true,
      data: {
        id: 'dev-user',
        type: 'iam_user',
        label: 'DevAlice',
        arn: 'arn:aws:iam::111122223333:user/DevAlice',
        accountId: '111122223333',
        monthlyCost: 0,
        essential: true,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AllowCreateDevRoles',
                Effect: 'Allow',
                Action: ['iam:CreateRole', 'iam:AttachRolePolicy'],
                Resource: 'arn:aws:iam::111122223333:role/dev-*'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'dev-experimental-role',
      type: 'iam_role',
      position: { x: 400, y: 220 },
      essential: true,
      data: {
        id: 'dev-experimental-role',
        type: 'iam_role',
        label: 'dev-lambda-runner',
        arn: 'arn:aws:iam::111122223333:role/dev-lambda-runner',
        accountId: '111122223333',
        monthlyCost: 0,
        essential: true,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'BroadDeveloperAccess',
                Effect: 'Allow',
                Action: '*',
                Resource: '*'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'dev-target-s3',
      type: 's3',
      position: { x: 680, y: 220 },
      essential: true,
      data: {
        id: 'dev-target-s3',
        type: 's3',
        label: 'dev-test-data',
        arn: 'arn:aws:s3:::dev-test-data',
        accountId: '111122223333',
        monthlyCost: 5,
        essential: true,
        config: { blockPublicAccess: true },
        identityPolicies: []
      }
    }
  ],
  initialEdges: [
    {
      id: 'edge-dev-user-to-role',
      source: 'dev-user',
      target: 'dev-experimental-role',
      label: 'Delegated Role'
    },
    {
      id: 'edge-role-to-s3',
      source: 'dev-experimental-role',
      target: 'dev-target-s3',
      label: 'Test Data Access'
    }
  ],
  packets: [
    {
      id: 'pkt-5-1-dev-s3',
      name: 'Read Sample Test Data',
      kind: 'legitimate',
      sourceNodeId: 'dev-experimental-role',
      targetNodeId: 'dev-target-s3',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::dev-test-data/sample.json',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/dev-lambda-runner' },
      expectedOutcome: 'ALLOW',
      description: 'Developer experimental role reads sample fixtures from dev-test-data bucket'
    },
    {
      id: 'pkt-5-1-admin-expansion',
      name: 'Privilege Escalation Beyond Boundary',
      kind: 'exploit',
      sourceNodeId: 'dev-experimental-role',
      targetNodeId: 'dev-target-s3',
      action: 'iam:CreateUser',
      resourceArn: 'arn:aws:iam::111122223333:user/admin-backdoor',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/dev-lambda-runner' },
      expectedOutcome: 'DENY',
      description: 'Experimental role attempts to create administrative IAM user outside boundary'
    }
  ]
};

export const stage5_1GlassCeiling: GameLevel = STAGE_5_1;
export default STAGE_5_1;
