'use client';

import { motion } from 'framer-motion';
import { Scene, toArr } from '@/components/analysis/eks/shared';
import type { EksResult } from '@/lib/analysis/eks-prompts';

export default function WhoLeftScene({
  whoLeftFirst,
}: {
  whoLeftFirst: EksResult['whoLeftFirst'];
}) {
  return (
    <Scene id="eks-who-left">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#6b3a3a' }}
        >
          analiza wycofania
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-10"
          style={{ color: '#dc2626' }}
        >
          KTO ODSZEDŁ PIERWSZY?
        </h3>

        {whoLeftFirst && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Verdict card */}
            <motion.div
              className="rounded-xl p-6 text-center md:col-span-2"
              style={{
                background: '#1a0808',
                border: '1px solid #991b1b30',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-3"
                style={{ color: '#4a4a4a' }}
              >
                Pierwszy/a odszedł/a
              </p>
              <p
                className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl font-extrabold"
                style={{ color: '#dc2626' }}
              >
                {whoLeftFirst.name}
              </p>
            </motion.div>

            {/* Withdrawal pattern — slides in from left */}
            <motion.div
              className="rounded-xl p-5"
              style={{
                background: '#1a0808',
                border: '1px solid #2a1010',
              }}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-3"
                style={{ color: '#4a4a4a' }}
              >
                Wzorzec wycofania
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#d4a07a' }}>
                {whoLeftFirst.withdrawalPattern}
              </p>
            </motion.div>

            {/* Other person's response — slides in from right */}
            <motion.div
              className="rounded-xl p-5"
              style={{
                background: '#1a0808',
                border: '1px solid #2a1010',
              }}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.35 }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-3"
                style={{ color: '#4a4a4a' }}
              >
                Reakcja drugiej osoby
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#d4a07a' }}>
                {whoLeftFirst.otherPersonResponse}
              </p>
            </motion.div>

            {/* Evidence */}
            {toArr(whoLeftFirst.evidence).length > 0 && (
              <div className="md:col-span-2 space-y-2">
                {toArr(whoLeftFirst.evidence).map((ev: string, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg px-4 py-2 text-xs italic"
                    style={{
                      background: 'rgba(153,27,27,0.05)',
                      borderLeft: '2px solid #991b1b40',
                      color: '#d4a07a',
                    }}
                  >
                    &ldquo;{ev}&rdquo;
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Scene>
  );
}
