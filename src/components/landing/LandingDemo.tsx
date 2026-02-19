'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Sample data — hardcoded, purely visual
// ---------------------------------------------------------------------------

const STATS = [
  { label: 'Wiadomości', value: '12 847', mono: true },
  { label: 'Mediana odpowiedzi', value: '4m 23s', mono: true },
  { label: 'Wynik zdrowia', value: '78', suffix: '/100', mono: true },
  { label: 'Aktywne dni', value: '423', mono: true },
];

const TONE_BARS: { trait: string; a: number; b: number }[] = [
  { trait: 'Ciepło', a: 72, b: 58 },
  { trait: 'Humor', a: 45, b: 68 },
  { trait: 'Formalność', a: 25, b: 18 },
];

const ACTIVITY_SPARKLINE = [
  12, 18, 24, 30, 22, 35, 42, 38, 50, 45, 60, 55, 48, 62, 70, 58, 45, 52, 40,
  65, 72, 80, 68, 55, 48, 75, 82, 90, 78, 62,
];

const PERSONS = [
  {
    name: 'Ania',
    color: '#3b82f6',
    colorSubtle: 'rgba(59, 130, 246, 0.12)',
    attachment: 'Bezpieczny',
    traits: ['Empatyczna', 'Bezpośrednia', 'Ciepła'],
  },
  {
    name: 'Kuba',
    color: '#a855f7',
    colorSubtle: 'rgba(168, 85, 247, 0.12)',
    attachment: 'Lekko unikający',
    traits: ['Analityczny', 'Humorystyczny', 'Powściągliwy'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 20 } as const,
    transition: { duration: 0.5, delay } as const,
  };
}

// ---------------------------------------------------------------------------
// Browser chrome wrapper
// ---------------------------------------------------------------------------

function BrowserChrome({ children, inView }: { children: React.ReactNode; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="overflow-hidden rounded-xl border border-border"
      style={{
        background: 'var(--bg-card, #111111)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      {/* Title bar */}
      <div
        className="flex h-10 items-center gap-2 border-b border-border px-3 sm:h-12 sm:gap-3 sm:px-4"
        style={{ background: 'rgba(255,255,255,0.015)' }}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#ff5f5740' }} />
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#febc2e40' }} />
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#28c84040' }} />
        </div>

        {/* Address bar */}
        <div
          className="mx-auto flex max-w-sm flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-0.5 sm:px-3 sm:py-1"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {/* Lock icon */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className="shrink-0 text-muted-foreground opacity-40"
          >
            <rect x="1.5" y="4.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
            <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
          <span className="truncate font-mono text-[10px] text-muted-foreground sm:text-xs">
            podtekst.app/analysis/demo
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="overflow-hidden p-4 md:p-6">{children}</div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatsRow({ inView }: { inView: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          {...fadeUp(0.15 + i * 0.08)}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-hover"
        >
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
            {stat.label}
          </span>
          <span className="font-mono text-xl font-bold text-foreground">
            {stat.value}
            {stat.suffix && (
              <span className="text-sm font-normal text-muted-foreground">
                {stat.suffix}
              </span>
            )}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function ToneComparison({ inView }: { inView: boolean }) {
  return (
    <motion.div
      {...fadeUp(0.5)}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
          Porównanie tonu
        </span>
        <div className="flex items-center gap-3">
          {PERSONS.map((p) => (
            <span
              key={p.name}
              className="flex items-center gap-1.5 font-mono text-[0.65rem]"
            >
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: p.color }}
              />
              <span style={{ color: p.color }}>{p.name}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {TONE_BARS.map((bar) => {
          const max = Math.max(bar.a, bar.b, 100);
          return (
            <div key={bar.trait} className="flex flex-col gap-1.5">
              <span className="font-story-body text-xs text-muted-foreground">
                {bar.trait}
              </span>
              <div className="flex flex-col gap-1">
                {/* Person A bar */}
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: PERSONS[0].color }}
                      initial={{ width: 0 }}
                      animate={
                        inView ? { width: `${(bar.a / max) * 100}%` } : {}
                      }
                      transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[0.65rem] text-muted-foreground">
                    {bar.a}
                  </span>
                </div>
                {/* Person B bar */}
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: PERSONS[1].color }}
                      initial={{ width: 0 }}
                      animate={
                        inView ? { width: `${(bar.b / max) * 100}%` } : {}
                      }
                      transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[0.65rem] text-muted-foreground">
                    {bar.b}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ActivitySparkline({ inView }: { inView: boolean }) {
  const maxVal = Math.max(...ACTIVITY_SPARKLINE);
  const height = 64;
  const barWidth = 6;
  const gap = 2;
  const totalWidth = ACTIVITY_SPARKLINE.length * (barWidth + gap) - gap;

  return (
    <motion.div
      {...fadeUp(0.65)}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
          Aktywność w czasie
        </span>
        <span className="font-mono text-[0.6rem] text-text-muted">
          ostatnie 30 tygodni
        </span>
      </div>

      <div className="flex items-end justify-center overflow-hidden">
        <svg
          width={totalWidth}
          height={height}
          viewBox={`0 0 ${totalWidth} ${height}`}
          className="w-full"
          preserveAspectRatio="none"
        >
          {ACTIVITY_SPARKLINE.map((val, i) => {
            const barHeight = (val / maxVal) * height;
            const x = i * (barWidth + gap);
            const y = height - barHeight;
            const intensity = val / maxVal;
            return (
              <motion.rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={`rgba(59, 130, 246, ${0.15 + intensity * 0.65})`}
                initial={{ scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.7 + i * 0.02,
                  ease: 'easeOut',
                }}
                style={{ transformOrigin: `${x + barWidth / 2}px ${height}px` }}
              />
            );
          })}
        </svg>
      </div>
    </motion.div>
  );
}

function PersonalityInsights({ inView }: { inView: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PERSONS.map((person, i) => (
        <motion.div
          key={person.name}
          {...fadeUp(0.8 + i * 0.1)}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border-hover"
        >
          <div className="mb-3 flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: person.color }}
            />
            <span
              className="font-story-display text-sm font-bold"
              style={{ color: person.color }}
            >
              {person.name}
            </span>
          </div>

          <div className="mb-3">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
              Styl przywiązania
            </span>
            <p className="mt-0.5 font-story-body text-sm font-medium text-foreground">
              {person.attachment}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {person.traits.map((trait) => (
              <span
                key={trait}
                className="rounded-md px-2 py-0.5 font-mono text-[0.65rem] font-medium"
                style={{
                  background: person.colorSubtle,
                  color: person.color,
                }}
              >
                {trait}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LandingDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="demo" ref={ref} className="mx-auto max-w-6xl px-6 py-24">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
          PODGLĄD
        </p>
        <h2 className="font-story-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Zobacz, co odkryjesz
        </h2>
        <p className="mt-2 font-story-body text-sm text-muted-foreground">
          Przykładowa analiza rozmowy Ani i Kuby &mdash; 12 847 wiadomości, 423 dni
        </p>
      </motion.div>

      {/* Browser chrome wrapping demo content */}
      <BrowserChrome inView={isInView}>
        <div className="flex flex-col gap-4">
          <StatsRow inView={isInView} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToneComparison inView={isInView} />
            <ActivitySparkline inView={isInView} />
          </div>
          <PersonalityInsights inView={isInView} />
        </div>
      </BrowserChrome>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 1 }}
        className="mt-12 text-center"
      >
        <Link
          href="/analysis/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-story-body text-sm font-semibold text-primary-foreground transition-all hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98]"
          style={{ minHeight: 48 }}
        >
          Analizuj swoją rozmowę
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 8h9M8.5 4l4 4-4 4" />
          </svg>
        </Link>
      </motion.div>
    </section>
  );
}
