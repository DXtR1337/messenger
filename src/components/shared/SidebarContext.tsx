'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'podtekst_sidebar_collapsed';

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  isMobile: boolean;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
  breadcrumb: string[];
  setBreadcrumb: (items: string[]) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readPersistedCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['PodTeksT']);

  useEffect(() => {
    setCollapsed(readPersistedCollapsed());

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setMobileOpen(false);
      }
      // Auto-collapse sidebar on medium screens (768-1279)
      if (window.innerWidth >= 768 && window.innerWidth < 1280) {
        setCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleCollapsed = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
      return;
    }
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, [isMobile]);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        isMobile,
        toggleCollapsed,
        setMobileOpen,
        breadcrumb,
        setBreadcrumb,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
}
