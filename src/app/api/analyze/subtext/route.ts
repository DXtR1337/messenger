import { runSubtextAnalysis } from '@/lib/analysis/gemini';
import type { SimplifiedMsg } from '@/lib/analysis/subtext';
import { rateLimit } from '@/lib/rate-limit';
import { subtextRequestSchema, formatZodError } from '@/lib/validation/schemas';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

const checkLimit = rateLimit(5, 10 * 60 * 1000); // 5 requests per 10 min

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for subtext analysis (multiple batches)

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

  const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB — subtext sends full message arrays
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return Response.json(
      { error: 'Request body too large. Maximum size is 10MB.' },
      { status: 413 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const parsed = subtextRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participants, relationshipContext, quantitativeContext } = parsed.data;
  const messages = parsed.data.messages as unknown as SimplifiedMsg[];

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

      // SSE keepalive heartbeat — prevents proxy idle timeout (e.g. Cloud Run 60s)
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

        send({ type: 'progress', status: 'Rozpoczynam analizę podtekstów...' });

        const result = await runSubtextAnalysis(
          messages,
          participants,
          (status) => {
            if (!signal.aborted && !closed) {
              send({ type: 'progress', status });
            }
          },
          relationshipContext as Record<string, unknown> | undefined,
          quantitativeContext,
        );

        if (signal.aborted) { safeClose(); return; }

        send({ type: 'complete', result });
      } catch (error) {
        if (!signal.aborted && !closed) {
          console.error('[Subtext]', error);
          send({
            type: 'error',
            error: error instanceof Error
              ? error.message
              : 'Błąd analizy podtekstów — spróbuj ponownie',
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
