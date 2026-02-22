'use client';

import { useRef, type ReactNode } from 'react';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type {
  Pass4Result,
  PersonProfile,
  QualitativeAnalysis,
} from '@/lib/analysis/types';
import type { CPSResult, CPSPatternResult, CPSAnswer } from '@/lib/analysis/communication-patterns';
import type { SubtextResult } from '@/lib/analysis/subtext';
import type { DelusionQuizResult } from '@/lib/analysis/delusion-quiz';
import type { CourtResult } from '@/lib/analysis/court-prompts';
import type { DatingProfileResult } from '@/lib/analysis/dating-profile-prompts';
import type { CoupleQuizComparison } from '@/lib/analysis/couple-quiz';

// ── Card components ──────────────────────────────────────────
import ReceiptCard from '@/components/share-cards/ReceiptCard';
import VersusCardV2 from '@/components/share-cards/VersusCardV2';
import RedFlagCard from '@/components/share-cards/RedFlagCard';
import GhostForecastCard from '@/components/share-cards/GhostForecastCard';
import CompatibilityCardV2 from '@/components/share-cards/CompatibilityCardV2';
import LabelCard from '@/components/share-cards/LabelCard';
import PersonalityPassportCard from '@/components/share-cards/PersonalityPassportCard';
import StatsCard from '@/components/share-cards/StatsCard';
import VersusCard from '@/components/share-cards/VersusCard';
import HealthScoreCard from '@/components/share-cards/HealthScoreCard';
import FlagsCard from '@/components/share-cards/FlagsCard';
import PersonalityCard from '@/components/share-cards/PersonalityCard';
import ScoresCard from '@/components/share-cards/ScoresCard';
import BadgesCard from '@/components/share-cards/BadgesCard';
import MBTICard from '@/components/share-cards/MBTICard';
import CPSCard from '@/components/share-cards/CPSCard';
import SubtextCard from '@/components/share-cards/SubtextCard';
import DelusionCard from '@/components/share-cards/DelusionCard';
import MugshotCard from '@/components/share-cards/MugshotCard';
import DatingProfileCard from '@/components/share-cards/DatingProfileCard';
import SimulatorCard, { type SimulatorExchange } from '@/components/share-cards/SimulatorCard';
import CoupleQuizCard from '@/components/share-cards/CoupleQuizCard';

// ============================================================
// DEMO PARTICIPANTS
// ============================================================

const P = ['Ania', 'Kuba'] as const;

// ============================================================
// PARSED CONVERSATION (minimal)
// ============================================================

const DEMO_CONVERSATION: ParsedConversation = {
  platform: 'messenger',
  title: 'Ania & Kuba',
  participants: [{ name: 'Ania' }, { name: 'Kuba' }],
  messages: [],
  metadata: {
    totalMessages: 12847,
    dateRange: { start: 1711929600000, end: 1740268800000 }, // ~Mar 2024 – Feb 2025
    isGroup: false,
    durationDays: 423,
  },
};

// ============================================================
// QUANTITATIVE ANALYSIS
// ============================================================

function genHeatmap(peakH: number, scale: number): number[][] {
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const dist = Math.abs(h - peakH);
      const base = Math.max(0, scale - dist * (scale / 8));
      return Math.round(base * (d < 5 ? 1 : 1.4) * (0.8 + Math.random() * 0.4));
    }),
  );
}

const aniaHeatmap = genHeatmap(20, 45);
const kubaHeatmap = genHeatmap(21, 35);

const DEMO_QUANTITATIVE: QuantitativeAnalysis = {
  perPerson: {
    Ania: {
      totalMessages: 7231,
      totalWords: 48920,
      totalCharacters: 251400,
      averageMessageLength: 6.8,
      averageMessageChars: 34.8,
      longestMessage: { content: 'Wiesz co, myślę że powinniśmy porozmawiać...', length: 89, timestamp: 1725000000000 },
      shortestMessage: { content: 'ok', length: 1, timestamp: 1720000000000 },
      messagesWithEmoji: 2814,
      emojiCount: 4102,
      topEmojis: [
        { emoji: '😂', count: 812 }, { emoji: '❤️', count: 634 }, { emoji: '😭', count: 418 },
        { emoji: '🥺', count: 312 }, { emoji: '✨', count: 287 },
      ],
      questionsAsked: 1423,
      mediaShared: 342,
      linksShared: 87,
      reactionsGiven: 1842,
      reactionsReceived: 1156,
      topReactionsGiven: [{ emoji: '❤️', count: 823 }, { emoji: '😂', count: 512 }],
      unsentMessages: 34,
      topWords: [
        { word: 'haha', count: 412 }, { word: 'dobra', count: 287 }, { word: 'kocham', count: 198 },
        { word: 'okej', count: 176 }, { word: 'super', count: 154 },
      ],
      topPhrases: [
        { phrase: 'nie wiem', count: 89 }, { phrase: 'co robisz', count: 67 },
        { phrase: 'dobranoc kochanie', count: 54 },
      ],
      uniqueWords: 4823,
      vocabularyRichness: 0.099,
    },
    Kuba: {
      totalMessages: 5616,
      totalWords: 31200,
      totalCharacters: 162240,
      averageMessageLength: 5.6,
      averageMessageChars: 28.9,
      longestMessage: { content: 'Ok to może spotkajmy się o 18 na rynku...', length: 72, timestamp: 1726000000000 },
      shortestMessage: { content: 'k', length: 1, timestamp: 1721000000000 },
      messagesWithEmoji: 1523,
      emojiCount: 2134,
      topEmojis: [
        { emoji: '😂', count: 523 }, { emoji: '👍', count: 412 }, { emoji: '🔥', count: 198 },
        { emoji: '❤️', count: 176 }, { emoji: '💀', count: 134 },
      ],
      questionsAsked: 987,
      mediaShared: 198,
      linksShared: 134,
      reactionsGiven: 1156,
      reactionsReceived: 1842,
      topReactionsGiven: [{ emoji: '👍', count: 423 }, { emoji: '😂', count: 312 }],
      unsentMessages: 12,
      topWords: [
        { word: 'spoko', count: 342 }, { word: 'git', count: 234 }, { word: 'luzik', count: 145 },
        { word: 'ok', count: 312 }, { word: 'haha', count: 287 },
      ],
      topPhrases: [
        { phrase: 'nie wiem', count: 98 }, { phrase: 'spoko luzik', count: 45 },
        { phrase: 'daj znać', count: 38 },
      ],
      uniqueWords: 3456,
      vocabularyRichness: 0.111,
    },
  },
  timing: {
    perPerson: {
      Ania: { averageResponseTimeMs: 342000, medianResponseTimeMs: 180000, fastestResponseMs: 8000, slowestResponseMs: 14400000, responseTimeTrend: -0.12 },
      Kuba: { averageResponseTimeMs: 612000, medianResponseTimeMs: 420000, fastestResponseMs: 12000, slowestResponseMs: 28800000, responseTimeTrend: 0.08 },
    },
    conversationInitiations: { Ania: 312, Kuba: 198 },
    conversationEndings: { Ania: 234, Kuba: 276 },
    longestSilence: { durationMs: 259200000, startTimestamp: 1728000000000, endTimestamp: 1728259200000, lastSender: 'Kuba', nextSender: 'Ania' },
    lateNightMessages: { Ania: 1423, Kuba: 876 },
  },
  engagement: {
    doubleTexts: { Ania: 423, Kuba: 134 },
    maxConsecutive: { Ania: 12, Kuba: 7 },
    messageRatio: { Ania: 0.563, Kuba: 0.437 },
    reactionRate: { Ania: 0.255, Kuba: 0.206 },
    reactionGiveRate: { Ania: 0.255, Kuba: 0.206 },
    reactionReceiveRate: { Ania: 0.206, Kuba: 0.255 },
    avgConversationLength: 25.2,
    totalSessions: 510,
  },
  patterns: {
    monthlyVolume: [
      { month: '2024-09', perPerson: { Ania: 812, Kuba: 634 }, total: 1446 },
      { month: '2024-10', perPerson: { Ania: 923, Kuba: 712 }, total: 1635 },
      { month: '2024-11', perPerson: { Ania: 1045, Kuba: 823 }, total: 1868 },
      { month: '2024-12', perPerson: { Ania: 876, Kuba: 645 }, total: 1521 },
      { month: '2025-01', perPerson: { Ania: 734, Kuba: 567 }, total: 1301 },
      { month: '2025-02', perPerson: { Ania: 645, Kuba: 498 }, total: 1143 },
    ],
    weekdayWeekend: {
      weekday: { Ania: 4812, Kuba: 3745 },
      weekend: { Ania: 2419, Kuba: 1871 },
    },
    volumeTrend: -0.08,
    bursts: [
      { startDate: '2024-10-14', endDate: '2024-10-16', messageCount: 342, avgDaily: 114 },
      { startDate: '2024-11-23', endDate: '2024-11-25', messageCount: 287, avgDaily: 96 },
    ],
  },
  heatmap: {
    perPerson: { Ania: aniaHeatmap, Kuba: kubaHeatmap },
    combined: aniaHeatmap.map((row, d) => row.map((v, h) => v + (kubaHeatmap[d]?.[h] ?? 0))),
  },
  trends: {
    responseTimeTrend: [
      { month: '2024-09', perPerson: { Ania: 300000, Kuba: 540000 } },
      { month: '2024-11', perPerson: { Ania: 360000, Kuba: 600000 } },
      { month: '2025-01', perPerson: { Ania: 320000, Kuba: 660000 } },
    ],
    messageLengthTrend: [
      { month: '2024-09', perPerson: { Ania: 7.2, Kuba: 5.8 } },
      { month: '2024-11', perPerson: { Ania: 6.8, Kuba: 5.4 } },
      { month: '2025-01', perPerson: { Ania: 6.5, Kuba: 5.2 } },
    ],
    initiationTrend: [
      { month: '2024-09', perPerson: { Ania: 0.58, Kuba: 0.42 } },
      { month: '2024-11', perPerson: { Ania: 0.62, Kuba: 0.38 } },
      { month: '2025-01', perPerson: { Ania: 0.60, Kuba: 0.40 } },
    ],
  },
  viralScores: {
    compatibilityScore: 73,
    interestScores: { Ania: 78, Kuba: 62 },
    ghostRisk: {
      Ania: { score: 18, factors: ['Częste inicjowanie rozmów', 'Niska tolerancja ciszy'] },
      Kuba: { score: 42, factors: ['Rosnący czas odpowiedzi', 'Malejąca długość wiadomości', 'Rzadsze inicjowanie'] },
    },
    delusionScore: 34,
    delusionHolder: 'Ania',
  },
  badges: [
    { id: 'night-owl', name: 'Nocna Sowa', emoji: '🦉', description: 'Najwięcej wiadomości po 22:00', holder: 'Ania', evidence: '1423 nocne wiadomości' },
    { id: 'chatterbox', name: 'Gaduła', emoji: '🗣️', description: 'Największa liczba wiadomości', holder: 'Ania', evidence: '7231 wiadomości' },
    { id: 'wordsmith', name: 'Słowotwórca', emoji: '✍️', description: 'Największe bogactwo słownictwa', holder: 'Kuba', evidence: '11.1% unikalnych słów' },
    { id: 'double-texter', name: 'Double Texter', emoji: '📱', description: 'Najwięcej podwójnych wiadomości', holder: 'Ania', evidence: '423 double texty' },
    { id: 'emoji-king', name: 'Królowa Emoji', emoji: '😂', description: 'Najwięcej użytych emoji', holder: 'Ania', evidence: '4102 emoji' },
    { id: 'link-sharer', name: 'Kurator Linków', emoji: '🔗', description: 'Najwięcej udostępnionych linków', holder: 'Kuba', evidence: '134 linki' },
  ],
  bestTimeToText: {
    perPerson: {
      Ania: { bestDay: 'sobota', bestHour: 20, bestWindow: '19:00-22:00', avgResponseMs: 120000 },
      Kuba: { bestDay: 'niedziela', bestHour: 21, bestWindow: '20:00-23:00', avgResponseMs: 180000 },
    },
  },
};

// ============================================================
// QUALITATIVE — Pass 3 (Person Profiles)
// ============================================================

function makeProfile(isAnia: boolean): PersonProfile {
  return {
    big_five_approximation: {
      openness: { range: isAnia ? [7, 9] : [5, 7], evidence: isAnia ? 'Kreatywna, ciekawa nowych doświadczeń' : 'Pragmatyczny, preferuje sprawdzone rozwiązania', confidence: 72 },
      conscientiousness: { range: isAnia ? [4, 6] : [6, 8], evidence: isAnia ? 'Spontaniczna, chaotyczna w planowaniu' : 'Zorganizowany, punktualny', confidence: 68 },
      extraversion: { range: isAnia ? [7, 9] : [3, 5], evidence: isAnia ? 'Inicjuje rozmowy, ekspresyjna' : 'Preferuje krótkie odpowiedzi, potrzebuje przestrzeni', confidence: 78 },
      agreeableness: { range: isAnia ? [6, 8] : [5, 7], evidence: isAnia ? 'Empatyczna, unikająca konfliktów' : 'Bezpośredni, szczery do bólu', confidence: 70 },
      neuroticism: { range: isAnia ? [6, 8] : [3, 5], evidence: isAnia ? 'Emocjonalna, intensywna' : 'Opanowany, rzadko wybucha', confidence: 65 },
    },
    attachment_indicators: {
      primary_style: isAnia ? 'anxious' : 'avoidant',
      indicators: [
        { behavior: isAnia ? 'Częste sprawdzanie statusu' : 'Potrzeba przestrzeni osobistej', attachment_relevance: isAnia ? 'Lęk przed porzuceniem' : 'Unikanie zbytniej bliskości', evidence_indices: [12, 45, 78] },
      ],
      confidence: 58,
    },
    communication_profile: {
      style: isAnia ? 'indirect' : 'direct',
      assertiveness: isAnia ? 45 : 72,
      emotional_expressiveness: isAnia ? 82 : 38,
      self_disclosure_depth: isAnia ? 74 : 42,
      question_to_statement_ratio: isAnia ? 'asks_more' : 'states_more',
      typical_message_structure: isAnia ? 'Emocjonalny wstęp + pytanie' : 'Krótka odpowiedź, konkrety',
      verbal_tics: isAnia ? ['no bo wiesz', 'serio?', 'haha'] : ['spoko', 'git', 'ok'],
      emoji_personality: isAnia ? 'Intensywna — emoji w każdej wiadomości' : 'Minimalistyczna — głównie 👍 i 😂',
    },
    communication_needs: {
      primary: isAnia ? 'affirmation' : 'space',
      secondary: isAnia ? 'consistency' : 'freedom',
      unmet_needs_signals: isAnia ? ['Podwójne wiadomości', 'Pytania o uczucia'] : ['Krótsze odpowiedzi', 'Dłuższe przerwy'],
      confidence: 62,
    },
    emotional_patterns: {
      emotional_range: isAnia ? 78 : 35,
      dominant_emotions: isAnia ? ['radość', 'niepokój', 'czułość'] : ['spokój', 'humor', 'frustracja'],
      coping_mechanisms_visible: isAnia ? ['humor', 'szukanie wsparcia'] : ['wycofanie', 'zmiana tematu'],
      stress_indicators: isAnia ? ['Dłuższe wiadomości', 'Więcej emoji'] : ['Krótsze odpowiedzi', 'Dłuższe przerwy'],
      confidence: 64,
    },
    clinical_observations: {
      anxiety_markers: { present: isAnia, patterns: isAnia ? ['Double texting', 'Częste pytania o status'] : [], severity: isAnia ? 'mild' : 'none', confidence: 52 },
      avoidance_markers: { present: !isAnia, patterns: !isAnia ? ['Unikanie głębszych tematów'] : [], severity: !isAnia ? 'mild' : 'none', confidence: 48 },
      manipulation_patterns: { present: false, types: [], severity: 'none', confidence: 72 },
      boundary_respect: { score: isAnia ? 68 : 74, examples: ['Respektowanie czasu odpowiedzi'], confidence: 65 },
      codependency_signals: { present: false, indicators: [], confidence: 58 },
      disclaimer: 'Analiza oparta wyłącznie na tekście — nie stanowi diagnozy klinicznej.',
    },
    conflict_resolution: {
      primary_style: isAnia ? 'direct_confrontation' : 'avoidant',
      triggers: isAnia ? ['Brak odpowiedzi', 'Ignorowanie emocji'] : ['Nadmierne wymagania', 'Presja'],
      recovery_speed: isAnia ? 'fast' : 'moderate',
      de_escalation_skills: isAnia ? 62 : 55,
      confidence: 58,
    },
    emotional_intelligence: {
      empathy: { score: isAnia ? 78 : 58, evidence: isAnia ? 'Zauważa emocje partnera' : 'Reaguje na wyraźne sygnały' },
      self_awareness: { score: isAnia ? 65 : 72, evidence: isAnia ? 'Rozpoznaje swoje emocje' : 'Świadomy swoich granic' },
      emotional_regulation: { score: isAnia ? 52 : 74, evidence: isAnia ? 'Impulsywne reakcje pod presją' : 'Opanowany w stresie' },
      social_skills: { score: isAnia ? 82 : 58, evidence: isAnia ? 'Łatwo nawiązuje kontakt' : 'Preferuje mniejsze grupy' },
      overall: isAnia ? 69 : 66,
      confidence: 62,
    },
    mbti: {
      type: isAnia ? 'ENFJ' : 'ISTP',
      confidence: isAnia ? 72 : 68,
      reasoning: {
        ie: { letter: isAnia ? 'E' : 'I', evidence: isAnia ? 'Częste inicjowanie rozmów' : 'Preferuje słuchanie', confidence: 78 },
        sn: { letter: isAnia ? 'N' : 'S', evidence: isAnia ? 'Abstrakcyjne tematy' : 'Konkretne, praktyczne', confidence: 65 },
        tf: { letter: isAnia ? 'F' : 'T', evidence: isAnia ? 'Decyzje oparte na emocjach' : 'Logiczne podejście', confidence: 72 },
        jp: { letter: isAnia ? 'J' : 'P', evidence: isAnia ? 'Lubi planować' : 'Spontaniczny', confidence: 62 },
      },
    },
    love_language: {
      primary: isAnia ? 'words_of_affirmation' : 'quality_time',
      secondary: isAnia ? 'quality_time' : 'acts_of_service',
      scores: {
        words_of_affirmation: isAnia ? 82 : 45,
        quality_time: isAnia ? 68 : 78,
        acts_of_service: isAnia ? 45 : 62,
        gifts_pebbling: isAnia ? 38 : 28,
        physical_touch: isAnia ? 72 : 55,
      },
      evidence: isAnia ? 'Częste komplementy i wyrazy miłości' : 'Inicjowanie wspólnych aktywności',
      confidence: 68,
    },
  };
}

const DEMO_PASS3: Record<string, PersonProfile> = {
  Ania: makeProfile(true),
  Kuba: makeProfile(false),
};

// ============================================================
// QUALITATIVE — Pass 4 (Synthesis)
// ============================================================

const DEMO_PASS4: Pass4Result = {
  executive_summary: 'Relacja romantyczna z wyraźną dynamiką lękowo-unikającą. Ania bardziej zaangażowana emocjonalnie, Kuba dystansujący się. Mimo to — silne fundamenty i wzajemny szacunek.',
  health_score: {
    overall: 72,
    components: { balance: 58, reciprocity: 65, response_pattern: 68, emotional_safety: 78, growth_trajectory: 82 },
    explanation: 'Relacja zdrowa z przestrzenią do poprawy w zakresie równowagi i wzajemności.',
  },
  key_findings: [
    { finding: 'Nierównowaga inicjowania', significance: 'concerning', detail: 'Ania inicjuje 61% rozmów, trend rosnący.' },
    { finding: 'Silna więź emocjonalna', significance: 'positive', detail: 'Wspólne żarty, pet names, regularne wyrazy uczuć.' },
    { finding: 'Rosnący czas odpowiedzi Kuby', significance: 'concerning', detail: 'Średni czas odpowiedzi wzrósł o 18% w ostatnich 3 miesiącach.' },
  ],
  relationship_trajectory: {
    current_phase: 'established',
    direction: 'stable',
    inflection_points: [
      { approximate_date: '2024-10', description: 'Szczytowy okres aktywności', evidence: 'Ponad 1600 wiadomości miesięcznie' },
      { approximate_date: '2025-01', description: 'Spadek intensywności', evidence: 'Malejąca liczba wiadomości i dłuższe przerwy' },
    ],
  },
  insights: [
    { for: 'Ania', insight: 'Daj Kubie więcej przestrzeni — nie każda cisza jest odrzuceniem.', priority: 'high' },
    { for: 'Kuba', insight: 'Częściej inicjuj rozmowy — Ania potrzebuje potwierdzenia.', priority: 'high' },
  ],
  conversation_personality: {
    if_this_conversation_were_a: { movie_genre: 'Dramat romantyczny', weather: 'Ciepło z burzami', one_word: 'Intensywność' },
  },
};

// ============================================================
// QUALITATIVE — CPS
// ============================================================

function makeCPSAnswer(yes: boolean, conf: number): CPSAnswer {
  return { answer: yes, confidence: conf, evidence: ['Wzorzec widoczny w rozmowie'] };
}

function makeCPSPattern(yesCount: number, total: number, threshold: number): CPSPatternResult {
  const answers: Record<number, CPSAnswer> = {};
  for (let i = 0; i < total; i++) answers[i] = makeCPSAnswer(i < yesCount, 65);
  return { yesCount, total, threshold, meetsThreshold: yesCount >= threshold, percentage: Math.round((yesCount / total) * 100), confidence: 68, answers };
}

const DEMO_CPS: CPSResult = {
  answers: {},
  patterns: {
    intimacy_avoidance: makeCPSPattern(2, 6, 4),
    over_dependence: makeCPSPattern(3, 7, 4),
    control_perfectionism: makeCPSPattern(1, 6, 4),
    suspicion_distrust: makeCPSPattern(1, 6, 4),
    self_focused: makeCPSPattern(2, 6, 4),
    emotional_intensity: makeCPSPattern(4, 7, 4),
    dramatization: makeCPSPattern(2, 6, 4),
    manipulation_low_empathy: makeCPSPattern(0, 6, 4),
    emotional_distance: makeCPSPattern(3, 7, 4),
    passive_aggression: makeCPSPattern(1, 6, 4),
  },
  overallConfidence: 68,
  disclaimer: 'Wyniki nie stanowią diagnozy klinicznej.',
  analyzedAt: Date.now(),
  participantName: 'Ania & Kuba',
};

// ============================================================
// QUALITATIVE — Subtext
// ============================================================

const DEMO_SUBTEXT: SubtextResult = {
  items: [
    {
      originalMessage: 'Spoko, jak chcesz',
      sender: 'Kuba',
      timestamp: 1730000000000,
      subtext: 'Nie jest mu wszystko jedno — chce żebyś nalegała',
      emotion: 'rozczarowanie',
      confidence: 82,
      category: 'passive_aggressive',
      isHighlight: true,
      exchangeContext: 'Po pytaniu o wspólne plany na weekend',
      windowId: 1,
      surroundingMessages: [
        { sender: 'Ania', content: 'Może pójdziemy gdzieś w sobotę?', timestamp: 1729999000000 },
      ],
    },
    {
      originalMessage: 'Haha no tak, pewnie masz rację 😂',
      sender: 'Ania',
      timestamp: 1731000000000,
      subtext: 'Nie zgadza się, ale boi się konfliktu',
      emotion: 'niepewność',
      confidence: 74,
      category: 'seeking_validation',
      isHighlight: true,
      exchangeContext: 'Dyskusja o częstotliwości spotkań',
      windowId: 2,
      surroundingMessages: [
        { sender: 'Kuba', content: 'Widzimy się wystarczająco często', timestamp: 1730999000000 },
      ],
    },
    {
      originalMessage: 'Nie no, nie jestem zły',
      sender: 'Kuba',
      timestamp: 1732000000000,
      subtext: 'Jest zły ale nie potrafi tego wyrazić',
      emotion: 'tłumiony gniew',
      confidence: 78,
      category: 'hidden_anger',
      isHighlight: false,
      exchangeContext: 'Po długiej ciszy',
      windowId: 3,
      surroundingMessages: [
        { sender: 'Ania', content: 'Czemu nie odpisujesz? Jesteś zły?', timestamp: 1731999000000 },
      ],
    },
  ],
  summary: {
    hiddenEmotionBalance: { Ania: 0.3, Kuba: 0.55 },
    mostDeceptivePerson: 'Kuba',
    deceptionScore: { Ania: 28, Kuba: 52 },
    topCategories: [
      { category: 'passive_aggressive', count: 8 },
      { category: 'hidden_anger', count: 6 },
      { category: 'seeking_validation', count: 5 },
    ],
    biggestReveal: {
      originalMessage: 'Spoko, jak chcesz',
      sender: 'Kuba',
      timestamp: 1730000000000,
      subtext: 'Nie jest mu wszystko jedno — chce żebyś nalegała',
      emotion: 'rozczarowanie',
      confidence: 82,
      category: 'passive_aggressive',
      isHighlight: true,
      exchangeContext: 'Po pytaniu o wspólne plany',
      windowId: 1,
      surroundingMessages: [],
    },
  },
  disclaimer: 'Interpretacja AI — nie jest faktem.',
  analyzedAt: Date.now(),
};

// ============================================================
// QUALITATIVE — Delusion Quiz
// ============================================================

const DEMO_DELUSION: DelusionQuizResult = {
  answers: [
    { questionId: 'q1', userAnswer: 'Ania', correctAnswer: 'Ania', isCorrect: true, revealText: 'Ania wysyła 56% wiadomości.' },
    { questionId: 'q2', userAnswer: 'Kuba', correctAnswer: 'Ania', isCorrect: false, revealText: 'Ania inicjuje 61% rozmów.' },
    { questionId: 'q3', userAnswer: '5 min', correctAnswer: '10 min', isCorrect: false, revealText: 'Kuba odpowiada średnio po 10 minutach.' },
    { questionId: 'q4', userAnswer: 'Kuba', correctAnswer: 'Ania', isCorrect: false, revealText: 'Ania wysyła 3x więcej double textów.' },
    { questionId: 'q5', userAnswer: 'Ania', correctAnswer: 'Ania', isCorrect: true, revealText: 'Ania — 1423 wiadomości po 22:00.' },
    { questionId: 'q6', userAnswer: 'Równo', correctAnswer: 'Ania', isCorrect: false, revealText: 'Ania daje 59% wszystkich reakcji.' },
    { questionId: 'q7', userAnswer: 'Kuba', correctAnswer: 'Kuba', isCorrect: true, revealText: 'Kuba — 134 linki.' },
    { questionId: 'q8', userAnswer: 'Ania', correctAnswer: 'Ania', isCorrect: true, revealText: 'Ania — 4102 emoji.' },
    { questionId: 'q9', userAnswer: 'Kuba', correctAnswer: 'Ania', isCorrect: false, revealText: 'Ania — 342 zdjęcia/media.' },
    { questionId: 'q10', userAnswer: 'Ania', correctAnswer: 'Kuba', isCorrect: false, revealText: 'Kuba wysłał najdłuższą wiadomość — 72 słowa.' },
    { questionId: 'q11', userAnswer: 'Ania', correctAnswer: 'Ania', isCorrect: true, revealText: 'Ania — 1423 pytania.' },
    { questionId: 'q12', userAnswer: 'Kuba', correctAnswer: 'Kuba', isCorrect: true, revealText: 'Kuba kończy 54% rozmów.' },
    { questionId: 'q13', userAnswer: 'Ania', correctAnswer: 'Ania', isCorrect: true, revealText: 'Ania — 34 wycofane wiadomości.' },
    { questionId: 'q14', userAnswer: 'Ania', correctAnswer: 'Kuba', isCorrect: false, revealText: 'Kuba — 11.1% bogactwa słownictwa.' },
    { questionId: 'q15', userAnswer: 'Równo', correctAnswer: 'Kuba', isCorrect: false, revealText: 'Kuba ma wyższe ryzyko ghostingu — 42/100.' },
  ],
  score: 7,
  delusionIndex: 53,
  label: 'Różowe okulary',
};

// ============================================================
// QUALITATIVE — Court Trial
// ============================================================

const DEMO_COURT: CourtResult = {
  caseNumber: 'PT/2026/DEMO',
  courtName: 'Sąd Rejonowy PodTeksT — Wydział Konwersacyjny',
  charges: [
    { id: 'c1', charge: 'Ghosting z premedytacją', article: 'Art. 42 §1 KK', severity: 'występek', evidence: ['3 dni ciszy', 'Czytał, nie odpisał'], defendant: 'Kuba' },
    { id: 'c2', charge: 'Spamowanie emocjami', article: 'Art. 15 §3 KK', severity: 'wykroczenie', evidence: ['423 double texty', '12 wiadomości z rzędu'], defendant: 'Ania' },
  ],
  prosecution: 'Oskarżony Kuba dopuszczał się systematycznego ghostingu, zostawiając Anię bez odpowiedzi na godziny.',
  defense: 'Obrona podnosi, że każdy ma prawo do przestrzeni osobistej i ciszy w komunikacji.',
  verdict: { summary: 'Oboje winni — ale z okolicznościami łagodzącymi.', reasoning: 'Dynamika lękowo-unikająca napędza wzajemne "przestępstwa" komunikacyjne.' },
  perPerson: {
    Ania: { name: 'Ania', verdict: 'winny', mainCharge: 'Spamowanie emocjami', sentence: '30 dni bez double textów', mugshotLabel: 'SERIAL DOUBLE TEXTER', funFact: '423 double texty i nie zamierza przestać' },
    Kuba: { name: 'Kuba', verdict: 'winny', mainCharge: 'Ghosting z premedytacją', sentence: '30 dni obowiązkowego odpisywania w ciągu 1h', mugshotLabel: 'GHOST PROFESJONALISTA', funFact: 'Czyta wiadomości po 3 sekundy, odpowiada po 3 godziny' },
  },
};

// ============================================================
// QUALITATIVE — Dating Profile
// ============================================================

const DEMO_DATING: DatingProfileResult = {
  profiles: {
    Ania: {
      name: 'Ania',
      age_vibe: '25, energy na 35',
      bio: 'Szuka kogoś kto odpisze w mniej niż 10 minut i nie uzna tego za desperację. Mistrzowsko łączy 12 wiadomości z rzędu w spójną narrację. Uważa że 4102 emoji w roku to "normalna ilość".',
      stats: [
        { label: 'Czas odpowiedzi', value: '5 min 42s', emoji: '⚡' },
        { label: 'Wiadomości/dzień', value: '17.1', emoji: '💬' },
        { label: 'Stosunek emoji', value: '39%', emoji: '😂' },
        { label: 'Double text rate', value: '5.8%', emoji: '📱' },
      ],
      prompts: [
        { prompt: 'Moja największa czerwona flaga', answer: '423 double texty w ciągu roku i uważam to za "normalną komunikację"' },
        { prompt: 'Idealna randka', answer: 'Rozmowa do 3 w nocy przez telefon, potem narzekanie że jestem zmęczona' },
      ],
      red_flags: ['Double texter seryjny', 'Nocna sowa — 1423 msg po 22:00', 'Odpisuje zanim skończysz pisać'],
      green_flags: ['Zawsze odpowiada', 'Zapamiętuje szczegóły', 'Prawdziwa rozmówczyni — 1423 pytania'],
      match_prediction: 'Idealny match z kimś kto lubi dostawać 12 wiadomości zanim zdąży odpowiedzieć na pierwszą',
      dealbreaker: 'Jeśli odpowiadasz "ok" na jej 3-paragrafową wiadomość — to koniec.',
      overall_rating: '⭐⭐⭐⭐ — 4/5 — minusik za desperację',
    },
  },
};

// ============================================================
// QUALITATIVE — Couple Quiz
// ============================================================

const DEMO_COUPLE_QUIZ: CoupleQuizComparison = {
  personA: {
    name: 'Ania',
    result: { ...DEMO_DELUSION, score: 7, delusionIndex: 53, label: 'Różowe okulary' },
  },
  personB: {
    name: 'Kuba',
    result: {
      answers: DEMO_DELUSION.answers.map(a => ({ ...a, isCorrect: !a.isCorrect })),
      score: 8,
      delusionIndex: 47,
      label: 'Realistyczny',
    },
  },
  perQuestion: DEMO_DELUSION.answers.slice(0, 10).map((a, i) => ({
    questionId: a.questionId,
    questionText: `Pytanie ${i + 1}`,
    answerA: a.userAnswer,
    answerB: a.correctAnswer,
    correctAnswer: a.correctAnswer,
    aCorrect: a.isCorrect,
    bCorrect: !a.isCorrect,
    agree: false,
  })),
  awarenessWinner: 'Kuba',
  delusionGap: 6,
  agreementRate: 0.35,
  bothWrongCount: 3,
  bothRightCount: 4,
};

// ============================================================
// QUALITATIVE — Combined
// ============================================================

const DEMO_QUALITATIVE: QualitativeAnalysis = {
  status: 'complete',
  pass2: {
    power_dynamics: { balance_score: -22, who_adapts_more: 'Ania', adaptation_type: 'emotional', evidence: ['Ania dostosowuje ton'], confidence: 68 },
    emotional_labor: { primary_caregiver: 'Ania', patterns: [], balance_score: 35, confidence: 62 },
    conflict_patterns: { conflict_frequency: 'occasional', typical_trigger: 'Brak odpowiedzi', resolution_style: { Ania: 'direct_confrontation', Kuba: 'avoidant' }, unresolved_tensions: ['Nierównowaga inicjowania'], confidence: 65 },
    intimacy_markers: { vulnerability_level: { Ania: { score: 72, examples: ['Dzielenie się lękami'], trend: 'stable' }, Kuba: { score: 45, examples: ['Rzadkie otwieranie się'], trend: 'increasing' } }, shared_language: { inside_jokes: 14, pet_names: true, unique_phrases: ['niunia', 'misiaczek'], language_mirroring: 68 }, confidence: 70 },
    red_flags: [
      { pattern: 'Rosnący czas odpowiedzi jednej strony', severity: 'moderate', evidence_indices: [1, 2], confidence: 72 },
      { pattern: 'Nierówna inicjatywa w rozmowach', severity: 'mild', evidence_indices: [3, 4], confidence: 68 },
      { pattern: 'Double texting bez odpowiedzi', severity: 'mild', evidence_indices: [5], confidence: 65 },
    ],
    green_flags: [
      { pattern: 'Regularne wyrazy uczuć', evidence_indices: [10, 11], confidence: 82 },
      { pattern: 'Wspólne żarty i pet names', evidence_indices: [12, 13], confidence: 78 },
      { pattern: 'Szybkie rozwiązywanie konfliktów', evidence_indices: [14], confidence: 70 },
    ],
  },
  pass3: DEMO_PASS3,
  pass4: DEMO_PASS4,
  cps: DEMO_CPS,
  subtext: DEMO_SUBTEXT,
  delusionQuiz: DEMO_DELUSION,
  courtTrial: DEMO_COURT,
  datingProfile: DEMO_DATING,
  coupleQuiz: DEMO_COUPLE_QUIZ,
};

// ============================================================
// DEMO SIMULATOR EXCHANGES
// ============================================================

const DEMO_SIMULATOR_EXCHANGES: SimulatorExchange[] = [
  { role: 'user', message: 'Hej, co robisz wieczorem?' },
  { role: 'target', message: 'Nic specjalnego, a co?' },
  { role: 'user', message: 'Może wpadniesz na kawę?' },
  { role: 'target', message: 'Hmm, muszę pomyśleć. Dam znać później ok?' },
];

// ============================================================
// RENDER DEMO CARD
// ============================================================

function SimulatorWrapper() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <SimulatorCard
      cardRef={ref}
      exchanges={DEMO_SIMULATOR_EXCHANGES}
      targetPerson="Kuba"
      confidence={72}
      totalMessages={12847}
    />
  );
}

export function renderDemoCard(cardId: string): ReactNode {
  const q = DEMO_QUANTITATIVE;
  const c = DEMO_CONVERSATION;
  const p = [...P] as string[];
  const qual = DEMO_QUALITATIVE;

  switch (cardId) {
    // V2 cards
    case 'receipt': return <ReceiptCard quantitative={q} conversation={c} />;
    case 'versus-v2': return <VersusCardV2 quantitative={q} participants={p} />;
    case 'redflag': return <RedFlagCard quantitative={q} qualitative={qual} participants={p} />;
    case 'ghost-forecast': return <GhostForecastCard viralScores={q.viralScores!} participants={p} />;
    case 'compatibility-v2': return <CompatibilityCardV2 viralScores={q.viralScores!} participants={p} />;
    case 'label': return <LabelCard qualitative={qual} participants={p} />;
    case 'passport': return <PersonalityPassportCard qualitative={qual} participants={p} />;
    // Classic redesigned cards
    case 'stats': return <StatsCard quantitative={q} conversation={c} participants={p} />;
    case 'versus': return <VersusCard quantitative={q} participants={p} />;
    case 'health': return <HealthScoreCard pass4={qual.pass4!} participants={p} />;
    case 'flags': return <FlagsCard redFlags={qual.pass2!.red_flags!} greenFlags={qual.pass2!.green_flags!} />;
    case 'personality': return <PersonalityCard profiles={qual.pass3!} participants={p} quantitative={q} />;
    case 'scores': return <ScoresCard viralScores={q.viralScores!} participants={p} />;
    case 'badges': return <BadgesCard badges={q.badges!} participants={p} />;
    case 'mbti': return <MBTICard profiles={qual.pass3!} participants={p} />;
    case 'cps': return <CPSCard cpsResult={qual.cps!} />;
    case 'subtext': return <SubtextCard subtextResult={qual.subtext!} participants={p} />;
    // Entertainment cards
    case 'delusion': return <DelusionCard result={qual.delusionQuiz!} participants={p} />;
    case 'mugshot': return <MugshotCard personVerdict={qual.courtTrial!.perPerson['Ania']} caseNumber={qual.courtTrial!.caseNumber} />;
    case 'dating-profile': return <DatingProfileCard profile={qual.datingProfile!.profiles['Ania']} />;
    case 'simulator': return <SimulatorWrapper />;
    case 'couple-quiz': return <CoupleQuizCard comparison={qual.coupleQuiz!} />;
    default: return null;
  }
}
