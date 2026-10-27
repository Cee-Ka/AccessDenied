import { GameLevel } from '../types/engine';

export const incidentCapitalOne: GameLevel = {
  id: 'incident-capital-one',
  roundNumber: 101,
  title: 'Incident 2019: The Capital SSRF Breach',
  subtitle: 'WAF Bypass, IMDS Metadata Extraction, and S3 Exfiltration',
  category: 'Incidents',
  storyBrief:
    'Modeled after the landmark 2019 cloud breach: A misconfigured open-source WAF running on an EC2 instance was tricked via SSRF into retrieving credentials from the EC2 instance metadata service (IMDSv1). The instance role had broad s3:ListBucket and s3:GetObject permissions across customer credit card application buckets.',
  threatIntel:
    'Adversary uses SSRF to dump temporary credentials from IMDSv1, then invokes S3 ListBuckets and Sync to dump 100M+ customer records. You must upgrade to IMDSv2, scope the WAF role strictly, and place S3 behind PrivateLink or endpoint policies.',
  targetBudget: 35,
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'WAF can inspect legitimate web ingress traffic and write security logs (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'SSRF token theft attempts on IMDS fail and customer vault remains uncompromised.'
    },
    star3Optimal: {
      budgetLimit: 35,
      leastPrivilege: true,
      description: 'IMDSv2 enforced, hop limit set to 1, and credit applications bucket locked down.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Harden EC2 Instance Metadata Service',
      content: 'IMDSv1 permits simple HTTP GET requests without token headers. Enforce IMDSv2 with hop limit 1 on the WAF EC2 instance.'
    },
    {
      level: 'root_cause',
      title: 'Over-Permissive WAF Role',
      content: 'A WAF needs to log traffic; it should never have `s3:*` on customer credit application archives.'
    },
    {
      level: 'solution_diff',
      title: 'Target Hardening',
      content: 'Set WAF EC2 config to imdsVersion: "v2", hop limit: 1. Remove s3:* and grant only s3:PutObject on security-waf-logs bucket.'
    }
  ],
  initialNodes: [
    {
      id: 'waf-ec2',
      type: 'ec2',
      position: { x: 220, y: 200 },
      data: {
        id: 'waf-ec2',
        type: 'ec2',
        label: 'ModSecurity WAF Proxy',
        arn: 'arn:aws:iam::111122223333:role/WAFProxyRole',
        accountId: '111122223333',
        monthlyCost: 15,
        config: {
          imdsVersion: 'v1',
          imdsHopLimit: 2
        },
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'OverPermissiveS3Sync',
                Effect: 'Allow',
                Action: ['s3:ListAllMyBuckets', 's3:ListBucket', 's3:GetObject', 's3:PutObject'],
                Resource: '*'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'customer-credit-s3',
      type: 's3',
      position: { x: 620, y: 140 },
      data: {
        id: 'customer-credit-s3',
        type: 's3',
        label: 'cust-credit-applications-vault',
        arn: 'arn:aws:s3:::cust-credit-applications-vault',
        accountId: '111122223333',
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: []
      }
    },
    {
      id: 'waf-logs-s3',
      type: 's3',
      position: { x: 620, y: 320 },
      data: {
        id: 'waf-logs-s3',
        type: 's3',
        label: 'security-waf-logs',
        arn: 'arn:aws:s3:::security-waf-logs',
        accountId: '111122223333',
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: []
      }
    }
  ],
  initialEdges: [
    { id: 'e-waf-credit', source: 'waf-ec2', target: 'customer-credit-s3', label: 'Overbroad Read' },
    { id: 'e-waf-logs', source: 'waf-ec2', target: 'waf-logs-s3', label: 'Write Logs' }
  ],
  packets: [
    {
      id: 'pkt-cap-legit-log',
      name: 'Write Ingress WAF Audit Log',
      kind: 'legitimate',
      sourceNodeId: 'waf-ec2',
      targetNodeId: 'waf-logs-s3',
      action: 's3:PutObject',
      resourceArn: 'arn:aws:s3:::security-waf-logs/2019/traffic.log',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/WAFProxyRole' },
      expectedOutcome: 'ALLOW',
      description: 'WAF forwards parsed request header log'
    },
    {
      id: 'pkt-cap-ssrf-imds',
      name: 'IMDSv1 SSRF Exfiltration Payload',
      kind: 'exploit',
      sourceNodeId: 'waf-ec2',
      targetNodeId: 'waf-ec2',
      action: 'ec2:GetMetadataToken/ssrf',
      resourceArn: 'arn:aws:ec2:us-east-1:111122223333:instance/i-waf',
      context: { 'aws:PrincipalIsPublic': true },
      expectedOutcome: 'DENY',
      description: 'Attacker queries 169.254.169.254 through SSRF in proxy URL parser'
    }
  ]
};
