/**
 * Transforms raw analysis data into shapes needed by story components.
 * All user-facing strings are in Polish.
 */

import type {
  QuantitativeAnalysis,
  ParsedConversation,
  PersonMetrics,
} from '@/lib/parsers/types';
import type { PersonProfile } from '@/lib/analysis/types';

// ============================================================
// 1. VersusCard Data
// ============================================================

export interface VersusCardData {
  emoji: string;
  label: string;
  labelPl: string;
  personAPercent: number;
  personBPercent: number;
  personAName: string;
  personBName: string;
  evidence: string;
}

function safePercent(a: number, b: number): [number, number] {
  const total = a + b;
  if (total === 0) return [50, 50];
  const pA = (a / total) * 100;
  return [pA, 100 - pA];
}

function formatRatio(a: number, b: number): string {
  if (b === 0) return a === 0 ? '1.0' : '∞';
  return (a / b).toFixed(1);
}

export function computeVersusCards(
  quantitative: QuantitativeAnalysis,
  participants: string[],
): VersusCardData[] {
  const [nameA, nameB] = participants;
  const metricsA = quantitative.perPerson[nameA];
  const metricsB = quantitative.perPerson[nameB];

  if (!metricsA || !metricsB) return [];

  const doubleA = quantitative.engagement.doubleTexts[nameA] ?? 0;
  const doubleB = quantitative.engagement.doubleTexts[nameB] ?? 0;
  const [dblPctA, dblPctB] = safePercent(doubleA, doubleB);

  const respA = quantitative.timing.perPerson[nameA]?.medianResponseTimeMs ?? 0;
  const respB = quantitative.timing.perPerson[nameB]?.medianResponseTimeMs ?? 0;
  const [ghostPctA, ghostPctB] = safePercent(respA, respB);

  const lenA = metricsA.averageMessageLength;
  const lenB = metricsB.averageMessageLength;
  const [thinkPctA, thinkPctB] = safePercent(lenA, lenB);

  const nightA = quantitative.timing.lateNightMessages[nameA] ?? 0;
  const nightB = quantitative.timing.lateNightMessages[nameB] ?? 0;
  const [nightPctA, nightPctB] = safePercent(nightA, nightB);

  const reactA = metricsA.reactionsGiven;
  const reactB = metricsB.reactionsGiven;
  const [simpPctA, simpPctB] = safePercent(reactA, reactB);

  const initA = quantitative.timing.conversationInitiations[nameA] ?? 0;
  const initB = quantitative.timing.conversationInitiations[nameB] ?? 0;
  const [startPctA, startPctB] = safePercent(initA, initB);

  const higherDouble = doubleA >= doubleB ? nameA : nameB;
  const doubleRatio = doubleA >= doubleB
    ? formatRatio(doubleA, doubleB)
    : formatRatio(doubleB, doubleA);

  const slowerName = respA >= respB ? nameA : nameB;
  const slowerMs = Math.max(respA, respB);
  const ghostMinutes = Math.round(slowerMs / 60000);

  const longerName = lenA >= lenB ? nameA : nameB;
  const longerWords = Math.round(Math.max(lenA, lenB));
  const shorterWords = Math.round(Math.min(lenA, lenB));

  const nightOwlName = nightA >= nightB ? nameA : nameB;
  const nightOwlCount = Math.max(nightA, nightB);

  const simpName = reactA >= reactB ? nameA : nameB;
  const simpRatio = reactA >= reactB
    ? formatRatio(reactA, reactB)
    : formatRatio(reactB, reactA);

  const starterName = initA >= initB ? nameA : nameB;
  const totalInits = initA + initB;
  const starterPct = totalInits > 0
    ? Math.round((Math.max(initA, initB) / totalInits) * 100)
    : 50;

  return [
    {
      emoji: '📱',
      label: 'Niestrudzony',
      labelPl: 'Przylepiec',
      personAPercent: dblPctA,
      personBPercent: dblPctB,
      personAName: nameA,
      personBName: nameB,
      evidence: `${higherDouble} wysyła ${doubleRatio}x więcej double-textów`,
    },
    {
      emoji: '👻',
      label: 'Ghost',
      labelPl: 'Duch',
      personAPercent: ghostPctA,
      personBPercent: ghostPctB,
      personAName: nameA,
      personBName: nameB,
      evidence: `${slowerName} odpowiada średnio po ${ghostMinutes} min`,
    },
    {
      emoji: '🤔',
      label: 'Overthinker',
      labelPl: 'Nadmyślacz',
      personAPercent: thinkPctA,
      personBPercent: thinkPctB,
      personAName: nameA,
      personBName: nameB,
      evidence: `${longerName} pisze śr. ${longerWords} słów vs ${shorterWords}`,
    },
    {
      emoji: '🌙',
      label: 'Night Owl',
      labelPl: 'Nocny Marek',
      personAPercent: nightPctA,
      personBPercent: nightPctB,
      personAName: nameA,
      personBName: nameB,
      evidence: `${nightOwlName} wysłał(a) ${nightOwlCount} wiadomości po 22:00`,
    },
    {
      emoji: '😍',
      label: 'Simp',
      labelPl: 'Simp',
      personAPercent: simpPctA,
      personBPercent: simpPctB,
      personAName: nameA,
      personBName: nameB,
      evidence: `${simpName} reaguje ${simpRatio}x częściej`,
    },
    {
      emoji: '🚀',
      label: 'Starter',
      labelPl: 'Inicjator',
      personAPercent: startPctA,
      personBPercent: startPctB,
      personAName: nameA,
      personBName: nameB,
      evidence: `${starterName} zaczyna ${starterPct}% rozmów`,
    },
  ];
}

// ============================================================
// 2. MegaStat Data
// ============================================================

export interface MegaStatData {
  value: number;
  label: string;
  comparison: string;
  emoji: string;
}

export function computeMegaStats(
  quantitative: QuantitativeAnalysis,
  conversation: ParsedConversation,
): MegaStatData[] {
  const totalMessages = conversation.metadata.totalMessages;
  const durationDays = conversation.metadata.durationDays;
  const perDay = durationDays > 0 ? (totalMessages / durationDays).toFixed(1) : '0';

  const totalWords = Object.values(quantitative.perPerson).reduce(
    (sum: number, person: PersonMetrics) => sum + person.totalWords,
    0,
  );

  const durationYears = durationDays / 365.25;
  let durationComparison: string;
  if (durationYears >= 1) {
    const years = Math.floor(durationYears);
    const remainingMonths = Math.round((durationYears - years) * 12);
    if (remainingMonths > 0) {
      durationComparison = `ponad ${years} ${pluralizeYears(years)} i ${remainingMonths} ${pluralizeMonths(remainingMonths)}`;
    } else {
      durationComparison = `dokładnie ${years} ${pluralizeYears(years)}`;
    }
  } else {
    const months = Math.round(durationDays / 30.44);
    durationComparison = `ponad ${months} ${pluralizeMonths(months)}`;
  }

  const booksEquiv = totalWords / 50000;
  let booksComparison: string;
  if (booksEquiv >= 1) {
    booksComparison = `to jak napisać ${booksEquiv.toFixed(1)} ${pluralizeBooks(booksEquiv)} `;
  } else {
    const pagesEquiv = Math.round(totalWords / 250);
    booksComparison = `to jak napisać ${pagesEquiv} stron książki`;
  }

  return [
    {
      value: totalMessages,
      label: 'Wiadomości',
      comparison: `to ${perDay} wiadomości dziennie`,
      emoji: '💬',
    },
    {
      value: durationDays,
      label: 'Dni rozmowy',
      comparison: durationComparison,
      emoji: '📅',
    },
    {
      value: totalWords,
      label: 'Słów łącznie',
      comparison: booksComparison,
      emoji: '📝',
    },
  ];
}

function pluralizeYears(n: number): string {
  if (n === 1) return 'rok';
  if (n >= 2 && n <= 4) return 'lata';
  return 'lat';
}

function pluralizeMonths(n: number): string {
  if (n === 1) return 'miesiąc';
  if (n >= 2 && n <= 4) return 'miesiące';
  return 'miesięcy';
}

function pluralizeBooks(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 1) return 'książkę';
  if (rounded >= 2 && rounded <= 4) return 'książki';
  return 'książek';
}

// ============================================================
// 3. Character Card Data
// ============================================================

export interface CharacterCardData {
  name: string;
  className: string;
  level: number;
  stats: Array<{ label: string; value: number; max: number }>;
  traits: string[];
  quote: string;
  specialAbility: string;
  colorIndex: number;
}

const ATTACHMENT_CLASS_MAP: Record<string, string> = {
  secure: 'Guardian',
  anxious: 'Empath',
  avoidant: 'Lone Wolf',
  disorganized: 'Wildcard',
  insufficient_data: 'Mystery',
};

export function computeCharacterData(
  profile: PersonProfile,
  name: string,
  quantitative: QuantitativeAnalysis,
  colorIndex: number,
): CharacterCardData {
  const attachmentStyle = profile.attachment_indicators?.primary_style ?? 'insufficient_data';
  const className = ATTACHMENT_CLASS_MAP[attachmentStyle] ?? 'Mystery';

  const eiOverall = profile.emotional_intelligence.overall;
  const level = Math.max(1, Math.min(99, Math.round((eiOverall / 10) * 99)));

  const bigFive = profile.big_five_approximation;
  const avgRange = (trait: { range: [number, number] }): number =>
    Math.round(((trait.range[0] + trait.range[1]) / 2) * 10) / 10;

  const stats = [
    { label: 'Otwartość', value: avgRange(bigFive.openness), max: 10 },
    { label: 'Sumienność', value: avgRange(bigFive.conscientiousness), max: 10 },
    { label: 'Ekstrawersja', value: avgRange(bigFive.extraversion), max: 10 },
    { label: 'Ugodowość', value: avgRange(bigFive.agreeableness), max: 10 },
    { label: 'Neurotyczność', value: avgRange(bigFive.neuroticism), max: 10 },
  ];

  const traits: string[] = [];
  traits.push(attachmentStyle);
  traits.push(profile.communication_profile.style);
  traits.push(profile.communication_needs.primary);

  const typicalStructure = profile.communication_profile.typical_message_structure;
  const firstTic = profile.communication_profile.verbal_tics[0];
  let quote = typicalStructure;
  if (firstTic) {
    quote = `${typicalStructure} — "${firstTic}"`;
  }

  const personMetrics = quantitative.perPerson[name];
  const specialAbility = computeSpecialAbility(name, quantitative, personMetrics);

  return {
    name,
    className,
    level,
    stats,
    traits,
    quote,
    specialAbility,
    colorIndex,
  };
}

function computeSpecialAbility(
  name: string,
  quantitative: QuantitativeAnalysis,
  metrics: PersonMetrics | undefined,
): string {
  if (!metrics) return 'Enigma — brak danych';

  interface AbilityCandidate {
    score: number;
    ability: string;
  }

  const candidates: AbilityCandidate[] = [];

  const maxConsec = quantitative.engagement.maxConsecutive[name] ?? 0;
  if (maxConsec > 0) {
    candidates.push({
      score: maxConsec,
      ability: `Monolog — ${maxConsec} wiadomości z rzędu bez odpowiedzi`,
    });
  }

  const reactionRate = quantitative.engagement.reactionRate[name] ?? 0;
  if (reactionRate > 0) {
    candidates.push({
      score: reactionRate * 100,
      ability: `Reaktor — reaguje na ${(reactionRate * 100).toFixed(0)}% wiadomości`,
    });
  }

  const doubleTexts = quantitative.engagement.doubleTexts[name] ?? 0;
  if (doubleTexts > 0) {
    candidates.push({
      score: doubleTexts / Math.max(1, metrics.totalMessages) * 100,
      ability: `Double-Texter — ${doubleTexts} wiadomości podwójnych`,
    });
  }

  const lateNight = quantitative.timing.lateNightMessages[name] ?? 0;
  if (lateNight > 0) {
    const lateNightPct = (lateNight / Math.max(1, metrics.totalMessages)) * 100;
    candidates.push({
      score: lateNightPct,
      ability: `Nocna Zmiana — ${lateNightPct.toFixed(0)}% wiadomości po 22:00`,
    });
  }

  const initiations = quantitative.timing.conversationInitiations[name] ?? 0;
  const totalInits = Object.values(quantitative.timing.conversationInitiations).reduce(
    (sum: number, val: number) => sum + val,
    0,
  );
  if (totalInits > 0) {
    const initPct = (initiations / totalInits) * 100;
    if (initPct >= 65) {
      candidates.push({
        score: initPct,
        ability: `Pierwszy Kontakt — inicjuje ${initPct.toFixed(0)}% rozmów`,
      });
    }
  }

  const vocabRichness = metrics.vocabularyRichness;
  if (vocabRichness > 0) {
    candidates.push({
      score: vocabRichness * 50,
      ability: `Lingwista — bogactwo słownictwa: ${(vocabRichness * 100).toFixed(0)}%`,
    });
  }

  if (candidates.length === 0) {
    return 'Enigma — trudno jednoznacznie określić';
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].ability;
}

// ============================================================
// 4. Fun Comparison Helper
// ============================================================

export function funComparison(value: number, unit: string): string {
  switch (unit) {
    case 'messages': {
      if (value >= 100000) return `tyle, ile średnia osoba wysyła w ${Math.round(value / 33000)} ${pluralizeYears(Math.round(value / 33000))}`;
      if (value >= 50000) return `więcej niż całe małe miasteczko powie w tydzień`;
      if (value >= 10000) return `tyle, ile zmieści się w ${Math.round(value / 300)} stronach czatu`;
      if (value >= 1000) return `to jak ${Math.round(value / 150)} godzin ciągłej rozmowy`;
      return `solidna dawka komunikacji`;
    }
    case 'words': {
      const books = value / 50000;
      if (books >= 5) return `to jak napisać ${books.toFixed(1)} książek`;
      if (books >= 1) return `to jak napisać ${books.toFixed(1)} ${pluralizeBooks(books)}`;
      const pages = Math.round(value / 250);
      if (pages >= 10) return `to jak napisać ${pages} stron`;
      return `skromny, ale treściwy dialog`;
    }
    case 'days': {
      const years = value / 365.25;
      if (years >= 2) return `ponad ${Math.floor(years)} ${pluralizeYears(Math.floor(years))} historii`;
      const months = Math.round(value / 30.44);
      if (months >= 2) return `ponad ${months} ${pluralizeMonths(months)} rozmów`;
      if (value >= 14) return `${Math.round(value / 7)} tygodni wymiany zdań`;
      return `${value} dni pełnych słów`;
    }
    case 'hours': {
      if (value >= 24) return `to ${Math.round(value / 24)} pełnych dób rozmowy`;
      if (value >= 1) return `ponad ${Math.round(value)} godzin dialogu`;
      return `${Math.round(value * 60)} minut rozmowy`;
    }
    case 'reactions': {
      if (value >= 1000) return `${value} reakcji — prawdziwy entuzjasta`;
      if (value >= 500) return `${value} reakcji — nie szczędzi emocji`;
      if (value >= 100) return `${value} reakcji — lubi dawać znać`;
      return `${value} reakcji`;
    }
    case 'emojis': {
      if (value >= 5000) return `${value} emoji — rozmowa bardziej wizualna niż tekstowa`;
      if (value >= 1000) return `${value} emoji — mistrz ekspresji`;
      if (value >= 100) return `${value} emoji — zdrowa dawka emocji`;
      return `${value} emoji`;
    }
    default: {
      if (value >= 10000) return `${value.toLocaleString('pl-PL')} — imponujące`;
      if (value >= 1000) return `${value.toLocaleString('pl-PL')} — solidnie`;
      return `${value}`;
    }
  }
}
