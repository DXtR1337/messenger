'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { loadAnalysis } from '@/lib/utils';
import { decodeCoupleSession } from '@/lib/analysis/couple-quiz';
import type { CoupleSessionData } from '@/lib/analysis/couple-quiz';
import type { StoredAnalysis } from '@/lib/analysis/types';
import CoupleQuiz from '@/components/analysis/CoupleQuiz';

type PageState =
  | { kind: 'loading' }
  | { kind: 'challenge'; analysis: StoredAnalysis }
  | { kind: 'respond'; analysis: StoredAnalysis; session: CoupleSessionData }
  | { kind: 'error'; message: string };

export default function CoupleQuizPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const id = params.id;
  const sessionParam = searchParams.get('session');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const analysis = await loadAnalysis(id);

        if (cancelled) return;

        if (!analysis) {
          setState({
            kind: 'error',
            message: 'Nie znaleziono analizy. Upewnij się, że link jest poprawny.',
          });
          return;
        }

        // Person B flow: session query param present
        if (sessionParam) {
          const session = decodeCoupleSession(sessionParam);

          if (!session) {
            setState({
              kind: 'error',
              message: 'Nieprawidłowy link z sesją. Poproś partnera o nowy link.',
            });
            return;
          }

          setState({ kind: 'respond', analysis, session });
          return;
        }

        // Person A flow: must have completed delusion quiz first
        if (!analysis.qualitative?.delusionQuiz) {
          setState({
            kind: 'error',
            message: 'Najpierw ukończ Quiz „Stawiam Zakład", zanim wyzwiesz partnera.',
          });
          return;
        }

        setState({ kind: 'challenge', analysis });
      } catch {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: 'Wystąpił błąd podczas ładowania danych. Spróbuj ponownie.',
          });
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [id, sessionParam]);

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">Ładowanie quizu parowego...</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  if (state.kind === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6">
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{state.message}</p>
        </div>
        <Link
          href={`/analysis/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do analizy
        </Link>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Person A: challenge mode (quiz already completed, generate link)
  // ------------------------------------------------------------------
  if (state.kind === 'challenge') {
    const participants = state.analysis.conversation.participants.map((p) => p.name);

    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Link
          href={`/analysis/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do analizy
        </Link>

        <CoupleQuiz
          mode="challenge"
          analysisId={id}
          personAName={participants[0] ?? 'Osoba A'}
          personAAnswers={state.analysis.qualitative!.delusionQuiz!.answers.map(a => ({ questionId: a.questionId, userAnswer: a.userAnswer }))}
          quantitative={state.analysis.quantitative}
          conversation={state.analysis.conversation}
        />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Person B: respond mode (answering the partner's challenge)
  // ------------------------------------------------------------------
  const participants = state.analysis.conversation.participants.map((p) => p.name);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link
        href={`/analysis/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do analizy
      </Link>

      <CoupleQuiz
        mode="respond"
        sessionData={state.session}
        participants={participants}
        quantitative={state.analysis.quantitative}
        conversation={state.analysis.conversation}
      />
    </div>
  );
}
