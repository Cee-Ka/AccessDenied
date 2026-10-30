import { describe, it, expect } from 'vitest';
import { buildTutorPrompt, escapeMermaidLabel, TutorPromptInput } from '../src/tutor/buildTutorPrompt';
import { evaluatePacket } from '../src/store/useGameStore';
import { round0CloudBasics } from '../src/levels/round0-cloud-basics';
import { round1LeakyBucket } from '../src/levels/round1-leaky-bucket';
import { CloudNodeData } from '../src/types/engine';

function inputFor(nodes: CloudNodeData[], edges: Array<{ source: string; target: string }>, earnedStars = 0): TutorPromptInput {
  return {
    level: round0CloudBasics,
    nodes,
    edges,
    packets: round0CloudBasics.packets,
    results: round0CloudBasics.packets.map(p => evaluatePacket(p, nodes, edges)),
    earnedStars,
  };
}

const initialNodes = () => round0CloudBasics.initialNodes.map(n => n.data);
const initialEdges = () => round0CloudBasics.initialEdges.map(e => ({ source: e.source, target: e.target }));

describe('Ask your agent: tutor prompt', () => {
  it('is deterministic', () => {
    const a = buildTutorPrompt(inputFor(initialNodes(), initialEdges()));
    const b = buildTutorPrompt(inputFor(initialNodes(), initialEdges()));
    expect(a).toBe(b);
  });

  it('has the blocks in order', () => {
    const p = buildTutorPrompt(inputFor(initialNodes(), initialEdges()));
    const order = ['patient AWS cloud security tutor', 'simplified model', '<level>', '<design>', '<parts>', '<result>'].map(s => p.indexOf(s));
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(p).toContain('Learn, round 0: Cloud Basics');
    expect(p).toContain('Budget: $10/month. My design costs $5/month.');
  });

  it('draws directed Mermaid edges from caller to callee', () => {
    const p = buildTutorPrompt(inputFor(initialNodes(), [...initialEdges(), { source: 'starter-app', target: 'starter-photos' }]));
    // Board order: starter-app = n1, starter-photos = n2, starter-intern = n3
    expect(p).toContain('flowchart LR');
    expect(p).toContain('  n3 --> n2');
    expect(p).toContain('  n1 --> n2');
    expect(p).not.toContain('n2 --> n1');
    expect(p).toContain('Arrows show the direction requests travel.');
  });

  it('includes each part\'s role, connections and policies as compact JSON', () => {
    const p = buildTutorPrompt(inputFor(initialNodes(), initialEdges()));
    const intern = p.split('\n').find(l => l.startsWith('- intern-dev'))!;
    expect(intern).toContain('(IAM User, Free)');
    expect(intern).toContain('Sends to: team-photos.');
    expect(intern).toContain('Identity policy: {"Version":"2012-10-17","Statement":[{"Sid":"InternBucketAccess"');
    const bucket = p.split('\n').find(l => l.startsWith('- team-photos'))!;
    expect(bucket).toContain('Gets requests from: intern-dev.');
    expect(bucket).toContain('Block Public Access on.');
  });

  it('labels a resource policy as such', () => {
    const nodes = round1LeakyBucket.initialNodes.map(n => n.data).concat([{
      id: 'invoices-bucket', type: 's3', label: 'customer-invoices', arn: 'arn:aws:s3:::customer-invoices', accountId: '111122223333',
      monthlyCost: 5, config: { blockPublicAccess: false }, identityPolicies: [],
      resourcePolicy: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: '*' }] },
    }]);
    const p = buildTutorPrompt({
      level: round1LeakyBucket, nodes, edges: [], packets: round1LeakyBucket.packets,
      results: round1LeakyBucket.packets.map(pk => evaluatePacket(pk, nodes, [])), earnedStars: 0,
    });
    expect(p.split('\n').find(l => l.startsWith('- customer-invoices'))).toContain('Resource policy: {"Version"');
  });

  it('names the deciding stage for failed packets', () => {
    const edges = [...initialEdges(), { source: 'starter-app', target: 'starter-photos' }];
    const p = buildTutorPrompt(inputFor(initialNodes(), edges));
    expect(p).toMatch(/Legitimate "Photo app reads a photo" \(s3:GetObject on arn:aws:s3:::team-photos\/cat\.jpg\) was denied at Identity Policy: Implicit Deny/);
    expect(p).toMatch(/Attack "Stolen login deletes photos" .* got through/);
  });

  it('switches closing instructions by outcome', () => {
    const failed = buildTutorPrompt(inputFor(initialNodes(), initialEdges(), 0));
    expect(failed).toContain('Explain why my design failed');
    expect(failed).toContain('Do not tell me which part or policy to change');
    expect(failed).toContain('Ask me one or two questions');
    expect(failed).toContain('Keep it under 200 words. Use short sentences.');

    const two = buildTutorPrompt(inputFor(initialNodes(), initialEdges(), 2));
    expect(two).toContain('passed with 2 stars');
    expect(two).toContain('$10 budget');
    expect(two).toContain('least privilege');
    expect(two).toContain('Do not give me the finished change');

    const three = buildTutorPrompt(inputFor(initialNodes(), initialEdges(), 3));
    expect(three).toContain('Quiz me with two questions');
  });

  it('escapes labels that would break Mermaid', () => {
    expect(escapeMermaidLabel('a "quoted" [x] <y>')).toBe('a #quot;quoted#quot; #91;x#93; #lt;y#gt;');
    const nodes = initialNodes().map(n => (n.id === 'starter-app' ? { ...n, label: 'App "v2" [prod]' } : n));
    const p = buildTutorPrompt(inputFor(nodes, initialEdges()));
    const line = p.split('\n').find(l => l.startsWith('  n1['))!;
    expect(line).toBe('  n1["App #quot;v2#quot; #91;prod#93;<br>IAM Role · Free"]');
  });

  it('never includes profile data', () => {
    const p = buildTutorPrompt(inputFor(initialNodes(), initialEdges()));
    expect(p).not.toMatch(/displayName|createdAt|firstRun/);
  });

  it('truncates very long policies to keep the prompt bounded', () => {
    const big = Array.from({ length: 200 }, (_, i) => ({ Sid: `S${i}`, Effect: 'Allow' as const, Action: `s3:Get${i}`, Resource: '*' }));
    const nodes = initialNodes().map(n => (n.id === 'starter-app' ? { ...n, identityPolicies: [{ Version: '2012-10-17' as const, Statement: big }] } : n));
    const p = buildTutorPrompt(inputFor(nodes, initialEdges()));
    expect(p).toContain('…(truncated)');
    expect(p.length).toBeLessThan(12_000);
  });
});
