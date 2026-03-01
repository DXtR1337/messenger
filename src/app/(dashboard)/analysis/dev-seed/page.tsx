'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * DEV-ONLY page: seeds IndexedDB with realistic mock analysis data
 * so we can preview mode pages (AI, metrics, etc.) with full content.
 *
 * Visit /analysis/dev-seed to inject data, then navigate to /analysis/dev-mock-001
 */

const MOCK_ID = 'dev-mock-001';

// ── Generate realistic messages spanning 12 months ──
function generateMessages(count: number) {
  const names = ['Alex', 'Jamie'];
  const now = Date.now();
  const yearAgo = now - 365 * 24 * 3600000;
  const msgs = [];

  const templates = [
    'Hej, co tam? 😊', 'Nic takiego, myślę o tobie', 'Kocham cię ❤️',
    'Kiedy się widzimy?', 'Jutro po pracy?', 'Super, nie mogę się doczekać!',
    'Widziałaś to? 😂', 'Hahaha tak 🤣', 'Dobranoc 🌙', 'Dzień dobry ☀️',
    'Tęsknię za tobą', 'Ja za tobą też', 'Co jesz na obiad?',
    'Pizza 🍕', 'A może sushi?', 'Spoko, jak chcesz',
    'Przepraszam za wczoraj', 'Nie ma sprawy, serio', 'Jesteś najlepsza',
    'Hej słuchaj, muszę ci coś powiedzieć...', 'Mów', 'Nie wiem jak to ująć ale... jestem z nas dumny',
    'Aww 🥺', 'Musimy kiedyś pojechać nad morze', 'TAK! Kiedy?',
    'Może w lipcu?', 'Brzmi idealnie', 'Zarezerwuję coś',
    'Spóźnię się trochę, sorry', 'Spoko, czekam', 'Jestem już! Gdzie jesteś?',
    'Przy wejściu', 'Widzę cię! 👋', 'O matko ale pięknie wyglądasz',
    'Przestań 😳', 'Serio mówię', 'No to chodźmy',
    'Co oglądamy dziś?', 'Może coś z Netflixa?', 'Znowu The Office? 😅',
    'Nie no, coś nowego', 'OK to ty wybierasz', 'Deal',
    'Zadzwoń jak możesz', 'Za 5 min', 'Ok ❤️',
    'Śmiesznie dzisiaj wyglądał Bartek 😂', 'Co zrobił?', 'Przyszedł w dwóch różnych butach',
    'NIE 🤣🤣🤣', 'Serio!', 'Umieraaaam',
    'Hej, wszystko ok?', 'Tak, czemu pytasz?', 'Miałeś taki dziwny story',
    'Aaa to nic, żartowałem', 'No ok, martwiłam się', 'Przepraszam 🙏',
    'Nie musisz przepraszać', 'Wiem ale i tak', 'Jesteś słodki',
  ];

  for (let i = 0; i < count; i++) {
    const progress = i / count;
    const ts = yearAgo + progress * (now - yearAgo) + Math.random() * 3600000;
    msgs.push({
      index: i,
      sender: names[i % 2 === 0 ? 0 : 1],
      content: templates[Math.floor(Math.random() * templates.length)],
      timestamp: ts,
      type: 'text' as const,
      reactions: Math.random() > 0.85 ? [{ emoji: '❤️', actor: names[(i + 1) % 2] }] : [],
      hasMedia: false,
      hasLink: false,
      isUnsent: false,
    });
  }
  return msgs;
}

function buildMockAnalysis() {
  const messages = generateMessages(1500);

  return {
    id: MOCK_ID,
    title: 'Dev Mock — Alex & Jamie',
    createdAt: Date.now(),
    relationshipContext: 'romantic',
    conversationFingerprint: 'mock-fp-' + Date.now(),

    conversation: {
      platform: 'messenger',
      title: 'Alex & Jamie',
      participants: [
        { name: 'Alex', platformId: 'u1' },
        { name: 'Jamie', platformId: 'u2' },
      ],
      metadata: {
        totalMessages: 1500,
        dateRange: { start: messages[0].timestamp, end: messages[messages.length - 1].timestamp },
        isGroup: false,
        durationDays: 365,
      },
      messages,
    },

    quantitative: {
      perPerson: {
        Alex: {
          totalMessages: 750, totalWords: 15000, totalCharacters: 95000,
          averageMessageLength: 20, averageMessageChars: 127,
          longestMessage: { content: 'To jest mój najdłuższy tekst kiedykolwiek napisany w tej konwersacji...', length: 70, timestamp: Date.now() },
          shortestMessage: { content: 'ok', length: 2, timestamp: Date.now() },
          messagesWithEmoji: 200, emojiCount: 350,
          topEmojis: [{ emoji: '😂', count: 80 }, { emoji: '❤️', count: 60 }, { emoji: '🔥', count: 40 }],
          questionsAsked: 120, mediaShared: 30, linksShared: 15,
          reactionsGiven: 180, reactionsReceived: 160,
          topReactionsGiven: [{ emoji: '❤️', count: 60 }, { emoji: '😂', count: 50 }],
          unsentMessages: 5,
          topWords: [{ word: 'kocham', count: 45 }, { word: 'tęsknię', count: 32 }, { word: 'super', count: 28 }],
          topPhrases: [{ phrase: 'dobranoc kochanie', count: 15 }, { phrase: 'do zobaczenia', count: 12 }],
          uniqueWords: 2500, vocabularyRichness: 0.167,
        },
        Jamie: {
          totalMessages: 750, totalWords: 14200, totalCharacters: 92000,
          averageMessageLength: 19, averageMessageChars: 123,
          longestMessage: { content: 'Jamie też pisze długie wiadomości, z emocjami i uczuciami...', length: 62, timestamp: Date.now() },
          shortestMessage: { content: 'k', length: 1, timestamp: Date.now() },
          messagesWithEmoji: 190, emojiCount: 320,
          topEmojis: [{ emoji: '❤️', count: 85 }, { emoji: '😂', count: 55 }, { emoji: '🥰', count: 35 }],
          questionsAsked: 110, mediaShared: 28, linksShared: 12,
          reactionsGiven: 170, reactionsReceived: 190,
          topReactionsGiven: [{ emoji: '❤️', count: 70 }, { emoji: '😂', count: 45 }],
          unsentMessages: 3,
          topWords: [{ word: 'kocham', count: 50 }, { word: 'piękna', count: 38 }, { word: 'zawsze', count: 25 }],
          topPhrases: [{ phrase: 'kocham cię', count: 18 }, { phrase: 'śpij dobrze', count: 14 }],
          uniqueWords: 2400, vocabularyRichness: 0.169,
        },
      },
      timing: {
        perPerson: {
          Alex: { averageResponseTimeMs: 180000, medianResponseTimeMs: 120000, fastestResponseMs: 5000, slowestResponseMs: 86400000, responseTimeTrend: 0.05, trimmedMeanMs: 150000, stdDevMs: 240000, q1Ms: 30000, q3Ms: 300000, iqrMs: 270000, p75Ms: 300000, p90Ms: 600000, p95Ms: 900000, skewness: 2.5, sampleSize: 500 },
          Jamie: { averageResponseTimeMs: 200000, medianResponseTimeMs: 140000, fastestResponseMs: 3000, slowestResponseMs: 172800000, responseTimeTrend: 0.08, trimmedMeanMs: 170000, stdDevMs: 310000, q1Ms: 40000, q3Ms: 350000, iqrMs: 310000, p75Ms: 350000, p90Ms: 720000, p95Ms: 1080000, skewness: 3.1, sampleSize: 480 },
        },
        conversationInitiations: { Alex: 180, Jamie: 170 },
        conversationEndings: { Alex: 175, Jamie: 172 },
        longestSilence: { durationMs: 604800000, startTimestamp: Date.now() - 100 * 86400000, endTimestamp: Date.now() - 93 * 86400000, lastSender: 'Alex', nextSender: 'Jamie' },
        lateNightMessages: { Alex: 120, Jamie: 95 },
      },
      engagement: {
        doubleTexts: { Alex: 45, Jamie: 38 },
        maxConsecutive: { Alex: 6, Jamie: 5 },
        messageRatio: { Alex: 0.5, Jamie: 0.5 },
        reactionRate: { Alex: 0.24, Jamie: 0.227 },
        reactionGiveRate: { Alex: 0.24, Jamie: 0.227 },
        reactionReceiveRate: { Alex: 0.213, Jamie: 0.253 },
        avgConversationLength: 18.5,
        totalSessions: 450,
      },
      patterns: {
        monthlyVolume: Array.from({ length: 12 }, (_, i) => ({
          month: `2025-${String(i + 1).padStart(2, '0')}`,
          perPerson: { Alex: 55 + Math.floor(Math.random() * 30), Jamie: 50 + Math.floor(Math.random() * 35) },
          total: 110 + Math.floor(Math.random() * 60),
        })),
        weekdayWeekend: { weekday: { Alex: 520, Jamie: 510 }, weekend: { Alex: 230, Jamie: 240 } },
        volumeTrend: 0.12,
        bursts: [{ startDate: '2025-06-15', endDate: '2025-06-20', messageCount: 450, avgDaily: 75 }],
      },
      heatmap: {
        perPerson: {
          Alex: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 20))),
          Jamie: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 20))),
        },
        combined: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 40))),
      },
      trends: {
        responseTimeTrend: Array.from({ length: 6 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, perPerson: { Alex: 200000 - i * 5000, Jamie: 220000 - i * 4000 } })),
        messageLengthTrend: Array.from({ length: 6 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, perPerson: { Alex: 17 + i, Jamie: 16 + i * 0.8 } })),
        initiationTrend: Array.from({ length: 6 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, perPerson: { Alex: 0.48 + i * 0.01, Jamie: 0.52 - i * 0.01 } })),
        sentimentTrend: Array.from({ length: 6 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, perPerson: { Alex: 0.60 + i * 0.03, Jamie: 0.62 + i * 0.02 } })),
      },
      viralScores: {
        compatibilityScore: 78,
        interestScores: { Alex: 82, Jamie: 75 },
        ghostRisk: { Alex: { score: 12, factors: ['responsive'] }, Jamie: { score: 18, factors: ['slightly delayed'] } },
        delusionScore: 15, delusionHolder: 'Alex',
      },
      badges: [
        { id: 'night_owl', name: 'Nocna Sowa', emoji: '🦉', description: '100+ wiadomości 22-04', holder: 'Alex', evidence: '120 nocnych' },
        { id: 'double_texter', name: 'Double Texter', emoji: '📱📱', description: 'Seryjny nadawca', holder: 'Jamie', evidence: '38 double-textów' },
        { id: 'emoji_master', name: 'Emoji Master', emoji: '😂', description: 'Najwięcej emoji', holder: 'Alex', evidence: '350 emoji' },
      ],
      bestTimeToText: {
        perPerson: {
          Alex: { bestDay: 'Friday', bestHour: 20, bestWindow: '20:00-22:00', avgResponseMs: 120000 },
          Jamie: { bestDay: 'Saturday', bestHour: 19, bestWindow: '19:00-21:00', avgResponseMs: 140000 },
        },
      },
      catchphrases: {
        perPerson: {
          Alex: [{ phrase: 'dobranoc kochanie', count: 15, uniqueness: 0.8 }, { phrase: 'tęsknię', count: 12, uniqueness: 0.6 }],
          Jamie: [{ phrase: 'kocham cię', count: 18, uniqueness: 0.7 }, { phrase: 'śpij dobrze', count: 14, uniqueness: 0.75 }],
        },
        shared: [{ phrase: 'do zobaczenia', count: 8, uniqueness: 0.4 }],
      },
      sentimentAnalysis: {
        perPerson: {
          Alex: { avgSentiment: 0.68, positiveRatio: 0.65, negativeRatio: 0.12, neutralRatio: 0.23, emotionalVolatility: 0.18 },
          Jamie: { avgSentiment: 0.70, positiveRatio: 0.68, negativeRatio: 0.10, neutralRatio: 0.22, emotionalVolatility: 0.15 },
        },
      },
      conflictAnalysis: {
        events: [
          { type: 'escalation', timestamp: Date.now() - 120 * 86400000, date: '2025-10-15', participants: ['Alex', 'Jamie'], description: 'Kłótnia o plany', severity: 6, messageRange: [420, 480] },
          { type: 'resolution', timestamp: Date.now() - 119 * 86400000, date: '2025-10-16', participants: ['Alex'], description: 'Przeprosiny', severity: 2, messageRange: [485, 510] },
        ],
        totalConflicts: 8, mostConflictProne: 'Jamie',
      },
      intimacyProgression: {
        trend: Array.from({ length: 6 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, score: 0.42 + i * 0.08, components: { messageLengthFactor: 0.4 + i * 0.06, emotionalWordsFactor: 0.45 + i * 0.07, informalityFactor: 0.35 + i * 0.05, lateNightFactor: 0.5 + i * 0.05 } })),
        overallSlope: 0.065, label: 'Growing intimacy',
      },
      responseTimeDistribution: {
        perPerson: {
          Alex: [
            { label: '< 1 min', minMs: 0, maxMs: 60000, count: 85, percentage: 11.3 },
            { label: '1-5 min', minMs: 60000, maxMs: 300000, count: 280, percentage: 37.3 },
            { label: '5-30 min', minMs: 300000, maxMs: 1800000, count: 245, percentage: 32.7 },
            { label: '30min-2h', minMs: 1800000, maxMs: 7200000, count: 105, percentage: 14.0 },
            { label: '> 2h', minMs: 7200000, maxMs: Infinity, count: 35, percentage: 4.7 },
          ],
          Jamie: [
            { label: '< 1 min', minMs: 0, maxMs: 60000, count: 75, percentage: 10.0 },
            { label: '1-5 min', minMs: 60000, maxMs: 300000, count: 250, percentage: 33.3 },
            { label: '5-30 min', minMs: 300000, maxMs: 1800000, count: 280, percentage: 37.3 },
            { label: '30min-2h', minMs: 1800000, maxMs: 7200000, count: 120, percentage: 16.0 },
            { label: '> 2h', minMs: 7200000, maxMs: Infinity, count: 25, percentage: 3.3 },
          ],
        },
      },
      yearMilestones: { peakMonth: { month: '2025-06', label: 'Czerwiec', count: 280 }, worstMonth: { month: '2025-01', label: 'Styczeń', count: 150 }, yoyTrend: 0.25, totalMonths: 12 },
      pursuitWithdrawal: {
        pursuer: 'Alex', withdrawer: 'Jamie', cycleCount: 3, avgCycleDurationMs: 604800000, escalationTrend: 0.05,
        cycles: [{ pursuitTimestamp: Date.now() - 240 * 86400000, withdrawalDurationMs: 432000000, pursuitMessageCount: 35, resolved: true }],
      },
      rankingPercentiles: {
        rankings: [
          { metric: 'message_volume', label: 'Top 15%', value: 1500, percentile: 85, emoji: '💬' },
          { metric: 'avg_response_time', label: 'Top 20%', value: 190, percentile: 80, emoji: '⚡' },
          { metric: 'emoji_usage', label: 'Top 5%', value: 670, percentile: 95, emoji: '😂' },
        ],
      },
      lsm: {
        overall: 0.62,
        perCategory: { articles: 0.58, pronouns: 0.65, prepositions: 0.60, negations: 0.55, quantifiers: 0.68, comparatives: 0.61, auxiliaries: 0.64, adverbs: 0.59, conjunctions: 0.67 },
        interpretation: 'Umiarkowana synchronizacja', adaptationDirection: { chameleon: 'Jamie', asymmetryScore: 0.18 },
      },
      pronounAnalysis: {
        perPerson: {
          Alex: { iCount: 425, weCount: 180, youCount: 260, iRate: 28.3, weRate: 12.0, youRate: 17.3, iWeRatio: 2.36 },
          Jamie: { iCount: 380, weCount: 215, youCount: 290, iRate: 26.8, weRate: 15.1, youRate: 20.4, iWeRatio: 1.78 },
        },
        relationshipOrientation: 68,
      },
      _version: 2,
    },

    // ═══ QUALITATIVE — AI analysis results ═══
    qualitative: {
      status: 'complete',
      pass1: {
        relationship_type: { category: 'romantic', sub_type: 'established_couple', confidence: 92 },
        tone_per_person: {
          Alex: { primary_tone: 'czuły', secondary_tones: ['żartobliwy', 'wrażliwy'], formality_level: 2, humor_presence: 65, humor_style: 'teasing', warmth: 88, confidence: 89, evidence_indices: [5, 12, 45] },
          Jamie: { primary_tone: 'ciepły', secondary_tones: ['wspierający', 'flirciarski'], formality_level: 1, humor_presence: 60, humor_style: 'playful', warmth: 90, confidence: 87, evidence_indices: [8, 25, 67] },
        },
        overall_dynamic: { description: 'Zbalansowana, czuła para z konsekwentnym zaangażowaniem', energy: 'high', balance: 'balanced', trajectory: 'warming', confidence: 88 },
      },
      pass2: {
        power_dynamics: { balance_score: 8, who_adapts_more: 'Jamie', adaptation_type: 'emotional', evidence: ['Jamie waliduje obawy Alexa'], confidence: 85 },
        emotional_labor: { primary_caregiver: 'Jamie', patterns: [{ type: 'comforting', performed_by: 'Jamie', frequency: 'frequent', evidence_indices: [25, 45] }], balance_score: 35, confidence: 82 },
        conflict_patterns: { conflict_frequency: 'occasional', typical_trigger: 'Luki komunikacyjne', resolution_style: { Alex: 'direct_confrontation', Jamie: 'apologetic' }, unresolved_tensions: [], confidence: 80 },
        intimacy_markers: {
          vulnerability_level: {
            Alex: { score: 72, examples: ['dzieli się lękami', 'przyznaje się do obaw'], trend: 'increasing' },
            Jamie: { score: 78, examples: ['otwiera się emocjonalnie'], trend: 'stable' },
          },
          shared_language: { inside_jokes: 8, pet_names: true, unique_phrases: ['nasze miejsce', 'zawsze i na zawsze'], language_mirroring: 0.68 },
          confidence: 87,
        },
        red_flags: [{ pattern: 'Okazjonalne wycofywanie po konflikcie', severity: 'mild', context_note: 'Występuje ~2x na kwartał', evidence_indices: [420], confidence: 75 }],
        green_flags: [
          { pattern: 'Konsekwentna czułość i walidacja', evidence_indices: [8, 25, 45, 78], confidence: 92 },
          { pattern: 'Szybkie rozwiązywanie konfliktów', evidence_indices: [420, 510], confidence: 88 },
        ],
      },
      pass3: {
        Alex: {
          big_five_approximation: {
            openness: { range: [6, 8], evidence: 'Dzieli się wrażliwością, lubi eksplorować tematy', confidence: 78 },
            conscientiousness: { range: [7, 8], evidence: 'Niezawodny w zobowiązaniach', confidence: 82 },
            extraversion: { range: [5, 7], evidence: 'Zbalansowane zaangażowanie społeczne', confidence: 75 },
            agreeableness: { range: [7, 9], evidence: 'Wspierający, szuka harmonii', confidence: 80 },
            neuroticism: { range: [4, 6], evidence: 'Okazjonalny lęk, generalnie stabilny', confidence: 76 },
          },
          attachment_indicators: {
            primary_style: 'secure',
            indicators: [
              { behavior: 'Konsekwentna inicjacja kontaktu', attachment_relevance: 'Wskazuje na bezpieczną bazę', evidence_indices: [5, 12, 25] },
              { behavior: 'Dzielenie się wrażliwością', attachment_relevance: 'Pokazuje zaufanie', evidence_indices: [67, 89] },
            ],
            confidence: 82,
          },
          communication_profile: { style: 'direct', assertiveness: 72, emotional_expressiveness: 78, self_disclosure_depth: 8, question_to_statement_ratio: 'balanced', typical_message_structure: 'Krótkie do średnich, dużo emoji', verbal_tics: ['haha', 'ugh', 'szczerze'], emoji_personality: 'ekspresyjny' },
          communication_needs: { primary: 'potwierdzenie', secondary: 'konsekwencja', unmet_needs_signals: [], confidence: 85 },
          emotional_patterns: { emotional_range: 7, dominant_emotions: ['radość', 'miłość', 'zadowolenie'], coping_mechanisms_visible: ['humor', 'dzielenie się z partnerem'], stress_indicators: ['krótsze wiadomości', 'mniej emoji'], confidence: 83 },
          clinical_observations: {
            anxiety_markers: { present: true, patterns: ['Wyraża obawy o przyszłość'], frequency: 'occasional', confidence: 72 },
            avoidance_markers: { present: false, patterns: [], frequency: 'not_observed', confidence: 88 },
            manipulation_patterns: { present: false, types: [], frequency: 'not_observed', confidence: 90 },
            boundary_respect: { score: 85, examples: ['Szanuje przestrzeń partnera'], confidence: 88 },
            codependency_signals: { present: false, indicators: [], confidence: 85 },
            disclaimer: 'Oparte wyłącznie na analizie tekstu',
          },
          conflict_resolution: { primary_style: 'direct_confrontation', triggers: ['Poczucie zaniedbania'], recovery_speed: 'moderate', de_escalation_skills: 72, confidence: 80 },
          emotional_intelligence: { empathy: { score: 78, evidence: 'Waliduje uczucia partnera' }, self_awareness: { score: 72, evidence: 'Przyznaje się do lęku' }, emotional_regulation: { score: 75, evidence: 'Generalnie spokojny' }, social_skills: { score: 80, evidence: 'Angażujący rozmówca' }, overall: 76, confidence: 81 },
          mbti: { type: 'ENFP', confidence: 68, reasoning: { ie: { letter: 'E', evidence: 'Częsta inicjacja', confidence: 75 }, sn: { letter: 'N', evidence: 'Zorientowany na przyszłość', confidence: 70 }, tf: { letter: 'F', evidence: 'Skupiony na emocjach', confidence: 78 }, jp: { letter: 'P', evidence: 'Spontaniczny', confidence: 65 } } },
          love_language: { primary: 'words_of_affirmation', secondary: 'quality_time', scores: { words_of_affirmation: 88, quality_time: 75, acts_of_service: 52, gifts_pebbling: 45, physical_touch: 68 }, evidence: 'Częste użycie potwierdzających słów', confidence: 82 },
        },
        Jamie: {
          big_five_approximation: {
            openness: { range: [7, 9], evidence: 'Ciekawski, chętnie eksploruje', confidence: 79 },
            conscientiousness: { range: [8, 9], evidence: 'Wysoce zorganizowany', confidence: 85 },
            extraversion: { range: [4, 6], evidence: 'Bardziej wycofany, preferuje intymne rozmowy', confidence: 73 },
            agreeableness: { range: [8, 9], evidence: 'Wysoce wspierający', confidence: 87 },
            neuroticism: { range: [3, 5], evidence: 'Emocjonalnie stabilny', confidence: 81 },
          },
          attachment_indicators: {
            primary_style: 'secure',
            indicators: [{ behavior: 'Konsekwentne zapewnianie i wsparcie', attachment_relevance: 'Demonstracja bezpiecznej bazy', evidence_indices: [8, 25, 45] }],
            confidence: 85,
          },
          communication_profile: { style: 'direct', assertiveness: 75, emotional_expressiveness: 82, self_disclosure_depth: 9, question_to_statement_ratio: 'balanced', typical_message_structure: 'Przemyślane, ciepłe', verbal_tics: ['kochanie', 'zawsze', 'na zawsze'], emoji_personality: 'ciepły' },
          communication_needs: { primary: 'konsekwencja', secondary: 'głębia', unmet_needs_signals: [], confidence: 87 },
          emotional_patterns: { emotional_range: 8, dominant_emotions: ['miłość', 'zadowolenie', 'czułość'], coping_mechanisms_visible: ['komunikacja', 'rozwiązywanie problemów'], stress_indicators: ['częstszy kontakt'], confidence: 85 },
          clinical_observations: {
            anxiety_markers: { present: false, patterns: [], frequency: 'not_observed', confidence: 86 },
            avoidance_markers: { present: false, patterns: [], frequency: 'not_observed', confidence: 89 },
            manipulation_patterns: { present: false, types: [], frequency: 'not_observed', confidence: 91 },
            boundary_respect: { score: 88, examples: ['Jasno określa potrzeby'], confidence: 90 },
            codependency_signals: { present: false, indicators: [], confidence: 88 },
            disclaimer: 'Oparte wyłącznie na analizie tekstu',
          },
          conflict_resolution: { primary_style: 'apologetic', triggers: ['Poczucie niedocenienia'], recovery_speed: 'fast', de_escalation_skills: 85, confidence: 84 },
          emotional_intelligence: { empathy: { score: 85, evidence: 'Wysoce wyczulony' }, self_awareness: { score: 80, evidence: 'Rozumie własne wzorce' }, emotional_regulation: { score: 82, evidence: 'Spokojna obecność' }, social_skills: { score: 83, evidence: 'Ciepły, autentyczny' }, overall: 82, confidence: 85 },
          mbti: { type: 'INFP', confidence: 72, reasoning: { ie: { letter: 'I', evidence: 'Przemyślany, preferuje głębokie rozmowy', confidence: 78 }, sn: { letter: 'N', evidence: 'Planowanie przyszłości', confidence: 75 }, tf: { letter: 'F', evidence: 'Kierowany wartościami', confidence: 82 }, jp: { letter: 'P', evidence: 'Elastyczny', confidence: 68 } } },
          love_language: { primary: 'quality_time', secondary: 'words_of_affirmation', scores: { words_of_affirmation: 82, quality_time: 90, acts_of_service: 75, gifts_pebbling: 58, physical_touch: 72 }, evidence: 'Często sugeruje wspólne spędzanie czasu', confidence: 85 },
        },
      },
      pass4: {
        executive_summary: 'Alex i Jamie dzielą głęboko połączony, bezpieczny związek romantyczny cechujący się konsekwentną czułością, zbalansowaną komunikacją i silnym poczuciem bezpieczeństwa emocjonalnego.',
        health_score: {
          overall: 82,
          components: { balance: 85, reciprocity: 88, response_pattern: 79, emotional_safety: 85, growth_trajectory: 76 },
          explanation: 'Silny związek pokazujący zdrową wzajemność, konsekwentne zaangażowanie i bezpieczeństwo emocjonalne.',
        },
        key_findings: [
          { finding: 'Bezpieczna Baza Przywiązania', significance: 'positive', detail: 'Oboje demonstrują bezpieczne wskaźniki przywiązania z konsekwentnym poszukiwaniem komfortu' },
          { finding: 'Zbalansowana Dynamika Władzy', significance: 'positive', detail: 'Lekka adaptacja w kierunku Jamie, ale ogólnie zrównoważona' },
          { finding: 'Sukces w Rozwiązywaniu Konfliktów', significance: 'positive', detail: 'Konflikty rozwiązywane szybko (24h)' },
        ],
        relationship_trajectory: {
          current_phase: 'established',
          direction: 'strengthening',
          inflection_points: [{ approximate_date: '2025-06', description: 'Okres wzmożonej intymności', evidence: 'Szczyt wolumenu wiadomości' }],
        },
        insights: [
          { for: 'Alex', insight: 'Twoja konsekwentna czułość i wrażliwość tworzą bezpieczeństwo. Kontynuuj wyrażanie potrzeb bezpośrednio.', priority: 'high' },
          { for: 'Jamie', insight: 'Twoje emocjonalne wsparcie jest głęboko doceniane. Upewnij się, że Twoje potrzeby też są spełniane.', priority: 'high' },
        ],
        predictions: [
          { prediction: 'Związek umocni się w ciągu 6-12 miesięcy', confidence: 78, timeframe: '6-12 miesięcy', basis: 'Pozytywna trajektoria, wysoka wzajemność' },
          { prediction: 'Potencjalny kryzys komunikacyjny w stresujących okresach', confidence: 45, timeframe: '3-6 miesięcy', basis: 'Historyczne wzorce wycofywania' },
        ],
        conversation_personality: { if_this_conversation_were_a: { movie_genre: 'Komedia romantyczna', weather: 'Ciepło, słonecznie z lekkim wiatrem', one_word: 'Dom' } },
      },
      roast: {
        roasts_per_person: {
          Alex: ['Ludzkie uosobienie "haha ok" z emocjonalnym whiplashem w zestawie', 'Myśli że 3 minuty odpowiedzi to "szybko" — kolego, to twój język miłości', 'Obsypuje Jamie czułością a potem znika na 2 godziny bo "zajęty"'],
          Jamie: ['Taki wspierający że aż podejrzane — co ukrywasz?', 'Używa "kochanie" częściej niż normalnych słów', 'Emocjonalnie dostępny 24/7 ale nie umie wybrać restauracji'],
        },
        relationship_roast: 'To jest co się dzieje gdy dwoje emocjonalnie inteligentnych ludzi się spotyka: zero dramy, same nudne rzeczy jak "komunikacja" i "zrozumienie." Rewolucyjne.',
        superlatives: [
          { title: 'Najszybciej Przeprosi', holder: 'Jamie', roast: 'Bo przepraszanie to drugi język Jamie po deklaracjach miłosnych' },
          { title: 'Mistrz Znikania', holder: 'Alex', roast: 'Opanował sztukę ghostowania... własnych powiadomień' },
        ],
        verdict: 'Zaskakująco zdrowe. Natychmiast szukajcie terapii żeby to zepsuć.',
      },
    },
  };
}

// ── IndexedDB write ──
async function seedIndexedDB() {
  const mock = buildMockAnalysis();

  return new Promise<string>((resolve, reject) => {
    const req = indexedDB.open('podtekst', 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('analyses')) {
        db.createObjectStore('analyses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('index')) {
        db.createObjectStore('index', { keyPath: 'id' });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['analyses', 'index'], 'readwrite');

      tx.objectStore('analyses').put(mock);
      tx.objectStore('index').put({
        id: mock.id,
        title: mock.title,
        createdAt: mock.createdAt,
        platform: mock.conversation.platform,
        participantCount: mock.conversation.participants.length,
        messageCount: mock.conversation.metadata.totalMessages,
        hasQualitative: true,
        relationshipContext: mock.relationshipContext,
      });

      tx.oncomplete = () => {
        db.close();
        resolve(mock.id);
      };
      tx.onerror = () => reject(tx.error);
    };

    req.onerror = () => reject(req.error);
  });
}

export default function DevSeedPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'seeding' | 'done' | 'error'>('idle');

  const handleSeed = useCallback(async () => {
    setStatus('seeding');
    try {
      const id = await seedIndexedDB();
      setStatus('done');
      setTimeout(() => router.push(`/analysis/${id}`), 800);
    } catch (err) {
      console.error('Seed failed:', err);
      setStatus('error');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505]">
      <div className="max-w-md space-y-6 rounded-2xl border border-purple-500/20 bg-purple-950/20 p-8 text-center backdrop-blur-sm">
        <h1 className="font-[var(--font-syne)] text-2xl font-bold text-purple-300">
          Dev Seed Tool
        </h1>
        <p className="text-sm text-purple-200/60">
          Wstrzyknij losowe dane analizy do IndexedDB, aby przeglądać strony trybów (AI, metryki, itp.) z pełną zawartością.
        </p>
        <button
          onClick={handleSeed}
          disabled={status === 'seeding'}
          className="rounded-xl bg-purple-600 px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:opacity-50"
        >
          {status === 'idle' && 'Seed Mock Data'}
          {status === 'seeding' && 'Seeding...'}
          {status === 'done' && 'Done! Redirecting...'}
          {status === 'error' && 'Error — check console'}
        </button>
        {status === 'done' && (
          <p className="text-xs text-green-400/80">
            Mock ID: <code className="text-green-300">{MOCK_ID}</code> — redirecting to analysis...
          </p>
        )}
      </div>
    </div>
  );
}
