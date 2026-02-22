import { z } from 'zod/v4';
import { runReplySimulation } from '@/lib/analysis/simulator-prompts';
import type { PersonProfile, Pass1Result, Pass2Result } from '@/lib/analysis/types';
import { rateLimit } from '@/lib/rate-limit';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';

// ── Local Zod schema (avoids modifying shared schemas.ts) ────

const exchangeSchema = z.object({
  role: z.enum(['user', 'target']),
  message: z.string(),
});

const wordCountSchema = z.object({
  word: z.string(),
  count: z.number(),
});

const phraseCountSchema = z.object({
  phrase: z.string(),
  count: z.number(),
});

const emojiCountSchema = z.object({
  emoji: z.string(),
  count: z.number(),
});

const simulateRequestSchema = z.object({
  userMessage: z.string().min(1).max(200),
  targetPerson: z.string().min(1),
  participants: z.array(z.string().min(1)).min(1),
  samples: z.object({}).passthrough(),
  quantitativeContext: z.string(),
  topWords: z.optional(z.array(wordCountSchema)),
  topPhrases: z.optional(z.array(phraseCountSchema)),
  avgMessageLengthWords: z.optional(z.number()),
  avgMessageLengthChars: z.optional(z.number()),
  emojiFrequency: z.optional(z.number()),
  topEmojis: z.optional(z.array(emojiCountSchema)),
  medianResponseTimeMs: z.optional(z.number()),
  personalityProfile: z.optional(z.unknown()),
  toneAnalysis: z.optional(z.unknown()),
  dynamicsAnalysis: z.optional(z.unknown()),
  previousExchanges: z.optional(z.array(exchangeSchema)),
});

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `"${issue.path.join('.')}"` : '(root)';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

// ── Rate limit ───────────────────────────────────────────────

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Handler ──────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, retryAfter } = checkLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const MAX_BODY_SIZE = 5 * 1024 * 1024;
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return Response.json({ error: 'Request body too large.' }, { status: 413 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = simulateRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const {
    userMessage,
    targetPerson,
    participants,
    quantitativeContext,
    previousExchanges,
  } = parsed.data;

  const samples = parsed.data.samples as unknown as AnalysisSamples;
  const personalityProfile = parsed.data.personalityProfile as PersonProfile | undefined;
  const toneAnalysis = parsed.data.toneAnalysis as Pass1Result | undefined;
  const dynamicsAnalysis = parsed.data.dynamicsAnalysis as Pass2Result | undefined;

  // Extract target person's messages from samples for example messages
  const personMessages = samples.perPerson?.[targetPerson] ?? [];
  const exampleMessages = personMessages
    .filter((m) => m.content && m.content.trim().length > 3)
    .slice(0, 30)
    .map((m) => m.content);

  const topWords = parsed.data.topWords ?? [];
  const topPhrases = parsed.data.topPhrases ?? [];
  const avgMessageLengthWords = parsed.data.avgMessageLengthWords ?? 8;
  const avgMessageLengthChars = parsed.data.avgMessageLengthChars ?? 40;
  const emojiFrequency = parsed.data.emojiFrequency ?? 0;
  const topEmojis = parsed.data.topEmojis ?? [];
  const medianResponseTimeMs = parsed.data.medianResponseTimeMs ?? 300000;

  const { signal } = request;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      try {
        if (signal.aborted) {
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        // Calculate realistic typing delay
        const typingDelay = Math.min(medianResponseTimeMs / 60, 5000);
        send({ type: 'typing', delay: Math.round(typingDelay) });

        const result = await runReplySimulation({
          userMessage,
          targetPerson,
          participants,
          quantitativeContext,
          topWords,
          topPhrases,
          avgMessageLengthWords,
          avgMessageLengthChars,
          emojiFrequency,
          topEmojis,
          medianResponseTimeMs,
          exampleMessages,
          previousExchanges: previousExchanges ?? [],
          personalityProfile,
          toneAnalysis,
          dynamicsAnalysis,
        });

        if (signal.aborted) {
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        send({
          type: 'reply',
          message: result.reply,
          confidence: result.confidence,
        });

        // Format response time for display
        const responseTimeSec = medianResponseTimeMs / 1000;
        let responseTimeEstimate: string;
        if (responseTimeSec < 60) {
          responseTimeEstimate = `${Math.round(responseTimeSec)} sek`;
        } else if (responseTimeSec < 3600) {
          responseTimeEstimate = `${Math.round(responseTimeSec / 60)} min`;
        } else {
          responseTimeEstimate = `${(responseTimeSec / 3600).toFixed(1)} godz`;
        }

        send({
          type: 'meta',
          responseTimeEstimate,
          styleNotes: result.styleNotes,
        });
      } catch (error) {
        if (!signal.aborted) {
          send({
            type: 'error',
            error: error instanceof Error
              ? error.message
              : 'Symulacja nie powiodla sie -- sprobuj ponownie',
          });
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
