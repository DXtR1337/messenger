/**
 * Storage utilities for Settings page.
 * Provides IndexedDB export/import/clear and localStorage management.
 */

import type { StoredAnalysis, AnalysisIndexEntry } from '@/lib/analysis/types';
import { logger } from '@/lib/logger';

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const DB_NAME = 'podtekst';
const STORE_ANALYSES = 'analyses';
const STORE_INDEX = 'index';
const LOCALSTORAGE_PREFIX = 'podtekst';

// -------------------------------------------------------------------
// IndexedDB helpers (mirror openDB from utils.ts to avoid circular deps)
// -------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
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

// -------------------------------------------------------------------
// Storage size estimation
// -------------------------------------------------------------------

export interface StorageEstimate {
  /** IndexedDB estimated usage in bytes */
  indexedDB: number;
  /** localStorage estimated usage in bytes */
  localStorage: number;
  /** Total estimated usage in bytes */
  total: number;
  /** Number of stored analyses */
  analysisCount: number;
}

export async function estimateStorageUsage(): Promise<StorageEstimate> {
  let idbSize = 0;
  let analysisCount = 0;

  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      idbSize = estimate.usage ?? 0;
    }
  } catch {
    // Fallback: count analyses
  }

  try {
    const db = await openDB();
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_INDEX, 'readonly');
      const req = tx.objectStore(STORE_INDEX).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    analysisCount = count;
  } catch {
    // ignore
  }

  let lsSize = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        lsSize += key.length + (localStorage.getItem(key)?.length ?? 0);
      }
    }
    lsSize *= 2; // UTF-16 encoding
  } catch {
    // ignore
  }

  return {
    indexedDB: idbSize,
    localStorage: lsSize,
    total: idbSize + lsSize,
    analysisCount,
  };
}

// -------------------------------------------------------------------
// Export all data
// -------------------------------------------------------------------

export interface ExportData {
  version: 1;
  exportedAt: string;
  analyses: StoredAnalysis[];
  index: AnalysisIndexEntry[];
  localStorage: Record<string, string>;
}

export async function exportAllData(): Promise<ExportData> {
  const db = await openDB();

  const analyses = await new Promise<StoredAnalysis[]>((resolve, reject) => {
    const tx = db.transaction(STORE_ANALYSES, 'readonly');
    const req = tx.objectStore(STORE_ANALYSES).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const index = await new Promise<AnalysisIndexEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE_INDEX, 'readonly');
    const req = tx.objectStore(STORE_INDEX).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const lsData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LOCALSTORAGE_PREFIX)) {
      lsData[key] = localStorage.getItem(key) ?? '';
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    analyses,
    index,
    localStorage: lsData,
  };
}

export function downloadExportData(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `podtekst-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------
// Import data
// -------------------------------------------------------------------

export async function importData(file: File): Promise<{ analysesImported: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as ExportData;

  if (data.version !== 1) {
    throw new Error('Nieobsługiwana wersja backupu');
  }

  const db = await openDB();

  // Import analyses + index in a single atomic transaction
  let validAnalysesCount = 0;
  if (data.analyses?.length || data.index?.length) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_ANALYSES, STORE_INDEX], 'readwrite');

      // Import analyses
      if (data.analyses?.length) {
        const analysesStore = tx.objectStore(STORE_ANALYSES);
        for (const analysis of data.analyses) {
          // Validate each analysis has required shape before import
          if (
            !analysis ||
            typeof analysis !== 'object' ||
            typeof (analysis as unknown as Record<string, unknown>).id !== 'string' ||
            typeof (analysis as unknown as Record<string, unknown>).title !== 'string'
          ) {
            logger.warn('[ImportData] Pominięto nieprawidłową analizę:', analysis);
            continue;
          }
          try {
            analysesStore.put(analysis);
            validAnalysesCount++;
          } catch (err) {
            if (err instanceof DOMException && err.name === 'QuotaExceededError') {
              tx.abort();
              reject(new Error('Brak miejsca w przeglądarce. Wyczyść stare analizy w Ustawieniach.'));
              return;
            }
            throw err;
          }
        }
      }

      // Import index
      if (data.index?.length) {
        const indexStore = tx.objectStore(STORE_INDEX);
        for (const entry of data.index) {
          // Validate each index entry has required shape before import
          if (
            !entry ||
            typeof entry !== 'object' ||
            typeof (entry as unknown as Record<string, unknown>).id !== 'string'
          ) {
            logger.warn('[ImportData] Pominięto nieprawidłowy wpis indeksu:', entry);
            continue;
          }
          try {
            indexStore.put(entry);
          } catch (err) {
            if (err instanceof DOMException && err.name === 'QuotaExceededError') {
              tx.abort();
              reject(new Error('Brak miejsca w przeglądarce. Wyczyść stare analizy w Ustawieniach.'));
              return;
            }
            throw err;
          }
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        const txError = tx.error;
        if (txError && txError.name === 'QuotaExceededError') {
          reject(new Error('Brak miejsca w przeglądarce. Wyczyść stare analizy w Ustawieniach.'));
        } else {
          reject(txError);
        }
      };
    });
  }

  // Import localStorage
  if (data.localStorage) {
    for (const [key, value] of Object.entries(data.localStorage)) {
      localStorage.setItem(key, value);
    }
  }

  return { analysesImported: validAnalysesCount };
}

// -------------------------------------------------------------------
// Clear all data
// -------------------------------------------------------------------

export async function clearAllData(): Promise<void> {
  // Clear IndexedDB
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_ANALYSES, STORE_INDEX], 'readwrite');
    tx.objectStore(STORE_ANALYSES).clear();
    tx.objectStore(STORE_INDEX).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Clear podtekst-* localStorage keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LOCALSTORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

// -------------------------------------------------------------------
// Format bytes for display
// -------------------------------------------------------------------

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
