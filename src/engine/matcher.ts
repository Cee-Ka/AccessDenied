/**
 * AWS IAM Glob Pattern Matcher & Variable Interpolator
 *
 * Implements AWS wildcard matching semantics:
 * - '*' matches 0 or more characters
 * - '?' matches exactly 1 character
 * - Action comparisons are case-insensitive ('s3:getobject' === 'S3:GetObject')
 * - Resource ARN comparisons are case-sensitive except for service/account/region prefixes
 */

export function matchPattern(pattern: string, text: string, caseSensitive: boolean = false): boolean {
  if (pattern === '*') return true;
  if (!pattern && !text) return true;
  if (!pattern || !text) return false;

  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const flags = caseSensitive ? '' : 'i';
  const regex = new RegExp(`^${escaped}$`, flags);
  return regex.test(text);
}

export function matchAction(pattern: string | string[], action: string): boolean {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  return patterns.some(p => matchPattern(p, action, false));
}

export function matchResource(pattern: string | string[] | undefined, resourceArn: string): boolean {
  if (!pattern) return true;
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  return patterns.some(p => matchPattern(p, resourceArn, true));
}

export function matchPrincipal(
  statementPrincipal: string | { AWS?: string | string[]; Service?: string | string[] } | Record<string, unknown> | undefined,
  requestPrincipalArn: string
): boolean {
  if (!statementPrincipal) return false;
  if (statementPrincipal === '*') return true;

  if (typeof statementPrincipal === 'string') {
    return matchPattern(statementPrincipal, requestPrincipalArn, true);
  }

  if (typeof statementPrincipal === 'object' && statementPrincipal !== null) {
    if ('AWS' in statementPrincipal) {
      const awsVal = (statementPrincipal as { AWS: string | string[] }).AWS;
      const awsList = Array.isArray(awsVal) ? awsVal : [awsVal];
      if (awsList.includes('*')) return true;
      return awsList.some(p => matchPattern(p, requestPrincipalArn, true));
    }
    if ('Service' in statementPrincipal) {
      const srvVal = (statementPrincipal as { Service: string | string[] }).Service;
      const srvList = Array.isArray(srvVal) ? srvVal : [srvVal];
      return srvList.some(s => matchPattern(s, requestPrincipalArn, false));
    }
  }

  return false;
}

export function interpolateVariables(template: string, context: Record<string, string | boolean | number>): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, key) => {
    return key in context ? String(context[key]) : `\${${key}}`;
  });
}
