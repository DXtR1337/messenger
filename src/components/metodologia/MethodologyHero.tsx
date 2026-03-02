'use client';

import { motion } from 'framer-motion';

export default function MethodologyHero() {
  return (
    <section className="relative w-full overflow-hidden py-24 md:py-32">
      {/* Subtle background gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-2xl px-6 text-center"
      >
        {/* Eyebrow */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="h-px w-8 bg-[#3b82f6]/30" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Metodologia
          </span>
          <div className="h-px w-8 bg-[#a855f7]/30" />
        </div>

        {/* Title — plain white, no gradient */}
        <h1 className="font-[family-name:var(--font-story-display)] text-4xl font-black text-foreground md:text-5xl">
          Jak to działa?
        </h1>

        <p className="mx-auto mt-5 max-w-lg font-[family-name:var(--font-story-body)] text-base leading-relaxed text-muted-foreground md:text-lg">
          Poznaj algorytmy stojące za analizą Twoich rozmów — od czystej matematyki po sztuczną inteligencję
        </p>

        {/* Big stat line */}
        <div className="mt-10">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-[family-name:var(--font-story-display)] text-5xl font-black text-foreground md:text-6xl">
              57
            </span>
            <span className="font-[family-name:var(--font-story-body)] text-lg text-muted-foreground md:text-xl">
              algorytmów
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 font-mono text-sm">
            <span className="rounded-md border border-[#3b82f6]/20 bg-[#3b82f6]/10 px-2.5 py-1 text-xs text-[#3b82f6]">
              34 math
            </span>
            <span className="rounded-md border border-[#a855f7]/20 bg-[#a855f7]/10 px-2.5 py-1 text-xs text-[#a855f7]">
              23 AI
            </span>
            <span className="text-[#444444]">·</span>
            <span className="text-muted-foreground">
              150+ metryk
            </span>
            <span className="text-[#444444]">·</span>
            <span className="text-muted-foreground">
              20+ źródeł
            </span>
          </div>

          {/* Scroll hint */}
          <p className="mt-8 font-mono text-[11px] text-[#333333]">
            ↓ Przeglądaj algorytmy
          </p>
        </div>
      </motion.div>

      {/* Bottom gradient line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.15), rgba(168,85,247,0.15), transparent)',
        }}
      />
    </section>
  );
}
