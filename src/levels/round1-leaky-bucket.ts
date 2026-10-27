import { GameLevel } from '../types/engine';

export const round1LeakyBucket: GameLevel = {
  id: 'round-1',
  roundNumber: 1,
  title: 'The Leaky Bucket',
  subtitle: 'S3 Bucket Policies vs. Block Public Access',
  category: 'Learn',
  storyBrief:
    'Your customer billing system stores sensitive monthly PDF invoices in an S3 bucket. A junior developer created a bucket policy with "Principal": "*" to make invoice previews work, but now scrapers are harvesting customer invoices from the public internet!',
  threatIntel:
    'Adversary botnets are probing sequential invoice URLs. Legitimate web servers must continue reading/writing invoices, but all unauthorized internet traffic must be blocked.',
  targetBudget: 25,
  unlockedServices: ['s3', 'iam_role'],
  newlyUnlockedService: {
    type: 's3',
    name: 'Amazon S3 (Simple Storage Service)',
    category: 'Storage',
    primer: 'Amazon S3 provides durable cloud object storage. In production, buckets must enable Block Public Access and restrict bucket policies to explicit IAM roles.',
    keyConcepts: ['Bucket Policies', 'Block Public Access', 'Object ARNs']
  },
  reportCard: {
    headline: 'Stage 1: First Cloud Storage — S3 Bucket & Policies',
    scenario: 'Your billing service generates customer PDF invoices. You need to provision cloud storage to store invoices safely so the billing web server can read and write them, while preventing internet botnets from scraping customer invoices.',
    tasks: [
      { step: 1, title: 'Provision S3 Storage', instruction: 'Drag an S3 Bucket from the left dock onto the canvas (or inspect the existing one).' },
      { step: 2, title: 'Connect Workload Route', instruction: 'Wire a connection line from Billing Web Server to the S3 Bucket.' },
      { step: 3, title: 'Enforce Public Block', instruction: 'Click the S3 Bucket to open the Inspector and ensure "Block Public Access" is toggled ON.' },
      { step: 4, title: 'Author Least-Privilege Bucket Policy', instruction: 'In the S3 Resource Policy tab, restrict s3:GetObject and s3:PutObject strictly to the Billing Web Server role ARN.' },
      { step: 5, title: 'Run Simulation', instruction: 'Click "Simulate" in the top bar to verify that invoice workloads succeed (200 OK) and the botnet scraper probe is blocked.' }
    ],
    securityIntel: 'Adversary botnets probe bucket URLs continuously. If "Principal": "*" is granted without Block Public Access, all customer invoices are exposed to the public internet.',
    budgetNotice: 'Target budget is $25/mo. An S3 bucket costs $5/mo base.'
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Web server can read and write customer invoice PDFs (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Internet botnet scraper receives 403 AccessDenied on all object downloads.'
    },
    star3Optimal: {
      budgetLimit: 25,
      leastPrivilege: true,
      description: 'Monthly cost is $20 or less and S3 bucket policy contains no public wildcard principal.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Inspect the S3 Bucket Security Toggles',
      content: 'Check the S3 Bucket properties in the right drawer. Is "Block Public Access" enabled?'
    },
    {
      level: 'root_cause',
      title: 'Wildcard Principal in Bucket Policy',
      content: 'The S3 Bucket Policy currently specifies `"Principal": "*"`. Restrict the principal strictly to the Web Server IAM Role ARN: `"arn:aws:iam::111122223333:role/WebServerRole"`.'
    },
    {
      level: 'solution_diff',
      title: 'Target Policy Solution',
      content: `Enable "Block Public Access" on the S3 bucket toggle, and update the Bucket Policy Statement:
{
  "Sid": "AllowWebServerOnly",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:role/WebServerRole" },
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::customer-invoices/*"
}`
    }
  ],
  initialNodes: [
    {
      id: 'web-server-ec2',
      type: 'ec2',
      position: { x: 120, y: 160 },
      data: {
        id: 'web-server-ec2',
        type: 'ec2',
        label: 'Billing Web Server',
        arn: 'arn:aws:iam::111122223333:role/WebServerRole',
        accountId: '111122223333',
        monthlyCost: 15,
        config: { imdsVersion: 'v2' },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'WebS3Access',
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:PutObject'],
                Resource: 'arn:aws:s3:::customer-invoices/*'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'botnet-scraper',
      type: 'external_vendor',
      position: { x: 120, y: 380 },
      data: {
        id: 'botnet-scraper',
        type: 'external_vendor',
        label: 'Anonymous Botnet Scraper',
        arn: 'arn:aws:iam::999999999999:root',
        accountId: '999999999999',
        monthlyCost: 0,
        config: {},
        identityPolicies: []
      }
    }
  ],
  initialEdges: [],
  packets: [
    {
      id: 'pkt-1-web-get',
      name: 'Fetch Monthly Invoice',
      kind: 'legitimate',
      sourceNodeId: 'web-server-ec2',
      targetNodeId: 'invoices-bucket',
      targetNodeType: 's3',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::customer-invoices/2026/01.pdf',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/WebServerRole' },
      expectedOutcome: 'ALLOW',
      description: 'Web server delivers invoice to logged-in user'
    },
    {
      id: 'pkt-1-web-put',
      name: 'Upload Generated Invoice',
      kind: 'legitimate',
      sourceNodeId: 'web-server-ec2',
      targetNodeId: 'invoices-bucket',
      action: 's3:PutObject',
      resourceArn: 'arn:aws:s3:::customer-invoices/2026/02.pdf',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/WebServerRole' },
      expectedOutcome: 'ALLOW',
      description: 'Billing daemon saves newly generated invoice'
    },
    {
      id: 'pkt-1-bot-scrape',
      name: 'Botnet Scraper Probe',
      kind: 'exploit',
      sourceNodeId: 'botnet-scraper',
      targetNodeId: 'invoices-bucket',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::customer-invoices/2026/01.pdf',
      context: { 'aws:PrincipalIsPublic': true },
      expectedOutcome: 'DENY',
      description: 'Unauthenticated attacker scraping customer PII'
    }
  ]
};
