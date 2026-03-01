/**
 * Unified message types for PodTeksT.
 * All platform-specific parsers normalize to these types.
 */

export interface Participant {
  name: string;
  /** Original platform-specific identifier if available */
  platformId?: string;
}

export interface Reaction {
  emoji: string;
  actor: string;
  timestamp?: number;
  /** Number of reactions of this type (Discord — actor is unknown, count aggregates) */
  count?: number;
}

export interface UnifiedMessage {
  /** Sequential index in the conversation */
  index: number;
  /** Who sent the message */
  sender: string;
  /** Message text content. Empty string for media-only messages */
  content: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Message type */
  type: 'text' | 'media' | 'sticker' | 'link' | 'call' | 'system' | 'unsent';
  /** Reactions on this message */
  reactions: Reaction[];
  /** Whether this message has media attached */
  hasMedia: boolean;
  /** Whether this message has a link/share */
  hasLink: boolean;
  /** Whether this message was unsent/deleted */
  isUnsent: boolean;
  /** @mentions in this message — display names of mentioned users (Discord) */
  mentions?: string[];
  /** Index of the message this is a reply to (Discord) */
  replyToIndex?: number;
  /** Whether this message was edited after sending (Discord) */
  isEdited?: boolean;
}

export interface ParsedConversation {
  /** Source platform */
  platform: 'messenger' | 'whatsapp' | 'instagram' | 'telegram' | 'discord';
  /** Conversation title */
  title: string;
  /** List of participants */
  participants: Participant[];
  /** All messages, chronologically sorted (oldest first) */
  messages: UnifiedMessage[];
  /** Metadata */
  metadata: {
    totalMessages: number;
    dateRange: {
      start: number; // Unix ms
      end: number;   // Unix ms
    };
    /** Whether this is a group chat (3+ participants) */
    isGroup: boolean;
    /** Duration of conversation in days */
    durationDays: number;
    /** Discord channel ID (set during Discord import) */
    discordChannelId?: string;
  };
}

/**
 * Quantitative analysis results — computed without AI.
 */
export interface QuantitativeAnalysis {
  perPerson: Record<string, PersonMetrics>;
  timing: TimingMetrics;
  engagement: EngagementMetrics;
  patterns: PatternMetrics;
  heatmap: HeatmapData;
  trends: TrendData;
  viralScores?: ViralScores;
  badges?: Badge[];
  bestTimeToText?: BestTimeToText;
  catchphrases?: CatchphraseResult;
  networkMetrics?: NetworkMetrics;
  reciprocityIndex?: ReciprocityIndex;
  sentimentAnalysis?: SentimentAnalysis;
  conflictAnalysis?: ConflictAnalysis;
  intimacyProgression?: IntimacyProgression;
  teamAnalysis?: TeamAnalysis;
  responseTimeDistribution?: ResponseTimeDistribution;
  yearMilestones?: YearMilestones;
  pursuitWithdrawal?: PursuitWithdrawalAnalysis;
  rankingPercentiles?: RankingPercentiles;
  /** Language Style Matching — function word similarity (Ireland & Pennebaker, 2010) */
  lsm?: LSMResult;
  /** Pronoun analysis — I/We/You rates (Pennebaker, 2011) */
  pronounAnalysis?: PronounAnalysis;
  /** Behavioral chronotype compatibility from message timestamps (Aledavood 2018) */
  chronotypeCompatibility?: import('../analysis/quant/chronotype').ChronotypeCompatibility;
  /** Shift-response vs support-response ratio (Derber 1979) */
  shiftSupportResult?: import('../analysis/quant/shift-support').ShiftSupportResult;
  /** Emotional granularity — diversity of emotion categories (Vishnubhotla 2024) */
  emotionalGranularity?: import('../analysis/quant/emotional-granularity').EmotionalGranularityResult;
  /** Bid-response ratio — Gottman's "turning toward" metric (Gottman 1999) */
  bidResponseResult?: import('../analysis/quant/bid-response').BidResponseResult;
  /** Integrative complexity — phrase-based IC scoring (Suedfeld & Tetlock 1977, Conway AutoIC 2014) */
  integrativeComplexity?: import('../analysis/quant/integrative-complexity').IntegrativeComplexityResult;
  /** Temporal focus — past/present/future orientation from marker analysis (Pennebaker LIWC 2007) */
  temporalFocus?: import('../analysis/quant/temporal-focus').TemporalFocusResult;
  /** Conversational repair patterns — self-repair vs other-repair (Schegloff 1977) */
  repairPatterns?: import('../analysis/quant/repair-patterns').RepairPatternsResult;
  /** Per-person conflict behavior fingerprint — escalation/de-escalation styles, conflict vocabulary */
  conflictFingerprint?: import('../analysis/quant/conflict-fingerprint').ConflictFingerprintResult;
  /** Professional RT analysis: turn-based, overnight-filtered, with composite indices (Templeton 2022) */
  responseTimeAnalysis?: import('../analysis/quant/response-time-engine').ResponseTimeAnalysis;
  /** Data format version — used for migrations (e.g. UTC→local date fix) */
  _version?: number;
}

// ============================================================
// Team Analysis types (groups 5+)
// ============================================================

export type TeamRoleType = 'lider' | 'mediator' | 'prowokator' | 'lurker' | 'nucleus' | 'outsider';

export interface TeamRoleScores {
  centrality: number;
  messageShare: number;
  initiationRate: number;
  doubleTextRate: number;
  lateNightRate: number;
  reciprocalStrength: number;
}

export interface TeamRole {
  name: string;
  role: TeamRoleType;
  confidence: number;
  evidence: string[];
  scores: TeamRoleScores;
}

export interface Community {
  id: number;
  members: string[];
  label: string;
  cohesion: number;
  bridgePerson?: string;
}

export interface TeamAnalysis {
  roles: TeamRole[];
  communities: Community[];
}

/**
 * Reciprocity Index — composite metric measuring relationship balance.
 * 0 = completely one-sided, 50 = perfectly balanced, 100 = completely one-sided (other direction).
 */
export interface ReciprocityIndex {
  /** Overall reciprocity score: 0-100, 50 = perfect balance */
  overall: number;
  /** Message count balance between participants */
  messageBalance: number;
  /** Who starts conversations balance */
  initiationBalance: number;
  /** Response time symmetry between participants */
  responseTimeSymmetry: number;
  /** Reaction/emoji giving balance */
  reactionBalance: number;
}

export interface PersonMetrics {
  totalMessages: number;
  totalWords: number;
  totalCharacters: number;
  averageMessageLength: number; // words
  averageMessageChars: number;  // characters
  longestMessage: { content: string; length: number; timestamp: number };
  shortestMessage: { content: string; length: number; timestamp: number };
  messagesWithEmoji: number;
  emojiCount: number;
  topEmojis: Array<{ emoji: string; count: number }>;
  questionsAsked: number; // messages containing ?
  mediaShared: number;
  linksShared: number;
  reactionsGiven: number;
  reactionsReceived: number;
  topReactionsGiven: Array<{ emoji: string; count: number }>;
  unsentMessages: number;
  /** Top 20 most-used words (excluding stopwords) */
  topWords: Array<{ word: string; count: number }>;
  /** Top 10 most-used 2-3 word phrases */
  topPhrases: Array<{ phrase: string; count: number }>;
  /** Number of unique words used */
  uniqueWords: number;
  /** Vocabulary richness: Guiraud's R = unique / sqrt(total) */
  vocabularyRichness: number;
  /** Questions per 1000 messages — normalized for cross-conversation comparison */
  questionsAskedPer1k?: number;
  /** Media shares per 1000 messages */
  mediaSharedPer1k?: number;
  /** Links per 1000 messages */
  linksSharedPer1k?: number;
  /** Emoji messages per 1000 messages */
  emojiRatePer1k?: number;
  /** @mentions this person made (Discord) */
  mentionsMade?: number;
  /** Times this person was @mentioned by others (Discord) */
  mentionsReceived?: number;
  /** Reply messages this person sent (Discord) */
  repliesSent?: number;
  /** Times others replied to this person's messages (Discord) */
  repliesReceived?: number;
  /** Messages edited after sending (Discord) */
  editedMessages?: number;
}

export interface TimingMetrics {
  perPerson: Record<string, {
    averageResponseTimeMs: number;
    medianResponseTimeMs: number;
    fastestResponseMs: number;
    slowestResponseMs: number;
    /** Response time trend over months: positive = getting slower */
    responseTimeTrend: number;
    /** 10% trimmed mean — robust to outliers on both tails */
    trimmedMeanMs?: number;
    /** Population standard deviation of response times */
    stdDevMs?: number;
    /** 25th percentile (Q1) */
    q1Ms?: number;
    /** 75th percentile (Q3) */
    q3Ms?: number;
    /** Interquartile range (Q3 - Q1) */
    iqrMs?: number;
    /** 75th percentile */
    p75Ms?: number;
    /** 90th percentile */
    p90Ms?: number;
    /** 95th percentile */
    p95Ms?: number;
    /** Fisher-Pearson skewness — positive = right-skewed (many fast, few slow) */
    skewness?: number;
    /** Number of response time data points (for sample-size awareness) */
    sampleSize?: number;
  }>;
  /** First message after 6h+ gap, per person */
  conversationInitiations: Record<string, number>;
  /** Last message before 6h+ gap, per person */
  conversationEndings: Record<string, number>;
  /** Longest gap between any messages, in ms */
  longestSilence: {
    durationMs: number;
    startTimestamp: number;
    endTimestamp: number;
    lastSender: string;
    nextSender: string;
  };
  /** Messages sent between 22:00-04:00 per person */
  lateNightMessages: Record<string, number>;
}

export interface EngagementMetrics {
  /** Messages sent in a row without reply (2+ = double text) */
  doubleTexts: Record<string, number>;
  /** Max messages in a row without reply */
  maxConsecutive: Record<string, number>;
  /** Ratio: person's messages / total messages */
  messageRatio: Record<string, number>;
  /** Reaction rate: reactions given / own total messages (backward compat alias for giveRate) */
  reactionRate: Record<string, number>;
  /** How often this person reacts to others' messages: reactionsGiven / own totalMessages */
  reactionGiveRate: Record<string, number>;
  /** How often others react to this person's messages: reactionsReceived / own totalMessages */
  reactionReceiveRate: Record<string, number>;
  /** Average messages per conversation session */
  avgConversationLength: number;
  /** Total distinct conversation sessions (separated by 6h+ gaps) */
  totalSessions: number;
  /** Mention rate: mentions made / messages sent (Discord) */
  mentionRate?: Record<string, number>;
  /** Reply rate: replies sent / total messages sent (Discord) */
  replyRate?: Record<string, number>;
}

export interface PatternMetrics {
  /** Messages per month */
  monthlyVolume: Array<{
    month: string; // YYYY-MM
    perPerson: Record<string, number>;
    total: number;
  }>;
  /** Weekday vs weekend activity */
  weekdayWeekend: {
    weekday: Record<string, number>;
    weekend: Record<string, number>;
  };
  /** Trend direction: positive = increasing, negative = decreasing */
  volumeTrend: number;
  /** Detected burst periods (>3x average daily messages) */
  bursts: Array<{
    startDate: string;
    endDate: string;
    messageCount: number;
    avgDaily: number;
  }>;
}

export interface HeatmapData {
  /** 7x24 matrix: [dayOfWeek][hourOfDay] = message count */
  perPerson: Record<string, number[][]>;
  combined: number[][];
}

export interface TrendData {
  /** Monthly average response time per person */
  responseTimeTrend: Array<{
    month: string;
    perPerson: Record<string, number>;
  }>;
  /** Monthly message length trend per person */
  messageLengthTrend: Array<{
    month: string;
    perPerson: Record<string, number>;
  }>;
  /** Monthly initiation ratio */
  initiationTrend: Array<{
    month: string;
    perPerson: Record<string, number>;
  }>;
  /** Monthly sentiment trend per person (-1 to 1 scale) */
  sentimentTrend?: Array<{
    month: string;
    perPerson: Record<string, number>;
  }>;
}

// ============================================================
// Sentiment Analysis
// ============================================================

export interface PersonSentimentStats {
  avgSentiment: number;
  positiveRatio: number;
  negativeRatio: number;
  neutralRatio: number;
  emotionalVolatility: number;
}

export interface SentimentAnalysis {
  perPerson: Record<string, PersonSentimentStats>;
}

// ============================================================
// Conflict Detection
// ============================================================

export type ConflictType = 'escalation' | 'cold_silence' | 'resolution';

export interface ConflictEvent {
  type: ConflictType;
  timestamp: number;
  date: string;
  participants: string[];
  description: string;
  severity: number;
  messageRange: [number, number];
}

export interface ConflictAnalysis {
  events: ConflictEvent[];
  totalConflicts: number;
  mostConflictProne?: string;
}

// ============================================================
// Intimacy Progression
// ============================================================

export interface IntimacyDataPoint {
  month: string;
  score: number;
  components: {
    messageLengthFactor: number;
    emotionalWordsFactor: number;
    informalityFactor: number;
    lateNightFactor: number;
  };
}

export interface IntimacyProgression {
  trend: IntimacyDataPoint[];
  overallSlope: number;
  label: string;
}

// ============================================================
// Viral Scores
// ============================================================

export interface ViralScores {
  /** Overall compatibility 0-100 based on activity overlap, response symmetry, engagement balance */
  compatibilityScore: number;
  /** Per-person interest score 0-100 based on initiation, response speed trends, message length trends */
  interestScores: Record<string, number>;
  /** Per-person ghost risk 0-100 — higher = more likely to ghost/be ghosted. null = insufficient data (<3 months) */
  ghostRisk: Record<string, GhostRiskData | null>;
  /** Delusion score 0-100 — how mismatched interest levels are (kept for IndexedDB backward compat) */
  delusionScore: number;
  /** Who is more "delusional" (has higher interest while other has lower) (kept for IndexedDB backward compat) */
  delusionHolder?: string;
  /** Alias for delusionScore — Investment Asymmetry 0-100 */
  investmentAsymmetry?: number;
  /** Alias for delusionHolder — more invested person */
  moreInvestedPerson?: string;
}

export interface GhostRiskData {
  score: number;
  factors: string[];
}

// ============================================================
// Badges & Achievements
// ============================================================

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  /** Optional custom icon filename (in /icons/badges/) */
  icon?: string;
  description: string;
  /** Who earned this badge */
  holder: string;
  /** Supporting evidence (stat value) */
  evidence: string;
}

// ============================================================
// Best Time to Text
// ============================================================

export interface BestTimeToText {
  perPerson: Record<string, {
    bestDay: string;
    bestHour: number;
    bestWindow: string;
    avgResponseMs: number;
  }>;
}

// ============================================================
// Catchphrases
// ============================================================

export interface CatchphraseResult {
  perPerson: Record<string, CatchphraseEntry[]>;
  /** Phrases co-used by multiple participants — no single person dominates (>70%) */
  shared: CatchphraseEntry[];
}

export interface CatchphraseEntry {
  phrase: string;
  count: number;
  /** How unique this phrase is to this person vs others (0-1, higher = more unique) */
  uniqueness: number;
}

// ============================================================
// Network Metrics (Group Chats)
// ============================================================

export interface NetworkNode {
  name: string;
  totalMessages: number;
  /** Degree centrality: 0-1, how connected this person is */
  centrality: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
  /** Total mutual interaction count */
  weight: number;
  /** Messages from -> to (A sent after B) */
  fromToCount: number;
  /** Messages to -> from (B sent after A) */
  toFromCount: number;
}

export interface NetworkMetrics {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  /** Graph density: actual edges / possible edges (0-1) */
  density: number;
  /** Person with highest centrality */
  mostConnected: string;
}

// ============================================================
// Response Time Distribution
// ============================================================

export interface ResponseTimeBin {
  label: string;
  minMs: number;
  maxMs: number;
  count: number;
  percentage: number;
}

export interface ResponseTimeDistribution {
  perPerson: Record<string, ResponseTimeBin[]>;
}

// ============================================================
// Year Milestones
// ============================================================

export interface YearMilestones {
  peakMonth: { month: string; label: string; count: number };
  worstMonth: { month: string; label: string; count: number };
  /** Year-over-year trend: (recent half) / (older half) - 1. Positive = growth */
  yoyTrend: number;
  totalMonths: number;
}

// ============================================================
// Pursuit-Withdrawal Analysis
// ============================================================

export interface PursuitWithdrawalCycle {
  pursuitTimestamp: number;
  withdrawalDurationMs: number;
  pursuitMessageCount: number;
  resolved: boolean;
}

export interface PursuitWithdrawalAnalysis {
  pursuer: string;
  withdrawer: string;
  cycleCount: number;
  avgCycleDurationMs: number;
  escalationTrend: number;
  cycles: PursuitWithdrawalCycle[];
}

// ============================================================
// Ranking Percentiles
// ============================================================

export interface RankingPercentile {
  metric: string;
  label: string;
  value: number;
  percentile: number;
  emoji: string;
  /** True when percentile is based on heuristic norms, not empirical population data */
  isEstimated?: boolean;
}

export interface RankingPercentiles {
  rankings: RankingPercentile[];
}

// ============================================================
// Language Style Matching (Ireland & Pennebaker, 2010)
// ============================================================

export interface LSMResult {
  /** Overall LSM score 0-1, higher = more linguistic synchrony */
  overall: number;
  /** Per-category LSM scores */
  perCategory: Record<string, number>;
  /** Polish-language interpretation */
  interpretation: string;
  /** Who adapts more to whom — the "chameleon" who mirrors their partner's style */
  adaptationDirection?: {
    chameleon: string;
    asymmetryScore: number;
  };
}

// ============================================================
// Pronoun Analysis (Pennebaker, 2011)
// ============================================================

export interface PersonPronounStats {
  iCount: number;
  weCount: number;
  youCount: number;
  iRate: number;       // per 1000 words
  weRate: number;      // per 1000 words
  youRate: number;     // per 1000 words
  iWeRatio: number;    // iRate / (weRate + 0.001)
}

export interface PronounAnalysis {
  perPerson: Record<string, PersonPronounStats>;
  /** 0-100, higher = more "we" language across all participants */
  relationshipOrientation: number;
}

// ============================================================
// Threat Meters
// ============================================================

export interface ThreatMeter {
  id: string;
  label: string;
  score: number;
  level: 'low' | 'moderate' | 'elevated' | 'critical';
  factors: string[];
}

export interface ThreatMetersResult {
  meters: ThreatMeter[];
}

// ============================================================
// Damage Report
// ============================================================

export interface DamageReportResult {
  emotionalDamage: number;
  communicationGrade: string;
  repairPotential: number;
  therapyBenefit: 'HIGH' | 'MODERATE' | 'LOW';
}
