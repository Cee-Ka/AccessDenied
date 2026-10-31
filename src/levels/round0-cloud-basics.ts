import { GameLevel } from '../types/engine';

const ACCOUNT = '111122223333';
const APP_ROLE_ARN = `arn:aws:iam::${ACCOUNT}:role/PhotoAppRole`;
const INTERN_ARN = `arn:aws:iam::${ACCOUNT}:user/intern-dev`;
const BUCKET_ARN = 'arn:aws:s3:::team-photos';

export const round0CloudBasics: GameLevel = {
  id: 'round-0',
  roundNumber: 0,
  title: 'Cloud Basics',
  subtitle: 'Principals, Resources & The Core Primitives',
  category: 'Learn',
  storyBrief:
    'A small team shares photos in one S3 bucket. The photo app cannot read anything yet, and an unlocked intern laptop threatens to delete photos. Fix both, one step at a time.',
  threatIntel:
    'An unlocked laptop on the intern\'s desk is being probed. An attacker is attempting to delete all team photos.',
  targetBudget: 10,
  conceptTags: ['principal', 'resource', 'connection', 'identity_policy', 'explicit_deny'],
  twistPager: 'Pager: Someone is attempting to delete photos from team-photos using intern-dev.',
  unlockedServices: ['s3', 'iam_role'],
  reportCard: {
    headline: 'Stage 0: Cloud Basics — Who May Do What',
    scenario:
      'PhotoAppRole needs to read photos from team-photos. The intern-dev user has permissions on the bucket. Follow the highlighted steps to meet the components, connect them, grant access, and block deletions.',
    tasks: [
      { step: 1, title: 'Meet the parts', instruction: 'Click the app (a principal) and the bucket (a resource).' },
      { step: 2, title: 'Connect them', instruction: 'Draw an arrow from PhotoAppRole to team-photos.' },
      { step: 3, title: 'Grant access', instruction: 'Allow s3:GetObject in the app\'s identity policy.' },
      { step: 4, title: 'Rein in the intern', instruction: 'Add an explicit Deny for s3:DeleteObject on intern-dev.' },
      { step: 5, title: 'Simulate', instruction: 'Press Simulate. The app reads, the intern uploads, and the delete attack is blocked.' },
    ],
    securityIntel: 'An Allow opens a door. A Deny keeps doors shut. A matching Deny always overrides an Allow.',
    budgetNotice: 'The bucket costs $5/mo. Roles and users are free. Stay at or under $10/mo.',
  },
  onboardingSteps: [
    {
      id: 'principal',
      title: 'This is a principal',
      body: 'A principal is whoever makes a request. PhotoAppRole is the role your photo app runs as. Click it to open the inspector.',
      conceptId: 'principal',
      target: 'starter-app',
      completeWhen: { predicate: 'nodeSelected', args: ['starter-app'] },
    },
    {
      id: 'resource',
      title: 'This is a resource',
      body: 'A resource is what gets called. team-photos is an S3 bucket. Click it.',
      conceptId: 'resource',
      target: 'starter-photos',
      completeWhen: { predicate: 'nodeSelected', args: ['starter-photos'] },
    },
    {
      id: 'connection',
      title: 'Connect caller to callee',
      body: 'Drag from the dot on the right of PhotoAppRole to team-photos. The arrow shows who calls whom.',
      conceptId: 'connection',
      target: 'starter-app',
      completeWhen: { predicate: 'edgeExists', args: ['starter-app', 'starter-photos'] },
    },
    {
      id: 'identity-policy',
      title: 'Give the app permission',
      body: 'Select PhotoAppRole and open "Identity Policy". Add a statement: Effect "Allow", Action "s3:GetObject", Resource "arn:aws:s3:::team-photos/*".',
      conceptId: 'identity_policy',
      target: '[data-tour="tab-identity"]',
      completeWhen: { predicate: 'identityPolicyHasAllow', args: ['starter-app'] },
    },
    {
      id: 'explicit-deny',
      title: 'Deny beats Allow',
      body: 'The intern can delete photos. Select intern-dev and add a second statement to its identity policy: Effect "Deny", Action "s3:DeleteObject", Resource "*". A matching Deny always wins.',
      conceptId: 'explicit_deny',
      target: 'starter-intern',
      completeWhen: { predicate: 'policyHasDeny', args: ['starter-intern'] },
    },
    {
      id: 'simulate',
      title: 'Run it',
      body: 'Press Simulate (or Ctrl/⌘+Enter). Green requests must pass. Red attacks must be blocked.',
      target: '[data-tour="simulate"]',
      completeWhen: { predicate: 'simulationPassed' },
    },
  ],
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'The photo app reads photos and the intern can still upload.',
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'The intern cannot delete photos.',
    },
    star3Optimal: {
      budgetLimit: 10,
      leastPrivilege: true,
      description: 'Stays within the $10/mo budget.',
    },
  },
  hints: [
    {
      level: 'nudge',
      title: 'Start with the photo app',
      content: 'The app has no arrow to the bucket and an empty identity policy. It needs both.',
    },
    {
      level: 'root_cause',
      title: 'Explicit Deny beats Allow',
      content: 'The intern has permission to delete photos. Add a statement with Effect "Deny" for action "s3:DeleteObject" to block deletes.',
    },
    {
      level: 'solution_diff',
      title: 'Target setup',
      content: 'PhotoAppRole → team-photos arrow; PhotoAppRole Allow s3:GetObject on team-photos/*; intern-dev Deny s3:DeleteObject on *.',
    },
  ],
  initialNodes: [
    {
      id: 'starter-app',
      type: 'iam_role',
      position: { x: 80, y: 80 },
      data: {
        id: 'starter-app',
        type: 'iam_role',
        label: 'PhotoAppRole',
        arn: APP_ROLE_ARN,
        accountId: ACCOUNT,
        monthlyCost: 0,
        config: {},
        identityPolicies: [{ Version: '2012-10-17', Statement: [] }],
      },
    },
    {
      id: 'starter-photos',
      type: 's3',
      position: { x: 480, y: 160 },
      data: {
        id: 'starter-photos',
        type: 's3',
        label: 'team-photos',
        arn: BUCKET_ARN,
        accountId: ACCOUNT,
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: [],
      },
    },
    {
      id: 'starter-intern',
      type: 'iam_user',
      position: { x: 80, y: 280 },
      data: {
        id: 'starter-intern',
        type: 'iam_user',
        label: 'intern-dev',
        arn: INTERN_ARN,
        accountId: ACCOUNT,
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'InternBucketAccess',
                Effect: 'Allow',
                Action: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
                Resource: [BUCKET_ARN, `${BUCKET_ARN}/*`],
              },
            ],
          },
        ],
      },
    },
  ],
  initialEdges: [
    { id: 'edge-intern-photos', source: 'starter-intern', target: 'starter-photos', label: 'intern uploads' },
  ],
  packets: [
    {
      id: 'pkt-0-app-read',
      name: 'Photo app reads a photo',
      kind: 'legitimate',
      sourceNodeId: 'starter-app',
      targetNodeId: 'starter-photos',
      action: 's3:GetObject',
      resourceArn: `${BUCKET_ARN}/cat.jpg`,
      context: { 'aws:PrincipalArn': APP_ROLE_ARN },
      expectedOutcome: 'ALLOW',
      description: 'The app shows a photo to a user.',
    },
    {
      id: 'pkt-0-intern-upload',
      name: 'Intern uploads a photo',
      kind: 'legitimate',
      sourceNodeId: 'starter-intern',
      targetNodeId: 'starter-photos',
      action: 's3:PutObject',
      resourceArn: `${BUCKET_ARN}/team-offsite.jpg`,
      context: { 'aws:PrincipalArn': INTERN_ARN },
      expectedOutcome: 'ALLOW',
      description: 'Uploading is part of the intern\'s job.',
    },
    {
      id: 'pkt-0-intern-delete',
      name: 'Stolen login deletes photos',
      kind: 'exploit',
      sourceNodeId: 'starter-intern',
      targetNodeId: 'starter-photos',
      action: 's3:DeleteObject',
      resourceArn: `${BUCKET_ARN}/cat.jpg`,
      context: { 'aws:PrincipalArn': INTERN_ARN },
      expectedOutcome: 'DENY',
      description: 'Someone at the unlocked laptop tries to wipe the bucket.',
    },
  ],
};
