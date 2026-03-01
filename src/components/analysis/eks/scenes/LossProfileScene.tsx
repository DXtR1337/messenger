'use client';

import { motion } from 'framer-motion';
import { Scene, EKGDivider } from '@/components/analysis/eks/shared';
import type { EksLossProfile } from '@/lib/analysis/eks-prompts';

interface LossProfileSceneProps {
  lossProfiles: EksLossProfile[];
}

export default function LossProfileScene({ lossProfiles }: LossProfileSceneProps) {
  return (
    <>
      <Scene id="eks-loss-profiles">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
            style={{ color: '#6b3a3a' }}
          >
            bilans
          </p>
          <h3
            className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-10"
            style={{ color: '#dc2626' }}
          >
            PROFIL STRATY
          </h3>

          {Array.isArray(lossProfiles) && lossProfiles.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {lossProfiles.map((profile: EksLossProfile, i: number) => (
                <motion.div
                  key={i}
                  className="rounded-xl p-5 md:p-6"
                  style={{
                    background: '#1a0808',
                    border: '1px solid #2a1010',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                >
                  <h4
                    className="font-[family-name:var(--font-syne)] text-lg font-bold mb-4"
                    style={{ color: '#dc2626' }}
                  >
                    {profile.name}
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <p
                        className="font-mono text-[10px] uppercase tracking-widest mb-1"
                        style={{ color: '#991b1b' }}
                      >
                        Co stracił/a
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: '#d4a07a' }}>
                        {profile.whatTheyLost}
                      </p>
                    </div>

                    <div>
                      <p
                        className="font-mono text-[10px] uppercase tracking-widest mb-1"
                        style={{ color: '#10b981' }}
                      >
                        Co zyskał/a
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: '#d4a07a' }}>
                        {profile.whatTheyGained}
                      </p>
                    </div>

                    <div>
                      <p
                        className="font-mono text-[10px] uppercase tracking-widest mb-1"
                        style={{ color: '#f59e0b' }}
                      >
                        Wzorzec do obserwacji
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: '#6b3a3a' }}>
                        {profile.patternToWatch}
                      </p>
                    </div>

                    <div>
                      <p
                        className="font-mono text-[10px] uppercase tracking-widest mb-1"
                        style={{ color: '#4a4a4a' }}
                      >
                        Czas gojenia
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: '#6b3a3a' }}>
                        {profile.healingTimeline}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Scene>
      <EKGDivider />
    </>
  );
}
