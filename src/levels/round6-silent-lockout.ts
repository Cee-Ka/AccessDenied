import { GameLevel } from '../types/engine';

export const round6SilentLockout: GameLevel = {
  id: 'round-6',
  roundNumber: 6,
  title: 'The Silent Lockout',
  subtitle: 'KMS Key Policies & Encryption Delegation',
  category: 'Learn',
  storyBrief:
    'A backend service encrypts sensitive payment tokens using a custom KMS Customer Managed Key (CMK). The developer granted "kms:Decrypt" in the Lambda\'s IAM role, but every request fails with a mysterious 403 AccessDenied error!',
  threatIntel:
    'AWS KMS Customer Managed Keys do NOT allow IAM policies to delegate access unless the Key Policy itself explicitly grants permissions to the account root ("arn:aws:iam::ACCOUNT:root"). You must establish proper key delegation while preventing cross-service unauthorized decryption.',
  targetBudget: 15,
  criteria: {
    star1Functional: {
      workloadPassRateTarget: 1.0,
      description: 'Backend Lambda successfully decrypts payment tokens (200 OK).'
    },
    star2Secure: {
      exploitsBlockedTarget: 1.0,
      noWildcardAdmin: true,
      description: 'Rogue worker without kms:Decrypt cannot decrypt payment tokens.'
    },
    star3Optimal: {
      budgetLimit: 15,
      leastPrivilege: true,
      description: 'KMS CMK Key Policy has account root delegation and scoped kms:Decrypt action.'
    }
  },
  hints: [
    {
      level: 'nudge',
      title: 'Inspect the KMS Key Policy',
      content: 'Click the KMS CMK node and inspect its Resource Policy. Does it contain an Allow statement for the account root?'
    },
    {
      level: 'root_cause',
      title: 'Missing Root Delegation in Key Policy',
      content: 'Unlike other AWS resources, KMS CMK policies are primary. If the Key Policy does not contain `"Principal": {"AWS": "arn:aws:iam::111122223333:root"}`, IAM identity policies have zero effect.'
    },
    {
      level: 'solution_diff',
      title: 'Target KMS Key Policy',
      content: `Add the root delegation statement to the KMS Key Policy:
{
  "Sid": "EnableIAMUserPermissions",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
  "Action": "kms:*",
  "Resource": "*"
}`
    }
  ],
  initialNodes: [
    {
      id: 'payment-lambda',
      type: 'lambda',
      position: { x: 120, y: 160 },
      data: {
        id: 'payment-lambda',
        type: 'lambda',
        label: 'Payment Processor Lambda',
        arn: 'arn:aws:iam::111122223333:role/PaymentProcessorRole',
        accountId: '111122223333',
        monthlyCost: 5,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'DecryptTokens',
                Effect: 'Allow',
                Action: 'kms:Decrypt',
                Resource: 'arn:aws:kms:us-east-1:111122223333:key/cmk-payments'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'rogue-worker',
      type: 'lambda',
      position: { x: 120, y: 340 },
      data: {
        id: 'rogue-worker',
        type: 'lambda',
        label: 'Unprivileged Worker',
        arn: 'arn:aws:iam::111122223333:role/UnprivilegedWorkerRole',
        accountId: '111122223333',
        monthlyCost: 5,
        config: {},
        identityPolicies: []
      }
    },
    {
      id: 'payment-cmk',
      type: 'kms',
      position: { x: 580, y: 240 },
      data: {
        id: 'payment-cmk',
        type: 'kms',
        label: 'Payments CMK Key',
        arn: 'arn:aws:kms:us-east-1:111122223333:key/cmk-payments',
        accountId: '111122223333',
        monthlyCost: 1,
        config: {},
        identityPolicies: [],
        resourcePolicy: {
          Version: '2012-10-17',
          Statement: [
            // EMPTY Statement array: missing root delegation!
          ]
        }
      }
    }
  ],
  initialEdges: [
    { id: 'e-pay-cmk', source: 'payment-lambda', target: 'payment-cmk', label: 'kms:Decrypt' },
    { id: 'e-rogue-cmk', source: 'rogue-worker', target: 'payment-cmk', label: 'kms:Decrypt Probe' }
  ],
  packets: [
    {
      id: 'pkt-6-legit-decrypt',
      name: 'Decrypt Credit Card Token',
      kind: 'legitimate',
      sourceNodeId: 'payment-lambda',
      targetNodeId: 'payment-cmk',
      action: 'kms:Decrypt',
      resourceArn: 'arn:aws:kms:us-east-1:111122223333:key/cmk-payments',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/PaymentProcessorRole' },
      expectedOutcome: 'ALLOW',
      description: 'Authorized payment service decrypting customer charge token'
    },
    {
      id: 'pkt-6-exploit-rogue',
      name: 'Unprivileged Decryption Probe',
      kind: 'exploit',
      sourceNodeId: 'rogue-worker',
      targetNodeId: 'payment-cmk',
      action: 'kms:Decrypt',
      resourceArn: 'arn:aws:kms:us-east-1:111122223333:key/cmk-payments',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::111122223333:role/UnprivilegedWorkerRole' },
      expectedOutcome: 'DENY',
      description: 'Rogue worker without kms:Decrypt identity permission attempts decryption'
    }
  ]
};
