'use client';

import { useCallback, useState } from 'react';
import type { RefObject } from 'react';

export function useCardDownload(
  ref: RefObject<HTMLDivElement | null>,
  filename: string,
  options?: { backgroundColor?: string },
) {
  const [isDownloading, setIsDownloading] = useState(false);
  const bgColor = options?.backgroundColor ?? '#09090b';

  const download = useCallback(async () => {
    const el = ref.current;
    if (!el || isDownloading) return;

    setIsDownloading(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(el, {
        backgroundColor: bgColor,
        scale: 3,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsDownloading(false);
    }
  }, [ref, filename, isDownloading, bgColor]);

  return { download, isDownloading };
}
