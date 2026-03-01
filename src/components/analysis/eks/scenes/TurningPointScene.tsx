'use client';

import { motion } from 'framer-motion';
import { Scene, toArr } from '@/components/analysis/eks/shared';
import type { EksResult } from '@/lib/analysis/eks-prompts';

export default function TurningPointScene({
  turningPoint,
}: {
  turningPoint: EksResult['turningPoint'];
}) {
  return (
    <Scene id="eks-turning-point">
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center relative">
        {/* Dimming overlay behind the spotlight content */}
        <div
          className="pointer-events-none absolute inset-0 -mx-4 -my-16"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.4) 100%)',
          }}
          aria-hidden="true"
        />

        <div className="relative">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-2"
            style={{ color: '#6b3a3a' }}
          >
            punkt bez powrotu
          </p>
          <h3
            className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight mb-10"
            style={{ color: '#dc2626' }}
          >
            MOMENT PRAWDY
          </h3>

          {turningPoint && (
            <>
              {/* Large date — typewriter with cursor blink */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <p
                  className="font-mono text-5xl md:text-7xl font-extrabold inline-block"
                  style={{
                    color: '#991b1b',
                    textShadow: '0 0 30px rgba(153,27,27,0.3)',
                  }}
                >
                  {turningPoint.approximateDate}
                  <span
                    className="inline-block w-[3px] h-[0.8em] ml-2 align-middle"
                    style={{
                      background: '#991b1b',
                      animation: 'eks-cursor-blink 1s step-end infinite',
                    }}
                  />
                </p>
              </motion.div>

              {/* Trigger — zoomed spotlight message */}
              <motion.div
                className="mx-auto max-w-xl mb-8 px-4 eks-scroll-deblur"
                initial={{ opacity: 0, scale: 1.5, filter: 'blur(4px)' }}
                whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
              >
                <p
                  className="text-lg md:text-xl leading-relaxed font-semibold"
                  style={{ color: '#d4a07a' }}
                >
                  {turningPoint.trigger}
                </p>
              </motion.div>

              {/* Evidence quotes — dimmed compared to trigger */}
              {toArr(turningPoint.evidence).length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 mb-8 text-left" style={{ opacity: 0.7 }}>
                  {toArr(turningPoint.evidence).map((ev: string, i: number) => (
                    <div
                      key={i}
                      className="eks-specimen-card rounded-lg px-4 py-3 text-sm italic"
                      style={{
                        background: 'rgba(26,8,8,0.6)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid #2a1010',
                        color: '#d4a07a',
                      }}
                    >
                      &ldquo;{ev}&rdquo;
                    </div>
                  ))}
                </div>
              )}

              {/* Counter-card — alternate reality, dashed border */}
              {turningPoint.whatShouldHaveHappened && (
                <motion.div
                  className="rounded-xl p-5 md:p-6 text-left mx-auto max-w-lg"
                  style={{
                    background: 'rgba(16,185,129,0.04)',
                    border: '2px dashed rgba(16,185,129,0.25)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-2"
                    style={{ color: 'rgba(16,185,129,0.6)' }}
                  >
                    &#9998; Alternatywna rzeczywistość
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: '#10b981' }}>
                    {turningPoint.whatShouldHaveHappened}
                  </p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </Scene>
  );
}
