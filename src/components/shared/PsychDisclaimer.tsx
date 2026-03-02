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
    <div
      className={cn(
        'relative mt-3 flex items-start gap-2.5 overflow-hidden rounded-lg border border-purple-500/[0.08] px-3.5 py-2.5',
        'bg-gradient-to-r from-purple-950/[0.06] via-transparent to-transparent',
        className,
      )}
    >
      {/* Left accent bar */}
      <div
        className="absolute inset-y-0 left-0 w-[2px]"
        style={{
          background: 'linear-gradient(180deg, rgba(168,85,247,0.5) 0%, rgba(139,92,246,0.2) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Info icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        className="mt-0.5 shrink-0 text-purple-400/40"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" />
        <path d="M8 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="8" cy="5" r="0.8" fill="currentColor" />
      </svg>

      <p className="text-xs leading-relaxed text-muted-foreground/80">
        {text}
        {citation && (
          <span className="ml-1 text-purple-400/60 italic">({citation})</span>
        )}
        {showGenericFooter && (
          <span className="text-muted-foreground/70"> {GENERIC_DISCLAIMER_PL}</span>
        )}
      </p>
    </div>
  );
}
