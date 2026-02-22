'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import CardShowcase from './CardShowcase';

const STATS = [
  { value: 12847, label: 'Analiz wykonanych', suffix: '+' },
  { value: 22, label: 'Typów kart do pobrania', suffix: '' },
  { value: 28, label: 'Metryk analizowanych', suffix: '+' },
  { value: 4, label: 'Passy AI analizy', suffix: '' },
];

const TRUST_BADGES = [
  '63 wzorce komunikacji',
  '12 zaburzeń osobowości',
  '4 passy AI',
  '28+ metryk',
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

export default function LandingSocialProof() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [paused, setPaused] = useState(false);

  return (
    <>
      {/* Marquee keyframes */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 50s linear infinite;
        }
        @media (max-width: 640px) {
          .marquee-track {
            animation-duration: 35s;
          }
        }
        .marquee-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      <section
        id="social-proof"
        ref={sectionRef}
        className="relative border-y border-border py-16"
        style={{
          overflowX: 'clip',
          background:
            'linear-gradient(135deg, rgba(59,130,246,0.02) 0%, rgba(168,85,247,0.02) 100%), var(--bg-card, #111111)',
        } as Record<string, string>}
      >
        <div className="mx-auto max-w-5xl px-6">
          {/* Stats row */}
          <div className="mb-10 grid grid-cols-2 gap-4 sm:gap-8 md:grid-cols-4">
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

          {/* Card showcase — infinite marquee with hover previews */}
          <CardShowcase inView={inView} paused={paused} onPause={setPaused} />
        </div>
      </section>
    </>
  );
}
