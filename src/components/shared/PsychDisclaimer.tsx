'use client';

import { cn } from '@/lib/utils';
import { GENERIC_DISCLAIMER_PL } from '@/lib/analysis/citations';

interface PsychDisclaimerProps {
  /** Main disclaimer text in Polish */
  text: string;
  /** Optional academic citation, e.g. "Gottman & Silver, 1999" */
  citation?: string;
  /** Whether to show the generic "not a clinical diagnosis" footer */
  showGenericFooter?: boolean;
  /** Optional className for outer container */
  className?: string;
}

export default function PsychDisclaimer({ text, citation, showGenericFooter, className }: PsychDisclaimerProps) {
  return (
    <div className={cn('mt-3 px-1', className)}>
      <p className="text-[11px] italic leading-relaxed text-muted-foreground/50">
        {text}
        {citation && (
          <span className="text-muted-foreground/40"> ({citation})</span>
        )}
        {showGenericFooter && (
          <span className="text-muted-foreground/40"> {GENERIC_DISCLAIMER_PL}</span>
        )}
      </p>
    </div>
  );
}
