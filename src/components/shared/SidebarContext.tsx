'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'chatscope_sidebar_collapsed';

interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
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
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['ChatScope']);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setCollapsed(readPersistedCollapsed());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable — silently ignore
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggleCollapsed, breadcrumb, setBreadcrumb }}
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
