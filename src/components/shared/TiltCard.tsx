'use client';

import { useRef, useState, useCallback, type ReactNode, type CSSProperties } from 'react';

interface TiltCardProps {
  children: ReactNode;
  maxTilt?: number;
  perspective?: number;
  glareColor?: string;
  className?: string;
  style?: CSSProperties;
}

export default function TiltCard({
  children,
  maxTilt = 12,
  perspective = 1500,
  glareColor = 'rgba(255,255,255,0.08)',
  className = '',
  style,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      setTilt({ x: -dy * maxTilt, y: dx * maxTilt });
      setGlarePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [maxTilt],
  );

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    setGlarePos({ x: 50, y: 50 });
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective,
        ...style,
      }}
    >
      <div
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isHovering ? 'transform 0.1s ease-out' : 'transform 0.6s ease-out',
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
      >
        {children}
        {/* Dynamic glare overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            background: isHovering
              ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, ${glareColor}, transparent 60%)`
              : 'none',
            mixBlendMode: 'color-dodge',
            opacity: isHovering ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
          }}
        />
      </div>
    </div>
  );
}
