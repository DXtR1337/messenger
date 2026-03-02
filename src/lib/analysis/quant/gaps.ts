/**
 * Communication gap detection for Tryb Eks.
 *
 * Scans raw message timestamps to find all significant gaps (>7 days),
 * classifies them by severity, and computes surrounding volume context.
 * This data feeds into AI context so the model can identify breakups
 * and reunions that stratified sampling might miss.
 */

export type GapClassification = 'cooling_off' | 'potential_breakup' | 'extended_separation';

export interface CommunicationGap {
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  durationDays: number;
  lastSender: string;
  nextSender: string;
  classification: GapClassification;
  /** Messages/month in 30 days before the gap */
  volumeBefore: number;
  /** Messages/month in 30 days after the gap */
  volumeAfter: number;
}

interface MinimalMessage {
  timestamp: number;
  sender: string;
}

interface MonthlyVolumeEntry {
  month: string; // YYYY-MM
  total: number;
}

const DAY_MS = 86_400_000;
const GAP_THRESHOLD_MS = 7 * DAY_MS;
const COOLING_OFF_MAX_MS = 14 * DAY_MS;
const POTENTIAL_BREAKUP_MAX_MS = 30 * DAY_MS;
const MAX_GAPS = 15;

function classifyGap(durationMs: number): GapClassification {
  if (durationMs < COOLING_OFF_MAX_MS) return 'cooling_off';
  if (durationMs < POTENTIAL_BREAKUP_MAX_MS) return 'potential_breakup';
  return 'extended_separation';
}

/**
 * Estimate monthly volume around a timestamp by looking at the monthlyVolume array.
 * Returns the average of the month containing the timestamp and its neighbor.
 */
function volumeAroundTimestamp(
  timestamp: number,
  monthlyVolume: MonthlyVolumeEntry[],
): number {
  if (monthlyVolume.length === 0) return 0;
  const date = new Date(timestamp);
  const targetMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const idx = monthlyVolume.findIndex(mv => mv.month === targetMonth);
  if (idx === -1) return 0;
  return monthlyVolume[idx].total;
}

/**
 * Detect all communication gaps >7 days from a chronologically sorted message array.
 * Returns top 15 gaps sorted by duration descending.
 */
export function detectCommunicationGaps(
  allMessages: MinimalMessage[],
  monthlyVolume: MonthlyVolumeEntry[],
): CommunicationGap[] {
  if (allMessages.length < 2) return [];

  const gaps: CommunicationGap[] = [];

  for (let i = 1; i < allMessages.length; i++) {
    const prev = allMessages[i - 1];
    const curr = allMessages[i];
    const durationMs = curr.timestamp - prev.timestamp;

    if (durationMs >= GAP_THRESHOLD_MS) {
      gaps.push({
        startTimestamp: prev.timestamp,
        endTimestamp: curr.timestamp,
        durationMs,
        durationDays: Math.round(durationMs / DAY_MS),
        lastSender: prev.sender,
        nextSender: curr.sender,
        classification: classifyGap(durationMs),
        volumeBefore: volumeAroundTimestamp(prev.timestamp, monthlyVolume),
        volumeAfter: volumeAroundTimestamp(curr.timestamp, monthlyVolume),
      });
    }
  }

  // Sort by duration descending, cap at MAX_GAPS
  gaps.sort((a, b) => b.durationMs - a.durationMs);
  return gaps.slice(0, MAX_GAPS);
}
