import { callGeminiWithRetry } from '@/lib/analysis/gemini';
import {
  CAPITALIZATION_SYSTEM_PROMPT,
  buildCapitalizationPrompt,
  type CapitalizationResult,
  type ACRType,
} from '@/lib/analysis/capitalization-prompts';
import { rateLimit } from '@/lib/rate-limit';
import { parseGeminiJSON } from '@/lib/analysis/json-parser';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const ACR_SCORE_WEIGHTS: Record<ACRType, number> = {
  active_constructive: 100,
  passive_constructive: 50,
  active_destructive: 10,
  passive_destructive: 20,
};

function computeACRScore(counts: Record<ACRType, number>): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 50;
  const weighted = Object.entries(counts).reduce(
    (sum, [type, count]) => sum + ACR_SCORE_WEIGHTS[type as ACRType] * count,
    0,
  );
  return Math.round(weighted / total);
}

function dominantType(counts: Record<ACRType, number>): ACRType {
  const entries = Object.entries(counts) as [ACRType, number][];
  return entries.sort(([, a], [, b]) => b - a)[0][0];
}

function interpret(overallScore: number): { interpretation: string; gottmanComparison: string } {
  const gottman = overallScore >= 80
    ? 'Poziom zbliżony do par szczęśliwych w badaniach Gottmana (≥80% AC).'
    : overallScore >= 55
    ? 'Poniżej normy Gottmana (86% AC), ale z potencjałem poprawy.'
    : 'Wyraźnie poniżej normy — pary rozchodzące się w badaniach Gottmana miały ~33% AC.';

  const interp = overallScore >= 80
    ? 'Relacja charakteryzuje się wysoką responsywnością na sukcesy partnera — fundament wspierającej więzi.'
    : overallScore >= 55
    ? 'Mieszane odpowiedzi na dobre wieści — czasem entuzjazm, czasem obojętność.'
    : 'Dobre wieści często spotykają się z bierną lub negatywną reakcją, co osłabia poczucie bycia wspieranym.';

  return { interpretation: interp, gottmanComparison: gottman };
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

  // Body size check BEFORE parsing JSON
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 100 * 1024) {
    return Response.json({ error: 'Zbyt duży request.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowy JSON.' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('messagesText' in body) ||
    !('participants' in body)
  ) {
    return Response.json({ error: 'Brak messagesText lub participants.' }, { status: 400 });
  }

  const { messagesText, participants, reconBriefing } = body as { messagesText: string; participants: string[]; reconBriefing?: string };

  if (typeof messagesText !== 'string' || !Array.isArray(participants) || participants.length < 2) {
    return Response.json({ error: 'Nieprawidłowe parametry żądania.' }, { status: 400 });
  }

  if (!participants.every(p => typeof p === 'string' && p.trim().length > 0)) {
    return Response.json({ error: 'Uczestnicy muszą mieć niepuste nazwy.' }, { status: 400 });
  }

  if (messagesText.length > 80000) {
    return Response.json({ error: 'Tekst za długi. Użyj krótszej próbki.' }, { status: 413 });
  }

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
        try { controller.enqueue(encoder.encode(':\n\n')); }
        catch { clearInterval(heartbeat); }
      }, SSE_HEARTBEAT_MS);

      try {
        if (signal.aborted) { safeClose(); return; }

        send({ type: 'progress', status: 'Analizowanie odpowiedzi na dobre wieści...' });

        let prompt = buildCapitalizationPrompt(messagesText, participants);
        if (reconBriefing) prompt = reconBriefing + '\n\n' + prompt;
        const rawJson = await callGeminiWithRetry(CAPITALIZATION_SYSTEM_PROMPT, prompt, 3, 4096, 0.3);

        if (signal.aborted) { safeClose(); return; }

        send({ type: 'progress', status: 'Przetwarzanie wyników...' });

        const parsed = parseGeminiJSON(rawJson) as {
          events?: Array<{
            goodNewsMessage: string;
            goodNewsSender: string;
            responseMessage: string;
            responseSender: string;
            type: ACRType;
            explanation: string;
          }>;
          perPerson?: Record<string, { ac: number; pc: number; ad: number; pd: number }>;
          interpretation?: string;
        };

        const events = parsed.events ?? [];
        const perPersonRaw = parsed.perPerson ?? {};
        const aiInterpretation = parsed.interpretation ?? '';

        // Build per-person profiles
        const perPerson: CapitalizationResult['perPerson'] = {};
        for (const name of participants) {
          const raw = perPersonRaw[name] ?? { ac: 0, pc: 0, ad: 0, pd: 0 };
          // Also count from events in case perPerson is missing
          const fromEvents = { ac: 0, pc: 0, ad: 0, pd: 0 };
          const typeMap: Record<ACRType, keyof typeof fromEvents> = {
            active_constructive: 'ac',
            passive_constructive: 'pc',
            active_destructive: 'ad',
            passive_destructive: 'pd',
          };
          for (const ev of events) {
            if (ev.responseSender === name) {
              const key = typeMap[ev.type];
              if (key) {
                fromEvents[key]++;
              }
            }
          }
          const counts: Record<ACRType, number> = {
            active_constructive: Math.max(raw.ac ?? 0, fromEvents.ac),
            passive_constructive: Math.max(raw.pc ?? 0, fromEvents.pc),
            active_destructive: Math.max(raw.ad ?? 0, fromEvents.ad),
            passive_destructive: Math.max(raw.pd ?? 0, fromEvents.pd),
          };
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          if (total === 0) continue;
          perPerson[name] = {
            name,
            typeCounts: counts,
            dominantType: dominantType(counts),
            acrScore: computeACRScore(counts),
          };
        }

        const allScores = Object.values(perPerson).map(p => p.acrScore);
        const overallScore = allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : 50;

        const { interpretation, gottmanComparison } = interpret(overallScore);

        const result: CapitalizationResult = {
          perPerson,
          examples: events.map(ev => ({
            goodNews: ev.goodNewsMessage,
            response: ev.responseMessage,
            responder: ev.responseSender,
            type: ev.type,
            explanation: ev.explanation,
          })),
          overallScore,
          interpretation: aiInterpretation || interpretation,
          gottmanComparison,
        };

        send({ type: 'complete', result });
      } catch (error) {
        if (!signal.aborted && !closed) {
          console.error('[Capitalization]', error);
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Analiza kapitalizacji nie powiodła się',
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
