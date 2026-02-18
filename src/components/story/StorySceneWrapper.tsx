'use client';

import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

interface StorySceneWrapperProps {
  chapter?: number;
  label?: string;
  title: string;
  titleAccent?: string;
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
  sceneIndex?: number;
}

export default function StorySceneWrapper({
  chapter,
  label,
  title,
  titleAccent,
  children,
  className = '',
  fullHeight = true,
  sceneIndex,
}: StorySceneWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <section
      ref={ref}
      className={`relative flex flex-col justify-center ${fullHeight ? 'min-h-screen' : ''} ${className}`}
      style={{ padding: 'var(--story-pad)' }}
      {...(sceneIndex !== undefined ? { 'data-scene-index': sceneIndex } : {})}
    >
      <div className="mx-auto w-full max-w-[920px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {(chapter !== undefined || label) && (
            <div className="mb-2">
              {chapter !== undefined && (
                <div
                  className="select-none"
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontSize: '4rem',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: 'rgba(109, 159, 255, 0.06)',
                  }}
                >
                  {String(chapter).padStart(2, '0')}
                </div>
              )}
              {label && (
                <div
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: 'var(--story-blue)',
                    marginBottom: '8px',
                  }}
                >
                  {label}
                </div>
              )}
            </div>
          )}

          <motion.h2
            style={{ y: titleY }}
            className="mb-6"
          >
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: 'var(--story-text)',
              }}
            >
              {titleAccent ? (
                <>
                  {title.split(titleAccent)[0]}
                  <span style={{ color: 'var(--story-blue)' }}>{titleAccent}</span>
                  {title.split(titleAccent)[1] ?? ''}
                </>
              ) : (
                title
              )}
            </span>
          </motion.h2>

          {children}
        </motion.div>
      </div>
    </section>
  );
}
