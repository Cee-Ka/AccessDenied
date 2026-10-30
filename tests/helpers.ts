import { useGameStore } from '../src/store/useGameStore';
import type { KeyValueStorage } from '../src/persistence/save';

/** Clean store with the given level loaded (no saved boards, no history). */
export function freshLevel(levelId: string, stars: Record<string, number> = {}) {
  useGameStore.getState().resetCampaignProgress();
  useGameStore.setState({ starRecords: stars, toast: null });
  useGameStore.getState().loadLevel(levelId);
  return useGameStore.getState();
}

/** Run the simulation and skip to the end so tests don't wait on animations. */
export async function runSkipped() {
  const run = useGameStore.getState().runSimulation();
  await useGameStore.getState().runSimulation();
  await run;
  return useGameStore.getState();
}

export class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  constructor(seed: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(seed)) this.data.set(k, v);
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

export class BlockedStorage implements KeyValueStorage {
  getItem(): string | null {
    throw new DOMException('blocked', 'SecurityError');
  }
  setItem(): void {
    throw new DOMException('blocked', 'SecurityError');
  }
  removeItem(): void {
    throw new DOMException('blocked', 'SecurityError');
  }
}
