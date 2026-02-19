import { runStandUpRoast } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import { rateLimit } from '@/lib/rate-limit';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface StandUpRequest {
  samples: AnalysisSamples;
  participants: string[];
  quantitativeContext: string;
}

export async function POST(request: Request): Promise<Response> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, retryAfter } = checkLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: 'Zbyt wiele \u017C\u0105da\u0144. Spr\u00F3buj ponownie za chwil\u0119.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const MAX_BODY_SIZE = 5 * 1024 * 1024;
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return Response.json({ error: 'Request body too large.' }, { status: 413 });
  }

  let body: StandUpRequest;
  try {
    body = (await request.json()) as StandUpRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { samples, participants, quantitativeContext } = body;
  if (!samples || !Array.isArray(participants) || participants.length === 0) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 });
  }

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

        send({ type: 'progress', status: 'Przygotowuj\u0119 wyst\u0119p stand-up...' });
        const result = await runStandUpRoast(samples, participants, quantitativeContext);

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
            error: 'B\u0142\u0105d generowania stand-upu \u2014 spr\u00F3buj ponownie',
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
