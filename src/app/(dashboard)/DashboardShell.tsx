'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/shared/SidebarContext';
import { CinematicNav } from '@/components/shared/Navigation';
import { cn } from '@/lib/utils';

/** Analysis pages handle their own full-screen layout */
function isImmersiveRoute(pathname: string): boolean {
  return /^\/analysis\/[^/]+/.test(pathname)
    && pathname !== '/analysis/new'
    && pathname !== '/analysis/compare';
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isImmersiveRoute(pathname);

  return (
    <>
      {/* Hide the top nav bar on immersive analysis pages — those pages
          use ModeSwitcherPill + their own back buttons for navigation */}
      {!immersive && (
        <header role="banner">
          <CinematicNav />
        </header>
      )}
      <main className={cn(
        'min-h-screen safe-area-main',
        !immersive && 'px-4 py-6 sm:px-6 md:px-8 lg:px-12',
      )}>
        <div className={cn(
          'mx-auto w-full',
          !immersive && 'max-w-[1400px]',
        )}>
          {children}
        </div>
      </main>
    </>
  );
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardInner>{children}</DashboardInner>
    </SidebarProvider>
  );
}
