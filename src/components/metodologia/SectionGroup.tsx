'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface SectionGroupProps {
  id: string;
  title: string;
  accent: 'blue' | 'purple';
  algorithmCount: number;
  /** Comma-separated first 3 algorithm titles, shown when collapsed */
  preview: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const ACCENT_COLORS = {
  blue: '#3b82f6',
  purple: '#a855f7',
} as const;

export default function SectionGroup({
  id,
  title,
  accent,
  algorithmCount,
  preview,
  isOpen,
  onToggle,
  children,
}: SectionGroupProps) {
  const accentColor = ACCENT_COLORS[accent];

  return (
    <section id={id} className="mb-8">
      {/* Group heading — clickable to toggle */}
      <button
        onClick={onToggle}
        className="group flex w-full items-start gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-[#111111]"
        aria-expanded={isOpen}
        aria-controls={`group-content-${id}`}
      >
        {/* Chevron with rotation */}
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-0.5 shrink-0"
        >
          <ChevronRight
            className="size-4"
            style={{ color: isOpen ? accentColor : '#555555' }}
          />
        </motion.div>

        {/* Accent dot */}
        <div
          className="mt-2 size-2 shrink-0 rounded-full"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 6px ${accentColor}50`,
          }}
        />

        {/* Title + count + preview */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h3 className="font-[family-name:var(--font-story-display)] text-xl font-bold text-foreground">
              {title}
            </h3>
            <span
              className="font-mono text-xs"
              style={{ color: `${accentColor}99` }}
            >
              {algorithmCount}
            </span>
          </div>

          {/* Preview — only when collapsed */}
          {!isOpen && preview && (
            <p className="mt-1 truncate font-[family-name:var(--font-story-body)] text-xs text-[#555555]">
              {preview}
            </p>
          )}
        </div>
      </button>

      {/* Collapsible cards container */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`group-content-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pb-4 pl-4 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
