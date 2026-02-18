'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import dynamic from 'next/dynamic';

const SplineScene = dynamic(
  () => import('@/components/shared/SplineScene').then((m) => ({ default: m.SplineScene })),
  { ssr: false },
);

interface SplineInterludeProps {
  scene: string;
  height?: string;
}

export default function SplineInterlude({ scene, height = '420px' }: SplineInterludeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{ height }}
    >
      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16"
        style={{ background: 'linear-gradient(to bottom, var(--background, #050505), transparent)' }}
      />

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16"
        style={{ background: 'linear-gradient(to top, var(--background, #050505), transparent)' }}
      />

      {/* Spline scene — desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.2 }}
        className="absolute inset-0 hidden md:block"
      >
        {isInView && <SplineScene scene={scene} className="h-full w-full" />}
      </motion.div>

      {/* Mobile gradient placeholder */}
      <div
        className="absolute inset-0 block md:hidden"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.04) 0%, transparent 70%)',
        }}
      />
    </section>
  );
}
