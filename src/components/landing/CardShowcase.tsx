'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderDemoCard } from './demo-card-data';

interface CardTile {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  accent: string;
}

const ALL_CARDS: CardTile[] = [
  // V2 anti-slop
  { id: 'receipt', emoji: '🧾', title: 'Paragon', desc: 'Rachunek za toksyczność', accent: '#faf7f2' },
  { id: 'versus-v2', emoji: '⚡', title: 'Versus V2', desc: 'Tablica wyników', accent: '#6d9fff' },
  { id: 'redflag', emoji: '🚩', title: 'Czerwona Flaga', desc: 'Raport niejawny', accent: '#dc2626' },
  { id: 'ghost-forecast', emoji: '👻', title: 'Prognoza', desc: 'Pogoda relacji', accent: '#10b981' },
  { id: 'compatibility-v2', emoji: '💕', title: 'Match', desc: 'Zodiakalny krąg', accent: '#f472b6' },
  { id: 'label', emoji: '🏷️', title: 'Etykietka', desc: 'Identyfikator', accent: '#a78bfa' },
  { id: 'passport', emoji: '🛂', title: 'Paszport', desc: 'Paszport osobowości', accent: '#fbbf24' },
  // Klasyczne (redesigned)
  { id: 'stats', emoji: '✈️', title: 'Czarna Skrzynka', desc: 'Raport z lotu', accent: '#ff8c00' },
  { id: 'versus', emoji: '⚖️', title: 'Akt Oskarżenia', desc: 'Dokument prawny', accent: '#8b0000' },
  { id: 'health', emoji: '🏥', title: 'Karta Pacjenta', desc: 'Wyniki labo', accent: '#0066cc' },
  { id: 'flags', emoji: '🔍', title: 'Tablica Śledczego', desc: 'Dowody na korku', accent: '#c4956a' },
  { id: 'personality', emoji: '🔮', title: 'Karta Tarota', desc: 'Mistyczny archetyp', accent: '#d4a847' },
  { id: 'scores', emoji: '🎰', title: 'Zdrapka', desc: 'Sprawdź wyniki', accent: '#15803d' },
  { id: 'badges', emoji: '🎖️', title: 'Medale Zasługi', desc: 'Na aksamicie', accent: '#cd7f32' },
  { id: 'mbti', emoji: '🎫', title: 'Bilet Lotniczy', desc: 'Osobowość = cel', accent: '#0055a4' },
  { id: 'cps', emoji: '🩻', title: 'Rentgen', desc: 'Skan komunikacji', accent: '#00d4ff' },
  // Rozrywka
  { id: 'subtext', emoji: '📡', title: 'Depesza', desc: 'Przechwycona tajemna', accent: '#d4a017' },
  { id: 'delusion', emoji: '📊', title: 'Wariograf', desc: 'Test kłamstw', accent: '#dc2626' },
  { id: 'couple-quiz', emoji: '🏆', title: 'Teleturniej', desc: 'Finał quizu', accent: '#ffd700' },
  { id: 'mugshot', emoji: '🚔', title: 'Kartoteka', desc: 'Akta policyjne', accent: '#1e3a5f' },
  { id: 'dating-profile', emoji: '📰', title: 'Ogłoszenie', desc: 'Matrymonialka', accent: '#1a1a1a' },
  { id: 'simulator', emoji: '🔮', title: 'Wyrocznia', desc: 'Kula przepowiedni', accent: '#7c3aed' },
];

function MarqueeCard({ card }: { card: CardTile }) {
  const [hovered, setHovered] = useState(false);

  const preview = useMemo(() => {
    if (!hovered) return null;
    return renderDemoCard(card.id);
  }, [hovered, card.id]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ flexShrink: 0 }}
    >
      <div
        className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-border-hover hover:scale-[1.02]"
        style={{ width: 140 }}
      >
        <div
          className="flex size-12 items-center justify-center rounded-lg text-xl"
          style={{ background: `${card.accent}15`, border: `1px solid ${card.accent}30` }}
        >
          {card.emoji}
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-foreground">{card.title}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{card.desc}</div>
        </div>
        <div style={{ width: '60%', height: 2, borderRadius: 1, background: card.accent, opacity: 0.4 }} />
      </div>

      {/* Real card preview on hover */}
      <AnimatePresence>
        {hovered && preview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 6 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full left-1/2 z-50 mb-4 hidden -translate-x-1/2 sm:block"
            style={{ pointerEvents: 'none' }}
          >
            {/* Scaled-down real card: 360×640 → 180×320 via scale(0.5) */}
            <div
              style={{
                width: 180,
                height: 320,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div
                style={{
                  width: 360,
                  height: 640,
                  transform: 'scale(0.5)',
                  transformOrigin: 'top left',
                }}
              >
                {preview}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CardShowcase({ inView, paused, onPause }: {
  inView: boolean;
  paused: boolean;
  onPause: (paused: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      <h3 className="mb-2 text-center font-mono text-lg font-bold text-foreground">
        Karty do pobrania
      </h3>
      <p className="mb-8 text-center font-mono text-xs text-muted-foreground">
        22 unikalne formaty — od paragonu po paszport osobowości
      </p>

      {/* Marquee container */}
      <div
        className="relative"
        style={{ overflowX: 'clip' } as Record<string, string>}
        onMouseEnter={() => onPause(true)}
        onMouseLeave={() => onPause(false)}
      >
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-16 bg-gradient-to-r from-[#111111] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-16 bg-gradient-to-l from-[#111111] to-transparent" />

        {/* Scrolling track */}
        <div
          className={`marquee-track flex gap-4 pb-4${paused ? ' paused' : ''}`}
          style={{ width: 'max-content' }}
        >
          {ALL_CARDS.map((card, i) => (
            <MarqueeCard key={`a-${i}`} card={card} />
          ))}
          {ALL_CARDS.map((card, i) => (
            <MarqueeCard key={`b-${i}`} card={card} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
