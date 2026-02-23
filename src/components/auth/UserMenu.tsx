'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserMenuProps {
  collapsed?: boolean;
}

export default function UserMenu({ collapsed = false }: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  // If Supabase is not configured or still loading, show default
  if (loading || !user) {
    return <DefaultUserCard collapsed={collapsed} />;
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Użytkownik';
  const initials = displayName.slice(0, 2).toUpperCase();

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex size-[34px] items-center justify-center rounded-lg text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--chart-a), var(--chart-b))' }}
        >
          {initials}
        </button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
      >
        <span
          className="flex size-[34px] shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--chart-a), var(--chart-b))' }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-[#fafafa]">{displayName}</p>
          <p className="truncate text-xs text-[#555555]">{user.email}</p>
        </div>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-[#1a1a1a] bg-[#111111] py-1 shadow-xl">
          <MenuLink href="/profile" icon={<User className="size-3.5" />} label="Profil" onClick={() => setMenuOpen(false)} />
          <MenuLink href="/settings" icon={<Settings className="size-3.5" />} label="Ustawienia" onClick={() => setMenuOpen(false)} />
          <div className="my-1 h-px bg-border" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-danger"
          >
            <LogOut className="size-3.5" />
            Wyloguj
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}

function DefaultUserCard({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <span
          className="flex size-[34px] items-center justify-center rounded-lg text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--chart-a), var(--chart-b))' }}
        >
          MK
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]">
      <span
        className="flex size-[34px] shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, var(--chart-a), var(--chart-b))' }}
      >
        MK
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#fafafa]">Użytkownik</p>
        <p className="truncate text-xs text-[#555555]">Plan darmowy</p>
      </div>
    </div>
  );
}
