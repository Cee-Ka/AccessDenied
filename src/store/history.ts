/**
 * Snapshot-based undo/redo for board edits.
 * Snapshots hold references to immutable node/edge arrays, so memory cost is small.
 */

import type { Edge, Node } from '@xyflow/react';
import type { CloudNodeData } from '../types/engine';

export const HISTORY_LIMIT = 50;
/** Edits with the same key inside this window collapse into one undo step (e.g. typing in a policy). */
export const COALESCE_WINDOW_MS = 1000;

export interface BoardSnapshot {
  nodes: Node<CloudNodeData>[];
  edges: Edge[];
}

export interface HistoryState {
  past: BoardSnapshot[];
  future: BoardSnapshot[];
  lastKey: string | null;
  lastAt: number;
}

export function emptyHistory(): HistoryState {
  return { past: [], future: [], lastKey: null, lastAt: 0 };
}

/** Record the board as it was before an edit. */
export function pushHistory(
  h: HistoryState,
  before: BoardSnapshot,
  coalesceKey: string | null = null,
  now: number = Date.now()
): HistoryState {
  if (coalesceKey && coalesceKey === h.lastKey && now - h.lastAt < COALESCE_WINDOW_MS) {
    return { ...h, future: [], lastAt: now };
  }
  const past = [...h.past, before];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, future: [], lastKey: coalesceKey, lastAt: now };
}

export function undoHistory(h: HistoryState, current: BoardSnapshot): { history: HistoryState; board: BoardSnapshot } | null {
  if (h.past.length === 0) return null;
  const board = h.past[h.past.length - 1];
  return {
    board,
    history: { past: h.past.slice(0, -1), future: [current, ...h.future], lastKey: null, lastAt: 0 },
  };
}

export function redoHistory(h: HistoryState, current: BoardSnapshot): { history: HistoryState; board: BoardSnapshot } | null {
  if (h.future.length === 0) return null;
  const [board, ...rest] = h.future;
  const past = [...h.past, current];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { board, history: { past, future: rest, lastKey: null, lastAt: 0 } };
}
