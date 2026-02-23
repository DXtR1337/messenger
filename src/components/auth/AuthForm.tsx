'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PTLogo from '@/components/shared/PTLogo';
import { createClient } from '@/lib/supabase/client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type AuthMode = 'login' | 'signup' | 'reset';

interface AuthFormProps {
  mode: AuthMode;
}

// -------------------------------------------------------------------
// AuthForm
// -------------------------------------------------------------------

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setSuccess('Sprawdź swoją skrzynkę e-mail i potwierdź rejestrację.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (error) throw error;
        setSuccess('Link do resetowania hasła został wysłany na podany e-mail.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd');
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) setError(error.message);
  };

  const title = mode === 'login' ? 'Zaloguj się' : mode === 'signup' ? 'Utwórz konto' : 'Resetuj hasło';
  const subtitle = mode === 'login'
    ? 'Wróć do swoich analiz'
    : mode === 'signup'
      ? 'Dołącz do PodTeksT'
      : 'Wyślemy link do resetowania hasła';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-purple-500/[0.03]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <PTLogo size={32} />
            <span className="font-display text-xl font-bold tracking-tight">
              <span className="text-[#3b82f6]">Pod</span>
              <span className="text-[#a855f7]">TeksT</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-8">
          <div className="mb-6 text-center">
            <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {/* Google OAuth — only for login/signup */}
          {mode !== 'reset' && (
            <>
              <Button
                variant="outline"
                className="w-full gap-3 rounded-xl py-5 text-sm font-medium"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <GoogleIcon />
                Kontynuuj z Google
              </Button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">lub</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ty@example.com"
                  className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password — not for reset */}
            {mode !== 'reset' && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Hasło
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 znaków"
                    className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="text-right">
                <Link
                  href="/auth/reset"
                  className="text-xs text-muted-foreground transition-colors hover:text-blue-400"
                >
                  Nie pamiętam hasła
                </Link>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success"
              >
                {success}
              </motion.p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full gap-2 rounded-xl py-5 text-sm font-semibold"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {title}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          {mode === 'login' ? (
            <>
              Nie masz konta?{' '}
              <Link href="/auth/signup" className="text-blue-400 transition-colors hover:text-blue-300">
                Zarejestruj się
              </Link>
            </>
          ) : mode === 'signup' ? (
            <>
              Masz już konto?{' '}
              <Link href="/auth/login" className="text-blue-400 transition-colors hover:text-blue-300">
                Zaloguj się
              </Link>
            </>
          ) : (
            <Link href="/auth/login" className="text-blue-400 transition-colors hover:text-blue-300">
              Wróć do logowania
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// -------------------------------------------------------------------
// Google icon (inline SVG to avoid external dependency)
// -------------------------------------------------------------------

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
