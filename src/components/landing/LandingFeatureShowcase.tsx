'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface FeatureCard {
  emoji: string;
  title: string;
  description: string;
  accent: string;
  span?: 'wide' | 'tall' | 'hero';
}

const FEATURES: FeatureCard[] = [
  {
    emoji: '💚',
    title: 'Wynik zdrowia relacji',
    description:
      'Composite score 0-100 z pięcioma komponentami: równowaga sił, wzajemność, wzorce odpowiedzi, bezpieczeństwo emocjonalne i trajektoria rozwoju.',
    accent: '#10b981',
    span: 'hero',
  },
  {
    emoji: '⚔️',
    title: 'Versus',
    description: 'Kto jest przylepcem? Kto ghostuje? Tale of the tape w 6 kategoriach.',
    accent: '#a855f7',
  },
  {
    emoji: '🚩',
    title: 'Czerwone flagi',
    description: 'AI wykrywa niezdrowe wzorce z poziomem zagrożenia i cytatami.',
    accent: '#ef4444',
  },
  {
    emoji: '🧠',
    title: 'Profil osobowości',
    description:
      'Big Five, styl przywiązania, inteligencja emocjonalna — pełny profil psychologiczny obu osób.',
    accent: '#3b82f6',
    span: 'wide',
  },
  {
    emoji: '🏆',
    title: 'Viral Scores',
    description: 'Ick Score, Rizz Level, Delulu Index — 8 viralowych metryk do udostępnienia.',
    accent: '#f59e0b',
  },
  {
    emoji: '🧾',
    title: '15+ kart Stories',
    description: 'Paragon, Red Flag Report, Paszport, Etykietka — gotowe do pobrania 1080×1920.',
    accent: '#f472b6',
  },
];

// Mini health score gauge rendered as SVG — used inside the hero card
function MiniGauge({ score, color }: { score: number; color: string }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const pct = score / 100;

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      {/* Track */}
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="5"
      />
      {/* Fill arc */}
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        transform="rotate(-90 44 44)"
        style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
      />
      <text
        x="44"
        y="42"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono"
        style={{ fontSize: '1.1rem', fontWeight: 900, fill: color }}
      >
        {score}
      </text>
      <text
        x="44"
        y="57"
        textAnchor="middle"
        className="font-mono"
        style={{ fontSize: '0.4rem', fill: '#888', letterSpacing: '0.1em' }}
      >
        / 100
      </text>
    </svg>
  );
}

export default function LandingFeatureShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="mx-auto max-w-5xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
          ANALIZA
        </p>
        <h2 className="font-story-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Co odkryjesz?
        </h2>
        <p className="mt-2 font-story-body text-sm text-muted-foreground">
          28+ metryk ilościowych + 4 passy analizy AI
        </p>
      </motion.div>

      {/* Bento grid */}
      <div className="grid auto-rows-[180px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => {
          const isHero = feature.span === 'hero';
          const isWide = feature.span === 'wide';
          // hero = 2 cols + 2 rows, wide = 2 cols + 1 row, default = 1×1
          const spanClass = isHero
            ? 'sm:col-span-2 sm:row-span-2'
            : isWide
              ? 'sm:col-span-2'
              : '';

          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className={`group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-border-hover hover:-translate-y-0.5 ${spanClass}`}
              style={{
                background: `radial-gradient(ellipse at 20% 0%, ${feature.accent}08, transparent 70%), var(--bg-card, #111111)`,
              }}
            >
              {/* Accent glow on hover */}
              <div
                className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `${feature.accent}15` }}
              />

              <div className={`relative z-10 flex h-full flex-col ${isHero ? 'justify-between' : ''}`}>
                {/* Top section */}
                <div>
                  <div className="mb-3 flex items-start justify-between">
                    <div
                      className="flex size-10 items-center justify-center rounded-lg"
                      style={{ background: `${feature.accent}12`, border: `1px solid ${feature.accent}20` }}
                    >
                      <span className="text-lg">{feature.emoji}</span>
                    </div>

                    {/* Mini gauge in hero card only */}
                    {isHero && <MiniGauge score={78} color={feature.accent} />}
                  </div>

                  <h3
                    className="mb-1.5 font-story-display text-sm font-bold"
                    style={{ color: feature.accent }}
                  >
                    {feature.title}
                  </h3>
                  <p className="font-story-body text-xs leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom accent bar */}
                <div className="mt-auto flex gap-1 pt-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div
                      key={j}
                      className="h-0.5 flex-1 rounded-full"
                      style={{
                        background: feature.accent,
                        opacity: 0.08 + (j / 5) * 0.35,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
