'use client';

import { motion } from 'framer-motion';
import { Scene } from '@/components/analysis/eks/shared';
import type { EksLetterToTherapist } from '@/lib/analysis/eks-prompts';

export default function LetterToTherapistScene({
  letterToTherapist,
}: {
  letterToTherapist: EksLetterToTherapist;
}) {
  const entries = Object.entries(letterToTherapist.perPerson);
  if (entries.length === 0) return null;

  return (
    <Scene id="eks-letter-to-therapist">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#6b5a3a' }}
        >
          poczekalnia
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-4"
          style={{ color: '#d4a07a' }}
        >
          LIST DO TERAPEUTY
        </h3>
        <p
          className="text-center text-sm mb-12 max-w-md mx-auto"
          style={{ color: '#6b5a3a' }}
        >
          Gdyby musieli opisać tę relację komuś obcemu...
        </p>

        <div className="space-y-10">
          {entries.map(([name, letter], i) => (
            <motion.div
              key={name}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'rgba(10,8,4,0.85)',
                border: '1px solid rgba(212,160,122,0.12)',
                boxShadow: '0 0 30px rgba(212,160,122,0.04)',
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
            >
              {/* Letter header — personal, raw feel */}
              <div
                className="px-6 py-4"
                style={{
                  background: 'rgba(212,160,122,0.04)',
                  borderBottom: '1px solid rgba(212,160,122,0.08)',
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-widest mb-1"
                  style={{ color: '#6b5a3a' }}
                >
                  {name} pisze:
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Opening — how they'd start */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <p
                    className="text-base italic leading-relaxed"
                    style={{ color: '#d4a07a', fontFamily: 'Georgia, serif' }}
                  >
                    &ldquo;{letter.opening}&rdquo;
                  </p>
                </motion.div>

                {/* What happened — their version */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-2"
                    style={{ color: '#6b5a3a' }}
                  >
                    Co się stało (ich wersja)
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#d4a07a', fontFamily: 'Georgia, serif' }}
                  >
                    {letter.whatHappened}
                  </p>
                </motion.div>

                {/* Looping thought */}
                <motion.div
                  className="rounded-lg p-4"
                  style={{
                    background: 'rgba(212,160,122,0.04)',
                    border: '1px solid rgba(212,160,122,0.10)',
                  }}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-2"
                    style={{ color: '#6b5a3a' }}
                  >
                    Myśl która się zapętla
                  </p>
                  <p
                    className="text-sm leading-relaxed italic"
                    style={{ color: '#d4a07a', fontFamily: 'Georgia, serif' }}
                  >
                    &ldquo;{letter.whatIKeepThinking}&rdquo;
                  </p>
                </motion.div>

                {/* Afraid to admit — the hardest part */}
                <motion.div
                  className="rounded-lg p-4"
                  style={{
                    background: 'rgba(153,27,27,0.06)',
                    border: '1px solid rgba(153,27,27,0.15)',
                  }}
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.65 }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-2"
                    style={{ color: '#991b1b' }}
                  >
                    Czego boję się przyznać
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#d4a07a', fontFamily: 'Georgia, serif' }}
                  >
                    {letter.whatImAfraidToAdmit}
                  </p>
                </motion.div>

                {/* The question — what they'd ask */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <div
                    className="pt-4"
                    style={{ borderTop: '1px solid rgba(212,160,122,0.06)' }}
                  >
                    <p
                      className="font-mono text-[10px] uppercase tracking-widest mb-2"
                      style={{ color: '#6b5a3a' }}
                    >
                      Pytanie do terapeuty
                    </p>
                    <p
                      className="text-base italic text-center"
                      style={{ color: '#d4a07a', fontFamily: 'Georgia, serif' }}
                    >
                      &ldquo;{letter.theQuestion}&rdquo;
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Scene>
  );
}
