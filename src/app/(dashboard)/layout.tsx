'use client';

import { SidebarProvider, useSidebar } from '@/components/shared/SidebarContext';
import { Navigation } from '@/components/shared/Navigation';
import { Topbar } from '@/components/shared/Topbar';
import { cn } from '@/lib/utils';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <div
        className={cn(
          'flex flex-1 flex-col min-h-screen transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          collapsed ? 'ml-[var(--sidebar-collapsed-w)]' : 'ml-[var(--sidebar-w)]'
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}
