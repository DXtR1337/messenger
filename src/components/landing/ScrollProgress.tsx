'use client';

import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      setProgress(Math.min(scrollTop / docHeight, 1));
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[1000] h-[3px]"
      style={{
        width: `${progress * 100}%`,
        background: 'linear-gradient(90deg, #3b82f6, #a855f7, #10b981)',
        transition: 'width 0.1s linear',
      }}
    />
  );
}
