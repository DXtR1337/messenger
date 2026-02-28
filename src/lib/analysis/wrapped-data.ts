/**
 * Wrapped Mode — transforms analysis data into 10 slide payloads.
 * Works with quantitative data only (no AI required).
 * All user-facing strings are in Polish.
 */

import type {
  QuantitativeAnalysis,
  ParsedConversation,
  PersonMetrics,
} from '@/lib/parsers/types';

// ─── Slide Types ──────────────────────────────────────────

export type SlideType =
  | 'intro'
  | 'total-messages'
  | 'duration'
  | 'who-texts-more'
  | 'response-time'
  | 'night-owl'
  | 'top-emoji'
  | 'peak-hour'
  | 'most-active-month'
  | 'summary';

export interface WrappedSlide {
  type: SlideType;
  gradient: string;
  emoji: string;
  title: string;
  value: string;
  subtitle: string;
  detail?: string;
  /** For comparison slides */
  personA?: { name: string; value: string; percent: number };
  personB?: { name: string; value: string; percent: number };
  /** For summary */
  stats?: Array<{ label: string; value: string; emoji: string }>;
}

// ─── Gradient Palette ─────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', // intro — deep purple
  'linear-gradient(135deg, #000428, #004e92)',            // total messages — ocean blue
  'linear-gradient(135deg, #0b3d3b, #1f8a70)',            // duration — emerald teal
  'linear-gradient(135deg, #0d1b2a, #1b4965, #2a6496)',   // who texts — azure
  'linear-gradient(135deg, #200122, #6f0000)',             // response time — wine red
  'linear-gradient(135deg, #020024, #0a0a52, #0f1b6e)',    // night owl — deep indigo
  'linear-gradient(135deg, #0a3d2e, #2d6a4f)',             // emoji — forest green
  'linear-gradient(135deg, #1a0800, #7c3b00, #b8560f)',    // peak hour — amber fire
  'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',    // most active — steel blue
  'linear-gradient(135deg, #1a0a2e, #302b63, #0f3460)',    // summary — purple-blue
] as const;

// ─── Helpers ──────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString('pl-PL');
}

function formatDuration(days: number): string {
  const years = Math.floor(days / 365.25);
  const months = Math.round((days % 365.25) / 30.44);

  if (years >= 1) {
    const yWord = years === 1 ? 'rok' : years <= 4 ? 'lata' : 'lat';
    if (months > 0) {
      const mWord = months === 1 ? 'miesiąc' : months <= 4 ? 'miesiące' : 'miesięcy';
      return `${years} ${yWord} i ${months} ${mWord}`;
    }
    return `${years} ${yWord}`;
  }

  if (months >= 1) {
    const mWord = months === 1 ? 'miesiąc' : months <= 4 ? 'miesiące' : 'miesięcy';
    return `${months} ${mWord}`;
  }

  return `${days} dni`;
}

function formatMinutes(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

function safePercent(a: number, b: number): [number, number] {
  const total = a + b;
  if (total === 0) return [50, 50];
  const pA = Math.round((a / total) * 100);
  return [pA, 100 - pA];
}

function findPeakHour(heatmap: QuantitativeAnalysis['heatmap']): { hour: number; count: number } {
  const combined = heatmap.combined;
  let maxHour = 12;
  let maxCount = 0;

  for (let hour = 0; hour < 24; hour++) {
    let total = 0;
    for (let day = 0; day < 7; day++) {
      total += combined[day]?.[hour] ?? 0;
    }
    if (total > maxCount) {
      maxCount = total;
      maxHour = hour;
    }
  }

  return { hour: maxHour, count: maxCount };
}

function findMostActiveMonth(
  patterns: QuantitativeAnalysis['patterns'],
): { month: string; total: number } | null {
  const volumes = patterns.monthlyVolume;
  if (volumes.length === 0) return null;

  let best = volumes[0];
  for (const v of volumes) {
    if (v.total > best.total) best = v;
  }

  return best;
}

const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

function formatMonthLabel(ym: string): string {
  const parts = ym.split('-');
  const m = parseInt(parts[1] ?? '0', 10);
  const y = parts[0] ?? '';
  return `${MONTHS_PL[m - 1] ?? ''} ${y}`;
}

// ─── Main Generator ───────────────────────────────────────

export function generateWrappedSlides(
  conversation: ParsedConversation,
  quantitative: QuantitativeAnalysis,
): WrappedSlide[] {
  const participants = conversation.participants.map((p) => p.name);
  const [nameA, nameB] = participants;
  const metricsA: PersonMetrics | undefined = quantitative.perPerson[nameA];
  const metricsB: PersonMetrics | undefined = nameB ? quantitative.perPerson[nameB] : undefined;
  const totalMessages = conversation.metadata.totalMessages;
  const durationDays = conversation.metadata.durationDays;
  const perDay = durationDays > 0 ? (totalMessages / durationDays).toFixed(1) : '0';

  const slides: WrappedSlide[] = [];

  // ── Slide 1: Intro ──
  slides.push({
    type: 'intro',
    gradient: GRADIENTS[0],
    emoji: '\u{1F4AC}',
    title: conversation.title,
    value: 'Wrapped',
    subtitle: `${formatNumber(totalMessages)} wiadomości \u00B7 ${formatDuration(durationDays)}`,
  });

  // ── Slide 2: Total Messages ──
  const totalWords = Object.values(quantitative.perPerson).reduce(
    (sum: number, p: PersonMetrics) => sum + p.totalWords, 0,
  );
  const books = (totalWords / 70_000).toFixed(1);
  slides.push({
    type: 'total-messages',
    gradient: GRADIENTS[1],
    emoji: '\u{1F4E8}',
    title: 'Wymieniliście',
    value: formatNumber(totalMessages),
    subtitle: 'wiadomości',
    detail: `To ${perDay} wiadomości dziennie i ${formatNumber(totalWords)} słów \u2014 jak ${books} książek`,
  });

  // ── Slide 3: Duration ──
  slides.push({
    type: 'duration',
    gradient: GRADIENTS[2],
    emoji: '\u{1F4C5}',
    title: 'Wasza historia trwa',
    value: formatDuration(durationDays),
    subtitle: `${formatNumber(durationDays)} dni rozmowy`,
    detail: durationDays > 365
      ? `To ponad ${Math.floor(durationDays / 365)} rok na jednym czacie`
      : `${Math.round(durationDays / 7)} tygodni nieprzerwanej komunikacji`,
  });

  // ── Slide 4: Who Texts More ──
  if (nameA && nameB && metricsA && metricsB) {
    const [pctA, pctB] = safePercent(metricsA.totalMessages, metricsB.totalMessages);
    const winner = pctA >= pctB ? nameA : nameB;
    slides.push({
      type: 'who-texts-more',
      gradient: GRADIENTS[3],
      emoji: '\u{1F4F1}',
      title: 'Kto pisze więcej?',
      value: winner,
      subtitle: `${pctA >= pctB ? pctA : pctB}% wszystkich wiadomości`,
      personA: { name: nameA, value: formatNumber(metricsA.totalMessages), percent: pctA },
      personB: { name: nameB, value: formatNumber(metricsB.totalMessages), percent: pctB },
    });
  }

  // ── Slide 5: Response Time ──
  if (nameA && nameB) {
    const rtA = quantitative.timing.perPerson[nameA]?.medianResponseTimeMs ?? 0;
    const rtB = quantitative.timing.perPerson[nameB]?.medianResponseTimeMs ?? 0;
    const fasterName = rtA <= rtB ? nameA : nameB;
    const fasterTime = Math.min(rtA, rtB);
    const slowerTime = Math.max(rtA, rtB);
    slides.push({
      type: 'response-time',
      gradient: GRADIENTS[4],
      emoji: '\u{23F1}\uFE0F',
      title: 'Kto odpowiada szybciej?',
      value: fasterName,
      subtitle: `Średnio w ${formatMinutes(fasterTime)}`,
      detail: `Wolniejsza osoba odpowiada w ${formatMinutes(slowerTime)}`,
      personA: { name: nameA, value: formatMinutes(rtA), percent: rtA <= rtB ? 100 : Math.min(100, Math.round((rtB / (rtA || 1)) * 100)) },
      personB: { name: nameB, value: formatMinutes(rtB), percent: rtB <= rtA ? 100 : Math.min(100, Math.round((rtA / (rtB || 1)) * 100)) },
    });
  }

  // ── Slide 6: Night Owl ──
  const nightMessages = quantitative.timing.lateNightMessages;
  const nightTotal = Object.values(nightMessages).reduce((sum, n) => sum + n, 0);
  if (nightTotal > 0 && nameA && nameB) {
    const nightA = nightMessages[nameA] ?? 0;
    const nightB = nightMessages[nameB] ?? 0;
    const owlName = nightA >= nightB ? nameA : nameB;
    const owlCount = Math.max(nightA, nightB);
    slides.push({
      type: 'night-owl',
      gradient: GRADIENTS[5],
      emoji: '\u{1F319}',
      title: 'Nocna zmiana',
      value: formatNumber(nightTotal),
      subtitle: 'wiadomości po 22:00',
      detail: `${owlName} wysyła ${formatNumber(owlCount)} z nich \u2014 prawdziwa sowa`,
    });
  }

  // ── Slide 7: Top Emoji ──
  const allEmojis = new Map<string, number>();
  for (const p of Object.values(quantitative.perPerson)) {
    for (const e of (p as PersonMetrics).topEmojis ?? []) {
      allEmojis.set(e.emoji, (allEmojis.get(e.emoji) ?? 0) + e.count);
    }
  }
  const sortedEmojis = [...allEmojis.entries()].sort((a, b) => b[1] - a[1]);
  const topEmoji = sortedEmojis[0];
  if (topEmoji) {
    const totalEmoji = [...allEmojis.values()].reduce((s, c) => s + c, 0);
    slides.push({
      type: 'top-emoji',
      gradient: GRADIENTS[6],
      emoji: topEmoji[0],
      title: 'Wasze ulubione emoji',
      value: topEmoji[0],
      subtitle: `Użyte ${formatNumber(topEmoji[1])} razy`,
      detail: `Łącznie użyliście ${formatNumber(totalEmoji)} emoji${sortedEmojis.length > 1 ? ` \u2014 #2 to ${sortedEmojis[1][0]}` : ''}`,
    });
  }

  // ── Slide 8: Peak Hour ──
  const peak = findPeakHour(quantitative.heatmap);
  const peakHourLabel = `${String(peak.hour).padStart(2, '0')}:00`;
  const peakEndLabel = `${String((peak.hour + 1) % 24).padStart(2, '0')}:00`;
  slides.push({
    type: 'peak-hour',
    gradient: GRADIENTS[7],
    emoji: peak.hour >= 6 && peak.hour < 18 ? '\u2600\uFE0F' : '\u{1F303}',
    title: 'Wasza złota godzina',
    value: peakHourLabel,
    subtitle: `Najczęściej rozmawiacie między ${peakHourLabel} a ${peakEndLabel}`,
    detail: `${formatNumber(peak.count)} wiadomości w tej godzinie łącznie`,
  });

  // ── Slide 9: Most Active Month ──
  const bestMonth = findMostActiveMonth(quantitative.patterns);
  if (bestMonth) {
    slides.push({
      type: 'most-active-month',
      gradient: GRADIENTS[8],
      emoji: '\u{1F525}',
      title: 'Wasz rekordowy miesiąc',
      value: formatMonthLabel(bestMonth.month),
      subtitle: `${formatNumber(bestMonth.total)} wiadomości`,
      detail: `To ${(bestMonth.total / 30).toFixed(0)} wiadomości dziennie w tym miesiącu`,
    });
  }

  // ── Slide 10: Summary Card ──
  const summaryStats: Array<{ label: string; value: string; emoji: string }> = [
    { label: 'Wiadomości', value: formatNumber(totalMessages), emoji: '\u{1F4AC}' },
    { label: 'Dni', value: formatNumber(durationDays), emoji: '\u{1F4C5}' },
    { label: 'Słów', value: formatNumber(totalWords), emoji: '\u{1F4DD}' },
    { label: 'Dziennie', value: perDay, emoji: '\u{1F4CA}' },
  ];

  if (topEmoji) {
    summaryStats.push({ label: 'Top emoji', value: topEmoji[0], emoji: '\u{1F3AF}' });
  }
  summaryStats.push({ label: 'Złota godzina', value: peakHourLabel, emoji: '\u{231A}' });

  slides.push({
    type: 'summary',
    gradient: GRADIENTS[9],
    emoji: '\u{2728}',
    title: conversation.title,
    value: 'Podsumowanie',
    subtitle: `${formatDuration(durationDays)} wspólnych rozmów`,
    stats: summaryStats,
  });

  return slides;
}
