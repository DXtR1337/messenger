'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { renderDemoCard } from './demo-card-data';

interface CardTile {
  id: string;
  emoji: string;
  icon?: string;
  title: string;
  desc: string;
  accent: string;
}

const ALL_CARDS: CardTile[] = [
  // V2 anti-slop
  { id: 'receipt', emoji: '🧾', icon: '/icons/cards/card-receipt.png', title: 'Paragon', desc: 'Rachunek za toksyczność', accent: '#faf7f2' },
  { id: 'versus-v2', emoji: '⚡', icon: '/icons/cards/card-versus-v2.png', title: 'Versus V2', desc: 'Tablica wyników', accent: '#6d9fff' },
  { id: 'redflag', emoji: '🚩', icon: '/icons/cards/card-redflag.png', title: 'Czerwona Flaga', desc: 'Raport niejawny', accent: '#dc2626' },
  { id: 'ghost-forecast', emoji: '👻', icon: '/icons/cards/card-ghost-forecast.png', title: 'Prognoza', desc: 'Pogoda relacji', accent: '#10b981' },
  { id: 'compatibility-v2', emoji: '💕', icon: '/icons/cards/card-compatibility-v2.png', title: 'Match', desc: 'Zodiakalny krąg', accent: '#f472b6' },
  { id: 'label', emoji: '🏷️', icon: '/icons/cards/card-label.png', title: 'Etykietka', desc: 'Identyfikator', accent: '#a78bfa' },
  { id: 'passport', emoji: '🛂', icon: '/icons/cards/card-passport.png', title: 'Paszport', desc: 'Paszport osobowości', accent: '#fbbf24' },
  // Klasyczne (redesigned)
  { id: 'stats', emoji: '✈️', icon: '/icons/cards/card-stats.png', title: 'Czarna Skrzynka', desc: 'Raport z lotu', accent: '#ff8c00' },
  { id: 'versus', emoji: '⚖️', icon: '/icons/cards/card-versus.png', title: 'Akt Oskarżenia', desc: 'Dokument prawny', accent: '#8b0000' },
  { id: 'health', emoji: '🏥', icon: '/icons/cards/card-health.png', title: 'Karta Pacjenta', desc: 'Wyniki labo', accent: '#0066cc' },
  { id: 'flags', emoji: '🔍', icon: '/icons/cards/card-flags.png', title: 'Tablica Śledczego', desc: 'Dowody na korku', accent: '#c4956a' },
  { id: 'personality', emoji: '🔮', icon: '/icons/cards/card-personality.png', title: 'Karta Tarota', desc: 'Mistyczny archetyp', accent: '#d4a847' },
  { id: 'scores', emoji: '🎰', icon: '/icons/cards/card-scores.png', title: 'Zdrapka', desc: 'Sprawdź wyniki', accent: '#15803d' },
  { id: 'badges', emoji: '🎖️', icon: '/icons/cards/card-badges.png', title: 'Medale Zasługi', desc: 'Na aksamicie', accent: '#cd7f32' },
  { id: 'mbti', emoji: '🎫', icon: '/icons/cards/card-mbti.png', title: 'Bilet Lotniczy', desc: 'Osobowość = cel', accent: '#0055a4' },
  { id: 'cps', emoji: '🩻', icon: '/icons/cards/card-cps.png', title: 'Rentgen', desc: 'Skan komunikacji', accent: '#00d4ff' },
  // Rozrywka
  { id: 'subtext', emoji: '📡', icon: '/icons/cards/card-subtext.png', title: 'Depesza', desc: 'Przechwycona tajemna', accent: '#d4a017' },
  { id: 'delusion', emoji: '📊', icon: '/icons/cards/card-delusion.png', title: 'Wariograf', desc: 'Test kłamstw', accent: '#dc2626' },
  { id: 'couple-quiz', emoji: '🏆', icon: '/icons/cards/card-couple-quiz.png', title: 'Teleturniej', desc: 'Finał quizu', accent: '#ffd700' },
  { id: 'mugshot', emoji: '🚔', icon: '/icons/cards/card-mugshot.png', title: 'Kartoteka', desc: 'Akta policyjne', accent: '#1e3a5f' },
  { id: 'dating-profile', emoji: '📰', icon: '/icons/cards/card-dating-profile.png', title: 'Ogłoszenie', desc: 'Matrymonialka', accent: '#1a1a1a' },
  { id: 'simulator', emoji: '🔮', icon: '/icons/cards/card-simulator.png', title: 'Wyrocznia', desc: 'Kula przepowiedni', accent: '#7c3aed' },
];

function MarqueeCard({ card, onOpen }: { card: CardTile; onOpen: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);

  const preview = useMemo(() => {
    if (!hovered) return null;
    return renderDemoCard(card.id);
  }, [hovered, card.id]);

  return (
    <div
      className="relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(card.id)}
      style={{ flexShrink: 0 }}
    >
      <div
        className="flex h-[156px] flex-col items-center justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-border-hover hover:scale-[1.02]"
        style={{ width: 140 }}
      >
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${card.accent}15`, border: `1px solid ${card.accent}30` }}
        >
          {card.icon ? (
            <Image src={card.icon} alt={card.title} width={128} height={128} className="size-10" unoptimized />
          ) : (
            <span className="text-xl">{card.emoji}</span>
          )}
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-foreground">{card.title}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{card.desc}</div>
        </div>
        <div className="shrink-0" style={{ width: '60%', height: 2, borderRadius: 1, background: card.accent, opacity: 0.4 }} />
      </div>

      {/* Real card preview on hover (desktop only) */}
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
  const [openCardIdx, setOpenCardIdx] = useState<number | null>(null);
  const total = ALL_CARDS.length;

  const openCard = useCallback((id: string) => {
    const idx = ALL_CARDS.findIndex((c) => c.id === id);
    if (idx !== -1) setOpenCardIdx(idx);
  }, []);

  const goPrev = useCallback(() => setOpenCardIdx((p) => p !== null ? ((p - 1) + total) % total : null), [total]);
  const goNext = useCallback(() => setOpenCardIdx((p) => p !== null ? (p + 1) % total : null), [total]);

  // Body scroll lock
  useEffect(() => {
    if (openCardIdx === null) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [openCardIdx]);

  // Keyboard: Escape, arrows
  useEffect(() => {
    if (openCardIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCardIdx(null);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCardIdx, goPrev, goNext]);

  const activeCard = openCardIdx !== null ? ALL_CARDS[openCardIdx] : null;

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
        23 unikalne formaty — od paragonu po paszport osobowości
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
            <MarqueeCard key={`a-${i}`} card={card} onOpen={openCard} />
          ))}
          {ALL_CARDS.map((card, i) => (
            <MarqueeCard key={`b-${i}`} card={card} onOpen={openCard} />
          ))}
        </div>
      </div>

      {/* Fullscreen card preview overlay */}
      {activeCard && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            key="card-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/95"
            onClick={(e) => { if (e.target === e.currentTarget) setOpenCardIdx(null); }}
          >
            {/* Close button */}
            <button
              onClick={() => setOpenCardIdx(null)}
              className="fixed top-4 right-4 z-[60] flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
              aria-label="Zamknij"
            >
              <X className="size-5" />
            </button>

            {/* Desktop: side arrows */}
            <button
              onClick={goPrev}
              className="fixed left-3 top-1/2 z-[60] hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-card-hover hover:text-foreground md:flex md:size-10"
              aria-label="Poprzednia karta"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={goNext}
              className="fixed right-3 top-1/2 z-[60] hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-card-hover hover:text-foreground md:flex md:size-10"
              aria-label="Następna karta"
            >
              <ChevronRight className="size-5" />
            </button>

            {/* Card title + counter */}
            <div className="sticky top-0 z-[55] flex items-center justify-center gap-3 py-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 60%, transparent)' }}>
              <span className="font-mono text-[10px] text-muted-foreground">{openCardIdx! + 1}/{total}</span>
              {activeCard.icon ? (
                <Image src={activeCard.icon} alt="" width={64} height={64} className="size-6" unoptimized />
              ) : (
                <span className="text-base">{activeCard.emoji}</span>
              )}
              <span className="font-mono text-xs font-bold text-foreground">{activeCard.title}</span>
            </div>

            {/* Card content — swipeable */}
            <motion.div
              key={activeCard.id}
              className="flex justify-center px-1 pb-16 md:px-16"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) goNext();
                else if (info.offset.x > 60) goPrev();
              }}
              onClick={(e) => { if (e.target === e.currentTarget) setOpenCardIdx(null); }}
            >
              <div className="w-full md:w-auto" style={{ minWidth: 'min(396px, 100%)' }}>
                {renderDemoCard(activeCard.id)}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </motion.div>
  );
}
