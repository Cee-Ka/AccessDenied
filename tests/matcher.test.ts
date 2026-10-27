import { describe, it, expect } from 'vitest';
import { matchAction, matchResource, matchPrincipal, interpolateVariables } from '../src/engine/matcher';

describe('IAM Matcher', () => {
  it('matches actions with wildcards and case-insensitivity', () => {
    expect(matchAction('s3:*', 's3:GetObject')).toBe(true);
    expect(matchAction('s3:*', 'S3:PUTOBJECT')).toBe(true);
    expect(matchAction(['s3:Get*', 's3:List*'], 's3:GetObject')).toBe(true);
    expect(matchAction('s3:Get*', 'dynamodb:GetItem')).toBe(false);
    expect(matchAction('*', 'iam:PassRole')).toBe(true);
  });

  it('matches resources with wildcards', () => {
    expect(matchResource('arn:aws:s3:::my-bucket/*', 'arn:aws:s3:::my-bucket/invoices/1.pdf')).toBe(true);
    expect(matchResource('arn:aws:s3:::my-bucket/*', 'arn:aws:s3:::other-bucket/file')).toBe(false);
    expect(matchResource('*', 'arn:aws:kms:us-east-1:123456789012:key/123')).toBe(true);
  });

  it('matches principals properly', () => {
    expect(matchPrincipal('*', 'arn:aws:iam::123456789012:role/Worker')).toBe(true);
    expect(matchPrincipal({ AWS: '*' }, 'arn:aws:iam::123456789012:user/Alice')).toBe(true);
    expect(matchPrincipal({ AWS: 'arn:aws:iam::123456789012:root' }, 'arn:aws:iam::123456789012:root')).toBe(true);
    expect(matchPrincipal({ AWS: 'arn:aws:iam::123456789012:role/AppRole' }, 'arn:aws:iam::123456789012:role/AppRole')).toBe(true);
    expect(matchPrincipal({ AWS: 'arn:aws:iam::123456789012:role/AppRole' }, 'arn:aws:iam::999999999999:role/BadRole')).toBe(false);
  });

  it('interpolates context variables', () => {
    const template = 'arn:aws:s3:::tenants/${tenantId}/*';
    expect(interpolateVariables(template, { tenantId: 'acme-corp' })).toBe('arn:aws:s3:::tenants/acme-corp/*');
  });
});
