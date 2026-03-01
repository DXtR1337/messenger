'use client';

import { motion } from 'framer-motion';
import { Scene, EKGDivider } from '@/components/analysis/eks/shared';
import type { EksResult } from '@/lib/analysis/eks-prompts';

interface DeathCertificateSceneProps {
  deathCertificate: NonNullable<EksResult['deathCertificate']>;
}

export default function DeathCertificateScene({ deathCertificate }: DeathCertificateSceneProps) {
  return (
    <>
      <Scene id="eks-death-certificate">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
            style={{ color: '#78716c' }}
          >
            dokument urzędowy
          </p>
          <h3
            className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-10"
            style={{ color: '#d6d3d1' }}
          >
            FORMALNY AKT ZGONU
          </h3>

          <motion.div
            className="rounded-xl p-6 md:p-8 max-w-xl mx-auto"
            style={{
              background: 'linear-gradient(170deg, rgba(28,25,23,0.8) 0%, rgba(12,10,9,0.9) 100%)',
              border: '1px solid rgba(168, 162, 158, 0.15)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Certificate rows */}
            <div className="space-y-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#78716c' }}>
                  Nr sprawy
                </p>
                <p className="font-mono text-sm" style={{ color: '#d6d3d1' }}>
                  {deathCertificate.caseNumber}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#78716c' }}>
                    Data narodzin
                  </p>
                  <p className="font-mono text-sm" style={{ color: '#d6d3d1' }}>
                    {deathCertificate.dateOfBirth}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#78716c' }}>
                    Data zgonu
                  </p>
                  <p className="font-mono text-sm" style={{ color: '#d6d3d1' }}>
                    {deathCertificate.dateOfDeath}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#78716c' }}>
                  Miejsce zgonu
                </p>
                <p className="text-sm italic" style={{ color: '#a8a29e' }}>
                  {deathCertificate.placeOfDeath}
                </p>
              </div>

              {/* Manner of death — hero element */}
              <div className="text-center py-4" style={{ borderTop: '1px solid rgba(168,162,158,0.1)', borderBottom: '1px solid rgba(168,162,158,0.1)' }}>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: '#78716c' }}>
                  Sposób zgonu
                </p>
                <motion.p
                  className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-extrabold uppercase tracking-wider"
                  style={{
                    color: deathCertificate.mannerOfDeath === 'homicide' ? '#dc2626'
                      : deathCertificate.mannerOfDeath === 'suicide' ? '#991b1b'
                      : deathCertificate.mannerOfDeath === 'accident' ? '#b45309'
                      : deathCertificate.mannerOfDeath === 'natural' ? '#8b7355'
                      : '#6b7280',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, type: 'spring' }}
                >
                  {deathCertificate.mannerOfDeath === 'natural' ? 'ŚMIERĆ NATURALNA'
                    : deathCertificate.mannerOfDeath === 'accident' ? 'WYPADEK'
                    : deathCertificate.mannerOfDeath === 'homicide' ? 'ZABÓJSTWO'
                    : deathCertificate.mannerOfDeath === 'suicide' ? 'SAMOBÓJSTWO'
                    : 'NIEOKREŚLONA'}
                </motion.p>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#78716c' }}>
                  Lekarz prowadzący
                </p>
                <p className="text-sm italic" style={{ color: '#a8a29e' }}>
                  {deathCertificate.attendingPhysician}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Scene>
      <EKGDivider />
    </>
  );
}
