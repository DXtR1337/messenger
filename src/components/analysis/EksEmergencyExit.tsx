'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface EksEmergencyExitProps {
  analysisId: string;
}

export default function EksEmergencyExit({ analysisId }: EksEmergencyExitProps) {
  const [showExit, setShowExit] = useState(false);

  return (
    <>
      {/* Floating exit button */}
      <button
        onClick={() => setShowExit(true)}
        className="eks-emergency-exit"
        aria-label="Przerwij analizę"
      >
        Chcę przerwać
      </button>

      {/* Warm exit overlay */}
      <AnimatePresence>
        {showExit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            style={{ background: 'rgba(5,0,0,0.95)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="max-w-md text-center"
            >
              <p className="text-xl md:text-2xl font-[family-name:var(--font-syne)] font-bold mb-6" style={{ color: '#d4a07a' }}>
                Nie musisz widzieć wszystkiego.
              </p>

              <p className="text-base mb-4 leading-relaxed" style={{ color: '#6b3a3a' }}>
                To, że odważyłeś/aś się zajrzeć — już jest dużo.
              </p>
              <p className="text-base mb-8 leading-relaxed" style={{ color: '#6b3a3a' }}>
                Reszta analizy czeka, gdybyś kiedyś chciał/a wrócić.
              </p>

              <p className="text-sm mb-2" style={{ color: '#4a4a4a' }}>
                Dbaj o siebie.
              </p>
              <p className="text-sm mb-10" style={{ color: '#4a4a4a' }}>
                Telefon Zaufania:{' '}
                <a href="tel:116123" className="underline" style={{ color: '#6b3a3a' }}>
                  116 123
                </a>{' '}
                (bezpłatny, całodobowy)
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={`/analysis/${analysisId}`}
                  className="px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02] inline-block"
                  style={{
                    background: 'rgba(153,27,27,0.2)',
                    border: '1px solid #991b1b',
                    color: '#dc2626',
                  }}
                >
                  Wróć do Centrum Dowodzenia
                </Link>
                <button
                  onClick={() => setShowExit(false)}
                  className="px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(42,16,16,0.5)',
                    border: '1px solid #2a1010',
                    color: '#6b3a3a',
                  }}
                >
                  Kontynuuj
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
