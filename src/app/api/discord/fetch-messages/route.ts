import { rateLimit } from '@/lib/rate-limit';
import type { DiscordMessage, DiscordChannel } from '@/lib/parsers/discord';

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

function isValidSnowflake(id: string): boolean {
  return /^\d{17,20}$/.test(id);
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

  let body: { botToken?: string; channelId?: string; messageLimit?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { channelId } = body;
  const messageLimit = Math.min(Math.max(body.messageLimit ?? 5000, 100), 200_000);

  // Use client-provided token or fall back to server-side PodTeksT bot token
  const botToken = (body.botToken && body.botToken.length >= 50)
    ? body.botToken
    : process.env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    return Response.json(
      { error: 'Brak tokenu bota. Dodaj PodTeksT BoT na swój serwer Discord.' },
      { status: 400 },
    );
  }

  if (!channelId || !isValidSnowflake(channelId)) {
    return Response.json(
      { error: 'Nieprawidłowe ID kanału. ID kanału to 17-20 cyfrowy numer.' },
      { status: 400 },
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
      const send = (data: Record<string, unknown>) => {
        if (signal.aborted) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const allMessages: DiscordMessage[] = [];
        let beforeId: string | undefined;
        let page = 0;

        send({ type: 'progress', fetched: 0, channelName });

        while (!signal.aborted) {
          const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
          url.searchParams.set('limit', String(MESSAGES_PER_PAGE));
          if (beforeId) url.searchParams.set('before', beforeId);

          const res = await fetch(url.toString(), { headers, signal });

          // Rate limit handling
          if (res.status === 429) {
            const retryAfterHeader = res.headers.get('Retry-After');
            const waitMs = retryAfterHeader
              ? parseFloat(retryAfterHeader) * 1000 + 200
              : 5000;
            send({ type: 'rate_limit', waitMs });
            await sleep(waitMs);
            continue;
          }

          if (!res.ok) {
            send({ type: 'error', message: `Discord API error: ${res.status} ${res.statusText}` });
            controller.close();
            return;
          }

          // Check rate limit headers proactively
          const remaining = res.headers.get('X-RateLimit-Remaining');
          const resetAfterHeader = res.headers.get('X-RateLimit-Reset-After');
          if (remaining === '0' && resetAfterHeader) {
            await sleep(parseFloat(resetAfterHeader) * 1000 + 200);
          }

          const messages = (await res.json()) as DiscordMessage[];
          if (!Array.isArray(messages) || messages.length === 0) break;

          allMessages.push(...messages);
          beforeId = messages[messages.length - 1].id;
          page++;

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
          controller.close();
          return;
        }

        send({
          type: 'complete',
          messages: allMessages,
          channelName,
          totalFetched: allMessages.length,
        });

        controller.close();
      } catch (err) {
        if (!signal.aborted) {
          send({
            type: 'error',
            message: err instanceof Error ? err.message : 'Nieznany błąd podczas pobierania wiadomości.',
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
