import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the gemini module to avoid actual API calls.
// runAnalysisPasses receives an onProgress callback as the 3rd argument — invoke it
// so the route emits progress SSE events before the complete event.
vi.mock('@/lib/analysis/gemini', () => ({
  runAnalysisPasses: vi.fn().mockImplementation(
    async (_samples: unknown, _participants: unknown, onProgress: (pass: number, status: string) => void) => {
      onProgress(1, 'Analyzing...');
      return { status: 'ok', pass1: {}, pass2: {}, pass3: {}, pass4: {} };
    },
  ),
  runRoastPass: vi.fn().mockResolvedValue({ roast: 'mock roast' }),
}));

// Mock rate limiting (already returns { allowed: true } but mock to isolate)
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => () => ({ allowed: true }),
}));

// Mock the SSE heartbeat constant to avoid long timers in tests
vi.mock('@/lib/analysis/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analysis/constants')>();
  return { ...actual, SSE_HEARTBEAT_MS: 60_000 };
});

// Valid minimal body that passes the analyzeRequestSchema
const validBody = {
  samples: { overview: [{ sender: 'Alice', content: 'Hello', timestamp: 1 }] },
  participants: ['Alice', 'Bob'],
};

async function collectSSE(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid JSON');
  });

  it('returns 400 for empty body (Zod validation failure)', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Validation error');
  });

  it('returns 400 when participants array is empty', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samples: { overview: [{ sender: 'Alice', content: 'Hi', timestamp: 1 }] },
        participants: [],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Validation error');
  });

  it('returns 400 when samples has no overview array', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samples: { something: 'else' },
        participants: ['Alice'],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 413 when Content-Length exceeds 5MB', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(6 * 1024 * 1024), // 6MB
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toContain('too large');
  });

  it('allows requests exactly at the 5MB limit', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(5 * 1024 * 1024), // exactly 5MB
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    // Should not be 413 — either 200 SSE or pass validation
    expect(res.status).not.toBe(413);
  });

  it('returns SSE stream with correct headers for valid request', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(res.headers.get('Connection')).toBe('keep-alive');
    expect(res.headers.get('X-Accel-Buffering')).toBe('no');
  });

  it('SSE stream contains complete event for standard mode', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const text = await collectSSE(res);
    // Should contain progress and complete events
    expect(text).toContain('"type":"progress"');
    expect(text).toContain('"type":"complete"');
  });

  it('SSE stream contains roast_complete event for roast mode', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, mode: 'roast' }),
    });
    const res = await POST(req);
    const text = await collectSSE(res);
    expect(text).toContain('"type":"roast_complete"');
  });

  it('accepts optional relationshipContext field', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, relationshipContext: 'romantic' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('rejects invalid relationshipContext value', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, relationshipContext: 'enemies' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
