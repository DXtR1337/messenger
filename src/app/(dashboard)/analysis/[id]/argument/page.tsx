'use client';

import dynamic from 'next/dynamic';
import ModePageShell from '@/components/shared/ModePageShell';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';

const ArgumentSimulator = dynamic(() => import('@/components/analysis/ArgumentSimulator'), {
  ssr: false,
  loading: () => <div className="brand-shimmer h-96" />,
});

export default function ArgumentPage() {
  return (
    <ModePageShell
      mode="argument"
      title="Symulacja Klotni"
      subtitle="Jak by wygladala wasza klotnia na dany temat?"
    >
      <SectionErrorBoundary section="ArgumentSimulator">
        <ArgumentSimulator />
      </SectionErrorBoundary>
    </ModePageShell>
  );
}
