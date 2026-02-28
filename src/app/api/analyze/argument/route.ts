import { z } from 'zod/v4';
import {
  runArgumentEnrichment,
  runArgumentGeneration,
  type EnrichmentParams,
  type GenerationParams,
} from '@/lib/analysis/argument-simulation-prompts';
import { rateLimit } from '@/lib/rate-limit';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

// ── Local Zod schema (avoids modifying shared schemas.ts) ────

const argumentRequestSchema = z.object({
  mode: z.enum(['enrich', 'generate']),
  topic: z.optional(z.string().min(1).max(200)),
  participants: z.array(z.string().min(1)).min(2),
  samples: z.object({}).passthrough(),
  quantitativeContext: z.string(),
  conflictFingerprint: z.optional(z.unknown()),
  personalityProfiles: z.optional(z.record(z.string(), z.unknown())),
  toneAnalysis: z.optional(z.unknown()),
  dynamicsAnalysis: z.optional(z.unknown()),
  enrichedFingerprint: z.optional(z.unknown()),
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
export const maxDuration = 120;

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

  const parsed = argumentRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const {
    mode,
    topic,
    participants,
    quantitativeContext,
    conflictFingerprint,
    personalityProfiles,
    toneAnalysis,
    dynamicsAnalysis,
    enrichedFingerprint,
  } = parsed.data;

  // Validate mode-specific required fields
  if (mode === 'generate' && !topic) {
    return Response.json(
      { error: 'Validation error: "topic" is required for generate mode.' },
      { status: 400 },
    );
  }
  if (mode === 'generate' && !enrichedFingerprint) {
    return Response.json(
      { error: 'Validation error: "enrichedFingerprint" is required for generate mode.' },
      { status: 400 },
    );
  }

  const samples = parsed.data.samples as unknown as AnalysisSamples;

  const { signal } = request;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      };
      const send = (data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { safeClose(); }
      };

      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, SSE_HEARTBEAT_MS);

      try {
        if (signal.aborted) { safeClose(); return; }

        if (mode === 'enrich') {
          // ── Enrich mode: extract conflict samples and fingerprint ──

          send({ type: 'progress', status: 'Analizuję wzorce konfliktów...' });

          // Extract conflict-relevant messages from per-person samples (flattened)
          const conflictSamples: string[] = [];
          for (const name of participants) {
            const personMessages = samples.perPerson?.[name] ?? [];
            const msgs = personMessages
              .filter((m: { content?: string }) => (m.content?.trim()?.length ?? 0) > 3)
              .slice(0, 50)
              .map((m: { content: string }) => `[${name}] ${m.content}`);
            conflictSamples.push(...msgs);
          }

          send({ type: 'progress', status: 'Buduję profil stylu kłótni...' });

          const enrichResult = await runArgumentEnrichment({
            participants,
            quantitativeContext,
            conflictSamples,
            conflictFingerprint: conflictFingerprint as EnrichmentParams['conflictFingerprint'],
            personalityProfiles: personalityProfiles as EnrichmentParams['personalityProfiles'],
            toneAnalysis: toneAnalysis as EnrichmentParams['toneAnalysis'],
            dynamicsAnalysis: dynamicsAnalysis as EnrichmentParams['dynamicsAnalysis'],
          });

          if (signal.aborted) { safeClose(); return; }

          send({ type: 'progress', status: 'Finalizuję analizę konfliktów...' });

          send({
            type: 'enrichment_complete',
            topics: enrichResult.topics,
            enrichedFingerprint: enrichResult,
          });
        } else {
          // ── Generate mode: build script from enriched fingerprint ──

          send({ type: 'progress', status: 'Przygotowuję dane uczestników...' });

          // Extract per-person example messages and stats
          const exampleMessages: Record<string, string[]> = {};
          for (const name of participants) {
            const personMessages = samples.perPerson?.[name] ?? [];
            exampleMessages[name] = personMessages
              .filter((m: { content?: string }) => (m.content?.trim()?.length ?? 0) > 3)
              .slice(0, 30)
              .map((m: { content: string }) => m.content);
          }

          send({ type: 'progress', status: 'Generuję symulację kłótni...' });

          const generateResult = await runArgumentGeneration({
            topic: topic!,
            participants,
            quantitativeContext,
            exampleMessages,
            enrichedFingerprint: enrichedFingerprint as GenerationParams['enrichedFingerprint'],
            personalityProfiles: personalityProfiles as GenerationParams['personalityProfiles'],
            toneAnalysis: toneAnalysis as GenerationParams['toneAnalysis'],
            dynamicsAnalysis: dynamicsAnalysis as GenerationParams['dynamicsAnalysis'],
            topWords: {},
            topPhrases: {},
            avgMessageLength: {},
            emojiFrequency: {},
            topEmojis: {},
            medianResponseTimes: {},
          });

          if (signal.aborted) { safeClose(); return; }

          send({ type: 'progress', status: 'Finalizuję scenariusz...' });

          send({
            type: 'complete',
            result: {
              messages: generateResult.messages,
              summary: generateResult.summary,
            },
          });
        }
      } catch (error) {
        if (!signal.aborted && !closed) {
          console.error('[Argument]', error);
          send({
            type: 'error',
            error: error instanceof Error
              ? error.message
              : 'Symulacja kłótni nie powiodła się — spróbuj ponownie',
          });
        }
      } finally {
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
