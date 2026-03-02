'use client';

import { useCallback } from 'react';

interface MethodologySidebarProps {
  items: Array<{
    id: string;
    title: string;
    accent: 'blue' | 'purple';
    sectionId: string;
  }>;
  activeId: string;
}

const ACCENT_COLORS = {
  blue: '#3b82f6',
  purple: '#a855f7',
} as const;

export default function MethodologySidebar({ items, activeId }: MethodologySidebarProps) {
  const handleClick = useCallback((sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const dividerIndex = items.findIndex(
    (item, idx) => idx > 0 && item.accent !== items[idx - 1].accent
  );

  const mathItems = items.filter((i) => i.accent === 'blue');
  const aiItems = items.filter((i) => i.accent === 'purple');

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 md:flex"
        aria-label="Nawigacja metodologii"
      >
        <div className="flex flex-col gap-0.5 rounded-xl border border-[#1a1a1a]/50 bg-[#111111]/80 p-1.5 backdrop-blur-sm">
          {/* MATH header */}
          <span className="px-2 pb-0.5 pt-1 font-mono text-[9px] font-bold uppercase tracking-widest text-[#3b82f6]/50">
            Math
          </span>

          {items.map((item, idx) => {
            const isActive = activeId === item.sectionId;
            const accentColor = ACCENT_COLORS[item.accent];

            return (
              <div key={item.id}>
                {/* AI header */}
                {idx === dividerIndex && (
                  <>
                    <div className="mx-1.5 my-1 border-t border-[#1a1a1a]" />
                    <span className="px-2 pb-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#a855f7]/50">
                      AI
                    </span>
                  </>
                )}

                <div className="group relative">
                  <button
                    onClick={() => handleClick(item.sectionId)}
                    className="flex h-7 w-full items-center rounded-lg px-2 text-left font-mono text-[11px] font-medium tracking-wide transition-all"
                    style={{
                      backgroundColor: isActive ? `${accentColor}1a` : 'transparent',
                      color: isActive ? accentColor : '#555555',
                      borderLeft: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                    }}
                    aria-label={item.title}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {item.title}
                  </button>

                  {/* Hover tooltip */}
                  <div className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="whitespace-nowrap rounded-md border border-[#1a1a1a] bg-[#111111] px-2.5 py-1 text-xs text-foreground shadow-lg">
                      {item.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom bar — two rows (Math + AI) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Nawigacja metodologii"
      >
        <div className="border-t border-[#1a1a1a]/50 bg-[#111111]/95 backdrop-blur-md">
          {/* Math row */}
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4"
              style={{ background: 'linear-gradient(to right, rgba(17,17,17,0.95), transparent)' }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4"
              style={{ background: 'linear-gradient(to left, rgba(17,17,17,0.95), transparent)' }}
            />
            <div className="flex overflow-x-auto px-1 scrollbar-none">
              {mathItems.map((item) => {
                const isActive = activeId === item.sectionId;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item.sectionId)}
                    className="shrink-0 whitespace-nowrap px-2.5 py-1.5 text-[11px] transition-colors"
                    style={{
                      color: isActive ? '#3b82f6' : '#555555',
                      fontWeight: isActive ? 600 : 400,
                    }}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thin divider */}
          <div className="mx-2 border-t border-[#1a1a1a]/40" />

          {/* AI row */}
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4"
              style={{ background: 'linear-gradient(to right, rgba(17,17,17,0.95), transparent)' }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4"
              style={{ background: 'linear-gradient(to left, rgba(17,17,17,0.95), transparent)' }}
            />
            <div className="flex overflow-x-auto px-1 scrollbar-none">
              {aiItems.map((item) => {
                const isActive = activeId === item.sectionId;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item.sectionId)}
                    className="shrink-0 whitespace-nowrap px-2.5 py-1.5 text-[11px] transition-colors"
                    style={{
                      color: isActive ? '#a855f7' : '#555555',
                      fontWeight: isActive ? 600 : 400,
                    }}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
