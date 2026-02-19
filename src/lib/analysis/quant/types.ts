/**
 * Internal types for quantitative analysis submodules.
 *
 * These types are used across the quant submodules but are not
 * part of the public API. They represent intermediate accumulator
 * state used during the single-pass message processing.
 */

/**
 * Per-person accumulator used during the main message loop.
 * Collects raw data that is later post-processed into final metrics.
 */
export interface PersonAccumulator {
  totalMessages: number;
  totalWords: number;
  totalCharacters: number;
  longestMessage: { content: string; length: number; timestamp: number };
  shortestMessage: { content: string; length: number; timestamp: number };
  messagesWithEmoji: number;
  emojiCount: number;
  emojiFreq: Map<string, number>;
  questionsAsked: number;
  mediaShared: number;
  linksShared: number;
  reactionsGiven: number;
  reactionsReceived: number;
  reactionsGivenFreq: Map<string, number>;
  unsentMessages: number;
  /** Response times when this person responded to someone else */
  responseTimes: number[];
  /** Monthly response times for trend computation */
  monthlyResponseTimes: Map<string, number[]>;
  /** Monthly word counts for message length trend */
  monthlyWordCounts: Map<string, number[]>;
  /** Messages received from others (for reaction rate computation) */
  messagesReceived: number;
  /** Word frequency map (excluding stopwords) */
  wordFreq: Map<string, number>;
  /** Bigram frequency map */
  phraseFreq: Map<string, number>;
}

/** Create a fresh PersonAccumulator with default values. */
export function createPersonAccumulator(): PersonAccumulator {
  return {
    totalMessages: 0,
    totalWords: 0,
    totalCharacters: 0,
    longestMessage: { content: '', length: 0, timestamp: 0 },
    shortestMessage: { content: '', length: Infinity, timestamp: 0 },
    messagesWithEmoji: 0,
    emojiCount: 0,
    emojiFreq: new Map(),
    questionsAsked: 0,
    mediaShared: 0,
    linksShared: 0,
    reactionsGiven: 0,
    reactionsReceived: 0,
    reactionsGivenFreq: new Map(),
    unsentMessages: 0,
    responseTimes: [],
    monthlyResponseTimes: new Map(),
    monthlyWordCounts: new Map(),
    messagesReceived: 0,
    wordFreq: new Map(),
    phraseFreq: new Map(),
  };
}
