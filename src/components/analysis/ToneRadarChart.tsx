'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Pass1Result, PersonTone } from '@/lib/analysis/types';

interface ToneRadarChartProps {
  pass1: Pass1Result;
  participants: string[];
}

const DIMENSIONS = ['Ciepły', 'Żartobliwy', 'Analityczny', 'Lękowy', 'Romantyczny', 'Neutralny'];
const DIMENSION_COUNT = DIMENSIONS.length;
const PERSON_A_COLOR = '#3b82f6';
const PERSON_B_COLOR = '#a855f7';

function mapToneData(personTone: PersonTone): number[] {
  const warmth = (personTone.warmth ?? 5) / 10;
  const humor = (personTone.humor_presence ?? 5) / 10;
  const analytical = (10 - (personTone.formality_level ?? 5)) / 10;

  const anxious = personTone.secondary_tones?.some(
    (t) =>
      t.toLowerCase().includes('anxi') || t.toLowerCase().includes('lęk'),
  )
    ? 0.6
    : 0.2;

  const primaryLower = personTone.primary_tone?.toLowerCase() ?? '';
  const secondaryLower = personTone.secondary_tones?.map((t) => t.toLowerCase()) ?? [];
  const romantic = primaryLower.includes('roman')
    ? 0.8
    : secondaryLower.some((t) => t.includes('roman'))
      ? 0.5
      : 0.2;

  const neutral = Math.max(0.1, 1 - warmth - humor * 0.5);

  return [warmth, humor, analytical, anxious, romantic, neutral];
}

function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  dataA: number[] | null,
  dataB: number[] | null,
) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = 85 * dpr;
  const startAngle = -Math.PI / 2;

  ctx.clearRect(0, 0, width, height);

  // Helper: get angle for dimension index
  function getAngle(index: number): number {
    return startAngle + (2 * Math.PI * index) / DIMENSION_COUNT;
  }

  // Helper: get vertex position
  function getVertex(index: number, scale: number): { x: number; y: number } {
    const angle = getAngle(index);
    return {
      x: cx * dpr + Math.cos(angle) * radius * scale,
      y: cy * dpr + Math.sin(angle) * radius * scale,
    };
  }

  // Draw grid rings (4 concentric hexagons)
  for (let ring = 1; ring <= 4; ring++) {
    const scale = ring / 4;
    ctx.beginPath();
    for (let i = 0; i < DIMENSION_COUNT; i++) {
      const { x, y } = getVertex(i, scale);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
  }

  // Draw axis lines from center
  for (let i = 0; i < DIMENSION_COUNT; i++) {
    const { x, y } = getVertex(i, 1);
    ctx.beginPath();
    ctx.moveTo(cx * dpr, cy * dpr);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
  }

  // Draw data shape helper
  function drawShape(data: number[], color: string, fillAlpha: string) {
    ctx.beginPath();
    for (let i = 0; i < DIMENSION_COUNT; i++) {
      const value = Math.max(0, Math.min(1, data[i]));
      const { x, y } = getVertex(i, value);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color + fillAlpha;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();
  }

  // Draw Person B first (behind)
  if (dataB) {
    drawShape(dataB, PERSON_B_COLOR, '20');
  }

  // Draw Person A on top
  if (dataA) {
    drawShape(dataA, PERSON_A_COLOR, '25');
  }

  // Draw dimension labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = `${10 * dpr}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < DIMENSION_COUNT; i++) {
    const { x, y } = getVertex(i, 1.18);
    ctx.fillText(DIMENSIONS[i], x, y);
  }
}

export default function ToneRadarChart({
  pass1,
  participants,
}: ToneRadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });

  const personA = participants[0];
  const personB = participants[1];

  const toneA = personA ? pass1.tone_per_person?.[personA] : undefined;
  const toneB = personB ? pass1.tone_per_person?.[personB] : undefined;

  const dataA = toneA ? mapToneData(toneA) : null;
  const dataB = toneB ? mapToneData(toneB) : null;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 220;
    const displayHeight = 220;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    drawRadarChart(ctx, displayWidth, displayHeight, dpr, dataA, dataB);
  }, [dataA, dataB]);

  useEffect(() => {
    if (isInView) {
      draw();
    }
  }, [isInView, draw]);

  return (
    <div
      ref={containerRef}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      <div className="px-5 pt-4">
        <h3 className="font-display text-[0.93rem] font-bold">Rozkład tonu</h3>
      </div>
      <div className="px-5 py-4 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <canvas
            ref={canvasRef}
            width={220}
            height={220}
            style={{ width: 220, height: 220 }}
          />
        </motion.div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2.5 text-[0.72rem] text-muted-foreground">
          <span>&#128522; Ciepły</span>
          <span>&#128540; Żartobliwy</span>
          <span>&#129300; Analityczny</span>
          <span>&#128552; Lękowy</span>
          <span>&#10084;&#65039; Romantyczny</span>
          <span>&#128528; Neutralny</span>
        </div>
      </div>
    </div>
  );
}
