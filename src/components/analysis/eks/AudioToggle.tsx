'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioToggleProps {
  isPlaying: boolean;
  onToggle: () => void;
  masterVolume: number;
  onVolumeChange: (v: number) => void;
}

/**
 * AudioToggle — floating audio control for EKS V4 scrollytelling.
 *
 * Fixed bottom-right. Circular button toggles audio on/off. Hover or click
 * expands a vertical volume slider. Hidden on mobile (< md breakpoint) via CSS.
 * Uses EKS crimson/amber palette.
 */
export function AudioToggle({
  isPlaying,
  onToggle,
  masterVolume,
  onVolumeChange,
}: AudioToggleProps) {
  const [showSlider, setShowSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Close slider when clicking outside
  useEffect(() => {
    if (!showSlider) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSlider(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSlider]);

  // Delayed hide on mouse leave (prevents flicker when moving between button and slider)
  const scheduleHide = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setShowSlider(false), 300);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onVolumeChange(parseFloat(e.target.value));
    },
    [onVolumeChange],
  );

  const volumePercent = Math.round(masterVolume * 100);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-50 hidden md:flex flex-col items-center gap-2"
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
    >
      {/* Volume slider — appears above the button */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            className="flex flex-col items-center gap-1.5 rounded-full px-2 py-3 backdrop-blur-md"
            style={{
              background: 'rgba(10,4,4,0.9)',
              border: '1px solid rgba(153,27,27,0.3)',
            }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Volume percentage label */}
            <span
              className="font-mono text-[9px] tracking-wider select-none"
              style={{ color: '#991b1b' }}
            >
              {volumePercent}
            </span>

            {/* Vertical slider — rendered as a rotated horizontal range input */}
            <div className="relative flex items-center justify-center" style={{ height: 80 }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={handleSliderChange}
                className="eks-audio-slider"
                aria-label={`Głośność: ${volumePercent}%`}
                style={{
                  width: 80,
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center center',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main toggle button */}
      <motion.button
        onClick={() => {
          onToggle();
          // Show slider briefly on toggle so user knows they can adjust
          if (!isPlaying) {
            setShowSlider(true);
            scheduleHide();
          }
        }}
        onMouseEnter={() => {
          cancelHide();
          setShowSlider(true);
        }}
        className="flex items-center justify-center rounded-full w-10 h-10 backdrop-blur-sm transition-colors"
        style={{
          background: isPlaying
            ? 'rgba(153,27,27,0.15)'
            : 'rgba(10,4,4,0.8)',
          border: `1px solid rgba(153,27,27,${isPlaying ? '0.4' : '0.2'})`,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isPlaying ? 'Wyłącz dźwięk' : 'Włącz dźwięk'}
        title={isPlaying ? 'Wyłącz dźwięk' : 'Włącz dźwięk'}
      >
        {isPlaying ? (
          <Volume2 size={16} color="#991b1b" strokeWidth={1.5} />
        ) : (
          <VolumeX size={16} color="#6b3a3a" strokeWidth={1.5} />
        )}
      </motion.button>

      {/* Slider styles — scoped to this component via class name */}
      <style>{`
        .eks-audio-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          background: linear-gradient(
            to right,
            rgba(153,27,27,0.6) 0%,
            rgba(153,27,27,0.6) ${volumePercent}%,
            rgba(107,58,58,0.2) ${volumePercent}%,
            rgba(107,58,58,0.2) 100%
          );
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .eks-audio-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #991b1b;
          border: 1px solid rgba(220,38,38,0.4);
          cursor: pointer;
          box-shadow: 0 0 6px rgba(153,27,27,0.4);
        }
        .eks-audio-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #991b1b;
          border: 1px solid rgba(220,38,38,0.4);
          cursor: pointer;
          box-shadow: 0 0 6px rgba(153,27,27,0.4);
        }
        .eks-audio-slider::-moz-range-track {
          height: 3px;
          background: rgba(107,58,58,0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
