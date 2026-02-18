'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { loadAnalysis } from '@/lib/utils';
import type { StoredAnalysis } from '@/lib/analysis/types';

import StoryIntro from '@/components/story/StoryIntro';
import StoryNumbers from '@/components/story/StoryNumbers';
import StoryVersus from '@/components/story/StoryVersus';
import StoryVibeCheck from '@/components/story/StoryVibeCheck';
import StoryFlags from '@/components/story/StoryFlags';
import StoryCharacters from '@/components/story/StoryCharacters';
import StoryWordCloud from '@/components/story/StoryWordCloud';
import StoryTimeline from '@/components/story/StoryTimeline';
import StoryPersonality from '@/components/story/StoryPersonality';
import StoryShareCard from '@/components/story/StoryShareCard';
import StorySceneWrapper from '@/components/story/StorySceneWrapper';
import StoryNavigation from '@/components/story/StoryNavigation';
import ShareCardGallery from '@/components/share-cards/ShareCardGallery';

export default function StoryPage() {
  const params = useParams();
  const id = params.id as string;

  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadAnalysis(id);
        if (!stored) {
          setError('Nie znaleziono analizy.');
        } else if (!stored.qualitative?.pass1) {
          setError('Analiza AI nie jest jeszcze ukończona. Wróć do dashboardu i uruchom analizę AI.');
        } else {
          setAnalysis(stored);
        }
      } catch {
        setError('Nie udało się załadować danych.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2
            className="mx-auto h-8 w-8 animate-spin"
            style={{ color: 'var(--story-blue)' }}
          />
          <p style={{ color: 'var(--story-text-2)', fontSize: '0.875rem' }}>
            Ładowanie historii...
          </p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-md space-y-6 text-center" style={{ padding: 'var(--story-pad)' }}>
          <div
            className="mx-auto flex size-16 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255, 107, 107, 0.1)' }}
          >
            <span style={{ fontSize: '2rem' }}>😕</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--story-text)',
            }}
          >
            Nie można wyświetlić historii
          </h2>
          <p style={{ color: 'var(--story-text-2)', fontSize: '0.875rem' }}>
            {error ?? 'Wystąpił nieoczekiwany błąd.'}
          </p>
          <Link
            href={`/analysis/${id}`}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--story-bg-card)',
              border: '1px solid var(--story-border)',
              color: 'var(--story-text)',
            }}
          >
            <ArrowLeft className="size-4" />
            Powrót do analizy
          </Link>
        </div>
      </div>
    );
  }

  const { conversation, quantitative, qualitative } = analysis;
  const participants = conversation.participants.map((p) => p.name);
  const pass1 = qualitative?.pass1;
  const pass2 = qualitative?.pass2;
  const pass3 = qualitative?.pass3;
  const pass4 = qualitative?.pass4;

  const avgResponseTime = (() => {
    const times = Object.values(quantitative.timing.perPerson).map(
      (p) => p.medianResponseTimeMs,
    );
    if (times.length === 0) return 0;
    return times.reduce((sum, t) => sum + t, 0) / times.length;
  })();

  const traits: string[] = [];
  if (pass3) {
    for (const name of participants) {
      const profile = pass3[name];
      if (profile) {
        traits.push(profile.attachment_indicators.primary_style);
        traits.push(profile.communication_profile.style);
      }
    }
  }

  // Compute conditions for conditional scenes
  const hasVibeCheck = !!pass4?.health_score;
  const hasFlags = !!pass2 && ((pass2.red_flags?.length ?? 0) > 0 || (pass2.green_flags?.length ?? 0) > 0);
  const hasCharacters = !!pass3;
  const hasTimeline = !!pass4?.relationship_trajectory;
  const hasPersonality = !!pass4?.conversation_personality;

  // Assign scene indices dynamically based on which conditional scenes are present
  let sceneCounter = 0;
  const introIndex = sceneCounter++;
  const numbersIndex = sceneCounter++;
  const versusIndex = sceneCounter++;
  const vibeCheckIndex = hasVibeCheck ? sceneCounter++ : -1;
  const flagsIndex = hasFlags ? sceneCounter++ : -1;
  const charactersIndex = hasCharacters ? sceneCounter++ : -1;
  const wordCloudIndex = sceneCounter++;
  const timelineIndex = hasTimeline ? sceneCounter++ : -1;
  const personalityIndex = hasPersonality ? sceneCounter++ : -1;
  const shareCardIndex = sceneCounter++;
  const galleryIndex = sceneCounter++;
  const totalScenes = sceneCounter;

  return (
    <StoryNavigation totalScenes={totalScenes}>
      <div className="relative">
        {/* Fixed back button */}
        <Link
          href={`/analysis/${id}`}
          className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium backdrop-blur-md transition-all hover:scale-105"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--story-border)',
            color: 'var(--story-text-2)',
          }}
        >
          <ArrowLeft className="size-3.5" />
          Powrót
        </Link>

        {/* Scene 1: Intro */}
        <div data-scene-index={introIndex}>
          <StoryIntro
            participants={participants}
            title={conversation.title}
            totalMessages={conversation.metadata.totalMessages}
            durationDays={conversation.metadata.durationDays}
          />
        </div>

        {/* Scene 2: Numbers */}
        <StorySceneWrapper
          chapter={1}
          label="Statystyki"
          title="Wasze rozmowy w liczbach"
          titleAccent="w liczbach"
          sceneIndex={numbersIndex}
        >
          <StoryNumbers quantitative={quantitative} conversation={conversation} />
        </StorySceneWrapper>

        {/* Scene 3: Versus */}
        <StorySceneWrapper
          chapter={2}
          label="Porównanie"
          title="Kto jest bardziej..."
          titleAccent="bardziej"
          sceneIndex={versusIndex}
        >
          <StoryVersus quantitative={quantitative} participants={participants} />
        </StorySceneWrapper>

        {/* Scene 4: Vibe Check — Health Score */}
        {hasVibeCheck && (
          <StorySceneWrapper
            chapter={3}
            label="Diagnoza"
            title="Jak zdrowa jest ta relacja?"
            titleAccent="zdrowa"
            sceneIndex={vibeCheckIndex}
          >
            <StoryVibeCheck healthScore={pass4!.health_score} />
          </StorySceneWrapper>
        )}

        {/* Scene 5: Red & Green Flags */}
        {hasFlags && (
          <StorySceneWrapper
            chapter={4}
            label="Flagi"
            title="Czerwone i zielone flagi"
            titleAccent="flagi"
            sceneIndex={flagsIndex}
          >
            <StoryFlags redFlags={pass2!.red_flags ?? []} greenFlags={pass2!.green_flags ?? []} />
          </StorySceneWrapper>
        )}

        {/* Scene 6: Character Profiles */}
        {hasCharacters && (
          <StorySceneWrapper
            chapter={5}
            label="Profile"
            title="Kim jesteście w tej rozmowie?"
            titleAccent="Kim jesteście"
            sceneIndex={charactersIndex}
          >
            <StoryCharacters
              profiles={pass3!}
              participants={participants}
              quantitative={quantitative}
            />
          </StorySceneWrapper>
        )}

        {/* Scene 7: Word Cloud */}
        <StorySceneWrapper
          chapter={6}
          label="Słowa"
          title="Co mówicie najczęściej?"
          titleAccent="najczęściej"
          fullHeight={false}
          sceneIndex={wordCloudIndex}
        >
          <StoryWordCloud
            perPerson={quantitative.perPerson}
            participants={participants}
          />
        </StorySceneWrapper>

        {/* Scene 8: Timeline */}
        {hasTimeline && (
          <StorySceneWrapper
            chapter={7}
            label="Oś czasu"
            title="Historia waszej relacji"
            titleAccent="Historia"
            sceneIndex={timelineIndex}
          >
            <StoryTimeline
              trajectory={pass4!.relationship_trajectory}
              conversationMeta={conversation.metadata}
            />
          </StorySceneWrapper>
        )}

        {/* Scene 9: Personality */}
        {hasPersonality && (
          <StorySceneWrapper
            chapter={8}
            label="Osobowość"
            title="Gdyby ta rozmowa była..."
            titleAccent="była"
            fullHeight={false}
            sceneIndex={personalityIndex}
          >
            <StoryPersonality personality={pass4!.conversation_personality} />
          </StorySceneWrapper>
        )}

        {/* Scene 10: Share Card */}
        <StorySceneWrapper
          chapter={9}
          label="Podsumowanie"
          title="Twoja karta relacji"
          titleAccent="karta"
          sceneIndex={shareCardIndex}
        >
          <StoryShareCard
            participants={participants}
            healthScore={pass4?.health_score.overall ?? 0}
            totalMessages={conversation.metadata.totalMessages}
            durationDays={conversation.metadata.durationDays}
            avgResponseTime={avgResponseTime}
            traits={traits}
            movieGenre={pass4?.conversation_personality?.if_this_conversation_were_a?.movie_genre ?? ''}
            executiveSummary={pass4?.executive_summary ?? ''}
          />
        </StorySceneWrapper>

        {/* Scene 11: Share Card Gallery */}
        <StorySceneWrapper
          chapter={10}
          label="Galeria"
          title="Pobierz karty na Stories"
          titleAccent="Stories"
          sceneIndex={galleryIndex}
        >
          <ShareCardGallery analysis={analysis} />
        </StorySceneWrapper>

        {/* Bottom spacer */}
        <div className="h-32" />
      </div>
    </StoryNavigation>
  );
}
