'use client';

import { useRef, useEffect } from 'react';

interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export default function Sparkline({
  data,
  color,
  width = 140,
  height = 36,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Set physical pixel size
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Scale for retina
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Compute min/max
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const val of data) {
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    const range = maxVal - minVal || 1;

    // Usable drawing area (leave 10% padding top and bottom)
    const paddingY = height * 0.1;
    const drawHeight = height - paddingY * 2;

    // Compute normalized points
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const points: Array<{ x: number; y: number }> = data.map((val, i) => ({
      x: i * stepX,
      y: paddingY + drawHeight - ((val - minVal) / range) * drawHeight,
    }));

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '25');
    gradient.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    for (const point of points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Last-point dot
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [data, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  );
}
