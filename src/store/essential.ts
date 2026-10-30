import type { Node } from '@xyflow/react';
import type { CloudNodeData } from '../types/engine';

export const ESSENTIAL_NODE_LABEL = 'Required by this scenario — cannot be deleted';

/** Split requested deletions into nodes that may go and essential nodes that must stay. */
export function filterDeletableNodeIds(
  ids: string[],
  nodes: Node<CloudNodeData>[]
): { deletable: string[]; kept: Node<CloudNodeData>[] } {
  const deletable: string[] = [];
  const kept: Node<CloudNodeData>[] = [];
  for (const id of ids) {
    const node = nodes.find(n => n.id === id);
    if (!node) continue;
    if (node.data.essential) kept.push(node);
    else deletable.push(id);
  }
  return { deletable, kept };
}

export function essentialNotice(kept: Node<CloudNodeData>[]): string {
  const names = kept.map(n => `"${n.data.label}"`).join(', ');
  return kept.length === 1
    ? `${names} is required by this scenario and can't be deleted.`
    : `${names} are required by this scenario and can't be deleted.`;
}
