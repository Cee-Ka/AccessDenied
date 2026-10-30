/**
 * Board import/export file format.
 * Import validates node types and every policy document before anything
 * touches the board; an invalid file leaves the board unchanged.
 */

import type { Edge, Node } from '@xyflow/react';
import { NODE_TYPES } from '../types/engine';
import type { CloudNodeData, NodeType, PolicyDocument } from '../types/engine';
import { serializeBoard } from './save';

export const BOARD_FILE_FORMAT = 'access-denied-board';
export const BOARD_FILE_VERSION = 1;

export interface BoardFile {
  format: typeof BOARD_FILE_FORMAT;
  version: number;
  levelId: string;
  nodes: Node<CloudNodeData>[];
  edges: Edge[];
}

export type ParseResult =
  | { ok: true; levelId: string; nodes: Node<CloudNodeData>[]; edges: Edge[] }
  | { ok: false; message: string };

export function buildBoardFile(levelId: string, nodes: Node<CloudNodeData>[], edges: Edge[]): string {
  const file: BoardFile = {
    format: BOARD_FILE_FORMAT,
    version: BOARD_FILE_VERSION,
    levelId,
    ...serializeBoard(nodes, edges),
  };
  return JSON.stringify(file, null, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Returns an error message, or null when the document is a valid policy. */
export function validatePolicyDocument(doc: unknown, where: string): string | null {
  if (!isRecord(doc)) return `${where}: policy must be a JSON object`;
  if (!Array.isArray(doc.Statement)) return `${where}: missing "Statement" array`;
  for (let i = 0; i < doc.Statement.length; i++) {
    const stmt = doc.Statement[i];
    if (!isRecord(stmt)) return `${where} Statement[${i}]: must be an object`;
    if (stmt.Effect !== 'Allow' && stmt.Effect !== 'Deny') {
      return `${where} Statement[${i}]${stmt.Sid ? ` ('${stmt.Sid}')` : ''}: Effect must be "Allow" or "Deny", got ${JSON.stringify(stmt.Effect)}`;
    }
    if (typeof stmt.Action !== 'string' && !Array.isArray(stmt.Action)) {
      return `${where} Statement[${i}]: "Action" must be a string or array`;
    }
  }
  return null;
}

function validateNodePolicies(data: Record<string, unknown>, label: string): string | null {
  const lists: Array<[string, unknown]> = [];
  if (data.identityPolicies !== undefined) {
    if (!Array.isArray(data.identityPolicies)) return `${label}: identityPolicies must be an array`;
    data.identityPolicies.forEach((p, i) => lists.push([`${label} identity policy #${i + 1}`, p]));
  }
  if (data.scpPolicies !== undefined) {
    if (!Array.isArray(data.scpPolicies)) return `${label}: scpPolicies must be an array`;
    data.scpPolicies.forEach((p, i) => lists.push([`${label} SCP #${i + 1}`, p]));
  }
  if (data.resourcePolicy !== undefined) lists.push([`${label} resource policy`, data.resourcePolicy]);
  if (data.trustPolicy !== undefined) lists.push([`${label} trust policy`, data.trustPolicy]);
  if (data.permissionBoundary !== undefined) lists.push([`${label} permission boundary`, data.permissionBoundary]);

  for (const [where, doc] of lists) {
    const err = validatePolicyDocument(doc, where);
    if (err) return err;
  }
  return null;
}

export function parseBoardFile(text: string, expectedLevelId: string, expectedLevelTitle?: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'This file is not valid JSON.' };
  }

  if (!isRecord(parsed) || parsed.format !== BOARD_FILE_FORMAT) {
    return { ok: false, message: 'This is not an AccessDenied board file.' };
  }
  if (typeof parsed.levelId !== 'string') {
    return { ok: false, message: 'The board file does not say which level it is for.' };
  }
  if (parsed.levelId !== expectedLevelId) {
    return {
      ok: false,
      message: `This board is for level "${parsed.levelId}", not ${expectedLevelTitle ? `"${expectedLevelTitle}"` : `"${expectedLevelId}"`}. Open that level first.`,
    };
  }
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    return { ok: false, message: 'The board file is missing its nodes or edges.' };
  }

  const ids = new Set<string>();
  for (const n of parsed.nodes) {
    if (!isRecord(n) || typeof n.id !== 'string' || !isRecord(n.data) || !isRecord(n.position)) {
      return { ok: false, message: 'A node in the file is malformed.' };
    }
    if (typeof n.position.x !== 'number' || typeof n.position.y !== 'number') {
      return { ok: false, message: `Node "${n.id}" has an invalid position.` };
    }
    if (!NODE_TYPES.includes(n.data.type as NodeType)) {
      return { ok: false, message: `Node "${n.id}" has an unknown service type ${JSON.stringify(n.data.type)}.` };
    }
    const policyErr = validateNodePolicies(n.data, `Node "${n.data.label ?? n.id}"`);
    if (policyErr) return { ok: false, message: policyErr };
    ids.add(n.id);
  }

  for (const e of parsed.edges) {
    if (!isRecord(e) || typeof e.id !== 'string' || typeof e.source !== 'string' || typeof e.target !== 'string') {
      return { ok: false, message: 'A connection in the file is malformed.' };
    }
  }

  return {
    ok: true,
    levelId: parsed.levelId,
    nodes: parsed.nodes as unknown as Node<CloudNodeData>[],
    // Connections to nodes that are missing are dropped by the store after essential restore.
    edges: parsed.edges as unknown as Edge[],
  };
}

export function isPolicyDocument(doc: unknown): doc is PolicyDocument {
  return validatePolicyDocument(doc, 'policy') === null;
}
