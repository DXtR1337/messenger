'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';
import { Scene } from '@/components/analysis/eks/shared';

const DeathLineSVG = dynamic(() => import('@/components/analysis/eks/DeathLineSVG'), {
  ssr: false,
  loading: () => <div className="w-full h-64 rounded-xl animate-pulse" style={{ background: 'rgba(42,16,16,0.3)' }} />,
});

const TiltCard = dynamic(
  () => import('@/components/shared/TiltCard'),
  { ssr: false },
);

interface DeathLineDataPoint {
  month: string;
  intimacy: number;
  sentiment: number;
  responseTime: number;
  redZone: number;
}

export default function DeathLineScene({
  deathLineData,
  emotionalTimeline,
}: {
  deathLineData: DeathLineDataPoint[];
  emotionalTimeline?: Array<{ month: string; keyEvent?: string }>;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeFullscreen(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, closeFullscreen]);

  return (
    <Scene id="eks-death-line">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#6b3a3a' }}
        >
          chronologia
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-8"
          style={{ color: '#dc2626' }}
        >
          LINIA ŚMIERCI
        </h3>

        {deathLineData.length > 0 ? (
          <>
            <TiltCard maxTilt={8} glareColor="rgba(220,38,38,0.06)">
              <div
                className="eks-specimen-card eks-scroll-fade-in rounded-xl p-4 md:p-6 relative group cursor-pointer"
                style={{
                  background: '#0a0404',
                  border: '1px solid #2a1010',
                }}
                onClick={() => setIsFullscreen(true)}
              >
                <DeathLineSVG
                  data={deathLineData}
                  emotionalTimeline={emotionalTimeline}
                />

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs" style={{ color: '#6b3a3a' }}>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 rounded" style={{ background: '#ec4899' }} />
                    Intymność
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 rounded" style={{ background: '#f59e0b' }} />
                    Sentyment
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 rounded" style={{ background: '#3b82f6' }} />
                    Czas odpowiedzi (odwrócony)
                  </span>
                </div>

                {/* Zoom hint overlay */}
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(0,0,0,0.4)' }}
                >
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(153,27,27,0.8)', border: '1px solid #dc2626' }}>
                    <Maximize2 className="size-4" style={{ color: '#fca5a5' }} />
                    <span className="font-mono text-xs uppercase tracking-wider" style={{ color: '#fca5a5' }}>
                      Powiększ
                    </span>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Fullscreen modal */}
            <AnimatePresence>
              {isFullscreen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[9999] flex flex-col"
                  style={{ background: 'rgba(5,2,2,0.97)' }}
                  onClick={closeFullscreen}
                >
                  {/* Close button */}
                  <div className="flex justify-end p-4">
                    <button
                      onClick={closeFullscreen}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-[#2a1010]"
                      style={{ border: '1px solid #2a1010', color: '#6b3a3a' }}
                    >
                      <X className="size-4" />
                      <span className="font-mono text-xs uppercase tracking-wider">Zamknij</span>
                    </button>
                  </div>

                  {/* Chart at full width */}
                  <div
                    className="flex-1 flex flex-col justify-center px-4 md:px-8 pb-8 overflow-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="w-full max-w-7xl mx-auto rounded-xl p-4 md:p-8"
                      style={{
                        background: '#0a0404',
                        border: '1px solid #2a1010',
                      }}
                    >
                      <h4
                        className="font-[family-name:var(--font-syne)] text-lg md:text-xl font-bold tracking-tight text-center mb-4"
                        style={{ color: '#dc2626' }}
                      >
                        LINIA ŚMIERCI
                      </h4>

                      <DeathLineSVG
                        data={deathLineData}
                        emotionalTimeline={emotionalTimeline}
                      />

                      {/* Legend */}
                      <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm" style={{ color: '#94a3b8' }}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-0.5 rounded" style={{ background: '#ec4899' }} />
                          Intymność
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-0.5 rounded" style={{ background: '#f59e0b' }} />
                          Sentyment
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-0.5 rounded" style={{ background: '#3b82f6' }} />
                          Czas odpowiedzi (odwrócony)
                        </span>
                      </div>
                    </div>

                    <p className="text-center mt-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: '#4a3030' }}>
                      Kliknij poza wykresem lub naciśnij Esc aby zamknąć
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div
            className="rounded-xl p-8 text-center text-sm"
            style={{
              background: '#1a0808',
              border: '1px solid #2a1010',
              color: '#4a4a4a',
            }}
          >
            Brak wystarczających danych do wygenerowania linii śmierci.
          </div>
        )}
      </div>
    </Scene>
  );
}
