'use client';

import { useEffect, useRef, useState } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;
    let paused = false;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      hue: 'blue' | 'purple';
    }

    const particles: Particle[] = [];
    const CONNECTION_DIST = 120;
    const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;

    function getParticleCount() {
      if (typeof window === 'undefined') return 40;
      return window.innerWidth < 768 ? 18 : 35;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
      particles.length = 0;
      const count = getParticleCount();
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          alpha: 0.08 + Math.random() * 0.22,
          hue: Math.random() > 0.5 ? 'blue' : 'purple',
        });
      }
    }

    let lastFrameTime = 0;

    function draw(timestamp: number) {
      animationId = requestAnimationFrame(draw);
      if (paused) return;
      if (timestamp - lastFrameTime < 33) return; // 30fps cap
      lastFrameTime = timestamp;

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
          const distSq = dx * dx + dy * dy;

          if (distSq < CONNECTION_DIST_SQ) {
            const opacity = (1 - Math.sqrt(distSq) / CONNECTION_DIST) * 0.1;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(q.x, q.y);
            ctx!.strokeStyle = `rgba(109, 159, 255, ${opacity})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
    }

    resize();
    initParticles();
    animationId = requestAnimationFrame(draw);

    const handleResize = () => {
      resize();
      initParticles();
    };
    window.addEventListener('resize', handleResize);

    const handleVisibilityChange = () => {
      paused = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMobile]);

  if (isMobile) {
    return (
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#050505] via-[#0a0a14] to-[#050505]" aria-hidden="true" />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
