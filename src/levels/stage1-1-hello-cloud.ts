import { GameLevel } from '../types/engine';

const ACCOUNT = '111122223333';
const ALICE_USER_ARN = `arn:aws:iam::${ACCOUNT}:user/intern-alice`;
const BUCKET_ARN = 'arn:aws:s3:::company-reports';

export const STAGE_1_1: GameLevel = {
  id: 'stage1-1-hello-cloud',
  stage: 1,
  stageLevel: 1,
  stageTitle: 'Stage 1: Foundations of Access',
  roundNumber: 1,
  title: 'Hello Cloud',
  subtitle: 'Canvas Basics & Your First Policy',
  category: 'Learn',
  storyBrief:
    'Alice joined as an intern and needs to read quarterly reports from the company-reports S3 bucket. Currently, no connection exists and her user has no permissions. Connect them and grant access.',
  threatIntel: 'Routine onboarding request. All systems quiet.',
  targetBudget: 10,
  conceptTags: ['principal', 'resource', 'connection', 'identity_policy'],
  twistPager: 'Pager: intern-alice reports 403 AccessDenied when attempting to read quarterly reports.',
  unlockedServices: ['iam_user', 's3'],
  onboardingSteps: [
    {
      id: 'principal',
      title: 'This is a principal',
      body: 'A principal is whoever makes a request. Alice is an intern user. Click her to open the inspector.',
      conceptId: 'principal',
      target: 'intern-alice',
      completeWhen: { predicate: 'nodeSelected', args: ['intern-alice'] },
    },
    {
      id: 'resource',
      title: 'This is a resource',
      body: 'A resource is what gets called. company-reports is an S3 bucket storing reports. Click it.',
      conceptId: 'resource',
      target: 'company-reports',
      completeWhen: { predicate: 'nodeSelected', args: ['company-reports'] },
    },
    {
      id: 'connection',
      title: 'Connect caller to callee',
      body: 'Drag an arrow from intern-alice to company-reports. The arrow shows who calls whom.',
      conceptId: 'connection',
      target: 'intern-alice',
      completeWhen: { predicate: 'edgeExists', args: ['intern-alice', 'company-reports'] },
    },
    {
      id: 'identity-policy',
      title: 'Author an identity policy',
      body: 'Select intern-alice and open "Identity Policy". Add a statement with Effect "Allow", Action "s3:GetObject", Resource "arn:aws:s3:::company-reports/*".',
      conceptId: 'identity_policy',
      target: '[data-tour="tab-identity"]',
      completeWhen: { predicate: 'identityPolicyHasAllow', args: ['intern-alice'] },
    },
    {
      id: 'simulate',
      title: 'Simulate the request',
      body: 'Click "Simulate" (or press Space) to test Alice\'s request. The packet turns green when allowed!',
      target: '[data-tour="simulate"]',
      completeWhen: { predicate: 'simulationPassed' },
    },
  ],
  newlyUnlockedService: {
    type: 'iam_user',
    name: 'IAM User & S3 Storage',
    category: 'Identity & Storage',
    primer:
      'An IAM user represents a person or workload with long-term credentials. Policies define what actions the user may perform on AWS resources.',
    keyConcepts: ['IAM User', 'Identity Policy', 'S3 Bucket', 'Directed Edges'],
  },
  reportCard: {
    headline: 'Stage 1.1: Hello Cloud — Canvas Basics & First Policy',
    scenario:
      'Intern Alice needs to read quarterly reports from the company-reports S3 bucket. Draw the connection arrow and author an identity policy allowing s3:GetObject.',
    tasks: [
      { step: 1, title: 'Connect caller to callee', instruction: 'Connect intern-alice to company-reports' },
      { step: 2, title: 'Grant report access', instruction: 'Grant s3:GetObject on company-reports/*' },
      { step: 3, title: 'Stay within budget', instruction: 'Stay within $10/mo budget' },
    ],
    securityIntel:
      'By default, AWS IAM denies all requests. You must connect the caller to the resource and write an explicit Allow policy statement.',
    budgetNotice: 'IAM users are free ($0/mo). The S3 bucket costs $5/mo base. Stay within the $10/mo budget.',
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Alice can read the quarterly report PDF (200 OK).',
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Policy grants s3:GetObject without wildcard action (* or s3:*).',
    },
    star3Optimal: {
      budgetLimit: 10,
      leastPrivilege: true,
      description: 'Total monthly cost is $10 or less and exact resource ARN is used.',
    },
  },
  hints: [
    {
      level: 'nudge',
      title: 'Connect caller to callee',
      content: 'Requests need a path. Draw a directed arrow from intern-alice to company-reports.',
    },
    {
      level: 'root_cause',
      title: 'Empty identity policy',
      content:
        'Alice has no permissions. Select intern-alice, open Identity Policy, and allow s3:GetObject on arn:aws:s3:::company-reports/*.',
    },
    {
      level: 'solution_diff',
      title: 'Target setup',
      content:
        'Arrow: intern-alice -> company-reports. Policy on intern-alice: Effect Allow, Action s3:GetObject, Resource arn:aws:s3:::company-reports/*.',
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
        identityPolicies: [{ Version: '2012-10-17', Statement: [] }],
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
  initialEdges: [],
  packets: [
    {
      id: 'pkt-1-1-read-report',
      name: 'Intern Alice reads quarterly report',
      kind: 'legitimate',
      sourceNodeId: 'intern-alice',
      targetNodeId: 'company-reports',
      action: 's3:GetObject',
      resourceArn: `${BUCKET_ARN}/q3-report.pdf`,
      context: { 'aws:PrincipalArn': ALICE_USER_ARN },
      expectedOutcome: 'ALLOW',
      description: 'Alice downloads the Q3 report PDF for her team onboarding.',
    },
  ],
};

export default STAGE_1_1;
