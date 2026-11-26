/**
 * AWS IAM Condition Evaluator
 * Supports: StringEquals, StringNotEquals, StringEqualsIgnoreCase, StringLike,
 *           ArnEquals, ArnLike, Bool, IpAddress, NotIpAddress,
 *           NumericLessThanEquals, NumericEquals, NumericGreaterThan,
 *           ForAllValues:StringEquals, ForAnyValue:StringEquals
 */

import { matchPattern, interpolateVariables } from './matcher';

export interface ConditionResult {
  passed: boolean;
  failedOperator?: string;
  failedKey?: string;
  expected?: unknown;
  actual?: unknown;
  reason?: string;
}

export function evaluateConditionBlock(
  conditionBlock: Record<string, Record<string, string | string[] | boolean | number>> | undefined,
  context: Record<string, string | boolean | number | string[] | undefined>
): ConditionResult {
  if (!conditionBlock || Object.keys(conditionBlock).length === 0) {
    return { passed: true };
  }

  for (const [rawOperator, keyMap] of Object.entries(conditionBlock)) {
    const operator = rawOperator.trim();

    for (const [key, rawExpectedVal] of Object.entries(keyMap)) {
      const actualVal = context[key];

      let expectedVal = rawExpectedVal;
      if (typeof rawExpectedVal === 'string' && rawExpectedVal.includes('${')) {
        expectedVal = interpolateVariables(rawExpectedVal, context as Record<string, string | boolean | number>);
      } else if (Array.isArray(rawExpectedVal)) {
        expectedVal = rawExpectedVal.map(item =>
          typeof item === 'string' && item.includes('${')
            ? interpolateVariables(item, context as Record<string, string | boolean | number>)
            : item
        );
      }

      const check = evaluateSingleCondition(operator, expectedVal, actualVal);
      if (!check.passed) {
        return {
          passed: false,
          failedOperator: operator,
          failedKey: key,
          expected: expectedVal,
          actual: actualVal,
          reason: check.reason,
        };
      }
    }
  }

  return { passed: true };
}

function evaluateSingleCondition(
  operator: string,
  expected: string | string[] | boolean | number,
  actual: unknown
): { passed: boolean; reason?: string } {
  // Set operators: ForAllValues:... or ForAnyValue:...
  if (operator.startsWith('ForAllValues:')) {
    const baseOp = operator.substring('ForAllValues:'.length);
    const expectedArr = Array.isArray(expected) ? expected.map(String) : [String(expected)];
    const actualArr = Array.isArray(actual) ? actual.map(String) : actual !== undefined ? [String(actual)] : [];

    // ForAllValues: EVERY value in the request must match at least one value in the policy condition
    const allPass = actualArr.every(act =>
      expectedArr.some(exp => evaluateBase(baseOp, exp, act))
    );
    return {
      passed: allPass,
      reason: allPass ? undefined : `ForAllValues:${baseOp} failed: some values in [${actualArr.join(', ')}] not satisfied by [${expectedArr.join(', ')}]`,
    };
  }

  if (operator.startsWith('ForAnyValue:')) {
    const baseOp = operator.substring('ForAnyValue:'.length);
    const expectedArr = Array.isArray(expected) ? expected.map(String) : [String(expected)];
    const actualArr = Array.isArray(actual) ? actual.map(String) : actual !== undefined ? [String(actual)] : [];

    // ForAnyValue: AT LEAST ONE value in the request must match at least one in the policy condition
    const anyPass = actualArr.some(act =>
      expectedArr.some(exp => evaluateBase(baseOp, exp, act))
    );
    return {
      passed: anyPass,
      reason: anyPass ? undefined : `ForAnyValue:${baseOp} failed: no value in [${actualArr.join(', ')}] matched [${expectedArr.join(', ')}]`,
    };
  }

  // Standard operators
  const expectedList = Array.isArray(expected) ? expected : [expected];

  // If actual is undefined, standard conditions fail
  if (actual === undefined || actual === null) {
    return { passed: false, reason: `Context key is missing or undefined` };
  }

  // AWS rules: positive multi-value conditions use OR logic; negated operators (StringNotEquals, NotIpAddress)
  // require EVERY listed value not to match (AND logic).
  const normOp = operator.toLowerCase();
  const isNegated = normOp === 'stringnotequals' || normOp === 'notipaddress';
  const passed = isNegated
    ? expectedList.every(exp => evaluateBase(operator, exp, actual))
    : expectedList.some(exp => evaluateBase(operator, exp, actual));
  return {
    passed,
    reason: passed ? undefined : `Condition ${operator} failed: actual '${actual}' does not match expected '${JSON.stringify(expected)}'`,
  };
}

function evaluateBase(
  operator: string,
  expected: string | boolean | number,
  actual: unknown
): boolean {
  const normOp = operator.toLowerCase();

  switch (normOp) {
    case 'stringequals':
      return String(actual) === String(expected);

    case 'stringnotequals':
      return String(actual) !== String(expected);

    case 'stringequalsignorecase':
      return String(actual).toLowerCase() === String(expected).toLowerCase();

    case 'stringlike':
      return matchPattern(String(expected), String(actual), false);

    case 'arnequals':
      return String(actual).trim() === String(expected).trim();

    case 'arnlike':
      return matchPattern(String(expected), String(actual), true);

    case 'bool':
      return String(actual).toLowerCase() === String(expected).toLowerCase();

    case 'numericlessthanequals':
      return Number(actual) <= Number(expected);

    case 'numericequals':
      return Number(actual) === Number(expected);

    case 'numericgreaterthan':
      return Number(actual) > Number(expected);

    case 'ipaddress':
      return checkIp(String(expected), String(actual));

    case 'notipaddress':
      return !checkIp(String(expected), String(actual));

    default:
      // Unknown operator, fallback to string equality
      return String(actual) === String(expected);
  }
}

function parseIpv4(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = ((value << 8) | octet) >>> 0;
  }
  return value;
}

function checkIp(cidrOrIp: string, actualIp: string): boolean {
  const actualNum = parseIpv4(actualIp);
  if (actualNum === null) return false;

  if (cidrOrIp.includes('/')) {
    const parts = cidrOrIp.split('/');
    if (parts.length !== 2) return false;
    const [prefix, bitsStr] = parts;
    if (!/^\d+$/.test(bitsStr)) return false;
    const bits = Number(bitsStr);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;

    const prefixNum = parseIpv4(prefix);
    if (prefixNum === null) return false;

    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (actualNum & mask) === (prefixNum & mask);
  }

  const expectedNum = parseIpv4(cidrOrIp);
  return expectedNum !== null && actualNum === expectedNum;
}
