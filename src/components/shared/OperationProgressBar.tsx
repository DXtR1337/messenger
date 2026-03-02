'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { OperationInfo } from '@/lib/analysis/analysis-context';
import {
  Flame, Scale, Mic, Search, Heart, MessagesSquare,
  ScanLine, Compass, Sparkles, Brain, Zap, X, Check, Loader2,
} from 'lucide-react';

const OP_META: Record<string, { icon: typeof Flame; accent: string; route?: string }> = {
  'ai-analysis':     { icon: Brain,           accent: '#a855f7', route: 'ai' },
  'enhanced-roast':  { icon: Flame,           accent: '#ff4500', route: 'roast' },
  'mega-roast':      { icon: Flame,           accent: '#ff6347', route: 'roast' },
  'court':           { icon: Scale,           accent: '#d4a853', route: 'court' },
  'dating':          { icon: Heart,           accent: '#ff006e', route: 'dating' },
  'standup':         { icon: Mic,             accent: '#ff9f0a', route: 'standup' },
  'simulator':       { icon: MessagesSquare,  accent: '#0084ff', route: 'simulator' },
  'cps':             { icon: ScanLine,        accent: '#10b981', route: 'cps' },
  'subtext':         { icon: Search,          accent: '#00ff41', route: 'subtext' },
  'capitalization':  { icon: Heart,           accent: '#ec4899', route: 'capitalization' },
  'moral':           { icon: Compass,         accent: '#f97316', route: 'moral' },
  'emotions':        { icon: Sparkles,        accent: '#06b6d4', route: 'emotions' },
  'przegryw':        { icon: Flame,           accent: '#ef4444', route: 'roast' },
  'argument':        { icon: Zap,             accent: '#ef4444', route: 'argument' },
};

function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return <span className="tabular-nums">{elapsed}s</span>;
}

interface CompletedOp { id: string; label: string; accent: string }

export default function OperationProgressBar() {
  const { runningOperations, stopOperation } = useAnalysis();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [show, setShow] = useState(false);
  const [completed, setCompleted] = useState<CompletedOp[]>([]);
  const prevOpsRef = useRef<Set<string>>(new Set());

  // Track completions for brief "done" animation
  useEffect(() => {
    const currentIds = new Set(runningOperations.keys());
    for (const prevId of prevOpsRef.current) {
      if (!currentIds.has(prevId)) {
        const meta = OP_META[prevId];
        setCompleted(prev => prev.some(c => c.id === prevId) ? prev : [...prev, { id: prevId, label: prevId, accent: meta?.accent ?? '#3b82f6' }]);
        setTimeout(() => {
          setCompleted(prev => prev.filter(c => c.id !== prevId));
        }, 2000);
      }
    }
    prevOpsRef.current = currentIds;
  }, [runningOperations]);

  // Animate entry/exit
  useEffect(() => {
    if (runningOperations.size > 0 || completed.length > 0) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [runningOperations.size, completed.length]);

  const hasContent = runningOperations.size > 0 || completed.length > 0;
  if (!hasContent && !show) return null;

  const ops = Array.from(runningOperations.entries());

  return (
    <div
      className={cn(
        'fixed bottom-16 left-1/2 z-50 -translate-x-1/2 pb-[env(safe-area-inset-bottom)] transition-all duration-500',
        'sm:bottom-[4.5rem] md:bottom-20',
        show && hasContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
      )}
    >
      <div
        className="flex w-[90vw] max-w-md flex-col gap-1.5 rounded-2xl px-4 py-3 backdrop-blur-xl"
        style={{ background: 'rgba(17,17,17,0.85)', boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
      >
        {/* Running operations */}
        {ops.map(([opId, info]) => (
          <OperationRow
            key={opId}
            opId={opId}
            info={info}
            onCancel={() => stopOperation(opId)}
            onNavigate={() => {
              const route = OP_META[opId]?.route;
              if (route && id) router.push(`/analysis/${id}/${route}`);
            }}
          />
        ))}

        {/* Completed flash */}
        {completed.map(c => (
          <div key={c.id} className="flex items-center gap-2 py-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Check className="size-3.5" style={{ color: c.accent }} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">{c.label}</span>
            <span className="font-mono text-[10px] text-emerald-500">Gotowe</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperationRow({
  opId, info, onCancel, onNavigate,
}: {
  opId: string;
  info: OperationInfo;
  onCancel: () => void;
  onNavigate: () => void;
}) {
  const meta = OP_META[opId] ?? { icon: Loader2, accent: '#3b82f6' };
  const Icon = meta.icon;

  return (
    <div className="group flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {/* Icon */}
        <Icon className="size-3.5 shrink-0 animate-pulse" style={{ color: meta.accent }} />

        {/* Label — clickable to navigate */}
        <button
          onClick={onNavigate}
          className="flex-1 text-left font-mono text-[11px] font-medium uppercase tracking-widest text-[#ccc] transition-colors hover:text-white"
        >
          {info.label}
        </button>

        {/* Elapsed time */}
        <span className="font-mono text-[10px] text-zinc-400">
          <ElapsedTime startedAt={info.startedAt} />
        </span>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="flex size-5 items-center justify-center rounded-full text-[#444] transition-colors hover:bg-white/10 hover:text-[#999]"
          title="Anuluj"
        >
          <X className="size-3" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.max(info.progress, 2)}%`,
            background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent}88)`,
          }}
        />
      </div>

      {/* Status text */}
      <span className="truncate text-[10px] text-[#666]">{info.status}</span>
    </div>
  );
}
