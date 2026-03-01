'use client';

import { motion } from 'framer-motion';
import { Scene, toArr, EKGDivider } from '@/components/analysis/eks/shared';
import type { EksResult } from '@/lib/analysis/eks-prompts';

interface UnsaidSceneProps {
  unsaidThings: EksResult['unsaidThings'];
}

export default function UnsaidScene({ unsaidThings }: UnsaidSceneProps) {
  if (!unsaidThings) return null;

  return (
    <>
      <Scene id="eks-unsaid">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
            style={{ color: '#475569' }}
          >
            archiwum ciszy
          </p>
          <h3
            className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-10"
            style={{ color: '#94a3b8' }}
          >
            RZECZY KTÓRYCH NIGDY NIE POWIEDZIELIŚCIE
          </h3>

          {/* Per-person unsaid things */}
          <div className="grid gap-6 md:grid-cols-2 mb-10">
            {Object.entries(unsaidThings.perPerson).map(([name, things], pi) => (
              <motion.div
                key={name}
                className="rounded-xl p-5 md:p-6"
                style={{
                  background: 'rgba(148, 163, 184, 0.03)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: pi * 0.15 }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-widest mb-4"
                  style={{ color: '#475569' }}
                >
                  {name} nigdy nie powiedział/a:
                </p>
                <div className="space-y-3">
                  {toArr(things).map((thing: string, i: number) => (
                    <motion.div
                      key={i}
                      className="rounded-lg px-4 py-3 text-sm italic"
                      style={{
                        background: 'rgba(148, 163, 184, 0.02)',
                        borderLeft: '2px solid rgba(148, 163, 184, 0.15)',
                        color: '#cbd5e1',
                      }}
                      initial={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
                      whileInView={{ opacity: 0.7, x: 0, filter: 'blur(0px)' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.15 }}
                    >
                      &ldquo;{thing}&rdquo;
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Shared unsaid — the emotional climax */}
          {unsaidThings.sharedUnsaid && (
            <motion.div
              className="text-center max-w-lg mx-auto"
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(12px)' }}
              whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ duration: 1.2 }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: '#475569' }}
              >
                Oboje tego unikaliście
              </p>
              <p
                className="font-[family-name:var(--font-syne)] text-lg md:text-2xl font-bold italic leading-relaxed"
                style={{
                  color: '#e2e8f0',
                  textShadow: '0 2px 12px rgba(226, 232, 240, 0.1)',
                }}
              >
                &ldquo;{unsaidThings.sharedUnsaid}&rdquo;
              </p>
            </motion.div>
          )}
        </div>
      </Scene>
      <EKGDivider />
    </>
  );
}
