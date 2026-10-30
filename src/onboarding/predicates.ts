/**
 * Named, pure completion checks for guided onboarding steps.
 * Level files reference these by id so level data stays serializable.
 */

import type { Edge, Node } from '@xyflow/react';
import type { CloudNodeData, OnboardingPredicateId, OnboardingStep, PolicyDocument, SimulationResult } from '../types/engine';

export interface GuideState {
  nodes: Node<CloudNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  results: SimulationResult[];
  simStatus: string;
}

const hasEffect = (docs: Array<PolicyDocument | undefined>, effect: 'Allow' | 'Deny') =>
  docs.some(d => d?.Statement?.some(s => s.Effect === effect));

const nodeById = (s: GuideState, id?: string) => s.nodes.find(n => n.id === id)?.data;

const PREDICATES: Record<OnboardingPredicateId, (s: GuideState, args: string[]) => boolean> = {
  nodeSelected: (s, [id]) => s.selectedNodeId === id,
  edgeExists: (s, [source, target]) => s.edges.some(e => e.source === source && e.target === target),
  identityPolicyHasAllow: (s, [id]) => hasEffect(nodeById(s, id)?.identityPolicies ?? [], 'Allow'),
  resourcePolicyHasAllow: (s, [id]) => hasEffect([nodeById(s, id)?.resourcePolicy], 'Allow'),
  policyHasDeny: (s, [id]) => {
    const d = nodeById(s, id);
    if (!d) return false;
    return hasEffect([...(d.identityPolicies ?? []), d.resourcePolicy, d.permissionBoundary, ...(d.scpPolicies ?? [])], 'Deny');
  },
  boundaryAttached: (s, [id]) => Boolean(nodeById(s, id)?.permissionBoundary?.Statement?.length),
  scpAttached: (s, [id]) => Boolean(nodeById(s, id)?.scpPolicies?.some(p => p.Statement?.length)),
  simulationPassed: s => s.simStatus === 'completed' && s.results.length > 0 && s.results.every(r => r.success),
};

export function isStepComplete(step: OnboardingStep, state: GuideState): boolean {
  if (!step.completeWhen) return false;
  const fn = PREDICATES[step.completeWhen.predicate];
  return fn ? fn(state, step.completeWhen.args ?? []) : false;
}
