import { Sparkles, BarChart3 } from 'lucide-react';

export function AIBadge({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 ${className ?? ''}`}>
      <Sparkles className="size-3" />
      AI
    </span>
  );
}

export function QuantBadge({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 ${className ?? ''}`}>
      <BarChart3 className="size-3" />
      Dane
    </span>
  );
}

export function SampleSizeBadge({ messageCount }: { messageCount: number }) {
  if (messageCount >= 200 && messageCount <= 1000) return null;

  const isLow = messageCount < 200;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
      isLow
        ? 'bg-amber-500/10 text-amber-400'
        : 'bg-emerald-500/10 text-emerald-400'
    }`}>
      {isLow ? 'Ograniczone dane' : 'Bogata próbka'}
    </span>
  );
}
