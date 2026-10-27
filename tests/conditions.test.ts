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
});
