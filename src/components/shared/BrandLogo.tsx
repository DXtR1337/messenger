'use client';

import { useState, useEffect } from 'react';
import BrandP from '@/components/shared/BrandP';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  eksMode?: boolean;
  /** Override the "eks" color (e.g. '#00ff41' for subtext green) */
  eksColor?: string;
}

export default function BrandLogo({ className = '', size = 'md', eksMode, eksColor }: BrandLogoProps) {
  const [autoEks, setAutoEks] = useState(false);

  // Auto-detect eks mode from AnalysisProvider's data-eks-mode attribute
  useEffect(() => {
    const el = document.documentElement;
    const check = () => setAutoEks(el.hasAttribute('data-eks-mode'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(el, { attributes: true, attributeFilter: ['data-eks-mode'] });
    return () => observer.disconnect();
  }, []);

  const isEks = eksMode ?? autoEks;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <span
      className={`brand-logo font-display font-extrabold tracking-tight ${sizeClasses[size]} ${className}`}
    >
      <BrandP height="0.85em" />
      <span className="text-[#3b82f6]">od</span>
      <span className="text-[#a855f7]">T</span>
      {isEks ? (
        <span
          className="brand-eks"
          style={{
            color: '#dc2626',
            textShadow: '0 0 16px rgba(220,38,38,0.5)',
          }}
        >
          eks
        </span>
      ) : eksColor ? (
        <span
          className="brand-eks"
          style={{ color: eksColor }}
        >
          eks
        </span>
      ) : (
        <span className="brand-eks text-[#a855f7]">eks</span>
      )}
      <span className="text-[#a855f7]">T</span>
    </span>
  );
}
