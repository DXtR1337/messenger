import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type { StoredAnalysis, AnalysisIndexEntry } from './analysis/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// UUID generation — fallback for environments where crypto.randomUUID is unavailable
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: manual v4 UUID
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => {
    const n = Number(c);
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16);
  });
}

// ============================================================
// IndexedDB Storage (replaces localStorage for large data)
// ============================================================

const DB_NAME = 'podtekst';
export const LEGACY_DB_NAME = 'chatscope';
const DB_VERSION = 1;
const STORE_ANALYSES = 'analyses';
const STORE_INDEX = 'index';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ANALYSES)) {
        db.createObjectStore(STORE_ANALYSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_INDEX)) {
        db.createObjectStore(STORE_INDEX, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };
  });
}

export async function saveAnalysis(analysis: StoredAnalysis): Promise<void> {
  const db = await openDB();

  // Save the full analysis
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ANALYSES, 'readwrite');
      tx.objectStore(STORE_ANALYSES).put(analysis);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new Error('Brak miejsca w przeglądarce. Wyczyść stare analizy w Ustawieniach.');
    }
    throw err;
  }

  // Update the lightweight index
  const entry: AnalysisIndexEntry = {
    id: analysis.id,
    title: analysis.title,
    createdAt: analysis.createdAt,
    messageCount: analysis.conversation.metadata.totalMessages,
    participants: analysis.conversation.participants.map(p => p.name),
    hasQualitative: analysis.qualitative?.status === 'complete',
    healthScore: analysis.qualitative?.pass4?.health_score?.overall,
    conversationFingerprint: analysis.conversationFingerprint,
    platform: analysis.conversation.platform,
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_INDEX, 'readwrite');
      tx.objectStore(STORE_INDEX).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new Error('Brak miejsca w przeglądarce. Wyczyść stare analizy w Ustawieniach.');
    }
    throw err;
  }
}

/**
 * Atomically patch a single generated image into an analysis in IndexedDB.
 * Uses a single readwrite transaction (get → mutate → put) so the write
 * succeeds even if the React component tree has already unmounted.
 */
export async function patchGeneratedImage(
  analysisId: string,
  key: string,
  dataUrl: string,
): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ANALYSES, 'readwrite');
    const store = tx.objectStore(STORE_ANALYSES);
    const req = store.get(analysisId);
    req.onsuccess = () => {
      const analysis = req.result as StoredAnalysis | undefined;
      if (!analysis) {
        resolve();
        return;
      }
      analysis.generatedImages = {
        ...(analysis.generatedImages ?? {}),
        [key]: dataUrl,
      };
      store.put(analysis);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAnalysis(id: string): Promise<StoredAnalysis | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANALYSES, 'readonly');
    const req = tx.objectStore(STORE_ANALYSES).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listAnalyses(): Promise<AnalysisIndexEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INDEX, 'readonly');
    const req = tx.objectStore(STORE_INDEX).getAll();
    req.onsuccess = () => {
      const entries = req.result as AnalysisIndexEntry[];
      // Sort by createdAt desc
      entries.sort((a, b) => b.createdAt - a.createdAt);
      resolve(entries);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listAnalysesByFingerprint(fingerprint: string): Promise<AnalysisIndexEntry[]> {
  const all = await listAnalyses();
  return all.filter(e => e.conversationFingerprint === fingerprint);
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_ANALYSES, STORE_INDEX], 'readwrite');
    tx.objectStore(STORE_ANALYSES).delete(id);
    tx.objectStore(STORE_INDEX).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================
// Legacy DB migration (chatscope → podtekst)
// ============================================================

export async function migrateLegacyDB(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  if (localStorage.getItem('podtekst-legacy-migrated') === 'true') return;

  try {
    const databases = await indexedDB.databases();
    const legacyExists = databases.some(db => db.name === LEGACY_DB_NAME);
    if (!legacyExists) {
      localStorage.setItem('podtekst-legacy-migrated', 'true');
      return;
    }

    const legacyDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(LEGACY_DB_NAME, 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const storeNames = Array.from(legacyDB.objectStoreNames);
    if (storeNames.length === 0) {
      legacyDB.close();
      localStorage.setItem('podtekst-legacy-migrated', 'true');
      return;
    }

    const newDB = await openDB();

    // Copy analyses
    if (storeNames.includes('analyses')) {
      const legacyTx = legacyDB.transaction('analyses', 'readonly');
      const legacyStore = legacyTx.objectStore('analyses');
      const allAnalyses = await new Promise<unknown[]>((resolve, reject) => {
        const req = legacyStore.getAll();
        req.onsuccess = () => resolve(req.result as unknown[]);
        req.onerror = () => reject(req.error);
      });

      if (allAnalyses.length > 0) {
        const newTx = newDB.transaction(STORE_ANALYSES, 'readwrite');
        const newStore = newTx.objectStore(STORE_ANALYSES);
        for (const analysis of allAnalyses) {
          newStore.put(analysis);
        }
        await new Promise<void>((resolve, reject) => {
          newTx.oncomplete = () => resolve();
          newTx.onerror = () => reject(newTx.error);
        });
      }
    }

    // Copy index
    if (storeNames.includes('index')) {
      const legacyTx = legacyDB.transaction('index', 'readonly');
      const legacyStore = legacyTx.objectStore('index');
      const allIndex = await new Promise<unknown[]>((resolve, reject) => {
        const req = legacyStore.getAll();
        req.onsuccess = () => resolve(req.result as unknown[]);
        req.onerror = () => reject(req.error);
      });

      if (allIndex.length > 0) {
        const newTx = newDB.transaction(STORE_INDEX, 'readwrite');
        const newStore = newTx.objectStore(STORE_INDEX);
        for (const entry of allIndex) {
          newStore.put(entry);
        }
        await new Promise<void>((resolve, reject) => {
          newTx.oncomplete = () => resolve();
          newTx.onerror = () => reject(newTx.error);
        });
      }
    }

    legacyDB.close();
    localStorage.setItem('podtekst-legacy-migrated', 'true');
  } catch (err) {
    console.error('[migrateLegacyDB]', err);
    // Don't block app startup on migration failure
  }
}

// ============================================================
// Formatting utilities
// ============================================================

export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) {
    const mins = ms / 60_000;
    return mins % 1 === 0 ? `${mins}m` : `${parseFloat(mins.toFixed(1))}m`;
  }
  if (ms < 86_400_000) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
