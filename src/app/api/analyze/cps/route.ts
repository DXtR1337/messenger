import { runCPSAnalysis } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import { rateLimit } from '@/lib/rate-limit';
import { cpsRequestSchema, formatZodError } from '@/lib/validation/schemas';

const checkLimit = rateLimit(5, 10 * 60 * 1000); // 5 requests per 10 min

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for CPS analysis (63 questions)

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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const parsed = cpsRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participantName } = parsed.data;
  // Zod validates samples is a non-null object; cast through unknown for the deeply-typed AnalysisSamples
  const samples = parsed.data.samples as unknown as AnalysisSamples;

  const { signal } = request;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // SSE keepalive heartbeat — prevents proxy idle timeout (e.g. Cloud Run 60s)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      try {
        // Check if client disconnected before starting CPS analysis
        if (signal.aborted) { clearInterval(heartbeat); controller.close(); return; }

        const result = await runCPSAnalysis(
          samples,
          participantName,
          (status) => {
            // Check disconnect before sending each progress update
            if (!signal.aborted) {
              send({ type: 'progress', status });
            }
          },
        );

        // Check if client disconnected after CPS analysis
        if (signal.aborted) { clearInterval(heartbeat); controller.close(); return; }

        send({ type: 'complete', result });
      } catch (error) {
        // Don't send error if client already disconnected
        if (!signal.aborted) {
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'CPS analysis failed',
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
