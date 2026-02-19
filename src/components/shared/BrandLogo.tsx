'use client';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function BrandLogo({ className = '', size = 'md' }: BrandLogoProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <span
      className={`brand-logo font-display font-extrabold tracking-tight ${sizeClasses[size]} ${className}`}
    >
      <span className="text-[#3b82f6]">Pod</span>
      <span className="text-[#a855f7]">T</span>
      <span className="brand-eks text-[#a855f7]">eks</span>
      <span className="text-[#a855f7]">T</span>
    </span>
  );
}
