import { GameLevel } from '../types/engine';
import { round0CloudBasics } from './round0-cloud-basics';
import { round1LeakyBucket } from './round1-leaky-bucket';
import { round2ImdsHeist } from './round2-imds-heist';
import { round3ConfusedDeputy } from './round3-confused-deputy';
import { round4ShadowAdmin } from './round4-shadow-admin';
import { round5TenantHopping } from './round5-tenant-hopping';
import { round6SilentLockout } from './round6-silent-lockout';
import { round7NatGatewayTrap } from './round7-nat-gateway-trap';
import { round8GuardrailClash } from './round8-guardrail-clash';
import { incidentCapitalOne } from './incident-capital-one';

export const ALL_LEVELS: GameLevel[] = [
  round0CloudBasics,
  round1LeakyBucket,
  round2ImdsHeist,
  round3ConfusedDeputy,
  round4ShadowAdmin,
  round5TenantHopping,
  round6SilentLockout,
  round7NatGatewayTrap,
  round8GuardrailClash,
  incidentCapitalOne,
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
