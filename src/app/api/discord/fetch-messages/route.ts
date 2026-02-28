import { rateLimit } from '@/lib/rate-limit';
import type { DiscordMessage, DiscordChannel } from '@/lib/parsers/discord';
import { discordFetchRequestSchema, formatZodError } from '@/lib/validation/schemas';

const checkLimit = rateLimit(3, 10 * 60 * 1000); // 3 requests per 10 min

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

const DISCORD_API = 'https://discord.com/api/v10';
const MESSAGES_PER_PAGE = 100;
const MAX_MESSAGES = 200_000;
const DELAY_BETWEEN_REQUESTS_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request): Promise<Response> {
  // Rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, retryAfter } = checkLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  // Body size check
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 1024) {
    return Response.json(
      { error: 'Request body too large.' },
      { status: 413 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = discordFetchRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const { channelId } = parsed.data;
  const messageLimit = Math.min(parsed.data.messageLimit ?? 5000, MAX_MESSAGES);

  // PIN protection — same as guilds endpoint
  const requiredPin = process.env.DISCORD_ACCESS_PIN;
  if (requiredPin) {
    const pin = parsed.data.pin;
    if (pin !== requiredPin) {
      return Response.json(
        { error: 'Nieprawidłowy PIN dostępu.' },
        { status: 401 },
      );
    }
  }

  // Use server-side bot token
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return Response.json(
      { error: 'Bot nie jest skonfigurowany (brak DISCORD_BOT_TOKEN).' },
      { status: 500 },
    );
  }

  const headers: HeadersInit = {
    'Authorization': `Bot ${botToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'PodTeksT/1.0',
  };

  // Verify channel access first
  let channelName = 'Discord';
  try {
    const channelRes = await fetch(`${DISCORD_API}/channels/${channelId}`, { headers });
    if (!channelRes.ok) {
      const status = channelRes.status;
      if (status === 401) {
        return Response.json(
          { error: 'Nieprawidłowy token bota. Sprawdź czy token jest poprawny.' },
          { status: 401 },
        );
      }
      if (status === 403) {
        return Response.json(
          { error: 'Bot nie ma dostępu do tego kanału. Upewnij się, że bot jest na serwerze i ma uprawnienia Read Message History.' },
          { status: 403 },
        );
      }
      if (status === 404) {
        return Response.json(
          { error: 'Kanał nie znaleziony. Sprawdź ID kanału.' },
          { status: 404 },
        );
      }
      return Response.json(
        { error: `Błąd Discord API: ${status}` },
        { status: status },
      );
    }
    const channelData = (await channelRes.json()) as DiscordChannel;
    channelName = channelData.name ?? 'Discord';
  } catch (err) {
    return Response.json(
      { error: `Nie udało się połączyć z Discord API: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 502 },
    );
  }

  // SSE stream for progress + final data
  const { signal } = request;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      };
      const send = (data: Record<string, unknown>) => {
        if (closed || signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { safeClose(); }
      };

      try {
        const allMessages: DiscordMessage[] = [];
        let beforeId: string | undefined;
        let rateLimitRetries = 0;
        const MAX_RATE_LIMIT_RETRIES = 10;

        send({ type: 'progress', fetched: 0, channelName });

        while (!signal.aborted && !closed) {
          const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
          url.searchParams.set('limit', String(MESSAGES_PER_PAGE));
          if (beforeId) url.searchParams.set('before', beforeId);

          const res = await fetch(url.toString(), { headers, signal });

          // Rate limit handling with NaN protection and max retries
          if (res.status === 429) {
            rateLimitRetries++;
            if (rateLimitRetries > MAX_RATE_LIMIT_RETRIES) {
              send({ type: 'error', message: 'Zbyt wiele rate limitów Discord API. Spróbuj ponownie później.' });
              safeClose();
              return;
            }
            const retryAfterHeader = res.headers.get('Retry-After');
            const parsed = retryAfterHeader ? parseFloat(retryAfterHeader) : NaN;
            const waitMs = isNaN(parsed) ? 5000 : Math.min(parsed * 1000 + 200, 60000);
            send({ type: 'rate_limit', waitMs });
            await sleep(waitMs);
            continue;
          }

          // Reset rate limit counter on successful request
          rateLimitRetries = 0;

          if (!res.ok) {
            send({ type: 'error', message: `Discord API error: ${res.status} ${res.statusText}` });
            safeClose();
            return;
          }

          // Check rate limit headers proactively (with NaN protection)
          const remaining = res.headers.get('X-RateLimit-Remaining');
          const resetAfterHeader = res.headers.get('X-RateLimit-Reset-After');
          if (remaining === '0' && resetAfterHeader) {
            const resetMs = parseFloat(resetAfterHeader);
            if (!isNaN(resetMs)) {
              await sleep(Math.min(resetMs * 1000 + 200, 60000));
            }
          }

          const messages = (await res.json()) as DiscordMessage[];
          if (!Array.isArray(messages) || messages.length === 0) break;

          allMessages.push(...messages);
          beforeId = messages[messages.length - 1].id;

          send({ type: 'progress', fetched: allMessages.length });

          // User-selected limit
          if (allMessages.length >= messageLimit) {
            send({ type: 'warning', message: `Osiągnięto limit ${messageLimit.toLocaleString()} wiadomości.` });
            break;
          }

          // Conservative pacing
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        }

        if (signal.aborted) {
          safeClose();
          return;
        }

        send({
          type: 'complete',
          messages: allMessages,
          channelName,
          totalFetched: allMessages.length,
        });

        safeClose();
      } catch (err) {
        if (!signal.aborted && !closed) {
          console.error('[Discord/fetch-messages]', err);
          send({
            type: 'error',
            message: err instanceof Error ? err.message : 'Nieznany błąd podczas pobierania wiadomości.',
          });
        }
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
