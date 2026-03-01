import { runEksRecon, runEksDeepAutopsy, runEksVerdict, runEksPsychogram, runEksTherapistResponse } from '@/lib/analysis/eks-prompts';
import type { EksRecon, EksResult, EksPsychogramResult } from '@/lib/analysis/eks-prompts';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import { rateLimit } from '@/lib/rate-limit';
import { eksRequestSchema, formatZodError } from '@/lib/validation/schemas';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

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

  const parsed = eksRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participants, quantitativeContext, existingAnalysis, phase } = parsed.data;
  const samples = parsed.data.samples as unknown as AnalysisSamples;
  const recon = parsed.data.recon as EksRecon | undefined;
  const targetedSamples = parsed.data.targetedSamples as unknown as AnalysisSamples | undefined;
  const finalMessages = parsed.data.finalMessages as Array<{ sender: string; content: string; timestamp: number; index: number }> | undefined;
  const eksResult = parsed.data.eksResult as unknown as EksResult | undefined;
  const cpsContext = parsed.data.cpsContext as Record<string, unknown> | undefined;

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

        if (phase === 'recon') {
          // ─── RECON MODE ───
          send({ type: 'progress', status: 'Rekonesans patologiczny...' });

          if (signal.aborted) { safeClose(); return; }
          send({ type: 'progress', status: 'Skanowanie wzorców...' });

          const reconResult = await runEksRecon(samples, participants, quantitativeContext);

          if (signal.aborted) { safeClose(); return; }
          send({ type: 'progress', status: 'Identyfikacja punktów zwrotnych...' });
          send({ type: 'recon_complete', recon: reconResult });
        } else if (phase === 'psychogram') {
          // ─── PSYCHOGRAM MODE (Pass 4) ───
          if (!eksResult) {
            send({ type: 'error', error: 'Psychogram wymaga wyników sekcji (eksResult)' });
            safeClose();
            return;
          }

          send({ type: 'progress', status: 'Analiza stylu przywiązania...' });

          if (signal.aborted) { safeClose(); return; }
          send({ type: 'progress', status: 'Identyfikacja wzorców powtarzalnych...' });

          let psychogramResult: EksPsychogramResult;
          try {
            psychogramResult = await runEksPsychogram(
              participants,
              quantitativeContext,
              eksResult,
              cpsContext,
            );
          } catch (psychErr) {
            console.error('[Eks] Psychogram pass failed:', psychErr);
            send({ type: 'error', error: psychErr instanceof Error ? psychErr.message : 'Błąd psychogramu' });
            safeClose();
            return;
          }

          if (signal.aborted) { safeClose(); return; }

          // ─── Pass 5: Therapist Response (separate pass for quality) ───
          // The therapist reads the patient's letter and writes a REAL response
          if (psychogramResult.letterToTherapist?.perPerson && Object.keys(psychogramResult.letterToTherapist.perPerson).length > 0) {
            send({ type: 'progress', status: 'Terapeuta czyta listy pacjentów...' });

            try {
              if (signal.aborted) { safeClose(); return; }
              send({ type: 'progress', status: 'Terapeuta pisze odpowiedź...' });

              const therapistResponse = await runEksTherapistResponse(
                participants,
                psychogramResult.letterToTherapist,
                quantitativeContext,
                eksResult,
                psychogramResult.attachmentMap,
                psychogramResult.expandedPatterns,
                psychogramResult.painSymmetry,
              );

              // Replace the empty/placeholder therapistLetter with the real response
              psychogramResult.therapistLetter = therapistResponse;
            } catch (therapistErr) {
              // Pass 5 failure is non-fatal — therapistLetter stays empty
              console.error('[Eks] Therapist response pass failed:', therapistErr);
            }
          }

          if (signal.aborted) { safeClose(); return; }
          send({ type: 'progress', status: 'Zamykanie psychogramu...' });
          send({ type: 'psychogram_complete', psychogram: psychogramResult });
        } else {
          // ─── AUTOPSY MODE (Pass 2 + Pass 3) ───
          send({ type: 'progress', status: 'Głęboka sekcja zwłok...' });

          if (signal.aborted) { safeClose(); return; }
          send({ type: 'progress', status: 'Analiza ukrytych wzorców...' });

          const deepResult = await runEksDeepAutopsy(
            samples,
            targetedSamples,
            participants,
            quantitativeContext,
            recon ?? { roughPhases: [], flaggedDateRanges: [], flaggedQuotes: [], areasToInvestigate: [], emotionalPeaks: [] },
            existingAnalysis as {
              pass1?: Record<string, unknown>;
              pass2?: Record<string, unknown>;
              pass4?: Record<string, unknown>;
            },
            finalMessages,
          );

          if (signal.aborted) { safeClose(); return; }
          send({ type: 'progress', status: 'Ekstrakcja dowodów...' });

          // Pass 3 — Verdict
          send({ type: 'progress', status: 'Formułowanie werdyktu...' });

          let finalResult: EksResult = { ...deepResult, passesCompleted: 2 };

          try {
            if (signal.aborted) { safeClose(); return; }
            send({ type: 'progress', status: 'Pisanie epitafium...' });

            const verdictResult = await runEksVerdict(participants, quantitativeContext, deepResult);

            if (signal.aborted) { safeClose(); return; }
            send({ type: 'progress', status: 'Zamykanie akt...' });

            // Merge verdict into deep result
            finalResult = {
              ...deepResult,
              unsaidThings: verdictResult.unsaidThings,
              repeatingPatterns: verdictResult.repeatingPatterns,
              emotionalTimeline: verdictResult.emotionalTimeline,
              deathCertificate: verdictResult.deathCertificate,
              epitaph: verdictResult.epitaph ?? deepResult.epitaph,
              passesCompleted: 3,
            };
          } catch (verdictError) {
            // Pass 3 failure is non-fatal — still return Pass 2 results
            console.error('[Eks] Verdict pass failed, returning Pass 2 only:', verdictError);
          }

          send({ type: 'complete', result: finalResult });
        }
      } catch (error) {
        if (!signal.aborted && !closed) {
          console.error('[Eks]', error);
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Błąd analizy eks — spróbuj ponownie',
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
