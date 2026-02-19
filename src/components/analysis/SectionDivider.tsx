import { cn } from '@/lib/utils';

interface SectionDividerProps {
  title: string;
  subtitle?: string;
  number?: string;
  className?: string;
  id?: string;
}

export default function SectionDivider({ title, subtitle, number, className, id }: SectionDividerProps) {
  return (
    <div id={id} className={cn('my-10 space-y-1', className)}>
      <div className="flex items-center gap-3">
        {number && (
          <span className="font-mono text-[10px] font-semibold tracking-[6px] uppercase text-muted-foreground">
            {number}
          </span>
        )}
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] font-semibold tracking-[4px] uppercase text-muted-foreground">
          {title}
        </span>
      </div>
      {subtitle && (
        <p className="text-right text-[11px] text-muted-foreground/60">{subtitle}</p>
      )}
    </div>
  );
}
