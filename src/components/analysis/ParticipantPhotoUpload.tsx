'use client';

import { useRef, useCallback } from 'react';
import { Camera, X } from 'lucide-react';
import { getPersonColor } from './PersonNavigator';

interface ParticipantPhotoUploadProps {
  participants: string[];
  photos: Record<string, string>;
  onUpload: (name: string, base64: string) => void;
  onRemove: (name: string) => void;
}

/** Resize + center-crop to 150x150 JPEG */
function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 150;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function ParticipantPhotoUpload({
  participants,
  photos,
  onUpload,
  onRemove,
}: ParticipantPhotoUploadProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = useCallback(
    async (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const base64 = await processImage(file);
        onUpload(name, base64);
      } catch {
        // silently fail
      }
      e.target.value = '';
    },
    [onUpload],
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
        Zdjęcia profilowe (PDF)
      </h4>
      <div className="flex flex-wrap gap-3">
        {participants.map((name, idx) => {
          const color = getPersonColor(idx);
          const photo = photos[name];

          return (
            <div key={name} className="flex flex-col items-center gap-1.5">
              <div className="relative">
                {photo ? (
                  <>
                    <img
                      src={photo}
                      alt={name}
                      className="size-12 rounded-full object-cover"
                      style={{ boxShadow: `0 0 0 2px ${color}` }}
                    />
                    <button
                      onClick={() => onRemove(name)}
                      className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="size-2.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRefs.current[name]?.click()}
                    className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-border bg-background transition-colors hover:border-text-muted"
                  >
                    <Camera className="size-4 text-text-muted" />
                  </button>
                )}
                <input
                  ref={(el) => { fileInputRefs.current[name] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(name, e)}
                />
              </div>
              <span
                className="max-w-[60px] truncate text-[10px] font-medium"
                style={{ color }}
              >
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
