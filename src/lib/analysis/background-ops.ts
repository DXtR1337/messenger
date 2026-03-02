/**
 * Module-level store for background operation state.
 *
 * When a hook starts an SSE operation, it registers here.
 * If the component unmounts (user navigates away), the operation
 * continues and updates this store. When the hook re-mounts,
 * it reads from here to restore loading state + prevent duplicate calls.
 *
 * Uses useSyncExternalStore for React integration.
 */

export interface BackgroundOpState {
  progress: number;
  phaseName: string;
  isComplete: boolean;
  error: string | null;
}

const store = new Map<string, BackgroundOpState>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

export function getBackgroundOp(key: string): BackgroundOpState | undefined {
  return store.get(key);
}

export function setBackgroundOp(key: string, state: BackgroundOpState) {
  store.set(key, state);
  notify();
}

export function clearBackgroundOp(key: string) {
  store.delete(key);
  notify();
}

/** For useSyncExternalStore */
export function subscribeBackgroundOps(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Snapshot factory for useSyncExternalStore — returns a stable reference per key */
const snapshots = new Map<string, () => BackgroundOpState | undefined>();

export function getSnapshotFactory(key: string) {
  if (!snapshots.has(key)) {
    snapshots.set(key, () => store.get(key));
  }
  return snapshots.get(key)!;
}
