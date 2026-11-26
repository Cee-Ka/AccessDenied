import { describe, it, expect } from 'vitest';
import { evaluateConditionBlock } from '../src/engine/conditions';

describe('IAM Condition Evaluator', () => {
  it('passes when condition block is empty or missing', () => {
    expect(evaluateConditionBlock(undefined, {}).passed).toBe(true);
    expect(evaluateConditionBlock({}, {}).passed).toBe(true);
  });

  it('evaluates StringEquals and StringNotEquals', () => {
    const block = {
      StringEquals: { 'sts:ExternalId': 'secret-123' },
    };
    expect(evaluateConditionBlock(block, { 'sts:ExternalId': 'secret-123' }).passed).toBe(true);
    expect(evaluateConditionBlock(block, { 'sts:ExternalId': 'wrong' }).passed).toBe(false);
  });

  it('evaluates Bool condition', () => {
    const block = {
      Bool: { 'aws:SecureTransport': 'true' },
    };
    expect(evaluateConditionBlock(block, { 'aws:SecureTransport': true }).passed).toBe(true);
    expect(evaluateConditionBlock(block, { 'aws:SecureTransport': false }).passed).toBe(false);
  });

  it('evaluates NumericLessThanEquals', () => {
    const block = {
      NumericLessThanEquals: { 'ec2:MetadataHttpPutResponseHopLimit': 1 },
    };
    expect(evaluateConditionBlock(block, { 'ec2:MetadataHttpPutResponseHopLimit': 1 }).passed).toBe(true);
    expect(evaluateConditionBlock(block, { 'ec2:MetadataHttpPutResponseHopLimit': 2 }).passed).toBe(false);
  });

  it('evaluates ForAllValues:StringEquals for fine-grained DynamoDB', () => {
    const block = {
      'ForAllValues:StringEquals': {
        'dynamodb:LeadingKeys': ['USER-123'],
      },
    };
    expect(evaluateConditionBlock(block, { 'dynamodb:LeadingKeys': ['USER-123'] }).passed).toBe(true);
    expect(evaluateConditionBlock(block, { 'dynamodb:LeadingKeys': ['USER-123', 'USER-456'] }).passed).toBe(false);
  });

  it('evaluates IpAddress CIDR ranges', () => {
    const block = {
      IpAddress: { 'aws:SourceIp': '192.168.1.0/24' },
    };
    expect(evaluateConditionBlock(block, { 'aws:SourceIp': '192.168.1.50' }).passed).toBe(true);
    expect(evaluateConditionBlock(block, { 'aws:SourceIp': '10.0.0.1' }).passed).toBe(false);
  });

  it('interpolates policy variables in condition values (e.g. ${aws:PrincipalTag/TenantId})', () => {
    const block = {
      'ForAllValues:StringEquals': {
        'dynamodb:LeadingKeys': ['${aws:PrincipalTag/TenantId}'],
      },
    };
    const matchingContext = {
      'aws:PrincipalTag/TenantId': 'TENANT#42',
      'dynamodb:LeadingKeys': ['TENANT#42'],
    };
    const mismatchContext = {
      'aws:PrincipalTag/TenantId': 'TENANT#42',
      'dynamodb:LeadingKeys': ['TENANT#99'],
    };
    expect(evaluateConditionBlock(block, matchingContext).passed).toBe(true);
    expect(evaluateConditionBlock(block, mismatchContext).passed).toBe(false);
  });

  it('interpolates string condition variables with fallback when key is missing in context', () => {
    const block = {
      StringEquals: {
        'dynamodb:LeadingKeys': '${aws:username}',
      },
    };
    expect(evaluateConditionBlock(block, { 'aws:username': 'alice', 'dynamodb:LeadingKeys': 'alice' }).passed).toBe(true);
    // Missing context key retains literal ${aws:username}
    expect(evaluateConditionBlock(block, { 'dynamodb:LeadingKeys': 'alice' }).passed).toBe(false);
  });

  it('requires ALL excluded values not to match for StringNotEquals and NotIpAddress arrays', () => {
    const regionBlock = {
      StringNotEquals: { 'aws:RequestedRegion': ['us-east-1', 'ap-southeast-1'] },
    };
    expect(evaluateConditionBlock(regionBlock, { 'aws:RequestedRegion': 'us-east-1' }).passed).toBe(false);
    expect(evaluateConditionBlock(regionBlock, { 'aws:RequestedRegion': 'ap-southeast-1' }).passed).toBe(false);
    expect(evaluateConditionBlock(regionBlock, { 'aws:RequestedRegion': 'eu-west-1' }).passed).toBe(true);

    const ipBlock = {
      NotIpAddress: { 'aws:SourceIp': ['10.0.0.0/8', '192.168.0.0/16'] },
    };
    expect(evaluateConditionBlock(ipBlock, { 'aws:SourceIp': '10.1.2.3' }).passed).toBe(false);
    expect(evaluateConditionBlock(ipBlock, { 'aws:SourceIp': '203.0.113.5' }).passed).toBe(true);
  });

  it('rejects malformed IPv4 addresses and invalid CIDR masks', () => {
    expect(evaluateConditionBlock({ IpAddress: { 'aws:SourceIp': '0.0.0.0/8' } }, { 'aws:SourceIp': 'garbage' }).passed).toBe(false);
    expect(evaluateConditionBlock({ IpAddress: { 'aws:SourceIp': '10.0.0.0/33' } }, { 'aws:SourceIp': '10.0.0.1' }).passed).toBe(false);
    expect(evaluateConditionBlock({ IpAddress: { 'aws:SourceIp': '999.0.0.1' } }, { 'aws:SourceIp': '999.0.0.1' }).passed).toBe(false);
  });
});
