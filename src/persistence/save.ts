/**
 * Versioned local save for the player profile and gameplay progress.
 *
 * Everything lives in one localStorage record (`access_denied_save_v2`).
 * Every storage access is wrapped in try/catch: the game must stay playable
 * when storage is blocked, full, or holds corrupt data.
 */

import type { Edge, Node } from '@xyflow/react';
import type { CloudNodeData } from '../types/engine';

export const SAVE_KEY = 'access_denied_save_v2';
export const CORRUPT_BACKUP_KEY = 'access_denied_save_corrupt_backup';
export const LEGACY_STARS_KEY = 'access_denied_stars_v1';
export const LEGACY_THEME_KEY = 'access_denied_theme_v1';
export const SAVE_VERSION = 2;

export type ThemeMode = 'light' | 'dark';

export interface PlayerProfile {
  displayName: string;
  createdAt: string;
  firstRunCompleted: boolean;
  lastLevelId: string | null;
}

export interface SavedBoard {
  levelRevision: string;
  nodes: Node<CloudNodeData>[];
  edges: Edge[];
}

export interface OnboardingProgress {
  /** levelId -> index of the current guide step */
  currentStep: Record<string, number>;
  /** levelId -> true once the guide has been finished */
  completed: Record<string, boolean>;
  /** Level ids whose twist pager has been seen at least once */
  seenTwists: string[];
}

export interface SaveSettings {
  theme: ThemeMode;
  soundMuted: boolean;
  simSpeed: number;
}

export interface SaveV2 {
  version: 2;
  profile: PlayerProfile;
  progress: {
    stars: Record<string, number>;
    boards: Record<string, SavedBoard>;
    onboarding: OnboardingProgress;
  };
  settings: SaveSettings;
}

/**
 * - `ok`: reads and writes work
 * - `unavailable`: storage is blocked; progress lives in memory only
 * - `readonly`: the stored record is from a newer app version; never overwrite it
 */
export type StorageStatus = 'ok' | 'unavailable' | 'readonly';

export interface LoadResult {
  save: SaveV2;
  status: StorageStatus;
  notice: string | null;
}

/** Minimal Storage surface so tests can inject a fake. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createDefaultSave(now: Date = new Date()): SaveV2 {
  return {
    version: SAVE_VERSION,
    profile: {
      displayName: '',
      createdAt: now.toISOString(),
      firstRunCompleted: false,
      lastLevelId: null,
    },
    progress: {
      stars: {},
      boards: {},
      onboarding: { currentStep: {}, completed: {}, seenTwists: [] },
    },
    settings: { theme: 'light', soundMuted: false, simSpeed: 1 },
  };
}

export function getBrowserStorage(): KeyValueStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

const NOTICE_UNAVAILABLE = 'Browser storage is blocked. You can play, but progress will not be saved.';
const NOTICE_READONLY = 'Your saved progress is from a newer version of AccessDenied. This session will not overwrite it.';
const NOTICE_CORRUPT = 'Saved progress could not be read, so the game started fresh. A backup of the old data was kept.';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeStars(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && v >= 0 && v <= 3) out[k] = Math.floor(v);
  }
  return out;
}

/** Fill any missing fields of a v2 record with defaults. */
function normalize(raw: Record<string, unknown>): SaveV2 {
  const d = createDefaultSave();
  const profile = isRecord(raw.profile) ? raw.profile : {};
  const progress = isRecord(raw.progress) ? raw.progress : {};
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const onboarding = isRecord(progress.onboarding) ? progress.onboarding : {};

  return {
    version: SAVE_VERSION,
    profile: {
      displayName: typeof profile.displayName === 'string' ? profile.displayName : d.profile.displayName,
      createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : d.profile.createdAt,
      firstRunCompleted: profile.firstRunCompleted === true,
      lastLevelId: typeof profile.lastLevelId === 'string' ? profile.lastLevelId : null,
    },
    progress: {
      stars: sanitizeStars(progress.stars),
      boards: isRecord(progress.boards) ? (progress.boards as Record<string, SavedBoard>) : {},
      onboarding: {
        currentStep: isRecord(onboarding.currentStep) ? (onboarding.currentStep as Record<string, number>) : {},
        completed: isRecord(onboarding.completed) ? (onboarding.completed as Record<string, boolean>) : {},
        seenTwists: Array.isArray(onboarding.seenTwists) ? onboarding.seenTwists.filter(s => typeof s === 'string') : [],
      },
    },
    settings: {
      theme: settings.theme === 'dark' ? 'dark' : 'light',
      soundMuted: settings.soundMuted === true,
      simSpeed: settings.simSpeed === 2 ? 2 : 1,
    },
  };
}

/** Build a v2 record from the legacy v1 keys. Never deletes them (rollback safety). */
export function migrateLegacy(storage: KeyValueStorage): SaveV2 {
  const save = createDefaultSave();
  try {
    const rawStars = storage.getItem(LEGACY_STARS_KEY);
    if (rawStars) save.progress.stars = sanitizeStars(JSON.parse(rawStars));
  } catch {
    // Unreadable legacy stars: start without them.
  }
  try {
    if (storage.getItem(LEGACY_THEME_KEY) === 'dark') save.settings.theme = 'dark';
  } catch {
    // Ignore.
  }
  // Returning v1 players have already been through the game.
  if (Object.keys(save.progress.stars).length > 0) save.profile.firstRunCompleted = true;
  return save;
}

export function loadSave(storage: KeyValueStorage | null = getBrowserStorage()): LoadResult {
  if (!storage) {
    return { save: createDefaultSave(), status: 'unavailable', notice: NOTICE_UNAVAILABLE };
  }

  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { save: createDefaultSave(), status: 'unavailable', notice: NOTICE_UNAVAILABLE };
  }

  if (raw === null) {
    const migrated = migrateLegacy(storage);
    writeSave(migrated, 'ok', storage);
    return { save: migrated, status: 'ok', notice: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }

  if (!isRecord(parsed) || typeof parsed.version !== 'number') {
    try {
      storage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // Best effort.
    }
    return { save: createDefaultSave(), status: 'ok', notice: NOTICE_CORRUPT };
  }

  if (parsed.version > SAVE_VERSION) {
    return { save: createDefaultSave(), status: 'readonly', notice: NOTICE_READONLY };
  }

  return { save: normalize(parsed), status: 'ok', notice: null };
}

/** Returns true when the record was written. */
export function writeSave(
  save: SaveV2,
  status: StorageStatus,
  storage: KeyValueStorage | null = getBrowserStorage()
): boolean {
  if (status !== 'ok' || !storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** Stable short hash of a level's starting setup, used to detect stale saved boards. */
export function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

const TRANSIENT_EDGE_KEYS = ['isSimulating', 'isExploit', 'speed', 'returnOutcome', 'returnLabel'];

/** Strip React Flow runtime fields and simulation state before saving or exporting. */
export function serializeBoard(nodes: Node<CloudNodeData>[], edges: Edge[]): Pick<SavedBoard, 'nodes' | 'edges'> {
  return {
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: n.data,
      ...(n.parentId ? { parentId: n.parentId } : {}),
      ...(n.extent === 'parent' ? { extent: 'parent' as const } : {}),
      ...(n.deletable === false ? { deletable: false } : {}),
    })),
    edges: edges.map(e => {
      const data = e.data ? { ...e.data } : undefined;
      if (data) for (const k of TRANSIENT_EDGE_KEYS) delete data[k];
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        ...(e.label !== undefined ? { label: e.label } : {}),
        ...(data && Object.keys(data).length > 0 ? { data } : {}),
      };
    }),
  };
}
