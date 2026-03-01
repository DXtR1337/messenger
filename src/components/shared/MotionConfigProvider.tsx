'use client';

import { MotionConfig } from 'framer-motion';

interface MotionConfigProviderProps {
  children: React.ReactNode;
}

export default function MotionConfigProvider({ children }: MotionConfigProviderProps) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
