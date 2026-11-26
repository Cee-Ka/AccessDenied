import { GameLevel } from '../types/engine';

const ACCOUNT = '111122223333';
const ROLE_ARN = `arn:aws:iam::${ACCOUNT}:role/OrderProcessorRole`;
const TABLE_ARN = `arn:aws:dynamodb:us-east-1:${ACCOUNT}:table/OrdersTable`;

export const STAGE_2_3: GameLevel = {
  id: 'stage2-3-serverless-worker',
  stage: 2,
  stageLevel: 3,
  stageTitle: 'Stage 2: The Magic Hat',
  roundNumber: 5,
  title: 'Serverless Worker',
  subtitle: 'Lambda Execution Role & Observability',
  category: 'Learn',
  storyBrief:
    'An automated order processing Lambda function needs to update order records in DynamoDB and write error logs to CloudWatch. Currently, its execution role has empty policies. Configure the trust policy for lambda.amazonaws.com and author a least-privilege identity policy allowing dynamodb:UpdateItem and CloudWatch logs.',
  threatIntel:
    'Pager: Order processing Lambda fails to execute with 403 on DynamoDB update and logging failure.',
  targetBudget: 15,
  conceptTags: ['lambda', 'execution_role', 'dynamodb', 'cloudwatch'],
  twistPager:
    'Pager: Order processing Lambda fails to execute with 403 on DynamoDB update and logging failure.',
  unlockedServices: ['lambda', 'dynamodb', 'iam_role'],
  newlyUnlockedService: {
    type: 'lambda',
    name: 'AWS Lambda (Serverless Compute)',
    category: 'Compute',
    primer:
      'AWS Lambda runs event-driven serverless code. Each function assumes an execution role defined by a trust policy with lambda.amazonaws.com.',
    keyConcepts: ['Lambda Execution Role', 'Trust Policy', 'DynamoDB Item Actions', 'CloudWatch Logs'],
  },
  reportCard: {
    headline: 'Stage 2.3: Serverless Worker — Lambda Execution Role & Observability',
    scenario:
      'OrderProcessor Lambda runs serverless order updates against DynamoDB OrdersTable. Configure the Lambda execution role trust policy and grant scoped DynamoDB and CloudWatch logging permissions.',
    tasks: [
      { step: 1, title: 'Configure Execution Role Trust', instruction: 'Set trust policy on order-lambda to trust lambda.amazonaws.com for sts:AssumeRole' },
      { step: 2, title: 'Grant Scoped Item Operations', instruction: 'Grant dynamodb:GetItem and dynamodb:UpdateItem on OrdersTable' },
      { step: 3, title: 'Grant CloudWatch Logging', instruction: 'Grant logs:CreateLogStream and logs:PutLogEvents on the Lambda log group' },
      { step: 4, title: 'Stay within budget', instruction: 'Stay within $15/mo monthly budget' },
    ],
    securityIntel:
      'Serverless compute functions require least-privilege execution roles. Never grant dynamodb:* or administrative table deletion rights to application workers.',
    budgetNotice: 'Lambda function costs $5/mo. DynamoDB table costs $10/mo. Stay within the $15/mo budget.',
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Order processing Lambda successfully updates order status in OrdersTable (200 OK).',
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Exploit probe attempting dynamodb:DeleteTable is blocked (403 AccessDenied).',
    },
    star3Optimal: {
      budgetLimit: 15,
      leastPrivilege: true,
      description: 'Total monthly cost is $15 or less with least-privilege item permissions and CloudWatch logging.',
    },
  },
  hints: [
    {
      level: 'nudge',
      title: 'Empty policies on order-lambda',
      content:
        'Both trust policy and identity policy on order-lambda are empty. Configure trust for lambda.amazonaws.com and allow dynamodb:UpdateItem.',
    },
    {
      level: 'root_cause',
      title: 'Lambda Execution Role setup',
      content:
        'Lambda requires a trust relationship with lambda.amazonaws.com and identity permissions for dynamodb:UpdateItem on OrdersTable.',
    },
    {
      level: 'solution_diff',
      title: 'Target role configuration',
      content:
        'Trust Policy: Effect Allow, Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole". Identity Policy: Allow dynamodb:GetItem, dynamodb:UpdateItem on OrdersTable and logs:CreateLogStream, logs:PutLogEvents on log group.',
    },
  ],
  initialNodes: [
    {
      id: 'order-lambda',
      type: 'lambda',
      position: { x: 100, y: 180 },
      essential: true,
      data: {
        id: 'order-lambda',
        type: 'lambda',
        label: 'OrderProcessor',
        arn: ROLE_ARN,
        accountId: ACCOUNT,
        monthlyCost: 5,
        essential: true,
        config: {},
        identityPolicies: [{ Version: '2012-10-17', Statement: [] }],
        trustPolicy: { Version: '2012-10-17', Statement: [] },
      },
    },
    {
      id: 'orders-dynamodb',
      type: 'dynamodb',
      position: { x: 500, y: 180 },
      essential: true,
      data: {
        id: 'orders-dynamodb',
        type: 'dynamodb',
        label: 'OrdersTable',
        arn: TABLE_ARN,
        accountId: ACCOUNT,
        monthlyCost: 10,
        essential: true,
        config: {},
        identityPolicies: [],
      },
    },
  ],
  initialEdges: [
    {
      id: 'edge-order-dynamodb',
      source: 'order-lambda',
      target: 'orders-dynamodb',
      label: 'updates orders',
    },
  ],
  packets: [
    {
      id: 'pkt-2-3-order-update',
      name: 'OrderProcessor updates order status',
      kind: 'legitimate',
      sourceNodeId: 'order-lambda',
      targetNodeId: 'orders-dynamodb',
      action: 'dynamodb:UpdateItem',
      resourceArn: TABLE_ARN,
      context: { 'aws:PrincipalArn': ROLE_ARN },
      expectedOutcome: 'ALLOW',
      description: 'Lambda function updates order fulfillment status in OrdersTable.',
    },
    {
      id: 'pkt-2-3-table-drop',
      name: 'Attacker attempts table drop',
      kind: 'exploit',
      sourceNodeId: 'order-lambda',
      targetNodeId: 'orders-dynamodb',
      action: 'dynamodb:DeleteTable',
      resourceArn: TABLE_ARN,
      context: { 'aws:PrincipalArn': ROLE_ARN },
      expectedOutcome: 'DENY',
      description: 'Malicious payload probes administrative deletion of entire OrdersTable.',
    },
  ],
};

export default STAGE_2_3;
