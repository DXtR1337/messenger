import { runDatingProfile } from '@/lib/analysis/dating-profile-prompts';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod/v4';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const datingProfileRequestSchema = z.object({
  samples: z.object({}).passthrough(),
  participants: z.array(z.string().min(1)).min(1, 'participants must contain at least one entry'),
  quantitativeContext: z.string(),
  existingAnalysis: z.optional(
    z.object({
      pass1: z.optional(z.unknown()),
      pass3: z.optional(z.unknown()),
    }),
  ),
});

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `"${issue.path.join('.')}"` : '(root)';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

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

  const parsed = datingProfileRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participants, quantitativeContext, existingAnalysis } = parsed.data;
  const samples = parsed.data.samples as unknown as AnalysisSamples;

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

        send({ type: 'progress', status: 'Tworzę szczere profile randkowe...' });
        const result = await runDatingProfile(
          samples,
          participants,
          quantitativeContext,
          existingAnalysis as { pass1?: Record<string, unknown>; pass3?: Record<string, unknown> } | undefined,
        );

        if (signal.aborted) {
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        send({ type: 'complete', result });
      } catch (error) {
        if (!signal.aborted) {
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Błąd generowania profili randkowych — spróbuj ponownie',
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
