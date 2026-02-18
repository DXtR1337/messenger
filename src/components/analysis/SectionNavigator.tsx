'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'section-metrics', label: 'Metryki', icon: '▦' },
  { id: 'section-activity', label: 'Aktywność', icon: '◔' },
  { id: 'section-communication', label: 'Komunikacja', icon: '◈' },
  { id: 'section-viral', label: 'Viral', icon: '◉' },
  { id: 'section-share', label: 'Udostępnij', icon: '⬡' },
  { id: 'section-ai', label: 'AI', icon: '◎' },
];

export default function SectionNavigator() {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        { rootMargin: '-20% 0px -60% 0px' },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 md:flex">
      <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card/80 p-1.5 backdrop-blur-sm">
        {SECTIONS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => handleClick(id)}
            title={label}
            className={cn(
              'group relative flex size-8 items-center justify-center rounded-lg text-sm transition-colors',
              activeId === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-card-hover hover:text-foreground',
            )}
          >
            <span className="text-xs">{icon}</span>
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
