import { describe, it, expect } from 'vitest';
import { evaluateRequest } from '../src/engine/evaluator';
import { CloudNodeData, SimulationPacket } from '../src/types/engine';

describe('IAM Evaluation Pipeline', () => {
  const ec2Node: CloudNodeData = {
    id: 'ec2-1',
    type: 'ec2',
    label: 'Web Server',
    arn: 'arn:aws:iam::111122223333:role/WebServerRole',
    accountId: '111122223333',
    monthlyCost: 15,
    config: {},
    identityPolicies: [
      {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowS3Invoices',
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject'],
            Resource: 'arn:aws:s3:::company-invoices/*'
          }
        ]
      }
    ]
  };

  const s3Node: CloudNodeData = {
    id: 's3-1',
    type: 's3',
    label: 'Company Invoices',
    arn: 'arn:aws:s3:::company-invoices',
    accountId: '111122223333',
    monthlyCost: 5,
    config: { blockPublicAccess: true },
    identityPolicies: []
  };

  it('allows request when identity policy grants Allow in same account', () => {
    const packet: SimulationPacket = {
      id: 'p-1',
      name: 'Fetch Invoice',
      kind: 'legitimate',
      sourceNodeId: 'ec2-1',
      targetNodeId: 's3-1',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::company-invoices/2026/01.pdf',
      context: {},
      expectedOutcome: 'ALLOW',
      description: 'Fetch monthly invoice'
    };

    const res = evaluateRequest(packet, [ec2Node, s3Node]);
    expect(res.outcome).toBe('ALLOW');
    expect(res.success).toBe(true);
  });

  it('explicit deny in identity policy overrides allow', () => {
    const deniedEc2: CloudNodeData = {
      ...ec2Node,
      identityPolicies: [
        ...ec2Node.identityPolicies,
        {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'DenyDelete',
              Effect: 'Deny',
              Action: 's3:GetObject',
              Resource: '*'
            }
          ]
        }
      ]
    };

    const packet: SimulationPacket = {
      id: 'p-2',
      name: 'Fetch Invoice',
      kind: 'legitimate',
      sourceNodeId: 'ec2-1',
      targetNodeId: 's3-1',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::company-invoices/2026/01.pdf',
      context: {},
      expectedOutcome: 'DENY',
      description: 'Fetch monthly invoice'
    };

    const res = evaluateRequest(packet, [deniedEc2, s3Node]);
    expect(res.outcome).toBe('DENY');
    expect(res.failureReason).toContain('Explicit Deny');
  });

  it('enforces permission boundary clipping', () => {
    const boundedEc2: CloudNodeData = {
      ...ec2Node,
      permissionBoundary: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'OnlyDynamoDBAllowedInBoundary',
            Effect: 'Allow',
            Action: 'dynamodb:*',
            Resource: '*'
          }
        ]
      }
    };

    const packet: SimulationPacket = {
      id: 'p-3',
      name: 'Fetch Invoice',
      kind: 'legitimate',
      sourceNodeId: 'ec2-1',
      targetNodeId: 's3-1',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::company-invoices/2026/01.pdf',
      context: {},
      expectedOutcome: 'DENY',
      description: 'Fetch monthly invoice'
    };

    const res = evaluateRequest(packet, [boundedEc2, s3Node]);
    expect(res.outcome).toBe('DENY');
    expect(res.failureReason).toContain('Permission Boundary');
  });

  it('requires cross-account resource policy allow when accounts differ', () => {
    const crossAccountS3: CloudNodeData = {
      ...s3Node,
      accountId: '999988887777', // Different account!
      resourcePolicy: undefined // No bucket policy granting cross-account trust
    };

    const packet: SimulationPacket = {
      id: 'p-4',
      name: 'Cross Account Read',
      kind: 'legitimate',
      sourceNodeId: 'ec2-1',
      targetNodeId: 's3-1',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::company-invoices/doc.pdf',
      context: {},
      expectedOutcome: 'DENY',
      description: 'Read from partner bucket'
    };

    const res = evaluateRequest(packet, [ec2Node, crossAccountS3]);
    expect(res.outcome).toBe('DENY');
    expect(res.failureReason).toContain('Cross-Account');

    // Now attach bucket policy trusting Account A
    const trustedCrossAccountS3: CloudNodeData = {
      ...crossAccountS3,
      resourcePolicy: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'TrustAccountA',
            Effect: 'Allow',
            Principal: { AWS: 'arn:aws:iam::111122223333:role/WebServerRole' },
            Action: 's3:GetObject',
            Resource: 'arn:aws:s3:::company-invoices/*'
          }
        ]
      }
    };

    const res2 = evaluateRequest(packet, [ec2Node, trustedCrossAccountS3]);
    expect(res2.outcome).toBe('ALLOW');
  });

  it('fails KMS Customer Managed Key access if root delegation is missing', () => {
    const kmsKey: CloudNodeData = {
      id: 'kms-1',
      type: 'kms',
      label: 'Database CMK',
      arn: 'arn:aws:kms:us-east-1:111122223333:key/cmk-123',
      accountId: '111122223333',
      monthlyCost: 1,
      config: {},
      identityPolicies: [],
      resourcePolicy: {
        Version: '2012-10-17',
        Statement: [] // Missing root delegation statement!
      }
    };

    const caller: CloudNodeData = {
      id: 'lambda-1',
      type: 'lambda',
      label: 'DB Worker',
      arn: 'arn:aws:iam::111122223333:role/WorkerRole',
      accountId: '111122223333',
      monthlyCost: 5,
      config: {},
      identityPolicies: [
        {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: 'kms:Decrypt',
              Resource: '*'
            }
          ]
        }
      ]
    };

    const packet: SimulationPacket = {
      id: 'p-5',
      name: 'Decrypt DB Secret',
      kind: 'legitimate',
      sourceNodeId: 'lambda-1',
      targetNodeId: 'kms-1',
      action: 'kms:Decrypt',
      resourceArn: 'arn:aws:kms:us-east-1:111122223333:key/cmk-123',
      context: {},
      expectedOutcome: 'DENY',
      description: 'Decrypt secret payload'
    };

    const res = evaluateRequest(packet, [caller, kmsKey]);
    expect(res.outcome).toBe('DENY');
    expect(res.failureReason).toContain('KMS Key Policy missing root delegation');
  });
});
