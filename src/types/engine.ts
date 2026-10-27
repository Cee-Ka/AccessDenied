export type Effect = 'Allow' | 'Deny';

export interface PolicyStatement {
  Sid?: string;
  Effect: Effect;
  Principal?: string | { AWS?: string | string[]; Service?: string | string[] } | Record<string, unknown>;
  Action: string | string[];
  Resource?: string | string[];
  Condition?: Record<string, Record<string, string | string[] | boolean | number>>;
}

export interface PolicyDocument {
  Version: '2012-10-17';
  Statement: PolicyStatement[];
}

export type NodeType =
  | 'iam_user'
  | 'iam_role'
  | 'ec2'
  | 'lambda'
  | 'cognito'
  | 'external_vendor'
  | 's3'
  | 'dynamodb'
  | 'rds'
  | 'kms'
  | 'secrets_manager'
  | 'aws_account'
  | 'vpc'
  | 'subnet'
  | 'nat_gw'
  | 'vpc_endpoint';

export interface CloudNodeData {
  [key: string]: unknown;
  id: string;
  type: NodeType;
  label: string;
  arn: string;
  accountId: string;
  monthlyCost: number;
  parentId?: string; // Subnet, VPC, or Account container
  config: {
    imdsVersion?: 'v1' | 'v2';
    imdsHopLimit?: number;
    blockPublicAccess?: boolean;
    requireExternalId?: string;
    inPrivateSubnet?: boolean;
    kmsKeyArn?: string;
    isMultiAz?: boolean;
    publiclyAccessible?: boolean;
    endpointType?: 'gateway' | 'interface';
    service?: string; // e.g. 's3', 'dynamodb', 'kms'
    executionRoleId?: string;
  };
  identityPolicies: PolicyDocument[];
  resourcePolicy?: PolicyDocument;
  trustPolicy?: PolicyDocument;
  permissionBoundary?: PolicyDocument;
  scpPolicies?: PolicyDocument[];
}

export interface SimulationPacket {
  id: string;
  name: string;
  kind: 'legitimate' | 'exploit';
  sourceNodeId: string;
  targetNodeId: string;
  sourceNodeType?: NodeType;
  targetNodeType?: NodeType;
  action: string;
  resourceArn: string;
  context: Record<string, string | boolean | number | string[]>;
  expectedOutcome: 'ALLOW' | 'DENY';
  description: string;
}

export type EvaluationStage =
  | 'NETWORK'
  | 'EXPLICIT_DENY'
  | 'SCP'
  | 'RESOURCE_POLICY'
  | 'TRUST_POLICY'
  | 'IDENTITY_POLICY'
  | 'PERMISSION_BOUNDARY'
  | 'CONDITION';

export interface EvaluationTraceStep {
  stage: EvaluationStage;
  status: 'PASS' | 'FAIL' | 'SKIPPED' | 'DENIED';
  summary: string;
  matchedStatement?: PolicyStatement;
  blockingPolicyType?: string;
}

export interface SimulationResult {
  packetId: string;
  success: boolean;
  outcome: 'ALLOW' | 'DENY' | 'NETWORK_UNREACHABLE' | 'BREACHED';
  traces: EvaluationTraceStep[];
  failureReason?: string;
}

export interface ServiceUnlockInfo {
  type: NodeType;
  name: string;
  category: string;
  primer: string;
  keyConcepts: string[];
}

export interface ArchitectureTask {
  step: number;
  title: string;
  instruction: string;
  serviceType?: NodeType;
}

export interface MissionReportCard {
  headline: string;
  scenario: string;
  newService?: ServiceUnlockInfo;
  tasks: ArchitectureTask[];
  securityIntel: string;
  budgetNotice: string;
}

export interface LevelStarCriteria {
  star1Functional: {
    workloadPassRateTarget: number; // 1.0 = 100%
    description: string;
  };
  star2Secure: {
    exploitsBlockedTarget: number; // 1.0 = 100%
    noWildcardAdmin: boolean;
    description: string;
  };
  star3Optimal: {
    budgetLimit: number;
    leastPrivilege: boolean;
    description: string;
  };
}

export interface LevelHint {
  level: 'nudge' | 'root_cause' | 'solution_diff';
  title: string;
  content: string;
}

export interface GameLevel {
  id: string;
  roundNumber: number;
  title: string;
  subtitle: string;
  category: 'Learn' | 'Incidents' | 'Sandbox';
  storyBrief: string;
  threatIntel: string;
  targetBudget: number;
  unlockedServices?: NodeType[];
  newlyUnlockedService?: ServiceUnlockInfo;
  reportCard?: MissionReportCard;
  initialNodes: Array<{
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: CloudNodeData;
    parentId?: string;
    extent?: 'parent';
  }>;
  initialEdges: Array<{
    id: string;
    source: string;
    target: string;
    animated?: boolean;
    label?: string;
    data?: Record<string, any>;
  }>;
  packets: SimulationPacket[];
  criteria: LevelStarCriteria;
  hints: LevelHint[];
}
