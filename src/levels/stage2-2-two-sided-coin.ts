import { GameLevel } from '../types/engine';

const ACCOUNT = '111122223333';
const ROLE_ARN = `arn:aws:iam::${ACCOUNT}:role/AppWorkerRole`;
const BUCKET_ARN = 'arn:aws:s3:::app-uploads';

export const STAGE_2_2: GameLevel = {
  id: 'stage2-2-two-sided-coin',
  stage: 2,
  stageLevel: 2,
  stageTitle: 'Stage 2: The Magic Hat',
  roundNumber: 4,
  title: 'Two-Sided Coin',
  subtitle: 'EC2 Trust Policy vs. Identity Policy',
  category: 'Learn',
  storyBrief:
    'An EC2 worker needs to upload data batches to the app-uploads S3 bucket. The worker role already has an identity policy allowing s3:PutObject. However, uploads fail with 403 AccessDenied because the role trust policy is misconfigured! Fix the trust policy to allow ec2.amazonaws.com to assume the role.',
  threatIntel:
    'Pager: Production EC2 batch uploader is throwing 403 AccessDenied during role assumption at instance boot.',
  targetBudget: 20,
  conceptTags: ['trust_policy', 'ec2', 'identity_policy'],
  twistPager:
    'Pager: Production EC2 batch uploader is throwing 403 AccessDenied during role assumption at instance boot.',
  unlockedServices: ['ec2', 'iam_role', 's3'],
  reportCard: {
    headline: 'Stage 2.2: Two-Sided Coin — EC2 Trust Policy vs. Identity Policy',
    scenario:
      'Every IAM role has two sides: the Identity Policy (what actions it can perform) and the Trust Policy (which principal may assume it). The worker EC2 has a valid identity policy for S3 uploads, but its trust policy lists the wrong service principal. Fix the trust policy.',
    tasks: [
      { step: 1, title: 'Inspect Trust Policy', instruction: 'Open worker-ec2 Inspector and navigate to the Trust Policy tab' },
      { step: 2, title: 'Trust EC2 service', instruction: 'Set Principal Service to ec2.amazonaws.com for sts:AssumeRole' },
      { step: 3, title: 'Verify upload and block deletes', instruction: 'Simulate to confirm s3:PutObject succeeds and unauthorized deletes are denied' },
      { step: 4, title: 'Stay within budget', instruction: 'Stay within $20/mo monthly budget' },
    ],
    securityIntel:
      'Trust policies govern sts:AssumeRole. An EC2 instance profile requires ec2.amazonaws.com in the trust policy Principal block. Without it, the instance cannot acquire temporary role credentials.',
    budgetNotice: 'EC2 worker costs $15/mo. S3 bucket costs $5/mo. Total budget is $20/mo.',
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Worker EC2 successfully uploads batch data to app-uploads (200 OK).',
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Unauthorized s3:DeleteObject is blocked (403 AccessDenied).',
    },
    star3Optimal: {
      budgetLimit: 20,
      leastPrivilege: true,
      description: 'Total monthly cost is $20 or less with trust policy restricted strictly to ec2.amazonaws.com.',
    },
  },
  hints: [
    {
      level: 'nudge',
      title: 'Check the Trust Policy tab',
      content:
        'The identity policy allows s3:PutObject, but the instance cannot assume the role. Look at the Trust Policy tab on worker-ec2.',
    },
    {
      level: 'root_cause',
      title: 'Wrong service principal in Trust Policy',
      content:
        'The trust policy currently trusts lambda.amazonaws.com instead of ec2.amazonaws.com. Change the trusted Service principal to ec2.amazonaws.com for Action sts:AssumeRole.',
    },
    {
      level: 'solution_diff',
      title: 'Target Trust Policy',
      content:
        'Statement: Effect Allow, Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole".',
    },
  ],
  initialNodes: [
    {
      id: 'worker-ec2',
      type: 'ec2',
      position: { x: 100, y: 180 },
      essential: true,
      data: {
        id: 'worker-ec2',
        type: 'ec2',
        label: 'App Worker EC2',
        arn: ROLE_ARN,
        accountId: ACCOUNT,
        monthlyCost: 15,
        essential: true,
        config: { imdsVersion: 'v2' },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AllowS3Upload',
                Effect: 'Allow',
                Action: ['s3:PutObject'],
                Resource: `${BUCKET_ARN}/*`,
              },
            ],
          },
        ],
        trustPolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'MisconfiguredServiceTrust',
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole',
            },
          ],
        },
      },
    },
    {
      id: 'uploads-bucket',
      type: 's3',
      position: { x: 500, y: 180 },
      essential: true,
      data: {
        id: 'uploads-bucket',
        type: 's3',
        label: 'app-uploads',
        arn: BUCKET_ARN,
        accountId: ACCOUNT,
        monthlyCost: 5,
        essential: true,
        config: { blockPublicAccess: true },
        identityPolicies: [],
      },
    },
  ],
  initialEdges: [
    {
      id: 'edge-worker-uploads',
      source: 'worker-ec2',
      target: 'uploads-bucket',
      label: 'uploads batches',
    },
  ],
  packets: [
    {
      id: 'pkt-2-2-upload',
      name: 'Worker uploads batch file',
      kind: 'legitimate',
      sourceNodeId: 'worker-ec2',
      targetNodeId: 'uploads-bucket',
      action: 's3:PutObject',
      resourceArn: `${BUCKET_ARN}/batch-01.dat`,
      context: { 'aws:PrincipalArn': ROLE_ARN },
      expectedOutcome: 'ALLOW',
      description: 'App worker EC2 instance uploads daily batch processing output.',
    },
    {
      id: 'pkt-2-2-unauthorized-action',
      name: 'Attempted deletion of batch file',
      kind: 'exploit',
      sourceNodeId: 'worker-ec2',
      targetNodeId: 'uploads-bucket',
      action: 's3:DeleteObject',
      resourceArn: `${BUCKET_ARN}/batch-01.dat`,
      context: { 'aws:PrincipalArn': ROLE_ARN },
      expectedOutcome: 'DENY',
      description: 'Unauthorized delete probe against batch storage.',
    },
  ],
};

export default STAGE_2_2;
