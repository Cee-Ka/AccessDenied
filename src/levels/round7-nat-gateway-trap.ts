import { GameLevel } from '../types/engine';

export const round7NatGatewayTrap: GameLevel = {
  id: 'round-7',
  roundNumber: 7,
  title: 'The NAT Gateway Trap',
  subtitle: 'VPC Endpoints & Cost Optimization',
  category: 'Learn',
  storyBrief:
    'A high-throughput Lambda function runs in a Private Subnet to analyze server logs stored in S3. The architecture connects through a NAT Gateway costing $32/mo base plus massive data transfer fees, blowing through the startup\'s monthly cloud budget!',
  threatIntel:
    'VPC Gateway Endpoints for Amazon S3 and DynamoDB are 100% free with zero data processing fees. By replacing the NAT Gateway with an S3 Gateway Endpoint and attaching a least-privilege endpoint policy, you drop monthly cost below budget while locking down network reachability.',
  targetBudget: 15,
  unlockedServices: ['s3', 'iam_role', 'ec2', 'lambda', 'dynamodb', 'kms', 'vpc_endpoint', 'nat_gw'],
  newlyUnlockedService: {
    type: 'vpc_endpoint',
    name: 'VPC Gateway Endpoint (Amazon S3)',
    category: 'Networking',
    primer: 'VPC Gateway Endpoints allow compute nodes inside private subnets to reach S3 and DynamoDB privately across the AWS network backbone with $0 data processing fees, replacing expensive NAT Gateways.',
    keyConcepts: ['Gateway Endpoints', 'Private Subnet Routing', 'Cost Optimization']
  },
  reportCard: {
    headline: 'Stage 7: VPC Networking & Cost — Gateway Endpoints vs NAT',
    scenario: 'A high-throughput Lambda function runs in a Private Subnet to analyze server logs stored in S3. The architecture connects through a NAT Gateway costing $32/mo base plus massive data transfer fees, blowing through the startup\'s monthly cloud budget.',
    tasks: [
      { step: 1, title: 'Analyze Architecture Cost', instruction: 'Notice the NAT Gateway has a monthly cost of $32/mo, exceeding the $15 budget cap.' },
      { step: 2, title: 'Delete NAT Gateway', instruction: 'Select the NAT Gateway node and delete it.' },
      { step: 3, title: 'Attach S3 Gateway Endpoint', instruction: 'Drag a VPC S3 Endpoint ($0/mo) from the left dock onto the board.' },
      { step: 4, title: 'Wire Private Route', instruction: 'Wire a connection line from Log Ingest Worker to the S3 Gateway Endpoint, and from the Endpoint to application-logs.' },
      { step: 5, title: 'Simulate', instruction: 'Verify log writes succeed (200 OK) while total infrastructure cost drops under budget ($10/mo).' }
    ],
    securityIntel: 'Traffic routed through VPC Endpoints never crosses the public internet, reducing exposure while cutting cloud egress charges to zero.',
    budgetNotice: 'Target budget is $15/mo. Replacing the $32/mo NAT Gateway with a free S3 Gateway Endpoint achieves optimal 3-star rating.'
  },
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Private subnet Lambda can read and write S3 log files (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Traffic stays inside the AWS private network backbone without internet exposure.'
    },
    star3Optimal: {
      budgetLimit: 15,
      leastPrivilege: true,
      description: 'Monthly cost is within $15 budget (NAT Gateway eliminated; S3 Gateway Endpoint utilized).'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Analyze Monthly Cost',
      content: 'Notice the NAT Gateway has a monthly cost of $32/mo, exceeding the $15 budget cap. Can a VPC Gateway Endpoint route S3 traffic for free?'
    },
    {
      level: 'root_cause',
      title: 'Costly NAT Gateway for Internal AWS Traffic',
      content: 'AWS provides free VPC Gateway Endpoints for S3 and DynamoDB. Replace the NAT Gateway with an S3 Gateway Endpoint.'
    },
    {
      level: 'solution_diff',
      title: 'Target Architecture',
      content: 'Remove the NAT Gateway node. Drag or connect an S3 VPC Endpoint with service "s3" and endpointType "gateway" ($0/mo).'
    }
  ],
  initialNodes: [
    {
      id: 'log-worker-lambda',
      type: 'lambda',
      position: { x: 120, y: 220 },
      data: {
        id: 'log-worker-lambda',
        type: 'lambda',
        label: 'Log Ingest Worker',
        arn: 'arn:aws:iam::111122223333:role/LogWorkerRole',
        accountId: '111122223333',
        monthlyCost: 5,
        config: {
          inPrivateSubnet: true
        },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'LogBucketAccess',
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:PutObject'],
                Resource: 'arn:aws:s3:::application-logs/*'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'costly-nat-gw',
      type: 'nat_gw',
      position: { x: 380, y: 140 },
      data: {
        id: 'costly-nat-gw',
        type: 'nat_gw',
        label: 'NAT Gateway ($32/mo)',
        arn: 'arn:aws:ec2:us-east-1:111122223333:natgateway/nat-expensive',
        accountId: '111122223333',
        monthlyCost: 32, // BLOWS $15 BUDGET!
        config: {},
        identityPolicies: []
      }
    },
    {
      id: 's3-logs-bucket',
      type: 's3',
      position: { x: 680, y: 220 },
      data: {
        id: 's3-logs-bucket',
        type: 's3',
        label: 'application-logs',
        arn: 'arn:aws:s3:::application-logs',
        accountId: '111122223333',
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: []
      }
    }
  ],
  initialEdges: [
    { id: 'e-lambda-nat', source: 'log-worker-lambda', target: 'costly-nat-gw', label: 'Egress' },
    { id: 'e-nat-s3', source: 'costly-nat-gw', target: 's3-logs-bucket', label: 'Internet Route to S3' }
  ],
  packets: [
    {
      id: 'pkt-7-legit-ingest',
      name: 'Write Aggregated Log Batch',
      kind: 'legitimate',
      sourceNodeId: 'log-worker-lambda',
      targetNodeId: 's3-logs-bucket',
      action: 's3:PutObject',
      resourceArn: 'arn:aws:s3:::application-logs/2026/app.log',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/LogWorkerRole' },
      expectedOutcome: 'ALLOW',
      description: 'Private Lambda streaming log archive to S3 bucket'
    }
  ]
};
