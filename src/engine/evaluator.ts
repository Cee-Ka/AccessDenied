/**
 * AWS IAM Policy Evaluation Pipeline
 * Implements the official AWS evaluation logic and returns a comprehensive trace log.
 */

import {
  CloudNodeData,
  EvaluationTraceStep,
  PolicyDocument,
  PolicyStatement,
  SimulationPacket,
  SimulationResult,
} from '../types/engine';
import { matchAction, matchPrincipal, matchResource } from './matcher';
import { evaluateConditionBlock } from './conditions';
import { evaluateNetworkPath } from './network';

export function evaluateRequest(
  packet: SimulationPacket,
  allNodes: CloudNodeData[]
): SimulationResult {
  const traces: EvaluationTraceStep[] = [];

  const sourceNode = allNodes.find(n => n.id === packet.sourceNodeId);
  const targetNode = allNodes.find(n => n.id === packet.targetNodeId);

  if (!sourceNode || !targetNode) {
    return {
      packetId: packet.id,
      success: false,
      outcome: 'DENY',
      failureReason: 'Source or target node not found in topology',
      traces: [{
        stage: 'NETWORK',
        status: 'FAIL',
        summary: `Invalid node reference: source=${packet.sourceNodeId}, target=${packet.targetNodeId}`
      }]
    };
  }

  // Phase A: Network Reachability Check
  const networkCheck = evaluateNetworkPath(
    sourceNode,
    targetNode,
    allNodes,
    packet.action,
    packet.resourceArn
  );
  traces.push(networkCheck.trace);

  if (!networkCheck.reachable) {
    return {
      packetId: packet.id,
      success: false,
      outcome: 'NETWORK_UNREACHABLE',
      failureReason: networkCheck.trace.summary,
      traces
    };
  }

  // Phase B: S3 Block Public Access Check (if targeting S3)
  if (targetNode.type === 's3' && targetNode.config?.blockPublicAccess) {
    if (sourceNode.type === 'external_vendor' || packet.context['aws:PrincipalIsPublic'] === true) {
      traces.push({
        stage: 'EXPLICIT_DENY',
        status: 'DENIED',
        summary: 'Blocked by S3 Block Public Access: Public/external anonymous requests are forbidden when Block Public Access is active.'
      });
      return {
        packetId: packet.id,
        success: false,
        outcome: 'DENY',
        failureReason: 'Blocked by S3 Block Public Access',
        traces
      };
    }
  }

  // Collect all relevant policies
  const identityPolicies = sourceNode.identityPolicies || [];
  const resourcePolicy = targetNode.resourcePolicy;
  const permissionBoundary = sourceNode.permissionBoundary;
  const scpPolicies = sourceNode.scpPolicies || [];

  const allPoliciesToAudit: { doc: PolicyDocument; type: string }[] = [];
  scpPolicies.forEach(p => allPoliciesToAudit.push({ doc: p, type: 'SCP' }));
  if (resourcePolicy) allPoliciesToAudit.push({ doc: resourcePolicy, type: 'Resource Policy' });
  identityPolicies.forEach(p => allPoliciesToAudit.push({ doc: p, type: 'Identity Policy' }));
  if (permissionBoundary) allPoliciesToAudit.push({ doc: permissionBoundary, type: 'Permission Boundary' });

  // Phase C - Step 2: Explicit Deny Sweep across ALL attached policies
  for (const item of allPoliciesToAudit) {
    for (const stmt of item.doc.Statement) {
      if (stmt.Effect === 'Deny') {
        const actionMatch = matchAction(stmt.Action, packet.action);
        const resourceMatch = matchResource(stmt.Resource, packet.resourceArn);

        // Check principal if statement specifies principal (resource policies / SCPs)
        let principalMatch = true;
        if (stmt.Principal) {
          principalMatch = matchPrincipal(stmt.Principal, sourceNode.arn);
        }

        if (actionMatch && resourceMatch && principalMatch) {
          const conditionCheck = evaluateConditionBlock(stmt.Condition, packet.context);
          if (conditionCheck.passed) {
            traces.push({
              stage: 'EXPLICIT_DENY',
              status: 'DENIED',
              summary: `Explicit Deny triggered by ${item.type} statement '${stmt.Sid || 'unnamed'}'. An explicit deny overrides all allows.`,
              matchedStatement: stmt,
              blockingPolicyType: item.type
            });
            return {
              packetId: packet.id,
              success: false,
              outcome: 'DENY',
              failureReason: `Explicit Deny in ${item.type} statement '${stmt.Sid || 'unnamed'}'`,
              traces
            };
          }
        }
      }
    }
  }

  traces.push({
    stage: 'EXPLICIT_DENY',
    status: 'PASS',
    summary: 'No Explicit Deny statements encountered across attached policies.'
  });

  // Phase C - Step 3: Organizations SCP Check
  if (scpPolicies.length > 0) {
    let scpAllowed = false;
    for (const scp of scpPolicies) {
      for (const stmt of scp.Statement) {
        if (stmt.Effect === 'Allow') {
          if (matchAction(stmt.Action, packet.action) && matchResource(stmt.Resource, packet.resourceArn)) {
            const cond = evaluateConditionBlock(stmt.Condition, packet.context);
            if (cond.passed) {
              scpAllowed = true;
              break;
            }
          }
        }
      }
      if (!scpAllowed) break; // All SCPs in hierarchy must allow
    }

    if (!scpAllowed) {
      traces.push({
        stage: 'SCP',
        status: 'DENIED',
        summary: `Blocked by Organization Service Control Policy (SCP). The action '${packet.action}' is not whitelisted in all ancestor SCPs.`
      });
      return {
        packetId: packet.id,
        success: false,
        outcome: 'DENY',
        failureReason: 'Blocked by Organization SCP guardrail',
        traces
      };
    }

    traces.push({
      stage: 'SCP',
      status: 'PASS',
      summary: 'Action is permitted by Organization Service Control Policies (SCPs).'
    });
  } else {
    traces.push({
      stage: 'SCP',
      status: 'SKIPPED',
      summary: 'No SCPs attached to this account (FullAWSAccess inherited).'
    });
  }

  // Phase C - Step 4: Special KMS CMK Root Delegation Rule
  if (targetNode.type === 'kms') {
    let rootDelegated = false;
    if (resourcePolicy) {
      for (const stmt of resourcePolicy.Statement) {
        if (stmt.Effect === 'Allow') {
          const rootArn = `arn:aws:iam::${targetNode.accountId}:root`;
          if (matchPrincipal(stmt.Principal, rootArn) || matchPrincipal(stmt.Principal, '*')) {
            if (matchAction(stmt.Action, 'kms:*') || matchAction(stmt.Action, packet.action)) {
              rootDelegated = true;
              break;
            }
          }
        }
      }
    }

    if (!rootDelegated) {
      traces.push({
        stage: 'RESOURCE_POLICY',
        status: 'DENIED',
        summary: `KMS CMK Key Policy Lockout: Customer Managed Key '${targetNode.label}' does not delegate administration to root ('arn:aws:iam::${targetNode.accountId}:root'). Identity policies cannot grant access to this key.`
      });
      return {
        packetId: packet.id,
        success: false,
        outcome: 'DENY',
        failureReason: 'KMS Key Policy missing root delegation grant',
        traces
      };
    }
  }

  // Phase C - Step 5: Resource-Based Policy Check vs Identity-Based Policy Check
  const isSameAccount = sourceNode.accountId === targetNode.accountId;
  let resourceAllowed = false;
  let identityAllowed = false;
  let matchedResourceStmt: PolicyStatement | undefined;
  let matchedIdentityStmt: PolicyStatement | undefined;

  // Evaluate Resource Policy (e.g. S3 Bucket Policy, KMS Key Policy)
  if (resourcePolicy) {
    for (const stmt of resourcePolicy.Statement) {
      if (stmt.Effect === 'Allow') {
        const principalMatch = matchPrincipal(stmt.Principal, sourceNode.arn);
        const actionMatch = matchAction(stmt.Action, packet.action);
        const resourceMatch = matchResource(stmt.Resource, packet.resourceArn);

        if (principalMatch && actionMatch && resourceMatch) {
          const cond = evaluateConditionBlock(stmt.Condition, packet.context);
          if (cond.passed) {
            resourceAllowed = true;
            matchedResourceStmt = stmt;
            break;
          } else {
            traces.push({
              stage: 'CONDITION',
              status: 'FAIL',
              summary: `Resource policy statement '${stmt.Sid || 'Allow'}' condition failed: ${cond.reason || ''}`
            });
          }
        }
      }
    }
  }

  // Evaluate Identity Policies
  for (const pol of identityPolicies) {
    for (const stmt of pol.Statement) {
      if (stmt.Effect === 'Allow') {
        const actionMatch = matchAction(stmt.Action, packet.action);
        const resourceMatch = matchResource(stmt.Resource, packet.resourceArn);

        if (actionMatch && resourceMatch) {
          const cond = evaluateConditionBlock(stmt.Condition, packet.context);
          if (cond.passed) {
            identityAllowed = true;
            matchedIdentityStmt = stmt;
            break;
          } else {
            traces.push({
              stage: 'CONDITION',
              status: 'FAIL',
              summary: `Identity policy statement '${stmt.Sid || 'Allow'}' condition failed: ${cond.reason || ''}`
            });
          }
        }
      }
    }
    if (identityAllowed) break;
  }

  // Evaluate authorization based on Same-Account vs Cross-Account
  const isPublicResourceGrant =
    resourceAllowed &&
    (matchedResourceStmt?.Principal === '*' ||
      (typeof matchedResourceStmt?.Principal === 'object' &&
        'AWS' in matchedResourceStmt.Principal &&
        matchedResourceStmt.Principal.AWS === '*'));

  if (isSameAccount || isPublicResourceGrant) {
    if (resourceAllowed) {
      traces.push({
        stage: 'RESOURCE_POLICY',
        status: 'PASS',
        summary: isPublicResourceGrant
          ? `Public Access Granted: Resource-based policy statement '${matchedResourceStmt?.Sid || 'unnamed'}' grants access to all principals ('*').`
          : `Allowed by Resource-based Policy statement '${matchedResourceStmt?.Sid || 'unnamed'}'.`,
        matchedStatement: matchedResourceStmt
      });
    } else if (identityAllowed) {
      traces.push({
        stage: 'IDENTITY_POLICY',
        status: 'PASS',
        summary: `Allowed by Identity-based Policy statement '${matchedIdentityStmt?.Sid || 'unnamed'}'.`,
        matchedStatement: matchedIdentityStmt
      });
    } else {
      traces.push({
        stage: 'IDENTITY_POLICY',
        status: 'DENIED',
        summary: `Implicit Deny: Neither Identity-based policy nor Resource-based policy granted 'Allow' for action '${packet.action}' on '${packet.resourceArn}'.`
      });
      return {
        packetId: packet.id,
        success: false,
        outcome: 'DENY',
        failureReason: `Implicit Deny: No Allow statement found for action '${packet.action}'`,
        traces
      };
    }
  } else {
    // Cross-Account: BOTH Identity Policy in Source Account AND Resource/Trust Policy in Target Account must Allow
    if (!identityAllowed) {
      traces.push({
        stage: 'IDENTITY_POLICY',
        status: 'DENIED',
        summary: `Cross-Account Denied: Source principal '${sourceNode.label}' lacks an Identity Policy granting '${packet.action}' on target resource.`
      });
      return {
        packetId: packet.id,
        success: false,
        outcome: 'DENY',
        failureReason: 'Cross-Account request missing Identity Policy Allow',
        traces
      };
    }

    if (!resourceAllowed) {
      traces.push({
        stage: 'RESOURCE_POLICY',
        status: 'DENIED',
        summary: `Cross-Account Denied: Target resource '${targetNode.label}' in account '${targetNode.accountId}' does not trust caller '${sourceNode.arn}'. Target Resource Policy must explicitly allow external principal.`
      });
      return {
        packetId: packet.id,
        success: false,
        outcome: 'DENY',
        failureReason: 'Cross-Account request missing Resource Policy Allow',
        traces
      };
    }

    traces.push({
      stage: 'RESOURCE_POLICY',
      status: 'PASS',
      summary: `Cross-Account Allowed: Both Identity Policy on '${sourceNode.label}' and Resource Policy on '${targetNode.label}' grant Allow.`
    });
  }

  // Phase C - Step 6: Permission Boundary Check
  if (permissionBoundary) {
    let boundaryAllowed = false;
    for (const stmt of permissionBoundary.Statement) {
      if (stmt.Effect === 'Allow') {
        if (matchAction(stmt.Action, packet.action) && matchResource(stmt.Resource, packet.resourceArn)) {
          const cond = evaluateConditionBlock(stmt.Condition, packet.context);
          if (cond.passed) {
            boundaryAllowed = true;
            break;
          }
        }
      }
    }

    if (!boundaryAllowed) {
      traces.push({
        stage: 'PERMISSION_BOUNDARY',
        status: 'DENIED',
        summary: `Clipped by Permission Boundary: Action '${packet.action}' was granted by Identity Policy but is not allowed by the attached Permission Boundary.`
      });
      return {
        packetId: packet.id,
        success: false,
        outcome: 'DENY',
        failureReason: `Clipped by Permission Boundary on ${sourceNode.label}`,
        traces
      };
    }

    traces.push({
      stage: 'PERMISSION_BOUNDARY',
      status: 'PASS',
      summary: 'Action is within the attached Permission Boundary limits.'
    });
  }

  // All checks passed!
  return {
    packetId: packet.id,
    success: true,
    outcome: 'ALLOW',
    traces
  };
}
