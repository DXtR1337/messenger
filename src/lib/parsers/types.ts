/**
 * Unified message types for ChatScope.
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
}

export interface ParsedConversation {
  /** Source platform */
  platform: 'messenger' | 'whatsapp' | 'instagram' | 'telegram';
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
  /** Vocabulary richness: unique words / total words */
  vocabularyRichness: number;
}

export interface TimingMetrics {
  perPerson: Record<string, {
    averageResponseTimeMs: number;
    medianResponseTimeMs: number;
    fastestResponseMs: number;
    slowestResponseMs: number;
    /** Response time trend over months: positive = getting slower */
    responseTimeTrend: number;
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
  /** Reaction rate: reactions given / messages received */
  reactionRate: Record<string, number>;
  /** Average messages per conversation session */
  avgConversationLength: number;
  /** Total distinct conversation sessions (separated by 6h+ gaps) */
  totalSessions: number;
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
}
