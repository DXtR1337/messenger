/**
 * Decodes a compressed share payload from a URL parameter.
 *
 * Returns null on any failure (invalid data, corrupted compression, etc.).
 */

import { decompressFromEncodedURIComponent } from 'lz-string';
import type { SharePayload } from './types';

function isValidPayload(data: unknown): data is SharePayload {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  // Version check
  if (obj.v !== 1) return false;

  // Required fields
  if (typeof obj.participantCount !== 'number') return false;
  if (typeof obj.messageCount !== 'number') return false;

  // dateRange must have start and end
  if (typeof obj.dateRange !== 'object' || obj.dateRange === null) return false;
  const dr = obj.dateRange as Record<string, unknown>;
  if (typeof dr.start !== 'number' || typeof dr.end !== 'number') return false;

  // badges must be an array
  if (!Array.isArray(obj.badges)) return false;

  // keyFindings must be an array
  if (!Array.isArray(obj.keyFindings)) return false;

  // Optional fields — type check only if present
  if (obj.healthScore !== null && typeof obj.healthScore !== 'number') return false;
  if (obj.executiveSummary !== null && typeof obj.executiveSummary !== 'string') return false;
  if (obj.roastVerdict !== null && typeof obj.roastVerdict !== 'string') return false;
  if (obj.relationshipType !== null && typeof obj.relationshipType !== 'string') return false;

  return true;
}

export function decodeShareData(encoded: string): SharePayload | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);
    if (!isValidPayload(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}
