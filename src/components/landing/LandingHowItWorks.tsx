'use client';

import { useRef, useState, useLayoutEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { Upload, BarChart3, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: Upload,
    title: 'Wrzuć plik',
    description:
      'Eksportuj rozmowę z Messengera jako JSON i przeciągnij na stronę. Obsługujemy też WhatsApp.',
    detail: '~30 sekund',
    color: '#3b82f6',
  },
  {
    icon: BarChart3,
    title: 'Analizujemy',
    description:
      '28+ metryk ilościowych obliczanych natychmiast, a potem 4 passy analizy AI — osobowość, dynamika, red flagi.',
    detail: '~2 minuty',
    color: '#a855f7',
  },
  {
    icon: Sparkles,
    title: 'Odkrywasz',
    description:
      'Interaktywny raport z kartami do pobrania na Instagram Stories. Receipt, Red Flag Report, Versus i 12 innych formatów.',
    detail: '15+ kart',
    color: '#10b981',
  },
];

/** Measures the vertical center of an icon relative to a container */
function getIconCenterY(icon: HTMLElement, container: HTMLElement): number {
  return icon.offsetTop - container.offsetTop + icon.offsetHeight / 2;
}

export default function LandingHowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  // Refs for mobile icons
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const mobileFirstIconRef = useRef<HTMLDivElement>(null);
  const mobileLastIconRef = useRef<HTMLDivElement>(null);
  const [mobileLine, setMobileLine] = useState({ top: 28, height: 0 });

  // Refs for desktop icons
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const desktopFirstIconRef = useRef<HTMLDivElement>(null);
  const desktopLastIconRef = useRef<HTMLDivElement>(null);
  const [desktopLine, setDesktopLine] = useState({ top: 28, height: 0 });

  const measureLines = useCallback(() => {
    // Mobile
    if (mobileContainerRef.current && mobileFirstIconRef.current && mobileLastIconRef.current) {
      const container = mobileContainerRef.current;
      const firstY = getIconCenterY(mobileFirstIconRef.current, container);
      const lastY = getIconCenterY(mobileLastIconRef.current, container);
      setMobileLine({ top: firstY, height: lastY - firstY });
    }
    // Desktop
    if (desktopContainerRef.current && desktopFirstIconRef.current && desktopLastIconRef.current) {
      const container = desktopContainerRef.current;
      const firstY = getIconCenterY(desktopFirstIconRef.current, container);
      const lastY = getIconCenterY(desktopLastIconRef.current, container);
      setDesktopLine({ top: firstY, height: lastY - firstY });
    }
  }, []);

  useLayoutEffect(() => {
    measureLines();
    window.addEventListener('resize', measureLines);
    return () => window.removeEventListener('resize', measureLines);
  }, [measureLines]);

  return (
    <section ref={ref} className="mx-auto max-w-4xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className="mb-16 text-center"
      >
        <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
          PROCES
        </p>
        <h2 className="font-story-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Jak to działa?
        </h2>
        <p className="mt-2 font-story-body text-sm text-muted-foreground">
          3 proste kroki do pełnej analizy psychologicznej
        </p>
      </motion.div>

      {/* ── Mobile: simple left-aligned timeline ── */}
      <div ref={mobileContainerRef} className="relative md:hidden">
        {/* Connector line — measured between first and last icon centers */}
        {mobileLine.height > 0 && (
          <motion.div
            className="absolute left-[27px] w-px"
            style={{
              background: 'linear-gradient(to bottom, #3b82f6, #a855f7, #10b981)',
              top: mobileLine.top,
              height: mobileLine.height,
              transformOrigin: 'top',
            }}
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
          />
        )}

        <div className="flex flex-col gap-10">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const iconRef =
              i === 0
                ? mobileFirstIconRef
                : i === STEPS.length - 1
                  ? mobileLastIconRef
                  : undefined;

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
                className="flex items-start gap-5"
              >
                {/* Icon on timeline */}
                <div
                  ref={iconRef}
                  className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl border-2"
                  style={{
                    borderColor: step.color,
                    background: `${step.color}15`,
                    boxShadow: `0 0 24px ${step.color}30`,
                  }}
                >
                  <Icon className="size-6" style={{ color: step.color }} />
                </div>

                {/* Card */}
                <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-5">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span
                      className="font-mono text-2xl font-black"
                      style={{ color: step.color, opacity: 0.25 }}
                    >
                      0{i + 1}
                    </span>
                    <h3 className="font-story-display text-base font-bold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p className="font-story-body text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                  <div className="mt-3">
                    <span
                      className="inline-block rounded-md px-2.5 py-1 font-mono text-[0.65rem] font-medium"
                      style={{ background: `${step.color}15`, color: step.color }}
                    >
                      {step.detail}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Desktop: CSS grid with centered timeline ── */}
      <div ref={desktopContainerRef} className="relative hidden md:block">
        {/* Connector line — measured between first and last icon centers */}
        {desktopLine.height > 0 && (
          <motion.div
            className="absolute left-1/2 w-px -translate-x-px"
            style={{
              background: 'linear-gradient(to bottom, #3b82f6, #a855f7, #10b981)',
              top: desktopLine.top,
              height: desktopLine.height,
              transformOrigin: 'top',
            }}
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
          />
        )}

        <div className="flex flex-col gap-14">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLeft = i % 2 === 0;
            const iconRef =
              i === 0
                ? desktopFirstIconRef
                : i === STEPS.length - 1
                  ? desktopLastIconRef
                  : undefined;

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.2 }}
                className="grid items-center"
                style={{ gridTemplateColumns: '1fr 72px 1fr' }}
              >
                {/* Left cell */}
                {isLeft ? (
                  <div className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-border-hover">
                    <div className="mb-2 flex items-center gap-3">
                      <span
                        className="font-mono text-3xl font-black"
                        style={{ color: step.color, opacity: 0.25 }}
                      >
                        0{i + 1}
                      </span>
                      <h3 className="font-story-display text-lg font-bold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <p className="font-story-body text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    <div className="mt-3">
                      <span
                        className="inline-block rounded-md px-2.5 py-1 font-mono text-[0.65rem] font-medium"
                        style={{ background: `${step.color}15`, color: step.color }}
                      >
                        {step.detail}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                {/* Center cell — icon */}
                <div ref={iconRef} className="relative z-10 flex justify-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-2xl border-2"
                    style={{
                      borderColor: step.color,
                      background: `${step.color}15`,
                      boxShadow: `0 0 24px ${step.color}30`,
                    }}
                  >
                    <Icon className="size-6" style={{ color: step.color }} />
                  </div>
                </div>

                {/* Right cell */}
                {!isLeft ? (
                  <div className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-border-hover">
                    <div className="mb-2 flex items-center gap-3">
                      <span
                        className="font-mono text-3xl font-black"
                        style={{ color: step.color, opacity: 0.25 }}
                      >
                        0{i + 1}
                      </span>
                      <h3 className="font-story-display text-lg font-bold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <p className="font-story-body text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    <div className="mt-3">
                      <span
                        className="inline-block rounded-md px-2.5 py-1 font-mono text-[0.65rem] font-medium"
                        style={{ background: `${step.color}15`, color: step.color }}
                      >
                        {step.detail}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
