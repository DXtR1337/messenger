import { cn } from '@/lib/utils';

interface SectionDividerProps {
  title: string;
  subtitle?: string;
  className?: string;
  id?: string;
}

export default function SectionDivider({ title, subtitle, className, id }: SectionDividerProps) {
  return (
    <div id={id} className={cn('my-8 space-y-1', className)}>
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-border" />
        <span className="mx-4 shrink-0 rounded-full border border-border bg-card px-4 py-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <div className="flex-1 border-t border-border" />
      </div>
      {subtitle && (
        <p className="text-center text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
