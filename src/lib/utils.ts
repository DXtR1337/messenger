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

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ANALYSES)) {
        db.createObjectStore(STORE_ANALYSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_INDEX)) {
        db.createObjectStore(STORE_INDEX, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAnalysis(analysis: StoredAnalysis): Promise<void> {
  const db = await openDB();

  // Save the full analysis
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ANALYSES, 'readwrite');
    tx.objectStore(STORE_ANALYSES).put(analysis);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

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

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_INDEX, 'readwrite');
    tx.objectStore(STORE_INDEX).put(entry);
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
// Formatting utilities
// ============================================================

export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.round((ms % 3_600_000) / 60_000);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(ms / 86_400_000);
  const h = Math.round((ms % 86_400_000) / 3_600_000);
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
