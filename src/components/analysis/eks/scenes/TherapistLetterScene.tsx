'use client';

import { motion } from 'framer-motion';
import { Scene } from '@/components/analysis/eks/shared';
import type { EksTherapistLetter } from '@/lib/analysis/eks-prompts';

export default function TherapistLetterScene({
  therapistLetter,
}: {
  therapistLetter: EksTherapistLetter;
}) {
  const entries = Object.entries(therapistLetter.perPerson);

  return (
    <Scene id="eks-therapist-letter">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#3a6b5a' }}
        >
          gabinet
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-4"
          style={{ color: '#10b981' }}
        >
          LIST OD TERAPEUTY
        </h3>
        <p
          className="text-center text-sm mb-12 max-w-md mx-auto"
          style={{ color: '#3a6b5a' }}
        >
          Gdyby terapeuta mógł napisać do każdego z was osobno...
        </p>

        <div className="space-y-10">
          {entries.map(([name, letter], i) => (
            <motion.div
              key={name}
              className="rounded-xl overflow-hidden eks-letter-paper"
              style={{
                background: 'rgba(6,8,8,0.8)',
                border: '1px solid rgba(16,185,129,0.12)',
                boxShadow: '0 0 30px rgba(16,185,129,0.04)',
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
            >
              {/* Letter header — handwritten feel */}
              <div
                className="px-6 py-4"
                style={{
                  background: 'rgba(16,185,129,0.04)',
                  borderBottom: '1px solid rgba(16,185,129,0.08)',
                }}
              >
                <p
                  className="text-lg italic"
                  style={{
                    color: '#10b981',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {letter.dearLine}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* What I see — unfolds first */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-2"
                    style={{ color: '#3a6b5a' }}
                  >
                    Co widzę
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#d4a07a', fontFamily: 'Georgia, serif' }}
                  >
                    {letter.whatISee}
                  </p>
                </motion.div>

                {/* What you don't see — unfolds second */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-2"
                    style={{ color: '#3a6b5a' }}
                  >
                    Czego nie widzisz
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#d4a07a', fontFamily: 'Georgia, serif' }}
                  >
                    {letter.whatYouDontSee}
                  </p>
                </motion.div>

                {/* One thing to work on — highlighted */}
                <motion.div
                  className="rounded-lg p-4"
                  style={{
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.15)',
                  }}
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-2"
                    style={{ color: '#10b981' }}
                  >
                    Jedna rzecz do przepracowania
                  </p>
                  <p
                    className="text-sm leading-relaxed font-semibold"
                    style={{ color: '#10b981', fontFamily: 'Georgia, serif' }}
                  >
                    {letter.oneThingToWorkOn}
                  </p>
                </motion.div>

                {/* Closing line */}
                <div
                  className="pt-4"
                  style={{ borderTop: '1px solid rgba(16,185,129,0.06)' }}
                >
                  <p
                    className="text-sm italic text-right"
                    style={{ color: '#3a6b5a', fontFamily: 'Georgia, serif' }}
                  >
                    {letter.closingLine}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Scene>
  );
}
