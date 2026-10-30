/**
 * Network Reachability & Routing Solver
 *
 * Verifies whether packets can physically traverse the network topology:
 * 1. Ingress: Public vs Private Subnet (external actors cannot directly reach private subnets)
 * 2. Egress: Private compute reaching AWS service endpoints (requires NAT Gateway or VPC Endpoint)
 * 3. VPC Endpoint Policies: Validates endpoint policy allow/deny
 */

import { CloudNodeData, EvaluationTraceStep } from '../types/engine';
import { matchAction, matchResource } from './matcher';

export interface NetworkPathResult {
  reachable: boolean;
  reason: string;
  trace: EvaluationTraceStep;
  egressMethod?: 'direct_internet' | 'nat_gateway' | 'vpc_gateway_endpoint' | 'vpc_interface_endpoint';
}

export function evaluateNetworkPath(
  sourceNode: CloudNodeData,
  targetNode: CloudNodeData,
  allNodes: CloudNodeData[],
  action: string,
  resourceArn: string,
  edges?: Array<{ source: string; target: string }>
): NetworkPathResult {
  // If target is in a private subnet, check if source is external or public
  const targetInPrivate = targetNode.config?.inPrivateSubnet ?? false;
  const sourceIsExternal = sourceNode.type === 'external_vendor' || sourceNode.type === 'iam_user';

  // Rule 0: Canvas Edge Connectivity Check (for non-external actors)
  // Edges are directed: an edge means "source calls target".
  if (edges !== undefined) {
    const hasDirectEdge = edges.some(e => e.source === sourceNode.id && e.target === targetNode.id);
    const hasIntermediate = edges.some(
      e => e.source === sourceNode.id && allNodes.some(m => m.id === e.target && ['nat_gw', 'vpc_endpoint', 'iam_role'].includes(m.type))
    );
    const hasReverseEdge = edges.some(e => e.source === targetNode.id && e.target === sourceNode.id);

    if (!hasDirectEdge && !hasIntermediate && hasReverseEdge && sourceNode.type !== 'external_vendor') {
      return {
        reachable: false,
        reason: 'EDGE_REVERSED',
        trace: {
          stage: 'NETWORK',
          status: 'DENIED',
          summary: `Wrong Direction: The connection points from '${targetNode.label}' to '${sourceNode.label}', but '${sourceNode.label}' is the caller. Select the arrow and choose "Reverse direction" so it points at '${targetNode.label}'.`
        }
      };
    }

    if (!hasDirectEdge && !hasIntermediate && sourceNode.type !== 'external_vendor') {
      return {
        reachable: false,
        reason: 'NO_EDGE_CONNECTED',
        trace: {
          stage: 'NETWORK',
          status: 'DENIED',
          summary: `Network Disconnected: '${sourceNode.label}' is not connected to '${targetNode.label}'. Wire an edge between their ports on the canvas!`
        }
      };
    }
  }

  // Rule 1: Ingress Check
  if (targetInPrivate && sourceIsExternal) {
    const trace: EvaluationTraceStep = {
      stage: 'NETWORK',
      status: 'DENIED',
      summary: `Network Unreachable: External caller '${sourceNode.label}' cannot directly route to private subnet node '${targetNode.label}' without an ingress load balancer or gateway.`
    };
    return {
      reachable: false,
      reason: 'BLOCKED_PRIVATE_SUBNET_INGRESS',
      trace
    };
  }

  // Rule 2: Egress Check for Private Compute calling AWS Services (S3, DynamoDB, KMS, SecretsManager)
  const sourceInPrivate = sourceNode.config?.inPrivateSubnet ?? false;
  const targetIsAwsService = ['s3', 'dynamodb', 'kms', 'secrets_manager'].includes(targetNode.type);

  if (sourceInPrivate && targetIsAwsService) {
    // Check for VPC Endpoints first
    const vpcEndpoints = allNodes.filter(n => n.type === 'vpc_endpoint');
    const targetService = targetNode.type === 's3' ? 's3' : targetNode.type === 'dynamodb' ? 'dynamodb' : targetNode.type;

    const matchingEndpoint = vpcEndpoints.find(ep => ep.config?.service === targetService);

    if (matchingEndpoint) {
      // Check VPC Endpoint Policy if attached
      if (matchingEndpoint.resourcePolicy) {
        for (const stmt of matchingEndpoint.resourcePolicy.Statement) {
          if (stmt.Effect === 'Deny') {
            if (matchAction(stmt.Action, action) && matchResource(stmt.Resource, resourceArn)) {
              return {
                reachable: false,
                reason: 'BLOCKED_BY_ENDPOINT_POLICY',
                trace: {
                  stage: 'NETWORK',
                  status: 'DENIED',
                  summary: `Traffic blocked by VPC Endpoint Policy statement '${stmt.Sid || 'Deny'}'`,
                  matchedStatement: stmt
                }
              };
            }
          }
        }
      }

      return {
        reachable: true,
        reason: 'ROUTED_VIA_VPC_ENDPOINT',
        egressMethod: matchingEndpoint.config?.endpointType === 'gateway' ? 'vpc_gateway_endpoint' : 'vpc_interface_endpoint',
        trace: {
          stage: 'NETWORK',
          status: 'PASS',
          summary: `Network Reachable: Traffic routed via ${matchingEndpoint.label} (${matchingEndpoint.config?.endpointType || 'gateway'}) directly to ${targetNode.label} without crossing public internet.`
        }
      };
    }

    // Check for NAT Gateway
    const hasNatGateway = allNodes.some(n => n.type === 'nat_gw');
    if (hasNatGateway) {
      return {
        reachable: true,
        reason: 'ROUTED_VIA_NAT_GATEWAY',
        egressMethod: 'nat_gateway',
        trace: {
          stage: 'NETWORK',
          status: 'PASS',
          summary: `Network Reachable: Traffic from private subnet routed via NAT Gateway to public AWS service '${targetNode.label}' (Incurs NAT data charges).`
        }
      };
    }

    // Neither VPC Endpoint nor NAT Gateway exists
    return {
      reachable: false,
      reason: 'NO_EGRESS_ROUTE',
      trace: {
        stage: 'NETWORK',
        status: 'DENIED',
        summary: `Network Unreachable: Node '${sourceNode.label}' is inside a Private Subnet with no route to AWS '${targetNode.label}'. Requires a NAT Gateway or VPC Endpoint.`
      }
    };
  }

  // Default: Direct connectivity
  return {
    reachable: true,
    reason: 'DIRECT_ROUTE',
    egressMethod: 'direct_internet',
    trace: {
      stage: 'NETWORK',
      status: 'PASS',
      summary: `Network Reachable: Direct network path established between '${sourceNode.label}' and '${targetNode.label}'.`
    }
  };
}
