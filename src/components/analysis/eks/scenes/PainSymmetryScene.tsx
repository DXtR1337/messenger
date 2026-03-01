'use client';

import { motion } from 'framer-motion';
import { Scene } from '@/components/analysis/eks/shared';
import type { EksPainSymmetry } from '@/lib/analysis/eks-prompts';

export default function PainSymmetryScene({
  painSymmetry,
  participants,
}: {
  painSymmetry: EksPainSymmetry;
  participants: string[];
}) {
  const personA = participants[0] ?? 'Osoba A';
  const personB = participants[1] ?? 'Osoba B';

  return (
    <Scene id="eks-pain-symmetry">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#6b3a6b' }}
        >
          bilans cierpienia
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-4"
          style={{ color: '#a855f7' }}
        >
          SYMETRIA BÓLU
        </h3>
        <p
          className="text-center text-sm mb-10 max-w-md mx-auto"
          style={{ color: '#6b3a6b' }}
        >
          Oboje raniliście. Oboje byliście ranieni. Oto rachunek.
        </p>

        {/* Who hurt more — verdict */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: '#4a4a4a' }}
          >
            Kto skrzywdził bardziej
          </p>
          <p
            className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl font-extrabold"
            style={{ color: '#a855f7', textShadow: '0 0 30px rgba(168,85,247,0.2)' }}
          >
            {painSymmetry.whoHurtMore}
          </p>
        </motion.div>

        {/* Pain exchange — two columns */}
        <div className="grid gap-6 md:grid-cols-2 mb-10">
          {/* How A hurt B */}
          <motion.div
            className="eks-pain-card rounded-xl p-5 md:p-6"
            style={{
              background: 'rgba(8,2,6,0.6)',
              border: '1px solid rgba(168,85,247,0.15)',
              boxShadow: 'inset 0 1px 0 rgba(168,85,247,0.05)',
            }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="font-mono text-[10px] uppercase tracking-widest mb-3"
              style={{ color: '#a855f7' }}
            >
              Jak {personA} ranił/a {personB}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#d4a07a' }}>
              {painSymmetry.howPersonAHurtB}
            </p>
          </motion.div>

          {/* How B hurt A */}
          <motion.div
            className="eks-pain-card rounded-xl p-5 md:p-6"
            style={{
              background: 'rgba(8,2,6,0.6)',
              border: '1px solid rgba(168,85,247,0.15)',
              boxShadow: 'inset 0 1px 0 rgba(168,85,247,0.05)',
            }}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <p
              className="font-mono text-[10px] uppercase tracking-widest mb-3"
              style={{ color: '#a855f7' }}
            >
              Jak {personB} ranił/a {personA}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#d4a07a' }}>
              {painSymmetry.howPersonBHurtA}
            </p>
          </motion.div>
        </div>

        {/* The irony */}
        <motion.div
          className="rounded-xl p-6 md:p-8 mb-8 text-center max-w-lg mx-auto"
          style={{
            background: 'rgba(168,85,247,0.04)',
            border: '1px solid rgba(168,85,247,0.12)',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: '#6b3a6b' }}
          >
            Ironia losu
          </p>
          <p
            className="text-base md:text-lg leading-relaxed italic"
            style={{ color: '#a855f7', fontFamily: 'Georgia, serif' }}
          >
            &ldquo;{painSymmetry.theIrony}&rdquo;
          </p>
        </motion.div>

        {/* What neither saw */}
        <motion.div
          className="text-center max-w-lg mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: '#4a4a4a' }}
          >
            Czego żadne z was nie widziało
          </p>
          <p
            className="font-[family-name:var(--font-syne)] text-lg md:text-xl font-bold leading-relaxed"
            style={{
              color: '#d4a07a',
              textShadow: '0 2px 12px rgba(212,160,122,0.1)',
            }}
          >
            {painSymmetry.whatNeitherSaw}
          </p>
        </motion.div>
      </div>
    </Scene>
  );
}
