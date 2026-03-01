'use client';

import { motion } from 'framer-motion';
import { SCENE_THEMES } from './scene-themes';

interface SceneIndicatorProps {
  activeIndex: number;
  totalScenes: number;
  onNavigate: (index: number) => void;
}

/**
 * Scene indicator — desktop: right-side dots with tooltips, mobile: compact bottom bar.
 */
export function SceneIndicator({ activeIndex, totalScenes, onNavigate }: SceneIndicatorProps) {
  const scenes = SCENE_THEMES.slice(0, totalScenes);

  return (
    <>
      {/* Desktop — right sidebar dots */}
      <motion.nav
        className="fixed right-3 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        aria-label="Nawigacja scen"
      >
        {scenes.map((theme, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={theme.id}
              onClick={() => onNavigate(i)}
              className="group relative flex items-center justify-center"
              aria-label={theme.label}
              aria-current={isActive ? 'step' : undefined}
            >
              {/* Tooltip — shown on hover */}
              <span
                className="absolute right-6 whitespace-nowrap rounded px-2 py-1 font-mono text-[9px] uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none"
                style={{
                  background: 'rgba(10,4,4,0.9)',
                  border: '1px solid rgba(153,27,27,0.2)',
                  color: theme.accent,
                }}
              >
                {theme.label}
              </span>

              {/* Dot */}
              <motion.div
                className="rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 8 : 4,
                  height: isActive ? 8 : 4,
                  background: isActive ? theme.accent : 'rgba(107,58,58,0.3)',
                  boxShadow: isActive ? `0 0 8px ${theme.glow}` : 'none',
                }}
                animate={{
                  scale: isActive ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: isActive ? Infinity : 0,
                  ease: 'easeInOut',
                }}
              />
            </button>
          );
        })}
      </motion.nav>

      {/* Mobile — compact bottom progress bar */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-center py-0.5 px-1"
        style={{
          background: 'linear-gradient(to top, rgba(10,4,4,0.95) 60%, transparent)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.2 }}
        aria-label="Nawigacja scen"
      >
        {scenes.map((theme, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={theme.id}
              onClick={() => onNavigate(i)}
              aria-label={theme.label}
              aria-current={isActive ? 'step' : undefined}
              className="flex items-center justify-center"
              style={{ minWidth: 20, minHeight: 44 }}
            >
              <span
                className="block rounded-full transition-all duration-200"
                style={{
                  width: isActive ? 16 : 6,
                  height: 4,
                  background: isActive ? theme.accent : 'rgba(107,58,58,0.3)',
                }}
              />
            </button>
          );
        })}
        <span className="ml-2 font-mono text-[8px] tabular-nums" style={{ color: '#6b3a3a' }}>
          {activeIndex + 1}/{totalScenes}
        </span>
      </motion.div>
    </>
  );
}
