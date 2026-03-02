'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, BookOpen, Beaker, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { Source } from './methodology-data';
import LimitationBox from './LimitationBox';

interface AlgorithmCardProps {
  id: string;
  title: string;
  teaser: string;
  description: string;
  howItWorks: string;
  sources: Source[];
  limitations: string[];
  iconPath: string;
  accent: 'blue' | 'purple';
  isOpen: boolean;
  onToggle: () => void;
}

const ACCENT = {
  blue: '#3b82f6',
  purple: '#a855f7',
} as const;

export default function AlgorithmCard({
  title,
  teaser,
  description,
  howItWorks,
  sources,
  limitations,
  iconPath,
  accent,
  isOpen,
  onToggle,
}: AlgorithmCardProps) {
  const [iconError, setIconError] = useState(false);
  const accentColor = ACCENT[accent];

  const handleIconError = useCallback(() => {
    setIconError(true);
  }, []);

  return (
    <div
      className="group relative cursor-pointer rounded-xl transition-colors duration-200"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        background: '#111111',
        borderLeft: `2px solid ${isOpen ? accentColor : 'transparent'}`,
        borderTop: '1px solid #1a1a1a',
        borderRight: '1px solid #1a1a1a',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      {/* Collapsed header — always visible */}
      <div className="flex items-start gap-4 p-5">
        {/* Icon */}
        <div className="shrink-0">
          {iconError ? (
            <div
              className="flex size-10 items-center justify-center rounded-lg"
              style={{ background: `${accentColor}1a` }}
            >
              {accent === 'blue' ? (
                <Beaker className="size-5" style={{ color: accentColor }} />
              ) : (
                <Sparkles className="size-5" style={{ color: accentColor }} />
              )}
            </div>
          ) : (
            <Image
              src={iconPath}
              alt=""
              width={40}
              height={40}
              className="rounded-lg"
              onError={handleIconError}
            />
          )}
        </div>

        {/* Title + teaser */}
        <div className="min-w-0 flex-1">
          <h3 className="font-[family-name:var(--font-story-display)] text-base font-semibold text-foreground">
            {title}
          </h3>
          <p className="mt-1 font-[family-name:var(--font-story-body)] text-sm leading-relaxed text-muted-foreground">
            {teaser}
          </p>
        </div>

        {/* Right side: source count + chevron */}
        <div className="flex shrink-0 items-center gap-3 pt-0.5">
          {sources.length > 0 && (
            <span
              className="hidden font-mono text-xs sm:inline"
              style={{ color: `${accentColor}99` }}
            >
              {sources.length} {sources.length === 1 ? 'źródło' : sources.length < 5 ? 'źródła' : 'źródeł'}
            </span>
          )}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDown
              className="size-4"
              style={{ color: isOpen ? accentColor : '#555555' }}
            />
          </motion.div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {/* Divider */}
              <div className="mb-5 h-px bg-[#1a1a1a]" />

              {/* Full description */}
              <p className="mb-5 font-[family-name:var(--font-story-body)] text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>

              {/* How it works */}
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="size-3.5" style={{ color: accentColor }} />
                  <span
                    className="font-mono text-xs font-medium uppercase tracking-wider"
                    style={{ color: accentColor }}
                  >
                    Jak to liczymy
                  </span>
                </div>
                <p className="font-[family-name:var(--font-story-body)] text-sm leading-relaxed text-muted-foreground">
                  {howItWorks}
                </p>
              </div>

              {/* Sources */}
              {sources.length > 0 && (
                <div className="mb-5">
                  <span className="mb-2.5 block font-mono text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Źródła naukowe
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((source, idx) => (
                      <SourceBadge key={idx} source={source} accent={accent} />
                    ))}
                  </div>
                </div>
              )}

              {/* Limitations */}
              {limitations.length > 0 && (
                <LimitationBox items={limitations} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SourceBadge({ source, accent }: { source: Source; accent: 'blue' | 'purple' }) {
  const accentColor = ACCENT[accent];
  const label = `${source.author}, ${source.year}`;
  const href = source.doi
    ? `https://doi.org/${source.doi}`
    : source.url;

  const baseClass =
    'inline-flex items-center rounded-md px-2.5 py-1 font-mono text-xs transition-colors';

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={baseClass}
        style={{
          background: `${accentColor}12`,
          color: accentColor,
          border: `1px solid ${accentColor}30`,
        }}
      >
        {label}
      </a>
    );
  }

  return (
    <span
      className={baseClass}
      style={{
        background: 'rgba(255,255,255,0.03)',
        color: '#888888',
        border: '1px solid #1a1a1a',
      }}
    >
      {label}
    </span>
  );
}
