'use client';

import { useRef, useEffect } from 'react';
import { useGsapCountUp } from '@/hooks/useGsapCountUp';
import {
  HelpCircle,
  Heart,
  Layers,
  VolumeX,
  BookOpen,
  Trash2,
  BookText,
  MessagesSquare,
  AtSign,
  Pencil,
} from 'lucide-react';
import { formatDuration, formatNumber } from '@/lib/utils';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

interface StatsGridProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
  platform?: ParsedConversation['platform'];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  breakdown: Array<{ name: string; value: string; index: number }>;
  delay: number;
}

const PERSON_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function StatCard({ icon, label, value, breakdown, delay }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [displayValue, startCountUp] = useGsapCountUp(value);

  // Trigger countUp when GSAP makes this card visible (via IntersectionObserver as simple fallback)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startCountUp();
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startCountUp]);

  return (
    <div
      ref={ref}
      className="h-full"
      data-scroll-column={delay % 4 < 2 ? 'left' : 'right'}
    >
      <div
        className="relative overflow-hidden h-full rounded-2xl border border-purple-500/[0.06] bg-purple-950/[0.08] p-5 sm:p-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-purple-500/[0.12] hover:-translate-y-0.5 hover:bg-purple-950/[0.1] hover:shadow-[0_12px_40px_-8px_rgba(168,85,247,0.12)]"
        style={{ boxShadow: 'inset 0 1px 0 0 rgba(168,85,247,0.06), 0 0 0 0.5px rgba(168,85,247,0.03)' }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="opacity-50">{icon}</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">{label}</span>
          </div>
          <p className="font-mono text-3xl sm:text-4xl font-bold text-foreground tracking-tight tabular-nums">
            {displayValue}
          </p>
          {breakdown.length > 0 && (
            <div className="space-y-1 border-t border-purple-500/[0.04] pt-2">
              {breakdown.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: PERSON_COLORS[entry.index % PERSON_COLORS.length] }}
                    />
                    <span className="text-white/50 truncate max-w-[120px] sm:max-w-none" title={entry.name}>{entry.name}</span>
                  </span>
                  <span className="font-mono font-medium text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatsGrid({ quantitative, participants, platform }: StatsGridProps) {
  const { timing, engagement, perPerson } = quantitative;
  const isDiscord = platform === 'discord';

  const stats: Array<Omit<StatCardProps, 'delay'>> = [
    {
      icon: <HelpCircle className="size-3.5" />,
      label: 'Zadane pytania',
      value: formatNumber(
        participants.reduce((sum, p) => sum + (perPerson[p]?.questionsAsked ?? 0), 0),
      ),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatNumber(perPerson[name]?.questionsAsked ?? 0),
        index,
      })),
    },
    // Card 2: Reaction rate (other platforms) or Mentions (Discord)
    isDiscord
      ? {
          icon: <AtSign className="size-3.5" />,
          label: 'Wzmianki (@)',
          value: formatNumber(
            participants.reduce((sum, p) => sum + (perPerson[p]?.mentionsReceived ?? 0), 0),
          ),
          breakdown: participants.map((name, index) => ({
            name,
            value: formatNumber(perPerson[name]?.mentionsReceived ?? 0),
            index,
          })),
        }
      : {
          icon: <Heart className="size-3.5" />,
          label: 'Wskaźnik reakcji',
          // Overall value: avg receive rate (= how popular messages are in this conversation)
          value: (() => {
            const rates = participants
              .map((p) => engagement.reactionReceiveRate?.[p])
              .filter((v): v is number => v !== undefined);
            const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
            return `${(avg * 100).toFixed(1)}%`;
          })(),
          breakdown: participants.map((name, index) => ({
            name,
            value: `${((engagement.reactionReceiveRate?.[name] ?? 0) * 100).toFixed(1)}%`,
            index,
          })),
        },
    {
      icon: <Layers className="size-3.5" />,
      label: 'Łączna liczba sesji',
      value: formatNumber(engagement.totalSessions),
      breakdown: [],
    },
    {
      icon: <VolumeX className="size-3.5" />,
      label: 'Najdłuższa cisza',
      value: formatDuration(timing.longestSilence.durationMs),
      breakdown: [],
    },
    {
      icon: <BookOpen className="size-3.5" />,
      label: 'Łączna liczba słów',
      value: formatNumber(
        participants.reduce((sum, p) => sum + (perPerson[p]?.totalWords ?? 0), 0),
      ),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatNumber(perPerson[name]?.totalWords ?? 0),
        index,
      })),
    },
    // Card 6: Unsent messages (other platforms) or Edited messages (Discord)
    isDiscord
      ? {
          icon: <Pencil className="size-3.5" />,
          label: 'Edytowane wiadomości',
          value: formatNumber(
            participants.reduce((sum, p) => sum + (perPerson[p]?.editedMessages ?? 0), 0),
          ),
          breakdown: participants.map((name, index) => ({
            name,
            value: formatNumber(perPerson[name]?.editedMessages ?? 0),
            index,
          })),
        }
      : {
          icon: <Trash2 className="size-3.5" />,
          label: 'Niewysłane wiadomości',
          value: formatNumber(
            participants.reduce((sum, p) => sum + (perPerson[p]?.unsentMessages ?? 0), 0),
          ),
          breakdown: participants.map((name, index) => ({
            name,
            value: formatNumber(perPerson[name]?.unsentMessages ?? 0),
            index,
          })),
        },
    {
      icon: <BookText className="size-3.5" />,
      label: 'Bogactwo słownictwa',
      value: (() => {
        const richness = participants
          .map((p) => perPerson[p]?.vocabularyRichness)
          .filter((v): v is number => v !== undefined);
        const avg = richness.length > 0 ? richness.reduce((a, b) => a + b, 0) / richness.length : 0;
        return avg.toFixed(1);
      })(),
      breakdown: participants.map((name, index) => ({
        name,
        value: (perPerson[name]?.vocabularyRichness ?? 0).toFixed(1),
        index,
      })),
    },
    {
      icon: <MessagesSquare className="size-3.5" />,
      label: 'Śr. długość rozmowy',
      value: `${Math.round(engagement.avgConversationLength)} wiad.`,
      breakdown: [],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.label} {...stat} delay={index} />
      ))}
    </div>
  );
}
