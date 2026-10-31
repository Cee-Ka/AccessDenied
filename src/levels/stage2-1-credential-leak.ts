import { GameLevel } from '../types/engine';

const ACCOUNT = '111122223333';
const ROLE_ARN = `arn:aws:iam::${ACCOUNT}:role/WebServerRole`;
const USER_ARN = `arn:aws:iam::${ACCOUNT}:user/leaked-dev`;
const BUCKET_ARN = 'arn:aws:s3:::product-catalog-assets';

export const STAGE_2_1: GameLevel = {
  id: 'stage2-1-credential-leak',
  stage: 2,
  stageLevel: 1,
  stageTitle: 'Stage 2: The Magic Hat',
  roundNumber: 3,
  title: 'Credential Leak',
  subtitle: 'Why IAM Roles Exist',
  category: 'Learn',
  storyBrief:
    'A developer hardcoded an IAM User static access key into an application repo and accidentally pushed it to GitHub! Automated scraper bots are using the leaked credentials to steal database backups from your S3 bucket. Migrate the web server to an IAM Role Instance Profile and eliminate the leaked user.',
  threatIntel:
    'Pager: Stolen developer access keys are being used from unauthorized foreign IPs to scrape product assets and database backups.',
  targetBudget: 20,
  conceptTags: ['iam_role', 'instance_profile', 'least_privilege'],
  twistPager:
    'Pager: Stolen developer access keys are being used from unauthorized foreign IPs to scrape product assets and database backups.',
  unlockedServices: ['ec2', 'iam_role', 's3'],
  newlyUnlockedService: {
    type: 'iam_role',
    name: 'AWS IAM Role & Instance Profile',
    category: 'Identity',
    primer:
      'IAM Roles provide temporary credentials with automatic rotation. Attaching an IAM Role to an EC2 instance eliminates hardcoded static access keys.',
    keyConcepts: ['IAM Role', 'Instance Profile', 'sts:AssumeRole', 'Temporary Credentials'],
  },
  reportCard: {
    headline: 'Stage 2.1: Credential Leak — Why IAM Roles Exist',
    scenario:
      'Automated scraper bots found hardcoded developer access keys on GitHub and are downloading database backups from product-catalog-assets. Remove the leaked user and attach a scoped IAM role to the web server.',
    tasks: [
      { step: 1, title: 'Eliminate leaked static user', instruction: 'Delete the leaked-user node or remove its wildcards' },
      { step: 2, title: 'Scope EC2 role permissions', instruction: 'Grant s3:GetObject on product-catalog-assets/* to web-server-ec2' },
      { step: 3, title: 'Connect web server to storage', instruction: 'Wire web-server-ec2 to catalog-bucket' },
      { step: 4, title: 'Stay within budget', instruction: 'Stay within $20/mo monthly budget' },
    ],
    securityIntel:
      'Static access keys never expire automatically and frequently leak into repositories. Compute services should always assume IAM Roles via Instance Profiles.',
    budgetNotice: 'EC2 instance costs $15/mo. S3 bucket costs $5/mo. Roles and users are $0/mo. Stay within $20/mo budget.',
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Production web server successfully reads catalog images (200 OK).',
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Attacker key scraper blocked from reading database backups (403 AccessDenied).',
    },
    star3Optimal: {
      budgetLimit: 20,
      leastPrivilege: true,
      description: 'Total monthly cost is $20 or less with scoped catalog asset permissions and static keys eliminated.',
    },
  },
  hints: [
    {
      level: 'nudge',
      title: 'Leaked static credentials',
      content:
        'An attacker is using leaked static keys from leaked-user. Delete leaked-user and connect web-server-ec2 to catalog-bucket.',
    },
    {
      level: 'root_cause',
      title: 'Static keys vs IAM Roles',
      content:
        'Hardcoded access keys in source control lead to credential leakage. Delete the leaked-user, then attach an identity policy with scoped s3:GetObject on product-catalog-assets/* to web-server-ec2.',
    },
    {
      level: 'solution_diff',
      title: 'Target configuration',
      content:
        'Delete leaked-user. Connect web-server-ec2 -> catalog-bucket. Policy on web-server-ec2: Effect Allow, Action s3:GetObject, Resource arn:aws:s3:::product-catalog-assets/*.',
    },
  ],
  initialNodes: [
    {
      id: 'web-server-ec2',
      type: 'ec2',
      position: { x: 80, y: 120 },
      essential: true,
      data: {
        id: 'web-server-ec2',
        type: 'ec2',
        label: 'Production Web Server',
        arn: ROLE_ARN,
        accountId: ACCOUNT,
        monthlyCost: 15,
        essential: true,
        config: { imdsVersion: 'v2' },
        identityPolicies: [{ Version: '2012-10-17', Statement: [] }],
      },
    },
    {
      id: 'leaked-user',
      type: 'iam_user',
      position: { x: 80, y: 300 },
      essential: false,
      data: {
        id: 'leaked-user',
        type: 'iam_user',
        label: 'LeakedDevUser',
        arn: USER_ARN,
        accountId: ACCOUNT,
        monthlyCost: 0,
        essential: false,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'LeakedWildcardAdmin',
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*',
              },
            ],
          },
        ],
      },
    },
    {
      id: 'catalog-bucket',
      type: 's3',
      position: { x: 500, y: 200 },
      essential: true,
      data: {
        id: 'catalog-bucket',
        type: 's3',
        label: 'product-catalog-assets',
        arn: BUCKET_ARN,
        accountId: ACCOUNT,
        monthlyCost: 5,
        essential: true,
        config: { blockPublicAccess: true },
        identityPolicies: [],
      },
    },
    {
      id: 'bot-attacker',
      type: 'external_vendor',
      position: { x: 80, y: 460 },
      essential: true,
      data: {
        id: 'bot-attacker',
        type: 'external_vendor',
        label: 'GitHub Key Scraper',
        arn: USER_ARN,
        accountId: ACCOUNT,
        monthlyCost: 0,
        essential: true,
        config: {},
        identityPolicies: [],
      },
    },
  ],
  initialEdges: [
    {
      id: 'edge-bot-catalog',
      source: 'bot-attacker',
      target: 'catalog-bucket',
      label: 'scrapes assets',
    },
  ],
  packets: [
    {
      id: 'pkt-2-1-web-read',
      name: 'Web server reads product image',
      kind: 'legitimate',
      sourceNodeId: 'web-server-ec2',
      targetNodeId: 'catalog-bucket',
      action: 's3:GetObject',
      resourceArn: `${BUCKET_ARN}/images/item1.png`,
      context: { 'aws:PrincipalArn': ROLE_ARN },
      expectedOutcome: 'ALLOW',
      description: 'Web server fetches product catalog image for storefront display.',
    },
    {
      id: 'pkt-2-1-bot-scrape',
      name: 'Bot scraper attempts database backup exfiltration',
      kind: 'exploit',
      sourceNodeId: 'bot-attacker',
      targetNodeId: 'catalog-bucket',
      action: 's3:GetObject',
      resourceArn: `${BUCKET_ARN}/database-backup.tar.gz`,
      context: { 'aws:PrincipalArn': USER_ARN },
      expectedOutcome: 'DENY',
      description: 'Automated GitHub scraper bot attempts to download database backup archive.',
    },
  ],
};

export default STAGE_2_1;
