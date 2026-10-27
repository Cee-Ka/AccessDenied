import { GameLevel } from '../types/engine';

export const round5TenantHopping: GameLevel = {
  id: 'round-5',
  roundNumber: 5,
  title: 'Tenant Hopping',
  subtitle: 'Fine-Grained DynamoDB Access Control',
  category: 'Learn',
  storyBrief:
    'A multi-tenant SaaS application stores customer records in a single DynamoDB table. Tenant A is authenticated with Cognito User Sub "tenant-alpha". A rogue script modifies the API payload to request partition keys belonging to "tenant-bravo"!',
  threatIntel:
    'Adversary crafts queries requesting partition key TENANT#bravo. You must enforce fine-grained access control using the dynamodb:LeadingKeys condition key matching the authenticated principal tag.',
  targetBudget: 20,
  unlockedServices: ['s3', 'iam_role', 'ec2', 'lambda', 'dynamodb'],
  newlyUnlockedService: {
    type: 'dynamodb',
    name: 'Amazon DynamoDB (NoSQL Database)',
    category: 'Database',
    primer: 'Amazon DynamoDB is a managed NoSQL database. In multi-tenant systems, IAM conditions like dynamodb:LeadingKeys enforce partition-level tenant isolation directly at the database engine.',
    keyConcepts: ['dynamodb:LeadingKeys', 'Fine-Grained Access Control', 'Multi-Tenant Isolation']
  },
  reportCard: {
    headline: 'Stage 5: Multi-Tenant Database — Fine-Grained DynamoDB',
    scenario: 'A multi-tenant SaaS application shares a single CustomerRecords DynamoDB table. Tenant Alpha can read and write their own documents. However, an attacker crafts an API query to retrieve documents belonging to Tenant Bravo (partition key TENANT#bravo).',
    tasks: [
      { step: 1, title: 'Provision DynamoDB Storage', instruction: 'Drag a DynamoDB Table from the left dock onto the canvas and connect it with SaaS API Handler.' },
      { step: 2, title: 'Inspect DynamoDB Policy', instruction: 'Select SaaS API Handler Lambda and examine its identity policy.' },
      { step: 3, title: 'Enforce Tenant Isolation', instruction: 'Add a condition block: "ForAllValues:StringEquals": { "dynamodb:LeadingKeys": ["TENANT#alpha"] }.' },
      { step: 4, title: 'Simulate', instruction: 'Verify Tenant Alpha queries succeed (200 OK) while cross-tenant queries to Tenant Bravo are rejected (403 AccessDenied).' }
    ],
    securityIntel: 'Without partition-level condition keys, any client with dynamodb:GetItem or dynamodb:Query can read across tenant boundaries in shared tables.',
    budgetNotice: 'Target budget is $20/mo. DynamoDB table costs $10/mo base.'
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Tenant Alpha can read and write items with partition key TENANT#alpha (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Requests for foreign partition keys like TENANT#bravo return 403 AccessDenied.'
    },
    star3Optimal: {
      budgetLimit: 20,
      leastPrivilege: true,
      description: 'Condition block uses ForAllValues:StringEquals on dynamodb:LeadingKeys.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Inspect DynamoDB Conditions',
      content: 'AWS DynamoDB supports fine-grained access control with the `dynamodb:LeadingKeys` condition key.'
    },
    {
      level: 'root_cause',
      title: 'Missing LeadingKeys Partition Isolation',
      content: 'Without `dynamodb:LeadingKeys`, any caller with `dynamodb:GetItem` can query any partition key across tenants.'
    },
    {
      level: 'solution_diff',
      title: 'Target Policy Solution',
      content: `Add a condition block to Tenant Role:
{
  "Sid": "TenantPartitionIsolation",
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"],
  "Resource": "arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords",
  "Condition": {
    "ForAllValues:StringEquals": {
      "dynamodb:LeadingKeys": ["TENANT#alpha"]
    }
  }
}`
    }
  ],
  initialNodes: [
    {
      id: 'tenant-app-lambda',
      type: 'lambda',
      position: { x: 140, y: 200 },
      data: {
        id: 'tenant-app-lambda',
        type: 'lambda',
        label: 'SaaS API Handler',
        arn: 'arn:aws:iam::111122223333:role/SaaSTenantRole',
        accountId: '111122223333',
        monthlyCost: 5,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'UnscopedDynamoDB',
                Effect: 'Allow',
                Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
                Resource: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords'
                // Missing Condition block!
              }
            ]
          }
        ]
      }
    }
  ],
  initialEdges: [],
  packets: [
    {
      id: 'pkt-5-legit-alpha',
      name: 'Query Tenant Alpha Records',
      kind: 'legitimate',
      sourceNodeId: 'tenant-app-lambda',
      targetNodeId: 'records-dynamodb',
      action: 'dynamodb:GetItem',
      resourceArn: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
      context: {
        'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/SaaSTenantRole',
        'dynamodb:LeadingKeys': ['TENANT#alpha']
      },
      expectedOutcome: 'ALLOW',
      description: 'Tenant Alpha loads own documents'
    },
    {
      id: 'pkt-5-exploit-bravo',
      name: 'Tenant Hopping to Tenant Bravo',
      kind: 'exploit',
      sourceNodeId: 'tenant-app-lambda',
      targetNodeId: 'records-dynamodb',
      action: 'dynamodb:GetItem',
      resourceArn: 'arn:aws:dynamodb:us-east-1:111122223333:table/CustomerRecords',
      context: {
        'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/SaaSTenantRole',
        'dynamodb:LeadingKeys': ['TENANT#bravo']
      },
      expectedOutcome: 'DENY',
      description: 'Attacker queries neighboring tenant partition key'
    }
  ]
};
