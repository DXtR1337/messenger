import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => () => ({ allowed: true }),
}));

// Mock PIN verification to pass by default (returns null = success)
vi.mock('../../lib/verify-pin', () => ({
  verifyDiscordPin: vi.fn().mockReturnValue(null),
}));

// Mock global fetch to avoid real Discord API calls
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('{}'),
});
vi.stubGlobal('fetch', mockFetch);

// Set up required env vars
const ORIGINAL_ENV = process.env;

// Valid mega roast body
const validMegaRoastBody = {
  channelId: '12345678901234567',
  pin: 'test-pin',
  megaRoast: {
    targetName: 'TestUser',
    opening: 'Here we go',
    roast_lines: ['Line 1', 'Line 2'],
    what_others_say: ['They say stuff'],
    self_owns: ['Self own 1'],
    superlatives: [{ title: 'Best at failing', roast: 'Epic fail' }],
    verdict: 'Guilty as charged',
  },
};

// Valid przegryw tygodnia body
const validPrzegrywBody = {
  channelId: '12345678901234567',
  pin: 'test-pin',
  type: 'przegrywTygodnia' as const,
  przegrywTygodnia: {
    winner: 'TestWinner',
    winnerScore: 85,
    winnerCategories: 6,
    nominations: [
      {
        categoryTitle: 'Worst Texter',
        emoji: '💀',
        winner: 'TestWinner',
        reason: 'They never reply',
        evidence: ['Exhibit A'],
      },
    ],
    ranking: [{ name: 'TestWinner', score: 85, oneLiner: 'King of cringe' }],
    intro: 'Welcome to the ceremony',
    crowningSpeech: 'And the crown goes to...',
    verdict: 'Undisputed champion',
    hallOfShame: [
      { person: 'TestWinner', quote: 'I said what?', commentary: 'Incredible' },
    ],
  },
};

describe('POST /api/discord/send-roast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, DISCORD_BOT_TOKEN: 'mock-bot-token' };
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });
  });

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid JSON');
  });

  it('returns 400 for empty body (validation failure)', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Validation error');
  });

  it('returns 400 when channelId is not a valid snowflake', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validMegaRoastBody,
        channelId: 'not-a-snowflake',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when channelId is too short (less than 17 digits)', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validMegaRoastBody,
        channelId: '1234567890123456', // 16 digits, too short
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when channelId is too long (more than 20 digits)', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validMegaRoastBody,
        channelId: '123456789012345678901', // 21 digits
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when megaRoast is missing required fields', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: '12345678901234567',
        pin: 'test-pin',
        megaRoast: {
          targetName: 'Test',
          // missing opening, roast_lines, etc.
        },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 when DISCORD_BOT_TOKEN is not set', async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMegaRoastBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Bot token');
  });

  it('returns 200 for valid megaRoast payload', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMegaRoastBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('returns 200 for valid przegrywTygodnia payload', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPrzegrywBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('calls Discord API with correct authorization header', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMegaRoastBody),
    });
    await POST(req);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('discord.com/api/v10/channels/12345678901234567/messages'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bot mock-bot-token',
        }),
      }),
    );
  });

  it('returns 502 when Discord API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    });
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMegaRoastBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain('Discord API error');
  });

  it('accepts 17-digit snowflake channelId', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validMegaRoastBody,
        channelId: '12345678901234567', // exactly 17 digits
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('accepts 20-digit snowflake channelId', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/discord/send-roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validMegaRoastBody,
        channelId: '12345678901234567890', // exactly 20 digits
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
