import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the gemini module to avoid actual API calls
vi.mock('@/lib/analysis/gemini', () => ({
  runCPSAnalysis: vi.fn().mockResolvedValue({ questions: [], score: 42 }),
}));

// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => () => ({ allowed: true }),
}));

// Mock the SSE heartbeat constant to avoid long timers in tests
vi.mock('@/lib/analysis/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analysis/constants')>();
  return { ...actual, SSE_HEARTBEAT_MS: 60_000 };
});

// Valid minimal body that passes the cpsRequestSchema
const validBody = {
  samples: { overview: [{ sender: 'Alice', content: 'Hello', timestamp: 1 }] },
  participantName: 'Alice',
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

describe('POST /api/analyze/cps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid JSON');
  });

  it('returns 400 for empty body (Zod validation failure)', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Validation error');
  });

  it('returns 400 when participantName is empty string', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samples: { overview: [{ sender: 'Alice', content: 'Hi', timestamp: 1 }] },
        participantName: '',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Validation error');
  });

  it('returns 400 when samples has no overview or all array', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samples: { randomKey: 'value' },
        participantName: 'Alice',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when participantName is missing', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samples: { overview: [{ sender: 'Alice', content: 'Hi', timestamp: 1 }] },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 413 when Content-Length exceeds 5MB', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
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
    expect(json.error).toContain('5MB');
  });

  it('returns SSE stream with correct Content-Type for valid request', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
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

  it('SSE stream contains complete event for valid request', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const text = await collectSSE(res);
    expect(text).toContain('"type":"complete"');
  });

  it('accepts samples with "all" key instead of "overview"', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/analyze/cps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samples: { all: [{ sender: 'Bob', content: 'Hey', timestamp: 2 }] },
        participantName: 'Bob',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
