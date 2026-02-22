/**
 * Photo loader for Stand-Up PDF.
 *
 * Fetches images from /photos/, resizes them via an offscreen canvas
 * to keep PDF size reasonable, and returns a PdfImages record.
 */

import type { PdfImages } from './standup-pdf';
import { PHOTO_KEYS } from './standup-pdf';

/** Target width for embedded images (px). Height scales proportionally. */
const TARGET_WIDTH = 800;

/** JPEG quality for the resized data URL (0-1). */
const JPEG_QUALITY = 0.7;

/**
 * Load a single image, resize it via canvas, and return a JPEG data URL.
 * Returns null if the image fails to load.
 */
function loadAndResize(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const ratio = TARGET_WIDTH / img.naturalWidth;
      const w = TARGET_WIDTH;
      const h = Math.round(img.naturalHeight * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };

    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Pre-load all Stand-Up PDF photos.
 *
 * Fetches each photo from `/photos/<key>.jpg`, resizes it,
 * and returns a PdfImages record keyed by PHOTO_KEYS values.
 *
 * @param onProgress Optional callback reporting how many images are done.
 */
export async function loadPdfImages(
  onProgress?: (loaded: number, total: number) => void,
): Promise<PdfImages> {
  const keys = Object.values(PHOTO_KEYS);
  const total = keys.length;
  const images: PdfImages = {};
  let loaded = 0;

  // Load in parallel (all from same origin — fast)
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      const dataUrl = await loadAndResize(`/photos/${key}.jpg`);
      loaded++;
      onProgress?.(loaded, total);
      return { key, dataUrl };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.dataUrl) {
      images[r.value.key] = r.value.dataUrl;
    }
  }

  return images;
}
