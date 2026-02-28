/**
 * Tests for json-parser.ts — the Gemini API response parsing utilities.
 *
 * Covers all three stages of parseGeminiJSON plus sanitizeJsonString edge cases.
 * These are the failure modes we care about for production robustness:
 * - Markdown fences (Gemini often wraps JSON in ```json ... ```)
 * - Extra prose before/after the JSON block
 * - Trailing commas (invalid JSON, but Gemini produces them)
 * - Unescaped control characters inside string values
 * - Partial / truncated responses (simulate network cut-off or rate limit)
 * - Complete garbage / non-JSON
 * - Schema mismatch (valid JSON, wrong shape) — parseGeminiJSON is type-unsafe by design
 */
import { describe, it, expect } from 'vitest';
import { sanitizeJsonString, parseGeminiJSON } from '../json-parser';

// ---------------------------------------------------------------------------
// sanitizeJsonString
// ---------------------------------------------------------------------------

describe('sanitizeJsonString', () => {
  it('passes through clean ASCII JSON unchanged', () => {
    const input = '{"key":"value","num":42}';
    expect(sanitizeJsonString(input)).toBe(input);
  });

  it('replaces unescaped newline inside string value', () => {
    const input = '{"text":"line1\nline2"}';
    const result = sanitizeJsonString(input);
    expect(result).toBe('{"text":"line1\\nline2"}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('replaces unescaped carriage return inside string value', () => {
    const input = '{"text":"a\rb"}';
    const result = sanitizeJsonString(input);
    expect(result).toBe('{"text":"a\\rb"}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('replaces unescaped tab inside string value', () => {
    const input = '{"text":"col1\tcol2"}';
    const result = sanitizeJsonString(input);
    expect(result).toBe('{"text":"col1\\tcol2"}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('replaces arbitrary low-code control chars with unicode escape', () => {
    // U+0001 (SOH) inside a string value
    const input = `{"text":"a\x01b"}`;
    const result = sanitizeJsonString(input);
    expect(result).toContain('\\u0001');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('does NOT escape control chars outside string values', () => {
    // A raw newline between JSON keys is valid whitespace — should NOT be escaped
    const input = '{\n"key":"val"\n}';
    const result = sanitizeJsonString(input);
    expect(result).toBe('{\n"key":"val"\n}');
  });

  it('preserves already-escaped sequences', () => {
    const input = '{"text":"line1\\nline2"}'; // already escaped
    expect(sanitizeJsonString(input)).toBe(input);
  });

  it('handles backslash before quote correctly (escaped quote)', () => {
    const input = '{"text":"say \\"hello\\""}';
    const result = sanitizeJsonString(input);
    expect(result).toBe(input); // should be unchanged
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('handles empty string', () => {
    expect(sanitizeJsonString('')).toBe('');
  });

  it('handles multiple string values with control chars', () => {
    const input = '{"a":"foo\nbar","b":"baz\ttab"}';
    const result = sanitizeJsonString(input);
    const parsed = JSON.parse(result) as { a: string; b: string };
    expect(parsed.a).toBe('foo\nbar');
    expect(parsed.b).toBe('baz\ttab');
  });
});

// ---------------------------------------------------------------------------
// parseGeminiJSON — Stage 1: markdown fence stripping
// ---------------------------------------------------------------------------

describe('parseGeminiJSON — markdown fence stripping', () => {
  it('parses JSON wrapped in ```json ... ``` fences', () => {
    const raw = '```json\n{"key":"value"}\n```';
    expect(parseGeminiJSON<{ key: string }>(raw)).toEqual({ key: 'value' });
  });

  it('parses JSON wrapped in ``` ... ``` fences (no language tag)', () => {
    const raw = '```\n{"key":"value"}\n```';
    expect(parseGeminiJSON<{ key: string }>(raw)).toEqual({ key: 'value' });
  });

  it('parses JSON with no fences', () => {
    const raw = '{"key":"value"}';
    expect(parseGeminiJSON<{ key: string }>(raw)).toEqual({ key: 'value' });
  });

  it('parses array JSON in fences', () => {
    const raw = '```json\n[1,2,3]\n```';
    expect(parseGeminiJSON<number[]>(raw)).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// parseGeminiJSON — Stage 1: prose extraction
// ---------------------------------------------------------------------------

describe('parseGeminiJSON — prose surrounding JSON', () => {
  it('extracts JSON object when prefixed by prose', () => {
    const raw = 'Here is your analysis:\n{"score":85}';
    expect(parseGeminiJSON<{ score: number }>(raw)).toEqual({ score: 85 });
  });

  it('extracts JSON and ignores trailing garbage after closing brace', () => {
    const raw = '{"key":"val"} Some trailing text that Gemini added.';
    expect(parseGeminiJSON<{ key: string }>(raw)).toEqual({ key: 'val' });
  });

  it('handles prose + fences together', () => {
    const raw = 'Sure, here:\n```json\n{"ok":true}\n```\nHope that helps!';
    expect(parseGeminiJSON<{ ok: boolean }>(raw)).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// parseGeminiJSON — Stage 2: direct parse (clean valid JSON)
// ---------------------------------------------------------------------------

describe('parseGeminiJSON — direct parse stage', () => {
  it('parses valid nested object', () => {
    const raw = '{"person":{"name":"Anna","age":30}}';
    const result = parseGeminiJSON<{ person: { name: string; age: number } }>(raw);
    expect(result.person.name).toBe('Anna');
    expect(result.person.age).toBe(30);
  });

  it('parses nested arrays', () => {
    const raw = '{"items":[{"id":1},{"id":2}]}';
    const result = parseGeminiJSON<{ items: Array<{ id: number }> }>(raw);
    expect(result.items).toHaveLength(2);
  });

  it('preserves unicode characters in string values', () => {
    const raw = '{"text":"Cześć! Łódź, żółw, ąę"}';
    const result = parseGeminiJSON<{ text: string }>(raw);
    expect(result.text).toBe('Cześć! Łódź, żółw, ąę');
  });
});

// ---------------------------------------------------------------------------
// parseGeminiJSON — Stage 3: sanitize + retry
// ---------------------------------------------------------------------------

describe('parseGeminiJSON — sanitize + retry stage', () => {
  it('parses JSON with trailing comma in object', () => {
    const raw = '{"key":"value","num":42,}';
    expect(parseGeminiJSON<{ key: string; num: number }>(raw)).toEqual({ key: 'value', num: 42 });
  });

  it('parses JSON with trailing comma in array', () => {
    const raw = '[1,2,3,]';
    expect(parseGeminiJSON<number[]>(raw)).toEqual([1, 2, 3]);
  });

  it('parses JSON with trailing comma in nested object', () => {
    const raw = '{"outer":{"a":1,"b":2,}}';
    const result = parseGeminiJSON<{ outer: { a: number; b: number } }>(raw);
    expect(result.outer.b).toBe(2);
  });

  it('parses JSON with unescaped newline inside string value', () => {
    const inner = '{"text":"line one\nline two"}';
    const result = parseGeminiJSON<{ text: string }>(inner);
    expect(result.text).toBe('line one\nline two');
  });

  it('parses JSON with both trailing commas AND unescaped control chars', () => {
    const raw = '{"text":"line1\nline2","num":7,}';
    const result = parseGeminiJSON<{ text: string; num: number }>(raw);
    expect(result.text).toBe('line1\nline2');
    expect(result.num).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// parseGeminiJSON — Error cases
// ---------------------------------------------------------------------------

describe('parseGeminiJSON — error cases', () => {
  it('throws on complete garbage input', () => {
    expect(() => parseGeminiJSON('not json at all %%$#@!')).toThrow(
      'Błąd parsowania odpowiedzi AI'
    );
  });

  it('throws on empty string', () => {
    expect(() => parseGeminiJSON('')).toThrow('Błąd parsowania odpowiedzi AI');
  });

  it('throws on truncated/partial JSON (simulates network cut-off)', () => {
    const truncated = '{"executive_summary":"Analysis of the conversation between Anna and Bar';
    expect(() => parseGeminiJSON(truncated)).toThrow('Błąd parsowania odpowiedzi AI');
  });

  it('throws on JSON with unclosed string', () => {
    expect(() => parseGeminiJSON('{"key":"unclosed')).toThrow('Błąd parsowania odpowiedzi AI');
  });

  it('throws on markdown fences with no JSON inside', () => {
    const raw = '```\nSorry, I cannot analyze this content.\n```';
    expect(() => parseGeminiJSON(raw)).toThrow('Błąd parsowania odpowiedzi AI');
  });
});

// ---------------------------------------------------------------------------
// parseGeminiJSON — Schema mismatch (valid JSON, wrong shape)
// NOTE: parseGeminiJSON is type-unsafe by design (it returns T via cast).
// Schema validation is the caller's responsibility. These tests document that
// behavior — parseGeminiJSON does NOT throw on schema mismatches.
// ---------------------------------------------------------------------------

describe('parseGeminiJSON — schema mismatch behavior (no throw)', () => {
  it('returns wrong-shape object without throwing', () => {
    const raw = '{"unexpected_field":true}';
    // TypeScript type says Pass1Result but we get something different
    const result = parseGeminiJSON<{ expected_field: string }>(raw);
    // It doesn't throw — caller must validate
    expect(result).toEqual({ unexpected_field: true });
  });

  it('returns null fields without throwing', () => {
    const raw = '{"score":null,"items":[]}';
    const result = parseGeminiJSON<{ score: number; items: string[] }>(raw);
    expect(result).toEqual({ score: null, items: [] });
  });
});

// ---------------------------------------------------------------------------
// parseGeminiJSON — Real-world Gemini response patterns
// ---------------------------------------------------------------------------

describe('parseGeminiJSON — real-world Gemini patterns', () => {
  it('handles deeply nested Pass3-style response with trailing commas', () => {
    const raw = `\`\`\`json
{
  "big_five_approximation": {
    "openness": {"range": [6, 8], "evidence": "Discusses abstract topics", "confidence": 72,},
    "conscientiousness": {"range": [4, 6], "evidence": "Mixed reply times", "confidence": 55,},
    "extraversion": {"range": [7, 9], "evidence": "High initiation rate", "confidence": 68,},
    "agreeableness": {"range": [5, 7], "evidence": "Rarely argues", "confidence": 60, "distinction_check": "Avoids conflict but rarely expresses warmth",},
    "neuroticism": {"range": [3, 5], "evidence": "Stable mood across months", "confidence": 62,}
  },
}
\`\`\``;
    interface BigFiveTrait { range: [number, number]; evidence: string; confidence: number; distinction_check?: string }
    const result = parseGeminiJSON<{
      big_five_approximation: {
        openness: BigFiveTrait;
        agreeableness: BigFiveTrait;
      };
    }>(raw);
    expect(result.big_five_approximation.openness.range).toEqual([6, 8]);
    expect(result.big_five_approximation.agreeableness.distinction_check).toBe('Avoids conflict but rarely expresses warmth');
  });

  it('handles Pass4-style response with newlines inside string values', () => {
    const raw = `{"executive_summary":"Anna initiates most conversations.\nBartek responds slowly.","health_score":{"overall":62}}`;
    const result = parseGeminiJSON<{ executive_summary: string; health_score: { overall: number } }>(raw);
    expect(result.executive_summary).toContain('\n');
    expect(result.health_score.overall).toBe(62);
  });

  it('handles response prefixed with "Based on the conversation analysis:"', () => {
    const raw = `Based on the conversation analysis:\n\n\`\`\`json\n{"verdict":"guilty","score":78}\n\`\`\``;
    const result = parseGeminiJSON<{ verdict: string; score: number }>(raw);
    expect(result.verdict).toBe('guilty');
    expect(result.score).toBe(78);
  });
});
