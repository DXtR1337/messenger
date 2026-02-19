'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp } from 'lucide-react';

const SECTIONS = [
  { id: 'section-metrics', label: 'Metryki', icon: '▦', accent: false },
  { id: 'section-activity', label: 'Aktywność', icon: '◔', accent: false },
  { id: 'section-communication', label: 'Komunikacja', icon: '◈', accent: false },
  { id: 'section-viral', label: 'Viral', icon: '◉', accent: true },
  { id: 'section-share', label: 'Udostępnij', icon: '⬡', accent: false },
  { id: 'section-ai', label: 'AI', icon: '◎', accent: false },
];

export default function SectionNavigator() {
  const [activeId, setActiveId] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

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

  // Scroll progress + back-to-top visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
      setShowBackToTop(scrollTop > 600);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      {/* Scroll progress bar — thin line at top of page */}
      <div className="fixed top-0 left-0 z-50 h-0.5 w-full bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-500 transition-[width] duration-150"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Desktop: vertical sidebar (existing behavior) */}
      <nav className="fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 md:flex">
        <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card/80 p-1.5 backdrop-blur-sm">
          {SECTIONS.map(({ id, label, icon, accent }) => (
            <button
              key={id}
              onClick={() => handleClick(id)}
              title={label}
              className={cn(
                'group relative flex size-8 items-center justify-center rounded-lg text-sm transition-colors',
                activeId === id
                  ? accent
                    ? 'bg-cyan/10 text-cyan'
                    : 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-card-hover hover:text-foreground',
              )}
            >
              <span className="text-xs">{icon}</span>
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile: horizontal bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border/50 bg-card/95 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md scrollbar-none">
          {SECTIONS.map(({ id, label, icon, accent }) => (
            <button
              key={id}
              onClick={() => handleClick(id)}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                activeId === id
                  ? accent
                    ? 'bg-cyan/15 text-cyan'
                    : 'bg-primary/15 text-primary'
                  : 'text-muted-foreground',
              )}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Back to Top button */}
      <button
        onClick={scrollToTop}
        className={cn(
          'fixed z-40 flex items-center justify-center rounded-full border border-border/50 bg-card/90 shadow-lg backdrop-blur-sm transition-all duration-300',
          'size-10 right-4',
          'bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-6',
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        )}
        aria-label="Przewiń do góry"
      >
        <ChevronUp className="size-5 text-muted-foreground" />
      </button>
    </>
  );
}
