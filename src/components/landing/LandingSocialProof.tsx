'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const STATS = [
  { value: 12847, label: 'Analiz wykonanych', suffix: '+' },
  { value: 15, label: 'Typów kart do pobrania', suffix: '' },
  { value: 28, label: 'Metryk analizowanych', suffix: '+' },
  { value: 4, label: 'Passy AI analizy', suffix: '' },
];

const TRUST_BADGES = [
  '63 wzorce komunikacji',
  '12 zaburzeń osobowości',
  '4 passy AI',
  '28+ metryk',
];

const SAMPLE_CARDS = [
  { emoji: '🧾', title: 'Paragon', desc: 'Twój rachunek za toksyczność', color: '#faf7f2', dark: false },
  { emoji: '🚩', title: 'Red Flag Report', desc: 'Oficjalny raport czerwonych flag', color: '#dc2626', dark: true },
  { emoji: '⚡', title: 'Versus', desc: 'Kto jest bardziej clingy?', color: '#6d9fff', dark: true },
  { emoji: '👻', title: 'Ghost Forecast', desc: 'Prognoza pogody dla relacji', color: '#10b981', dark: true },
  { emoji: '🏷️', title: 'Etykietka', desc: 'Twój label do bio', color: '#a78bfa', dark: true },
  { emoji: '💕', title: 'Match %', desc: 'Tinder-style kompatybilność', color: '#f472b6', dark: true },
  { emoji: '🛂', title: 'Paszport', desc: 'Personality Passport', color: '#fbbf24', dark: true },
  { emoji: '🏆', title: 'Awards', desc: 'Group Chat Awards', color: '#f97316', dark: true },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString('pl-PL')}{suffix}
    </span>
  );
}

// Render a single card tile used in the marquee strip
function MarqueeCard({ card }: { card: typeof SAMPLE_CARDS[number] }) {
  return (
    <div
      className="flex shrink-0 flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-border-hover hover:scale-[1.02]"
      style={{ width: 140 }}
    >
      <div
        className="flex size-12 items-center justify-center rounded-lg text-xl"
        style={{
          background: `${card.color}15`,
          border: `1px solid ${card.color}30`,
        }}
      >
        {card.emoji}
      </div>
      <div className="text-center">
        <div className="text-xs font-bold text-foreground">{card.title}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">{card.desc}</div>
      </div>
    </div>
  );
}

export default function LandingSocialProof() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [paused, setPaused] = useState(false);

  return (
    <>
      {/* Keyframes injected via a style element — Tailwind cannot generate @keyframes at runtime */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 30s linear infinite;
        }
        @media (max-width: 640px) {
          .marquee-track {
            animation-duration: 20s;
          }
        }
        .marquee-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      <section
        ref={sectionRef}
        className="relative overflow-hidden border-y border-border py-16"
        style={{
          background:
            'linear-gradient(135deg, rgba(59,130,246,0.02) 0%, rgba(168,85,247,0.02) 100%), var(--bg-card, #111111)',
        }}
      >
        <div className="mx-auto max-w-5xl px-6">
          {/* Stats row */}
          <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="font-mono text-4xl font-black text-foreground md:text-5xl">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="mt-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust badges row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="mb-14 flex flex-wrap items-center justify-center gap-2"
          >
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border bg-card/50 px-3 py-1 font-mono text-[0.65rem] text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </motion.div>

          {/* Card showcase — infinite marquee */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="mb-2 text-center font-mono text-lg font-bold text-foreground">
              Karty do pobrania
            </h3>
            <p className="mb-8 text-center font-mono text-xs text-muted-foreground">
              Każda karta to osobny format — od paragonu po paszport osobowości
            </p>

            {/* Marquee container — overflow-hidden clips the scrolling track */}
            <div
              className="relative overflow-hidden"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              {/* Fade edges */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-16 bg-gradient-to-r from-[#111111] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-16 bg-gradient-to-l from-[#111111] to-transparent" />

              {/* Scrolling track: cards duplicated so the loop is seamless */}
              <div
                className={`marquee-track flex gap-4 pb-4${paused ? ' paused' : ''}`}
                style={{ width: 'max-content' }}
              >
                {/* First copy */}
                {SAMPLE_CARDS.map((card, i) => (
                  <MarqueeCard key={`a-${i}`} card={card} />
                ))}
                {/* Duplicate copy — makes the loop seamless */}
                {SAMPLE_CARDS.map((card, i) => (
                  <MarqueeCard key={`b-${i}`} card={card} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
