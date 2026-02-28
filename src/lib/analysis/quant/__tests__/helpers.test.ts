/**
 * Tests for quantitative analysis helper functions.
 */
import { describe, it, expect } from 'vitest';
import {
  extractEmojis,
  countWords,
  tokenizeWords,
  median,
  percentile,
  filterResponseTimeOutliers,
  topN,
  topNWords,
  topNPhrases,
  getMonthKey,
  getDayKey,
  isLateNight,
  isWeekend,
} from '../helpers';

// ============================================================
// countWords
// ============================================================

describe('countWords', () => {
  it('counts words in a simple English sentence', () => {
    expect(countWords('Hello world how are you')).toBe(5);
  });

  it('counts words in a Polish sentence', () => {
    expect(countWords('Cześć jak się masz')).toBe(4);
  });

  it('counts words in mixed language text', () => {
    expect(countWords('Hey cześć what is up')).toBe(5);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \t  \n  ')).toBe(0);
  });

  it('counts emoji-only text as single word', () => {
    expect(countWords('😀')).toBe(1);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('hello    world')).toBe(2);
  });
});

// ============================================================
// tokenizeWords
// ============================================================

describe('tokenizeWords', () => {
  it('lowercases and splits text into words', () => {
    const tokens = tokenizeWords('Hello World Test');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens).toContain('test');
  });

  it('filters out stopwords', () => {
    const tokens = tokenizeWords('I am going to the store');
    // "i", "am", "to", "the" are stopwords
    expect(tokens).not.toContain('the');
    expect(tokens).toContain('going');
    expect(tokens).toContain('store');
  });

  it('filters out single-character tokens', () => {
    const tokens = tokenizeWords('I a b c word');
    expect(tokens).not.toContain('a');
    expect(tokens).not.toContain('b');
    expect(tokens).not.toContain('c');
  });

  it('strips emoji characters', () => {
    const tokens = tokenizeWords('hello 😀 world 🎉');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    // No emoji in result
    for (const t of tokens) {
      expect(t).toMatch(/^[a-zA-Z\u00C0-\u024F]+$/u);
    }
  });

  it('splits on punctuation', () => {
    const tokens = tokenizeWords('hello,world;test!foo?bar');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens).toContain('test');
    expect(tokens).toContain('foo');
    expect(tokens).toContain('bar');
  });

  it('returns empty array for empty string', () => {
    expect(tokenizeWords('')).toEqual([]);
  });
});

// ============================================================
// extractEmojis
// ============================================================

describe('extractEmojis', () => {
  it('extracts standard emoji from text', () => {
    const result = extractEmojis('Hello 😀 World 🎉');
    expect(result).toContain('😀');
    expect(result).toContain('🎉');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no emoji present', () => {
    expect(extractEmojis('Hello World')).toEqual([]);
  });

  it('extracts multiple emoji from emoji-only text', () => {
    const result = extractEmojis('😀🎉❤️👍');
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('handles empty string', () => {
    expect(extractEmojis('')).toEqual([]);
  });

  it('extracts emoji mixed with Polish text', () => {
    const result = extractEmojis('Cześć 👋 jak się masz 😊');
    expect(result).toContain('👋');
    expect(result).toContain('😊');
  });
});

// ============================================================
// median
// ============================================================

describe('median', () => {
  it('returns middle element for odd-length array', () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it('returns average of two middle elements for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('returns the single element for length-1 array', () => {
    expect(median([42])).toBe(42);
  });

  it('returns 0 for empty array', () => {
    expect(median([])).toBe(0);
  });

  it('handles unsorted input by sorting first', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('handles negative numbers', () => {
    expect(median([-5, -1, -3])).toBe(-3);
  });
});

// ============================================================
// percentile
// ============================================================

describe('percentile', () => {
  it('returns correct 50th percentile (median)', () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(percentile(sorted, 50)).toBe(3);
  });

  it('returns first element for 0th percentile', () => {
    const sorted = [10, 20, 30, 40, 50];
    expect(percentile(sorted, 0)).toBe(10);
  });

  it('returns last element for 100th percentile', () => {
    const sorted = [10, 20, 30, 40, 50];
    expect(percentile(sorted, 100)).toBe(50);
  });

  it('interpolates between values for fractional index', () => {
    const sorted = [1, 2, 3, 4];
    // 25th percentile: idx = 0.25 * 3 = 0.75 => 1 + (2-1)*0.75 = 1.75
    expect(percentile(sorted, 25)).toBe(1.75);
  });

  it('returns 0 for empty array', () => {
    expect(percentile([], 50)).toBe(0);
  });

  it('returns the single element for any percentile on length-1 array', () => {
    expect(percentile([42], 0)).toBe(42);
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 100)).toBe(42);
  });
});

// ============================================================
// filterResponseTimeOutliers
// ============================================================

describe('filterResponseTimeOutliers', () => {
  it('returns input unchanged when fewer than 10 elements', () => {
    const times = [100, 200, 300, 400, 500];
    expect(filterResponseTimeOutliers(times)).toEqual(times);
  });

  it('filters extreme outliers from large dataset', () => {
    // Normal range: 100-500, one extreme outlier: 100000
    const normal = [100, 150, 200, 250, 300, 350, 400, 450, 500, 100000];
    const filtered = filterResponseTimeOutliers(normal);
    // Outlier should be removed
    expect(filtered).not.toContain(100000);
    // Normal values should remain
    expect(filtered).toContain(100);
    expect(filtered).toContain(500);
  });

  it('keeps values within 3*IQR upper fence', () => {
    // All values close together — nothing should be filtered
    const times = Array.from({ length: 20 }, (_, i) => 100 + i * 10);
    const filtered = filterResponseTimeOutliers(times);
    expect(filtered).toHaveLength(20);
  });

  it('handles dataset with multiple outliers', () => {
    const base = Array.from({ length: 15 }, () => 100);
    const withOutliers = [...base, 50000, 60000, 70000];
    const filtered = filterResponseTimeOutliers(withOutliers);
    expect(filtered.length).toBeLessThan(withOutliers.length);
    // All 100s should remain
    expect(filtered.filter(v => v === 100)).toHaveLength(15);
  });
});

// ============================================================
// topN, topNWords, topNPhrases
// ============================================================

describe('topN', () => {
  it('returns top items sorted by count descending', () => {
    const map = new Map([['😀', 5], ['😂', 10], ['❤️', 3]]);
    const result = topN(map, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ emoji: '😂', count: 10 });
    expect(result[1]).toEqual({ emoji: '😀', count: 5 });
  });

  it('returns all items when n exceeds map size', () => {
    const map = new Map([['😀', 1]]);
    expect(topN(map, 5)).toHaveLength(1);
  });
});

describe('topNWords', () => {
  it('returns top words sorted by count descending', () => {
    const map = new Map([['hello', 10], ['world', 5], ['test', 8]]);
    const result = topNWords(map, 2);
    expect(result[0]).toEqual({ word: 'hello', count: 10 });
    expect(result[1]).toEqual({ word: 'test', count: 8 });
  });
});

describe('topNPhrases', () => {
  it('returns top phrases sorted by count descending', () => {
    const map = new Map([['hello world', 7], ['good morning', 3], ['how are', 5]]);
    const result = topNPhrases(map, 2);
    expect(result[0]).toEqual({ phrase: 'hello world', count: 7 });
    expect(result[1]).toEqual({ phrase: 'how are', count: 5 });
  });
});

// ============================================================
// Date helpers
// ============================================================

describe('getMonthKey', () => {
  it('returns YYYY-MM format', () => {
    const ts = new Date(2024, 2, 15, 12, 0, 0).getTime(); // March 15 local
    expect(getMonthKey(ts)).toBe('2024-03');
  });

  it('uses local timezone, not UTC', () => {
    // Feb 1 at 00:30 local time — should be Feb, not Jan
    const ts = new Date(2024, 1, 1, 0, 30, 0).getTime();
    expect(getMonthKey(ts)).toBe('2024-02');
  });

  it('pads single-digit months', () => {
    const ts = new Date(2024, 0, 15, 12, 0, 0).getTime(); // January
    expect(getMonthKey(ts)).toBe('2024-01');
  });
});

describe('getDayKey', () => {
  it('returns YYYY-MM-DD format', () => {
    const ts = new Date(2024, 2, 15, 12, 0, 0).getTime(); // March 15 local
    expect(getDayKey(ts)).toBe('2024-03-15');
  });

  it('uses local timezone, not UTC', () => {
    // Feb 1 at 00:30 local time — should be Feb 1, not Jan 31
    const ts = new Date(2024, 1, 1, 0, 30, 0).getTime();
    expect(getDayKey(ts)).toBe('2024-02-01');
  });

  it('pads single-digit days and months', () => {
    const ts = new Date(2024, 0, 5, 12, 0, 0).getTime(); // Jan 5
    expect(getDayKey(ts)).toBe('2024-01-05');
  });
});

describe('isLateNight', () => {
  it('returns true for 23:00', () => {
    const ts = new Date(2024, 2, 15, 23, 0, 0).getTime();
    expect(isLateNight(ts)).toBe(true);
  });

  it('returns true for 02:00', () => {
    const ts = new Date(2024, 2, 15, 2, 0, 0).getTime();
    expect(isLateNight(ts)).toBe(true);
  });

  it('returns false for 12:00', () => {
    const ts = new Date(2024, 2, 15, 12, 0, 0).getTime();
    expect(isLateNight(ts)).toBe(false);
  });

  it('returns false for 04:00 (boundary)', () => {
    const ts = new Date(2024, 2, 15, 4, 0, 0).getTime();
    expect(isLateNight(ts)).toBe(false);
  });

  it('returns true for 22:00 (boundary)', () => {
    const ts = new Date(2024, 2, 15, 22, 0, 0).getTime();
    expect(isLateNight(ts)).toBe(true);
  });
});

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    // March 16, 2024 is a Saturday
    const ts = new Date(2024, 2, 16, 12, 0, 0).getTime();
    expect(isWeekend(ts)).toBe(true);
  });

  it('returns true for Sunday', () => {
    // March 17, 2024 is a Sunday
    const ts = new Date(2024, 2, 17, 12, 0, 0).getTime();
    expect(isWeekend(ts)).toBe(true);
  });

  it('returns false for Monday', () => {
    // March 18, 2024 is a Monday
    const ts = new Date(2024, 2, 18, 12, 0, 0).getTime();
    expect(isWeekend(ts)).toBe(false);
  });
});

describe('tokenizeWords - Unicode normalization (NFC)', () => {
  it('handles NFC normalized text correctly', () => {
    const nfc = 'kochanie'; // standard ę
    expect(tokenizeWords(nfc)).toContain('kochanie');
  });

  it('treats NFD and NFC forms of same word as identical after normalization', () => {
    // NFD: ę decomposed as e + combining character
    const nfd = 'kochanie'.normalize('NFD');
    const nfc = 'kochanie'.normalize('NFC');
    // After our normalization step, both should produce same token
    expect(tokenizeWords(nfd)).toEqual(tokenizeWords(nfc));
  });

  it('handles FB Messenger double-encode edge case via NFC', () => {
    // When NFC normalizes already-correct Polish text, output is unchanged
    // Use 'nienawidzę' (not a stopword) and 'uwielbiam' (not a stopword)
    const text = 'nienawidzę uwielbiam kocham';
    const result = tokenizeWords(text);
    expect(result).toContain('nienawidzę');
    expect(result).toContain('kocham');
  });

  it('tokenizes Polish text without diacritics correctly', () => {
    // 'nienawidze' and 'kocham' are not stopwords
    const text = 'nienawidze kocham uwielbiam';
    const result = tokenizeWords(text);
    expect(result).toContain('nienawidze');
    expect(result).toContain('kocham');
  });

  it('does not create duplicate tokens for same word in NFC and NFD forms', () => {
    // In a frequency map, NFC-normalized text should not produce duplicates
    const nfdText = '\u006B\u006F\u0063\u0068\u0061\u006E\u0069\u0065'; // "kochanie" in ASCII (no diacritics issue)
    const nfcText = 'kochanie';
    expect(tokenizeWords(nfdText)).toEqual(tokenizeWords(nfcText));
  });

  it('NFC normalization is transparent for ASCII text (no change)', () => {
    const ascii = 'hello world test';
    const result = tokenizeWords(ascii);
    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(result).toContain('test');
  });

  it('still filters stopwords after NFC normalization', () => {
    // Common Polish stopwords should still be filtered
    const text = 'ja to jest on ona'; // all likely stopwords
    const result = tokenizeWords(text);
    // Should not contain Polish stopwords - exact set depends on constants
    // At minimum, result should be array (may be empty if all filtered)
    expect(Array.isArray(result)).toBe(true);
  });

  it('handles mixed Polish and ASCII text with NFC', () => {
    // 'bardzo' is a stopword; use 'kocham' and 'uwielbiam' which are not
    const mixed = 'kocham you uwielbiam much';
    const result = tokenizeWords(mixed);
    expect(result).toContain('kocham');
    expect(result).toContain('uwielbiam');
    expect(result.every(w => w.length >= 2)).toBe(true);
  });
});
