'use client';

import { motion } from 'framer-motion';
import { Scene } from '@/components/analysis/eks/shared';
import type { QuizComparison } from '@/components/analysis/EksButton';

export default function QuizComparisonScene({
  comparisons,
}: {
  comparisons: QuizComparison[];
}) {
  if (comparisons.length === 0) return null;

  const hits = comparisons.filter(c => c.isMatch).length;
  const close = comparisons.filter(c => c.isClose).length;
  const total = comparisons.length;

  // Score label
  const scoreLabel =
    hits >= total - 1 ? 'Znasz się na tym lepiej niż myślisz.'
      : hits >= total / 2 ? 'Nieźle — ale AI widzi więcej.'
        : 'AI widzi to zupełnie inaczej niż ty.';

  return (
    <Scene id="eks-quiz-comparison">
      <div className="max-w-xl mx-auto px-4 md:px-6">
        {/* Header */}
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#6b3a3a' }}
        >
          twoje odpowiedzi vs AI
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-3"
          style={{ color: '#dc2626' }}
        >
          JAK MYŚLISZ, CO POWIE AI?
        </h3>

        {/* Score */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="font-mono text-5xl font-black mb-2"
            style={{ color: '#dc2626' }}
          >
            {hits}/{total}
          </div>
          <p
            className="text-sm font-mono"
            style={{ color: '#d4a07a' }}
          >
            {close > 0 && `(+${close} prawie)`}
          </p>
          <p
            className="text-xs mt-2 italic"
            style={{ color: '#6b3a3a' }}
          >
            {scoreLabel}
          </p>
        </motion.div>

        {/* Comparison rows */}
        <div className="space-y-3">
          {comparisons.map((c, i) => (
            <motion.div
              key={c.questionId}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'rgba(10,4,4,0.7)',
                border: `1px solid ${c.isMatch ? 'rgba(16,185,129,0.25)' : c.isClose ? 'rgba(245,158,11,0.25)' : 'rgba(153,27,27,0.2)'}`,
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {/* Question */}
              <div
                className="px-4 py-2.5"
                style={{
                  background: c.isMatch
                    ? 'rgba(16,185,129,0.06)'
                    : c.isClose
                      ? 'rgba(245,158,11,0.06)'
                      : 'rgba(153,27,27,0.06)',
                  borderBottom: '1px solid rgba(153,27,27,0.1)',
                }}
              >
                <div className="flex items-center justify-between">
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: '#6b3a3a' }}
                  >
                    {c.question}
                  </p>
                  <span className="text-sm">
                    {c.isMatch ? '✓' : c.isClose ? '~' : '✗'}
                  </span>
                </div>
              </div>

              {/* Answers side by side */}
              <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'rgba(153,27,27,0.1)' }}>
                <div className="px-4 py-3">
                  <p
                    className="font-mono text-[9px] uppercase tracking-widest mb-1"
                    style={{ color: '#6b3a3a' }}
                  >
                    Ty
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: '#d4a07a' }}
                  >
                    {c.userAnswer}
                  </p>
                </div>
                <div className="px-4 py-3" style={{ borderColor: 'rgba(153,27,27,0.1)' }}>
                  <p
                    className="font-mono text-[9px] uppercase tracking-widest mb-1"
                    style={{ color: '#6b3a3a' }}
                  >
                    AI
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: c.isMatch ? '#10b981' : c.isClose ? '#f59e0b' : '#dc2626',
                    }}
                  >
                    {c.aiAnswer}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <p
          className="text-center text-[10px] mt-8 font-mono uppercase tracking-widest"
          style={{ color: '#4a2020' }}
        >
          przewiń w dół po pełne wyniki
        </p>
      </div>
    </Scene>
  );
}
