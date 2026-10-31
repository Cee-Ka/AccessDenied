import { GameLevel } from '../types/engine';
import { STAGE_1_1 } from './stage1-1-hello-cloud';
import { STAGE_1_2 } from './stage1-2-curious-teammate';
import { STAGE_2_1 } from './stage2-1-credential-leak';
import { STAGE_2_2 } from './stage2-2-two-sided-coin';
import { STAGE_2_3 } from './stage2-3-serverless-worker';
import { STAGE_3_1 } from './stage3-1-leaky-bucket';
import { STAGE_3_2 } from './stage3-2-cross-account-bridge';
import { STAGE_3_3 } from './stage3-3-silent-lockout';
import { STAGE_4_1 } from './stage4-1-metadata-heist';
import { STAGE_4_2 } from './stage4-2-confused-deputy';
import { STAGE_4_3 } from './stage4-3-shadow-admin';
import { STAGE_4_4 } from './stage4-4-tenant-hopping';
import { STAGE_5_1 } from './stage5-1-glass-ceiling';
import { STAGE_5_2 } from './stage5-2-nat-gateway-trap';
import { STAGE_5_3 } from './stage5-3-organization-shield';
import { STAGE_6_1 } from './stage6-1-capital-one';

export {
  STAGE_1_1,
  STAGE_1_2,
  STAGE_2_1,
  STAGE_2_2,
  STAGE_2_3,
  STAGE_3_1,
  STAGE_3_2,
  STAGE_3_3,
  STAGE_4_1,
  STAGE_4_2,
  STAGE_4_3,
  STAGE_4_4,
  STAGE_5_1,
  STAGE_5_2,
  STAGE_5_3,
  STAGE_6_1,
};

// Legacy aliases for backward compatibility
export const round0CloudBasics = STAGE_1_1;
export const round1LeakyBucket = STAGE_3_1;
export const round2ImdsHeist = STAGE_4_1;
export const round3ConfusedDeputy = STAGE_4_2;
export const round4ShadowAdmin = STAGE_4_3;
export const round5TenantHopping = STAGE_4_4;
export const round6SilentLockout = STAGE_3_3;
export const round7NatGatewayTrap = STAGE_5_2;
export const round8GuardrailClash = STAGE_5_3;
export const incidentCapitalOne = STAGE_6_1;

export const ALL_LEVELS: GameLevel[] = [
  STAGE_1_1,
  STAGE_1_2,
  STAGE_2_1,
  STAGE_2_2,
  STAGE_2_3,
  STAGE_3_1,
  STAGE_3_2,
  STAGE_3_3,
  STAGE_4_1,
  STAGE_4_2,
  STAGE_4_3,
  STAGE_4_4,
  STAGE_5_1,
  STAGE_5_2,
  STAGE_5_3,
  STAGE_6_1,
];

export const LEARN_LEVELS = ALL_LEVELS.filter(l => l.category === 'Learn');
export const INCIDENT_LEVELS = ALL_LEVELS.filter(l => l.category === 'Incidents');

export const SANDBOX_DEFAULT_LEVEL: GameLevel = {
  id: 'sandbox-default',
  roundNumber: 0,
  title: 'Cloud Architecture Sandbox',
  subtitle: 'Freeform AWS IAM & Network Lab',
  category: 'Sandbox',
  storyBrief:
    'Build and experiment with arbitrary multi-account AWS topologies. Drag AWS services from the dock, connect nodes, author custom IAM policy documents, and simulate legitimate or adversary request flows.',
  threatIntel: 'Design your own attack scenarios or test production policy configurations before deployment.',
  targetBudget: 100,
  conceptTags: ['identity_policy', 'resource_policy', 'principal'],
  criteria: {
    star1Functional: { workloadPassRateTarget: 1.0, description: 'All custom workloads pass' },
    star2Secure: { exploitsBlockedTarget: 1.0, noWildcardAdmin: false, description: 'All custom exploits blocked' },
    star3Optimal: { budgetLimit: 100, leastPrivilege: false, description: 'Within budget' }
  },
  hints: [],
  initialNodes: [
    {
      id: 'sandbox-role',
      type: 'iam_role',
      position: { x: 150, y: 200 },
      data: {
        id: 'sandbox-role',
        type: 'iam_role',
        label: 'MyCustomRole',
        arn: 'arn:aws:iam::123456789012:role/MyCustomRole',
        accountId: '123456789012',
        monthlyCost: 0,
        config: {},
        identityPolicies: [
          {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'CustomAllowStatement',
                Effect: 'Allow',
                Action: ['s3:GetObject'],
                Resource: ['arn:aws:s3:::my-bucket/*']
              }
            ]
          }
        ]
      }
    },
    {
      id: 'sandbox-s3',
      type: 's3',
      position: { x: 550, y: 200 },
      data: {
        id: 'sandbox-s3',
        type: 's3',
        label: 'my-bucket',
        arn: 'arn:aws:s3:::my-bucket',
        accountId: '123456789012',
        monthlyCost: 5,
        config: { blockPublicAccess: true },
        identityPolicies: []
      }
    }
  ],
  initialEdges: [
    { id: 'e-sandbox-1', source: 'sandbox-role', target: 'sandbox-s3', label: 's3:GetObject' }
  ],
  packets: [
    {
      id: 'pkt-sandbox-test',
      name: 'Test Read Object',
      kind: 'legitimate',
      sourceNodeId: 'sandbox-role',
      targetNodeId: 'sandbox-s3',
      action: 's3:GetObject',
      resourceArn: 'arn:aws:s3:::my-bucket/data.json',
      context: { 'aws:PrincipalArn': 'arn:aws:iam::123456789012:role/MyCustomRole' },
      expectedOutcome: 'ALLOW',
      description: 'Test packet'
    }
  ]
};

export const LEGACY_ID_MAP: Record<string, string> = {
  'round-0': STAGE_1_1.id,
  'round-1': STAGE_3_1.id,
  'round-2': STAGE_4_1.id,
  'round-3': STAGE_4_2.id,
  'round-4': STAGE_4_3.id,
  'round-5': STAGE_4_4.id,
  'round-6': STAGE_3_3.id,
  'round-7': STAGE_5_2.id,
  'round-8': STAGE_5_3.id,
  'incident-capital-one': STAGE_6_1.id,
};

export function findLevel(id: string): GameLevel | undefined {
  if (id === SANDBOX_DEFAULT_LEVEL.id) return SANDBOX_DEFAULT_LEVEL;
  const resolvedId = LEGACY_ID_MAP[id] || id;
  return ALL_LEVELS.find(l => l.id === resolvedId);
}
