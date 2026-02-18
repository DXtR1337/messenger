import { runSCIDAnalysis } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import { rateLimit } from '@/lib/rate-limit';

const checkLimit = rateLimit(5, 10 * 60 * 1000); // 5 requests per 10 min

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // 3 minutes for SCID analysis (119 questions)

interface SCIDRequest {
  samples: AnalysisSamples;
  participantName: string;
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

  const { samples, participantName } = (await request.json()) as SCIDRequest;

  if (!samples) {
    return Response.json({ error: 'Missing samples' }, { status: 400 });
  }

  if (!participantName) {
    return Response.json({ error: 'Missing participantName' }, { status: 400 });
  }

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
        // Check if client disconnected before starting SCID analysis
        if (signal.aborted) { clearInterval(heartbeat); controller.close(); return; }

        const result = await runSCIDAnalysis(
          samples,
          participantName,
          (status) => {
            // Check disconnect before sending each progress update
            if (!signal.aborted) {
              send({ type: 'progress', status });
            }
          },
        );

        // Check if client disconnected after SCID analysis
        if (signal.aborted) { clearInterval(heartbeat); controller.close(); return; }

        send({ type: 'complete', result });
      } catch (error) {
        // Don't send error if client already disconnected
        if (!signal.aborted) {
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'SCID analysis failed',
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
