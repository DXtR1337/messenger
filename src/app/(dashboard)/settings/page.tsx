'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Database,
  Download,
  Upload,
  Trash2,
  HardDrive,
  Cookie,
  Shield,
  Info,
  Check,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  estimateStorageUsage,
  exportAllData,
  downloadExportData,
  importData,
  clearAllData,
  formatBytes,
  type StorageEstimate,
} from '@/lib/settings/storage-utils';
import { useTier } from '@/lib/tiers/tier-context';
import PTLogo from '@/components/shared/PTLogo';

// -------------------------------------------------------------------
// Settings page
// -------------------------------------------------------------------

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-2xl font-bold flex items-center gap-3">
          <Settings className="size-6 text-muted-foreground" />
          Ustawienia
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferencje, dane i informacje o aplikacji
        </p>
      </motion.div>

      {/* Sections */}
      <div className="grid gap-6">
        <PreferencesSection />
        <DataManagementSection />
        <AboutSection />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Preferences Section
// -------------------------------------------------------------------

function PreferencesSection() {
  const [cookieConsent, setCookieConsent] = useState<boolean | null>(null);
  const [aiConsent, setAiConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const cookie = localStorage.getItem('podtekst-cookie-consent');
    setCookieConsent(cookie === null ? null : cookie === 'true');

    const ai = localStorage.getItem('podtekst-ai-consent');
    setAiConsent(ai === null ? null : ai === 'true');
  }, []);

  const toggleCookieConsent = () => {
    const next = !cookieConsent;
    localStorage.setItem('podtekst-cookie-consent', String(next));
    setCookieConsent(next);
    if (next) window.dispatchEvent(new Event('podtekst-consent'));
  };

  const toggleAiConsent = () => {
    const next = !aiConsent;
    localStorage.setItem('podtekst-ai-consent', String(next));
    setAiConsent(next);
  };

  return (
    <SectionCard
      icon={<Shield className="size-4" />}
      title="Preferencje"
      description="Prywatność i zgody"
      index={0}
    >
      <div className="divide-y divide-border/50">
        {/* Cookie consent */}
        <SettingRow
          icon={<Cookie className="size-4 text-amber-400" />}
          label="Pliki cookie (Google Analytics)"
          description="Anonimowa analityka ruchu na stronie"
          action={
            <ToggleSwitch
              checked={cookieConsent === true}
              onChange={toggleCookieConsent}
              label="cookies"
            />
          }
        />

        {/* AI consent */}
        <SettingRow
          icon={<Shield className="size-4 text-blue-400" />}
          label="Przetwarzanie AI"
          description="Zgoda na wysyłanie próbki wiadomości do analizy Gemini API"
          action={
            <ToggleSwitch
              checked={aiConsent === true}
              onChange={toggleAiConsent}
              label="ai"
            />
          }
        />
      </div>
    </SectionCard>
  );
}

// -------------------------------------------------------------------
// Data Management Section
// -------------------------------------------------------------------

type DataAction = 'idle' | 'exporting' | 'importing' | 'clearing' | 'confirm-clear';

function DataManagementSection() {
  const [storage, setStorage] = useState<StorageEstimate | null>(null);
  const [action, setAction] = useState<DataAction>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshStorage = useCallback(() => {
    estimateStorageUsage().then(setStorage);
  }, []);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

  const handleExport = async () => {
    setAction('exporting');
    setMessage(null);
    try {
      const data = await exportAllData();
      downloadExportData(data);
      setMessage({ type: 'success', text: `Wyeksportowano ${data.analyses.length} analiz` });
    } catch {
      setMessage({ type: 'error', text: 'Błąd eksportu danych' });
    }
    setAction('idle');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAction('importing');
    setMessage(null);
    try {
      const result = await importData(file);
      setMessage({ type: 'success', text: `Zaimportowano ${result.analysesImported} analiz` });
      refreshStorage();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Błąd importu' });
    }
    setAction('idle');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClear = async () => {
    if (action !== 'confirm-clear') {
      setAction('confirm-clear');
      return;
    }
    setAction('clearing');
    setMessage(null);
    try {
      await clearAllData();
      setMessage({ type: 'success', text: 'Wszystkie dane zostały usunięte' });
      refreshStorage();
    } catch {
      setMessage({ type: 'error', text: 'Błąd usuwania danych' });
    }
    setAction('idle');
  };

  const isLoading = action === 'exporting' || action === 'importing' || action === 'clearing';

  return (
    <SectionCard
      icon={<Database className="size-4" />}
      title="Dane"
      description="Eksport, import i zarządzanie przechowywanymi analizami"
      index={1}
    >
      {/* Storage usage */}
      {storage && (
        <div className="mb-5 rounded-lg border border-border/50 bg-white/[0.02] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardDrive className="size-4" />
              <span>Użycie pamięci</span>
            </div>
            <span className="font-mono text-sm font-medium text-foreground">
              {formatBytes(storage.total)}
            </span>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>IndexedDB: {formatBytes(storage.indexedDB)}</span>
            <span>localStorage: {formatBytes(storage.localStorage)}</span>
            <span className="text-foreground/70">{storage.analysisCount} {storage.analysisCount === 1 ? 'analiza' : storage.analysisCount < 5 ? 'analizy' : 'analiz'}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExport}
          disabled={isLoading}
        >
          <Download className="size-3.5" />
          {action === 'exporting' ? 'Eksportuję...' : 'Eksportuj dane'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
        >
          <Upload className="size-3.5" />
          {action === 'importing' ? 'Importuję...' : 'Importuj backup'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        {action === 'confirm-clear' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-danger font-medium">Na pewno?</span>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleClear}
            >
              <Trash2 className="size-3.5" />
              Tak, usuń wszystko
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAction('idle')}
            >
              Anuluj
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-danger hover:bg-danger/10 hover:text-danger hover:border-danger/30"
            onClick={handleClear}
            disabled={isLoading}
          >
            <Trash2 className="size-3.5" />
            {action === 'clearing' ? 'Usuwam...' : 'Wyczyść dane'}
          </Button>
        )}
      </div>

      {/* Status message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            message.type === 'success'
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="size-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="size-3.5 shrink-0" />
          )}
          {message.text}
        </motion.div>
      )}
    </SectionCard>
  );
}

// -------------------------------------------------------------------
// About Section
// -------------------------------------------------------------------

function AboutSection() {
  const { tier } = useTier();

  const tierLabel = tier === 'free' ? 'Darmowy' : tier === 'pro' ? 'Pro' : 'Unlimited';
  const tierColor = tier === 'free' ? 'bg-muted-foreground/20 text-muted-foreground' : tier === 'pro' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400';

  return (
    <SectionCard
      icon={<Info className="size-4" />}
      title="O aplikacji"
      description="Informacje o PodTeksT"
      index={2}
    >
      {/* App info */}
      <div className="flex items-start gap-4 mb-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-white/[0.03]">
          <PTLogo size={28} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold">PodTeksT</span>
            <Badge className={tierColor}>{tierLabel}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            odkryj to, co kryje się między wierszami
          </p>
        </div>
      </div>

      {/* Tech credits */}
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-right font-medium text-foreground/60">AI analiza</span>
          <span>Google Gemini API (gemini-3-flash-preview)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-right font-medium text-foreground/60">Development</span>
          <span>Claude Opus 4.6</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-right font-medium text-foreground/60">Framework</span>
          <span>Next.js 16 + React 19</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-right font-medium text-foreground/60">Prywatność</span>
          <span>Dane przetwarzane lokalnie, żadne rozmowy nie są zapisywane na serwerze</span>
        </div>
      </div>

      {/* Links */}
      <div className="mt-5 flex flex-wrap gap-2">
        <AboutLink href="https://github.com" label="GitHub" />
        <AboutLink href="/pricing" label="Cennik" internal />
      </div>
    </SectionCard>
  );
}

// -------------------------------------------------------------------
// Shared components
// -------------------------------------------------------------------

function SectionCard({
  icon,
  title,
  description,
  children,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="border-border/60 bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <CardTitle className="text-[15px]">{title}</CardTitle>
          </div>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function SettingRow({
  icon,
  label,
  description,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3 min-w-0">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
        checked ? 'bg-blue-500' : 'bg-white/10'
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function AboutLink({ href, label, internal }: { href: string; label: string; internal?: boolean }) {
  const className = "inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:border-border hover:bg-white/[0.04]";

  if (internal) {
    return (
      <a href={href} className={className}>
        {label}
        <ChevronRight className="size-3" />
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}
