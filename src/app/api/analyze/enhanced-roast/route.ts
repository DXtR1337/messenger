import { runEnhancedRoastPass } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import type { Pass1Result, Pass2Result, PersonProfile, Pass4Result, RoastResult } from '@/lib/analysis/types';
import { rateLimit } from '@/lib/rate-limit';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface EnhancedRoastRequest {
  samples: AnalysisSamples;
  participants: string[];
  quantitativeContext: string;
  qualitative: {
    pass1: Pass1Result;
    pass2: Pass2Result;
    pass3: Record<string, PersonProfile>;
    pass4: Pass4Result;
  };
}

export async function POST(request: Request): Promise<Response> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, retryAfter } = checkLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: 'Zbyt wiele \u017c\u0105da\u0144. Spr\u00f3buj ponownie za chwil\u0119.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const MAX_BODY_SIZE = 10 * 1024 * 1024;
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return Response.json({ error: 'Request body too large.' }, { status: 413 });
  }

  let body: EnhancedRoastRequest;
  try {
    body = (await request.json()) as EnhancedRoastRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { samples, participants, quantitativeContext, qualitative } = body;
  if (!samples || !Array.isArray(participants) || participants.length === 0 || !qualitative?.pass1) {
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

        send({ type: 'progress', status: 'Generuj\u0119 brutaln\u0105 prawd\u0119...' });
        const result: RoastResult = await runEnhancedRoastPass(
          samples, participants, quantitativeContext, qualitative,
        );

        if (signal.aborted) {
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        send({ type: 'roast_complete', result });
      } catch (error) {
        console.error('[Enhanced Roast API Error]', error);
        if (!signal.aborted) {
          send({
            type: 'error',
            error: 'B\u0142\u0105d generowania roastu \u2014 spr\u00f3buj ponownie',
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
