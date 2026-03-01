'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scene, toArr } from '@/components/analysis/eks/shared';
import type { EksResult } from '@/lib/analysis/eks-prompts';

interface GoldenAgeSceneProps {
  goldenAge: EksResult['goldenAge'];
}

export default function GoldenAgeScene({ goldenAge }: GoldenAgeSceneProps) {
  const warmRef = useRef<HTMLDivElement>(null);
  const [warmth, setWarmth] = useState(0);

  // Scroll-driven warmth: sepia + saturation intensifies as user scrolls deeper
  useEffect(() => {
    const el = warmRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const ratio = Math.min(1, entry.intersectionRatio / 0.4);
          setWarmth(ratio);
        }
      },
      { threshold: Array.from({ length: 20 }, (_, i) => i / 19) },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Scene id="eks-golden-age" className="eks-golden-transition eks-golden-warmth relative">
      <div
        ref={warmRef}
        className="max-w-3xl mx-auto px-4 md:px-6"
        style={{
          filter: warmth > 0.05 ? `sepia(${(warmth * 0.15).toFixed(2)}) saturate(${(1 + warmth * 0.3).toFixed(2)}) brightness(${(1 + warmth * 0.05).toFixed(2)})` : 'none',
          transition: 'filter 0.3s ease-out',
        }}
      >
        {/* Warm amber ambient glow -- stands out from crimson */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, rgba(212,160,122,0.12) 0%, rgba(139,115,85,0.04) 50%, transparent 80%)',
          }}
          aria-hidden="true"
        />
        {/* Old photo vignette (dark corners) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)',
          }}
          aria-hidden="true"
        />

        <div className="relative">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
            style={{ color: '#d4a07a' }}
          >
            wspomnienia
          </p>

          <h3
            className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-4"
            style={{
              color: '#d4a07a',
              textShadow: '0 2px 20px rgba(212,160,122,0.2)',
            }}
          >
            Ale było też coś dobrego.
          </h3>

          {goldenAge && (
            <>
              <div
                className="rounded-xl p-6 md:p-8 mb-6"
                style={{
                  background: 'rgba(139,115,85,0.08)',
                  border: '1px solid rgba(212,160,122,0.2)',
                  boxShadow: '0 0 40px rgba(212,160,122,0.05)',
                }}
              >
                {/* Period */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: '#d4a07a' }}
                  >
                    {goldenAge.periodStart} &mdash; {goldenAge.periodEnd}
                  </span>
                  {goldenAge.peakIntimacy > 0 && (
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: '#8b7355' }}
                    >
                      Intymność: {goldenAge.peakIntimacy}/100
                    </span>
                  )}
                  {goldenAge.peakActivity > 0 && (
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: '#8b7355' }}
                    >
                      Aktywność: {goldenAge.peakActivity} msg/mies.
                    </span>
                  )}
                </div>

                {/* Description -- warm serif */}
                <p
                  className="text-base leading-relaxed mb-6"
                  style={{
                    color: '#d4a07a',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {goldenAge.description}
                </p>

                {/* Best quotes -- warm gold accent */}
                {toArr(goldenAge?.bestQuotes).length > 0 && (
                  <div className="space-y-3 mb-6">
                    {toArr(goldenAge?.bestQuotes).map((quote: string, i: number) => (
                      <motion.div
                        key={i}
                        className="rounded-lg px-4 py-3 text-sm italic"
                        style={{
                          background: 'rgba(212,160,122,0.06)',
                          borderLeft: '2px solid rgba(212,160,122,0.4)',
                          color: '#d4a07a',
                          fontFamily: 'Georgia, serif',
                        }}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                      >
                        &ldquo;{quote}&rdquo;
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* What made it work */}
                {goldenAge.whatMadeItWork && (
                  <div>
                    <p
                      className="font-mono text-[10px] uppercase tracking-widest mb-2"
                      style={{ color: '#d4a07a' }}
                    >
                      Dlaczego dzialalo
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: '#d4a07a', fontFamily: 'Georgia, serif' }}>
                      {goldenAge.whatMadeItWork}
                    </p>
                  </div>
                )}
              </div>

              <p
                className="text-center text-sm italic"
                style={{
                  color: '#8b7355',
                  fontFamily: 'Georgia, serif',
                }}
              >
                To też jest część twojej historii.
              </p>
            </>
          )}
        </div>
      </div>
    </Scene>
  );
}
