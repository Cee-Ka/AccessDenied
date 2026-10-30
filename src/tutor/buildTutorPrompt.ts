/**
 * "Ask your agent": builds a tutor prompt the player pastes into their own AI
 * assistant. Pure and deterministic: same board + results → same text.
 * Never includes profile data, and the game never sends it anywhere.
 */

import type {
  CloudNodeData,
  EvaluationStage,
  GameLevel,
  PolicyDocument,
  SimulationPacket,
  SimulationResult,
} from '../types/engine';
import { getServiceConcept } from '../content/concepts';

export interface TutorPromptInput {
  level: GameLevel;
  nodes: CloudNodeData[];
  edges: Array<{ source: string; target: string }>;
  packets: SimulationPacket[];
  results: SimulationResult[];
  earnedStars: number;
}

export const PROMPT_SOFT_LIMIT = 12_000;
export const POLICY_TRUNCATE_AT = 1_500;

const STAGE_LABEL: Record<EvaluationStage, string> = {
  NETWORK: 'Network',
  EXPLICIT_DENY: 'Explicit Deny',
  SCP: 'SCP',
  RESOURCE_POLICY: 'Resource Policy',
  TRUST_POLICY: 'Trust Policy',
  IDENTITY_POLICY: 'Identity Policy',
  PERMISSION_BOUNDARY: 'Permission Boundary',
  CONDITION: 'Condition',
};

/** Escape characters that break Mermaid node labels. */
export function escapeMermaidLabel(text: string): string {
  return text
    .replace(/"/g, '#quot;')
    .replace(/\[/g, '#91;')
    .replace(/\]/g, '#93;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;');
}

const cost = (n: number) => (n > 0 ? `$${n}/mo` : 'Free');

function modeLine(level: GameLevel): string {
  if (level.category === 'Learn') return `Learn, round ${level.roundNumber}`;
  if (level.category === 'Incidents') return 'Incident';
  return 'Sandbox';
}

function policyJson(doc: PolicyDocument, truncate: boolean): string {
  const json = JSON.stringify(doc);
  return truncate && json.length > POLICY_TRUNCATE_AT ? `${json.slice(0, POLICY_TRUNCATE_AT)}…(truncated)` : json;
}

function configSummary(d: CloudNodeData): string[] {
  const c = d.config || {};
  const out: string[] = [];
  if (c.imdsVersion) out.push(`IMDS ${c.imdsVersion}${c.imdsHopLimit !== undefined ? `, hop limit ${c.imdsHopLimit}` : ''}`);
  if (d.type === 's3') out.push(`Block Public Access ${c.blockPublicAccess ? 'on' : 'off'}`);
  if (c.inPrivateSubnet) out.push('in a private subnet');
  if (c.requireExternalId !== undefined) out.push(`required ExternalId: ${c.requireExternalId ? JSON.stringify(c.requireExternalId) : 'none'}`);
  if (c.service) out.push(`endpoint for ${c.service}${c.endpointType ? ` (${c.endpointType})` : ''}`);
  if (c.publiclyAccessible !== undefined) out.push(`publicly accessible: ${c.publiclyAccessible ? 'yes' : 'no'}`);
  return out;
}

function policyLines(d: CloudNodeData, truncate: boolean): string[] {
  const out: string[] = [];
  (d.identityPolicies || []).forEach((p, i, all) =>
    out.push(`Identity policy${all.length > 1 ? ` ${i + 1}` : ''}: ${policyJson(p, truncate)}`)
  );
  if (d.resourcePolicy) out.push(`Resource policy: ${policyJson(d.resourcePolicy, truncate)}`);
  if (d.trustPolicy) out.push(`Trust policy: ${policyJson(d.trustPolicy, truncate)}`);
  if (d.permissionBoundary) out.push(`Permission boundary: ${policyJson(d.permissionBoundary, truncate)}`);
  (d.scpPolicies || []).forEach((p, i, all) => out.push(`SCP${all.length > 1 ? ` ${i + 1}` : ''}: ${policyJson(p, truncate)}`));
  return out;
}

/** The stage that decided a packet's outcome, and its trace summary. */
function decidingStep(result: SimulationResult) {
  const traces = result.traces || [];
  return (
    traces.find(t => t.status === 'DENIED') ||
    [...traces].reverse().find(t => t.status === 'FAIL') ||
    traces[traces.length - 1]
  );
}

function resultBlock(input: TutorPromptInput): string[] {
  const { packets, results, earnedStars, level, nodes } = input;
  const lines: string[] = [];
  const legit = packets.filter(p => p.kind === 'legitimate');
  const attacks = packets.filter(p => p.kind === 'exploit');
  const failedLegit = legit.filter(p => !results[packets.indexOf(p)]?.success);
  const leakedAttacks = attacks.filter(p => !results[packets.indexOf(p)]?.success);
  const totalCost = nodes.reduce((acc, n) => acc + (n.monthlyCost || 0), 0);

  lines.push(
    earnedStars > 0
      ? `Passed with ${earnedStars} star${earnedStars === 1 ? '' : 's'}.`
      : 'Failed.'
  );
  lines.push(
    `Legitimate requests: ${legit.length - failedLegit.length} of ${legit.length} passed. ` +
      `Attacks: ${attacks.length - leakedAttacks.length} of ${attacks.length} blocked. ` +
      `Cost: ${cost(totalCost)} (budget ${cost(level.targetBudget)}).`
  );

  for (const p of failedLegit) {
    const step = decidingStep(results[packets.indexOf(p)]);
    lines.push(
      `- Legitimate "${p.name}" (${p.action} on ${p.resourceArn}) was denied at ${step ? STAGE_LABEL[step.stage] : 'an unknown stage'}: ${step?.summary ?? 'no trace'}`
    );
  }
  for (const p of leakedAttacks) {
    const step = decidingStep(results[packets.indexOf(p)]);
    lines.push(
      `- Attack "${p.name}" (${p.action} on ${p.resourceArn}) got through. Last check: ${step ? STAGE_LABEL[step.stage] : 'none'}: ${step?.summary ?? 'no trace'}`
    );
  }
  return lines;
}

function closing(input: TutorPromptInput): string {
  const { earnedStars, level } = input;
  if (earnedStars === 0) {
    return [
      'The first problem listed in <result> is what the game found; the rest follows from it.',
      'Explain why my design failed, using the data above. Do not tell me which part or policy to change.',
      'Ask me one or two questions that lead me to the fix myself.',
      'Keep it under 200 words. Use short sentences.',
    ].join('\n');
  }
  if (earnedStars < 3) {
    const next =
      earnedStars === 1
        ? 'The next star needs every attack blocked.'
        : `The next star needs the monthly cost at or under the $${level.targetBudget} budget, and least privilege: no wildcard actions or resources that the design does not need.`;
    return [
      `My design passed with ${earnedStars} star${earnedStars === 1 ? '' : 's'}. ${next}`,
      'Explain what stands between this design and the next star, using the data above. Do not give me the finished change.',
      'Ask me one or two questions that lead me there.',
      'Keep it under 200 words. Use short sentences.',
    ].join('\n');
  }
  return [
    'My design earned all three stars.',
    'Quiz me with two questions about why it works: one about security, one about cost or least privilege.',
    'Wait for my answers before you explain anything.',
    'Keep it under 150 words.',
  ].join('\n');
}

function build(input: TutorPromptInput, truncate: boolean): string {
  const { level, nodes, edges } = input;
  const idOf = new Map(nodes.map((n, i) => [n.id, `n${i + 1}`]));
  const labelOf = new Map(nodes.map(n => [n.id, n.label]));
  const totalCost = nodes.reduce((acc, n) => acc + (n.monthlyCost || 0), 0);
  const validEdges = edges.filter(e => idOf.has(e.source) && idOf.has(e.target));

  const design = [
    '```mermaid',
    'flowchart LR',
    ...nodes.map(
      n => `  ${idOf.get(n.id)}["${escapeMermaidLabel(n.label)}<br>${escapeMermaidLabel(getServiceConcept(n.type)?.title ?? n.type)} · ${cost(n.monthlyCost)}"]`
    ),
    ...validEdges.map(e => `  ${idOf.get(e.source)} --> ${idOf.get(e.target)}`),
    '```',
    'Arrows show the direction requests travel.',
  ];

  const parts = nodes.map(n => {
    const concept = getServiceConcept(n.type);
    const incoming = validEdges.filter(e => e.target === n.id).map(e => labelOf.get(e.source));
    const outgoing = validEdges.filter(e => e.source === n.id).map(e => labelOf.get(e.target));
    const bits = [
      `- ${n.label} (${concept?.title ?? n.type}, ${cost(n.monthlyCost)}): ${concept?.summary ?? ''}`.trimEnd(),
      incoming.length ? `Gets requests from: ${incoming.join(', ')}.` : '',
      outgoing.length ? `Sends to: ${outgoing.join(', ')}.` : '',
      ...configSummary(n).map(c => `${c[0].toUpperCase()}${c.slice(1)}.`),
      ...policyLines(n, truncate).map(p => `${p}.`),
    ].filter(Boolean);
    return bits.join(' ');
  });

  return [
    'You are a patient AWS cloud security tutor. I am learning with AccessDenied, a game where I fix AWS setups on a board and send requests through them.',
    'Help me understand my design. Do not redesign it and do not give me a finished answer.',
    'The game uses its own simplified model of AWS IAM and networking. Trust the data below, not real-world details.',
    '',
    '<level>',
    `${modeLine(level)}: ${level.title} (${level.subtitle}).`,
    `Goal: ${level.storyBrief}`,
    `Threat: ${level.twistPager?.replace(/^Pager:\s*/, '') ?? level.threatIntel}`,
    `Budget: $${level.targetBudget}/month. My design costs $${totalCost}/month.`,
    '</level>',
    '<design>',
    ...design,
    '</design>',
    '<parts>',
    ...parts,
    '</parts>',
    '<result>',
    ...resultBlock(input),
    '</result>',
    '',
    closing(input),
  ].join('\n');
}

export function buildTutorPrompt(input: TutorPromptInput): string {
  const full = build(input, false);
  return full.length > PROMPT_SOFT_LIMIT ? build(input, true) : full;
}
