'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface StoryIntroProps {
  participants: string[];
  title: string;
  totalMessages: number;
  durationDays: number;
}

export default function StoryIntro({
  participants,
  title,
  totalMessages,
  durationDays,
}: StoryIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      hue: 'blue' | 'purple';
    }

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 60;
    const CONNECTION_DIST = 120;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.scale(dpr, dpr);
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: 0.1 + Math.random() * 0.3,
          hue: Math.random() > 0.5 ? 'blue' : 'purple',
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const color =
          p.hue === 'blue'
            ? `rgba(109, 159, 255, ${p.alpha})`
            : `rgba(179, 140, 255, ${p.alpha})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.12;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(q.x, q.y);
            ctx!.strokeStyle = `rgba(109, 159, 255, ${opacity})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();

    window.addEventListener('resize', () => {
      resize();
      initParticles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const nameA = participants[0] ?? 'Osoba A';
  const nameB = participants[1] ?? 'Osoba B';
  const initialA = nameA.charAt(0).toUpperCase();
  const initialB = nameB.charAt(0).toUpperCase();

  const titleLines = ['Historia', 'Waszej', 'Relacji'];

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 0 }}
      />

      <div
        className="relative z-10 flex flex-col items-center gap-8 px-6"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2 rounded-full border px-3 py-1"
          style={{
            borderColor: 'var(--story-border)',
            background: 'var(--story-bg-card)',
          }}
        >
          <span
            className="relative inline-block h-2 w-2 rounded-full"
            style={{ background: 'var(--story-green)' }}
          >
            <span
              className="absolute inset-0 animate-ping rounded-full"
              style={{ background: 'var(--story-green)', opacity: 0.6 }}
            />
          </span>
          <span
            className="font-mono select-none"
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--story-text-2)',
            }}
          >
            PodTeksT &times; Gemini
          </span>
        </motion.div>

        {/* Animated title */}
        <div className="flex flex-col items-center">
          {titleLines.map((line, i) => (
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                duration: 0.7,
                delay: [0.3, 0.55, 0.8][i],
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                fontFamily: 'var(--font-syne)',
                fontSize: 'clamp(2.8rem, 9vw, 6rem)',
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: i === 1 ? 'var(--story-blue)' : 'var(--story-text)',
              }}
            >
              {line}
            </motion.div>
          ))}
        </div>

        {/* Participant display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-0"
        >
          {/* Person A avatar + name */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #3b6bff, #6d9fff)',
              }}
            >
              <span
                className="select-none text-white"
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                {initialA}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.78rem',
                color: 'var(--story-blue)',
              }}
            >
              {nameA}
            </span>
          </div>

          {/* Connecting SVG line */}
          <svg
            height="2"
            viewBox="0 0 80 2"
            className="mx-2 w-12 flex-shrink-0 sm:mx-3 sm:w-20"
            style={{ marginBottom: 24 }}
          >
            <defs>
              <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--story-blue)" stopOpacity="0.7" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="100%" stopColor="var(--story-purple)" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <line
              x1="0"
              y1="1"
              x2="80"
              y2="1"
              stroke="url(#line-grad)"
              strokeWidth="1"
            />
          </svg>

          {/* Person B avatar + name */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #8b5cf6, #b38cff)',
              }}
            >
              <span
                className="select-none text-white"
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                {initialB}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.78rem',
                color: 'var(--story-purple)',
              }}
            >
              {nameB}
            </span>
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.9rem',
            color: 'var(--story-text-3)',
          }}
        >
          {totalMessages.toLocaleString('pl-PL')} wiadomości &middot;{' '}
          {durationDays.toLocaleString('pl-PL')} dni
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 2.0 }}
          className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
          style={{ bottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))' }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--story-text-3)',
            }}
          >
            przewiń
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: 1,
              height: 24,
              background: 'linear-gradient(to bottom, var(--story-text-3), transparent)',
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
