import { GameLevel } from '../types/engine';

const ACCOUNT = '111122223333';
const ALICE_USER_ARN = `arn:aws:iam::${ACCOUNT}:user/intern-alice`;
const BUCKET_ARN = 'arn:aws:s3:::company-reports';

export const STAGE_1_2: GameLevel = {
  id: 'stage1-2-curious-teammate',
  stage: 1,
  stageLevel: 2,
  stageTitle: 'Stage 1: Foundations of Access',
  roundNumber: 2,
  title: 'The Curious Teammate',
  subtitle: 'Explicit Deny Always Wins',
  category: 'Learn',
  storyBrief:
    'Alice has access to quarterly reports in company-reports. However, the bucket also stores executive payroll under /salaries/*. Someone using Alice credentials attempts to read salary spreadsheets. Use an explicit Deny to block access to the salaries folder while keeping report access working.',
  threatIntel:
    'Pager: Someone using intern-alice credentials is attempting to access confidential payroll files in company-reports/salaries/.',
  targetBudget: 10,
  conceptTags: ['explicit_deny', 'least_privilege', 'resource'],
  twistPager:
    'Pager: Someone using intern-alice credentials is attempting to access confidential payroll files in company-reports/salaries/.',
  unlockedServices: ['iam_user', 's3'],
  reportCard: {
    headline: 'Stage 1.2: The Curious Teammate — Explicit Deny Always Wins',
    scenario:
      'Alice has access to quarterly reports, but someone is probing confidential executive salaries stored under /salaries/*. Add an Explicit Deny statement to her identity policy.',
    tasks: [
      { step: 1, title: 'Preserve legitimate access', instruction: 'Keep legitimate report access working' },
      { step: 2, title: 'Block payroll folder', instruction: 'Add Explicit Deny statement for company-reports/salaries/*' },
      { step: 3, title: 'Stay within budget', instruction: 'Stay within $10/mo budget' },
    ],
    securityIntel:
      'In AWS IAM, an explicit Deny statement always wins over any Allow statement, regardless of where or when the Allow was defined.',
    budgetNotice: 'The S3 bucket costs $5/mo base. Users are free ($0/mo). Stay within the $10/mo budget.',
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Legitimate quarterly report downloads succeed (200 OK).',
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Salary exploit blocked via Explicit Deny statement (403 AccessDenied).',
    },
    star3Optimal: {
      budgetLimit: 10,
      leastPrivilege: true,
      description: 'Total monthly cost is $10 or less with scoped prefix denial.',
    },
  },
  hints: [
    {
      level: 'nudge',
      title: 'Salary exploit target',
      content:
        'The exploit request targets arn:aws:s3:::company-reports/salaries/executive-payroll.xlsx. You must block this path.',
    },
    {
      level: 'root_cause',
      title: 'Explicit Deny always wins',
      content:
        'An Allow opens access to company-reports/*. Add a second statement with Effect "Deny" for Action "s3:GetObject" on Resource "arn:aws:s3:::company-reports/salaries/*". An explicit Deny always overrides an Allow.',
    },
    {
      level: 'solution_diff',
      title: 'Target policy statement',
      content:
        'Add statement: Effect Deny, Action s3:GetObject, Resource arn:aws:s3:::company-reports/salaries/*.',
    },
  ],
  initialNodes: [
    {
      id: 'intern-alice',
      type: 'iam_user',
      position: { x: 80, y: 160 },
      essential: true,
      data: {
        id: 'intern-alice',
        type: 'iam_user',
        label: 'intern-alice',
        arn: ALICE_USER_ARN,
        accountId: ACCOUNT,
        monthlyCost: 0,
        essential: true,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AllowReportsRead',
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: `${BUCKET_ARN}/*`,
              },
            ],
          },
        ],
      },
    },
    {
      id: 'company-reports',
      type: 's3',
      position: { x: 480, y: 160 },
      essential: true,
      data: {
        id: 'company-reports',
        type: 's3',
        label: 'company-reports',
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
      id: 'edge-alice-reports',
      source: 'intern-alice',
      target: 'company-reports',
      label: 'reads reports',
    },
  ],
  packets: [
    {
      id: 'pkt-1-2-read-report',
      name: 'Alice reads quarterly report',
      kind: 'legitimate',
      sourceNodeId: 'intern-alice',
      targetNodeId: 'company-reports',
      action: 's3:GetObject',
      resourceArn: `${BUCKET_ARN}/q3-report.pdf`,
      context: { 'aws:PrincipalArn': ALICE_USER_ARN },
      expectedOutcome: 'ALLOW',
      description: 'Alice downloads the quarterly report PDF.',
    },
    {
      id: 'pkt-1-2-read-salary',
      name: 'Curious probe reads payroll spreadsheet',
      kind: 'exploit',
      sourceNodeId: 'intern-alice',
      targetNodeId: 'company-reports',
      action: 's3:GetObject',
      resourceArn: `${BUCKET_ARN}/salaries/executive-payroll.xlsx`,
      context: { 'aws:PrincipalArn': ALICE_USER_ARN },
      expectedOutcome: 'DENY',
      description: 'Someone attempts to read confidential executive salaries from the salaries folder.',
    },
  ],
};

export default STAGE_1_2;
