#!/usr/bin/env node

/**
 * AccessDenied IAM Policy Engine & Validator MCP Server
 * Conforms to Model Context Protocol (MCP) 2024-11-05 specification over Stdio.
 */

const readline = require('readline');

function matchPattern(pattern, text) {
  if (pattern === '*') return true;
  const regexPattern = '^' + pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.') + '$';
  return new RegExp(regexPattern, 'i').test(text);
}

function matchesAny(patterns, text) {
  const arr = Array.isArray(patterns) ? patterns : [patterns];
  return arr.some(p => matchPattern(p, text));
}

function validatePolicy(policyJson) {
  let parsed;
  try {
    parsed = typeof policyJson === 'string' ? JSON.parse(policyJson) : policyJson;
  } catch (err) {
    return { valid: false, errors: [`JSON Parse Error: ${err.message}`], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Policy must be a JSON object'], warnings: [] };
  }

  if (parsed.Version && parsed.Version !== '2012-10-17') {
    warnings.push(`Expected Version "2012-10-17", received "${parsed.Version}"`);
  }

  if (!Array.isArray(parsed.Statement)) {
    errors.push('Policy must contain a "Statement" array');
    return { valid: false, errors, warnings };
  }

  parsed.Statement.forEach((stmt, idx) => {
    const id = stmt.Sid ? `Statement[${idx}] ('${stmt.Sid}')` : `Statement[${idx}]`;

    if (stmt.Effect !== 'Allow' && stmt.Effect !== 'Deny') {
      errors.push(`${id}: Effect must be either "Allow" or "Deny" (received: "${stmt.Effect}")`);
    }

    if (!stmt.Action) {
      errors.push(`${id}: Missing required field "Action"`);
    } else {
      const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
      if (actions.includes('*')) {
        warnings.push(`${id}: Over-permissive wildcard "Action": "*" violates least privilege.`);
      }
    }

    if (!stmt.Resource) {
      errors.push(`${id}: Missing required field "Resource"`);
    } else {
      const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];
      if (resources.includes('*') && stmt.Effect === 'Allow') {
        warnings.push(`${id}: Wildcard "Resource": "*" grants access to all resources in account.`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    statementCount: parsed.Statement.length
  };
}

function simulateAccess(action, resourceArn, policies, context = {}) {
  const traces = [];
  let explicitDeny = false;
  let explicitAllow = false;
  let blockingStatement = null;

  const parsedPolicies = (Array.isArray(policies) ? policies : [policies]).map(p => {
    return typeof p === 'string' ? JSON.parse(p) : p;
  });

  // Step 1: Explicit Deny Sweep
  for (const pol of parsedPolicies) {
    if (!pol?.Statement) continue;
    for (const stmt of pol.Statement) {
      if (stmt.Effect === 'Deny') {
        const actionMatch = matchesAny(stmt.Action, action);
        const resourceMatch = matchesAny(stmt.Resource, resourceArn);
        if (actionMatch && resourceMatch) {
          explicitDeny = true;
          blockingStatement = stmt;
          traces.push({
            stage: 'EXPLICIT_DENY',
            status: 'DENIED',
            summary: `Explicit Deny matched action '${action}' and resource '${resourceArn}' in statement '${stmt.Sid || 'unnamed'}'`
          });
          break;
        }
      }
    }
    if (explicitDeny) break;
  }

  if (explicitDeny) {
    return {
      decision: 'DENIED',
      reason: 'EXPLICIT_DENY',
      blockingStatement,
      traces
    };
  }

  // Step 2: Allow Check
  for (const pol of parsedPolicies) {
    if (!pol?.Statement) continue;
    for (const stmt of pol.Statement) {
      if (stmt.Effect === 'Allow') {
        const actionMatch = matchesAny(stmt.Action, action);
        const resourceMatch = matchesAny(stmt.Resource, resourceArn);
        if (actionMatch && resourceMatch) {
          // Check conditions if present
          let conditionPassed = true;
          if (stmt.Condition) {
            for (const [operator, condBlock] of Object.entries(stmt.Condition)) {
              if (operator === 'StringEquals') {
                for (const [key, expectedVal] of Object.entries(condBlock)) {
                  const actualVal = context[key];
                  if (String(actualVal) !== String(expectedVal)) {
                    conditionPassed = false;
                    traces.push({
                      stage: 'CONDITION',
                      status: 'FAIL',
                      summary: `Condition StringEquals failed for key '${key}'. Expected '${expectedVal}', got '${actualVal}'`
                    });
                  }
                }
              }
            }
          }

          if (conditionPassed) {
            explicitAllow = true;
            traces.push({
              stage: 'IDENTITY_OR_RESOURCE_ALLOW',
              status: 'PASS',
              summary: `Allowed by statement '${stmt.Sid || 'unnamed'}'`
            });
            break;
          }
        }
      }
    }
    if (explicitAllow) break;
  }

  if (explicitAllow) {
    return { decision: 'ALLOWED', reason: 'EXPLICIT_ALLOW', traces };
  }

  traces.push({
    stage: 'IMPLICIT_DENY',
    status: 'DENIED',
    summary: `Default implicit deny: no statement granted allow for action '${action}' on '${resourceArn}'`
  });

  return { decision: 'DENIED', reason: 'IMPLICIT_DENY', traces };
}

// Stdio JSON-RPC 2.0 Server Loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id, result, error = null) {
  const payload = { jsonrpc: '2.0', id };
  if (error) {
    payload.error = error;
  } else {
    payload.result = result;
  }
  process.stdout.write(JSON.stringify(payload) + '\n');
}

rl.on('line', line => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    sendResponse(null, null, { code: -32700, message: 'Parse error' });
    return;
  }

  const { id, method, params } = request;

  if (method === 'initialize') {
    sendResponse(id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: 'iam-policy-engine',
        version: '1.0.0'
      }
    });
  } else if (method === 'notifications/initialized') {
    // No-op notification
  } else if (method === 'tools/list') {
    sendResponse(id, {
      tools: [
        {
          name: 'validate_iam_policy',
          description: 'Validates an AWS IAM policy JSON string, verifies syntax, Statement array, Effect, and identifies over-permissive wildcards.',
          inputSchema: {
            type: 'object',
            properties: {
              policyJson: {
                type: 'string',
                description: 'The raw JSON string of the IAM PolicyDocument'
              }
            },
            required: ['policyJson']
          }
        },
        {
          name: 'simulate_iam_access',
          description: 'Deterministically evaluates whether an AWS IAM action is ALLOWED or DENIED against policy documents and context.',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'AWS IAM Action (e.g. s3:GetObject, dynamodb:PutItem)' },
              resourceArn: { type: 'string', description: 'Target Resource ARN' },
              policies: { type: 'string', description: 'JSON array or string of PolicyDocuments' },
              context: { type: 'object', description: 'Request context dictionary (optional)' }
            },
            required: ['action', 'resourceArn', 'policies']
          }
        }
      ]
    });
  } else if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    try {
      if (name === 'validate_iam_policy') {
        const result = validatePolicy(args.policyJson);
        sendResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        });
      } else if (name === 'simulate_iam_access') {
        let policies = args.policies;
        if (typeof policies === 'string') {
          try { policies = JSON.parse(policies); } catch (e) { policies = [policies]; }
        }
        const result = simulateAccess(args.action, args.resourceArn, policies, args.context || {});
        sendResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        });
      } else {
        sendResponse(id, null, { code: -32601, message: `Tool not found: ${name}` });
      }
    } catch (err) {
      sendResponse(id, null, { code: -32603, message: `Internal error: ${err.message}` });
    }
  } else if (id !== undefined) {
    sendResponse(id, null, { code: -32601, message: `Method not found: ${method}` });
  }
});
