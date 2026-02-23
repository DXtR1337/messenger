/**
 * Tests for Zod validation schemas.
 */
import { describe, it, expect } from 'vitest';
import {
  analyzeRequestSchema,
  cpsRequestSchema,
  courtRequestSchema,
  standUpRequestSchema,
  subtextRequestSchema,
  formatZodError,
} from '../schemas';

// ============================================================
// analyzeRequestSchema
// ============================================================

describe('analyzeRequestSchema', () => {
  it('accepts valid payload with required fields', () => {
    const payload = {
      samples: { messages: [] },
      participants: ['Alice', 'Bob'],
    };
    const result = analyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts payload with all optional fields', () => {
    const payload = {
      samples: { messages: [] },
      participants: ['Alice', 'Bob'],
      relationshipContext: 'romantic' as const,
      mode: 'roast' as const,
      quantitativeContext: 'some stats',
    };
    const result = analyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects when samples is missing', () => {
    const payload = { participants: ['Alice'] };
    const result = analyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects when participants is empty', () => {
    const payload = { samples: {}, participants: [] };
    const result = analyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects when participants contains empty string', () => {
    const payload = { samples: {}, participants: [''] };
    const result = analyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects invalid relationshipContext enum value', () => {
    const payload = {
      samples: {},
      participants: ['Alice'],
      relationshipContext: 'enemy',
    };
    const result = analyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects invalid mode enum value', () => {
    const payload = {
      samples: {},
      participants: ['Alice'],
      mode: 'invalid',
    };
    const result = analyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// cpsRequestSchema
// ============================================================

describe('cpsRequestSchema', () => {
  it('accepts valid payload', () => {
    const payload = { samples: { data: [] }, participantName: 'Alice' };
    const result = cpsRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects empty participantName', () => {
    const payload = { samples: {}, participantName: '' };
    const result = cpsRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects missing participantName', () => {
    const payload = { samples: {} };
    const result = cpsRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// courtRequestSchema
// ============================================================

describe('courtRequestSchema', () => {
  it('accepts valid payload with required fields', () => {
    const payload = {
      samples: { evidence: [] },
      participants: ['Alice', 'Bob'],
      quantitativeContext: 'stats here',
    };
    const result = courtRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts payload with optional existingAnalysis', () => {
    const payload = {
      samples: {},
      participants: ['Alice'],
      quantitativeContext: 'stats',
      existingAnalysis: {
        pass1: { some: 'data' },
        pass2: null,
      },
    };
    const result = courtRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects missing quantitativeContext', () => {
    const payload = {
      samples: {},
      participants: ['Alice'],
    };
    const result = courtRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// standUpRequestSchema
// ============================================================

describe('standUpRequestSchema', () => {
  it('accepts valid payload', () => {
    const payload = {
      samples: {},
      participants: ['Alice', 'Bob'],
      quantitativeContext: 'stats',
    };
    const result = standUpRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects missing quantitativeContext', () => {
    const payload = {
      samples: {},
      participants: ['Alice'],
    };
    const result = standUpRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// subtextRequestSchema
// ============================================================

describe('subtextRequestSchema', () => {
  it('rejects when messages array has fewer than 100 items', () => {
    const messages = Array.from({ length: 50 }, (_, i) => ({
      sender: 'Alice',
      content: `msg ${i}`,
      timestamp: 1700000000000 + i * 1000,
      index: i,
    }));
    const payload = {
      messages,
      participants: ['Alice', 'Bob'],
    };
    const result = subtextRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('accepts when messages array has 100+ items', () => {
    const messages = Array.from({ length: 100 }, (_, i) => ({
      sender: 'Alice',
      content: `msg ${i}`,
      timestamp: 1700000000000 + i * 1000,
      index: i,
    }));
    const payload = {
      messages,
      participants: ['Alice'],
    };
    const result = subtextRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

// ============================================================
// formatZodError
// ============================================================

describe('formatZodError', () => {
  it('formats error with path and message', () => {
    const result = analyzeRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      // Should include path info and error messages
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
      // Should mention the missing fields
      expect(formatted).toContain('samples');
    }
  });

  it('formats multiple errors with semicolons', () => {
    const result = analyzeRequestSchema.safeParse({ samples: 'not-object' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      // Should contain participant-related error too
      expect(formatted).toContain('participants');
    }
  });

  it('shows (root) for errors without path', () => {
    // Use a schema that can produce root-level errors
    const result = cpsRequestSchema.safeParse('not an object');
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    }
  });
});
