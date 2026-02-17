import { runAnalysisPasses } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';

export const maxDuration = 120;

interface AnalyzeRequest {
  samples: AnalysisSamples;
  participants: string[];
}

export async function POST(request: Request): Promise<Response> {
  const { samples, participants } = (await request.json()) as AnalyzeRequest;

  if (!samples || !participants?.length) {
    return Response.json({ error: 'Missing samples or participants' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await runAnalysisPasses(
          samples,
          participants,
          (pass, status) => send({ type: 'progress', pass, status }),
        );
        if (result.status === 'error') {
          send({ type: 'error', error: result.error ?? 'Analysis failed' });
        } else {
          send({ type: 'complete', result });
        }
      } catch (error) {
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Analysis failed',
        });
      } finally {
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
