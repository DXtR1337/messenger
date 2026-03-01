'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EksEntryGateProps {
  onProceed: () => void;
  onGoBack: () => void;
}

export default function EksEntryGate({ onProceed, onGoBack }: EksEntryGateProps) {
  const [showWarning, setShowWarning] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!showWarning ? (
        <motion.div
          key="gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
        >
          <p className="text-sm uppercase tracking-[0.2em] mb-8" style={{ color: '#6b3a3a' }}>
            zanim zaczniemy
          </p>

          <h2 className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold mb-4" style={{ color: '#dc2626' }}>
            Czy jesteś gotowy/a?
          </h2>

          <p className="text-base md:text-lg mb-12 max-w-md leading-relaxed" style={{ color: '#d4a07a' }}>
            Czy minęło więcej niż 2 tygodnie od rozstania?
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onProceed}
              className="px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(153,27,27,0.2)',
                border: '1px solid #991b1b',
                color: '#dc2626',
              }}
            >
              Tak, jestem gotowy/a
            </button>
            <button
              onClick={() => setShowWarning(true)}
              className="px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(42,16,16,0.5)',
                border: '1px solid #2a1010',
                color: '#6b3a3a',
              }}
            >
              Nie, to świeże
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="warning"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
        >
          <p className="text-base md:text-lg mb-6 max-w-lg leading-relaxed" style={{ color: '#d4a07a' }}>
            To normalne, że chcesz zrozumieć co się stało.
          </p>
          <p className="text-base md:text-lg mb-6 max-w-lg leading-relaxed" style={{ color: '#d4a07a' }}>
            Ale świeżo po rozstaniu wyniki mogą uderzyć mocniej niż oczekujesz.
          </p>
          <p className="text-sm mb-12 max-w-lg" style={{ color: '#6b3a3a' }}>
            Wróć kiedy będziesz gotowy/a. Dane nigdzie nie uciekną.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onProceed}
              className="px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(42,16,16,0.5)',
                border: '1px solid #2a1010',
                color: '#6b3a3a',
              }}
            >
              Wchodzę mimo wszystko
            </button>
            <button
              onClick={onGoBack}
              className="px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(153,27,27,0.2)',
                border: '1px solid #991b1b',
                color: '#dc2626',
              }}
            >
              Wracam później
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
