'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, ChevronDown, Hash, Loader2, Lock, RefreshCw, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseDiscordMessages } from '@/lib/parsers/discord';
import type { DiscordMessage } from '@/lib/parsers/discord';
import { computeQuantitativeAnalysis } from '@/lib/analysis/quantitative';
import { saveAnalysis, generateId } from '@/lib/utils';
import type { StoredAnalysis, RelationshipContext } from '@/lib/analysis/types';
import { trackEvent } from '@/lib/analytics/events';

type DiscordState = 'idle' | 'loading_guilds' | 'fetching' | 'parsing' | 'saving' | 'complete' | 'error';

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  categoryId: string | null;
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  iconUrl: string | null;
  channels: Channel[];
}

interface DiscordImportProps {
  relationshipType: RelationshipContext | null;
  autoChannelId?: string | null;
}

export default function DiscordImport({ relationshipType, autoChannelId }: DiscordImportProps) {
  const router = useRouter();
  const [state, setState] = useState<DiscordState>('idle');
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [channelName, setChannelName] = useState('');
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualChannelId, setManualChannelId] = useState('');
  const [messageLimit, setMessageLimit] = useState(5000);
  const [pin, setPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Restore verified PIN from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('podtekst-discord-pin');
    if (stored) {
      setPin(stored);
      setPinVerified(true);
    }
  }, []);

  const MESSAGE_LIMITS = [
    { value: 200, label: '200', time: '~10s' },
    { value: 500, label: '500', time: '~20s' },
    { value: 1000, label: '1 000', time: '~1 min' },
    { value: 2000, label: '2 000', time: '~2 min' },
    { value: 5000, label: '5 000', time: '~5 min', recommended: true },
    { value: 10000, label: '10 000', time: '~10 min' },
    { value: 20000, label: '20 000', time: '~15 min', warning: true },
    { value: 30000, label: '30 000', time: '~20 min', warning: true },
    { value: 50000, label: '50 000', time: '~30 min', warning: true },
    { value: 100000, label: '100 000', time: '~60 min', warning: true },
    { value: 200000, label: '200 000', time: '~2h', warning: true },
  ];

  const verifyPin = useCallback(async (pinToCheck: string) => {
    setPinError('');
    try {
      const res = await fetch(`/api/discord/guilds?pin=${encodeURIComponent(pinToCheck)}`);
      if (res.status === 401) {
        setPinError('Nieprawidłowy PIN.');
        return;
      }
      // PIN valid — store and mark verified
      sessionStorage.setItem('podtekst-discord-pin', pinToCheck);
      setPinVerified(true);
      setPinError('');
      // Also process the guilds response we already have
      if (res.ok) {
        const data = await res.json();
        setGuilds(data.guilds ?? []);
      }
    } catch {
      setPinError('Błąd połączenia.');
    }
  }, []);

  // Load guilds after PIN is verified (skip when auto-channel link)
  useEffect(() => {
    if (!autoChannelId && pinVerified) loadGuilds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinVerified]);

  const loadGuilds = useCallback(async () => {
    const hadGuilds = guilds.length > 0;
    setState('loading_guilds');
    if (!hadGuilds) setError('');
    try {
      const storedPin = sessionStorage.getItem('podtekst-discord-pin') ?? '';
      const res = await fetch(`/api/discord/guilds?pin=${encodeURIComponent(storedPin)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          // PIN invalid — clear verified state
          setPinVerified(false);
          sessionStorage.removeItem('podtekst-discord-pin');
          setPinError('PIN wygasł. Wpisz ponownie.');
          setState('idle');
          return;
        }
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setGuilds(data.guilds ?? []);
      setError('');
      setState('idle');
    } catch (err) {
      setState(hadGuilds ? 'idle' : 'error');
      setError(err instanceof Error ? err.message : 'Nie udało się pobrać serwerów.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guilds.length]);

  const startFetch = useCallback(async (channelId: string) => {
    setError('');
    setState('fetching');
    setFetchedCount(0);
    setChannelName('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/discord/fetch-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channelId.trim(), messageLimit }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error('Brak odpowiedzi z serwera.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let allMessages: DiscordMessage[] = [];
      let resolvedChannelName = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'progress') {
              setFetchedCount(event.fetched);
              if (event.channelName) {
                setChannelName(event.channelName);
                resolvedChannelName = event.channelName;
              }
            } else if (event.type === 'complete') {
              allMessages = event.messages;
              resolvedChannelName = event.channelName ?? resolvedChannelName;
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== jsonStr) {
              throw parseErr;
            }
          }
        }
      }

      if (allMessages.length === 0) {
        throw new Error('Nie znaleziono wiadomości w tym kanale.');
      }

      // Parse messages
      setState('parsing');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const conversation = parseDiscordMessages(allMessages, resolvedChannelName);
      conversation.metadata.discordChannelId = channelId.trim();

      if (conversation.metadata.totalMessages < 100) {
        throw new Error(
          `Kanał zawiera tylko ${conversation.metadata.totalMessages} wiadomości. Minimum to 100.`,
        );
      }

      // Quantitative analysis
      const quantitative = computeQuantitativeAnalysis(conversation);

      // Save
      setState('saving');
      const id = generateId();
      const analysis: StoredAnalysis = {
        id,
        title: conversation.title,
        createdAt: Date.now(),
        relationshipContext: relationshipType ?? undefined,
        conversation,
        quantitative,
      };

      await saveAnalysis(analysis);

      trackEvent({
        name: 'upload_complete',
        params: {
          platform: 'discord',
          messageCount: conversation.metadata.totalMessages,
          durationDays: conversation.metadata.durationDays,
        },
      });

      setState('complete');
      await new Promise((resolve) => setTimeout(resolve, 600));

      sessionStorage.setItem('podtekst-celebrate-' + id, '1');
      router.push(`/analysis/${id}`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setState('error');
      setError(err instanceof Error ? err.message : 'Nieznany błąd.');
    }
  }, [messageLimit, relationshipType, router]);

  // No auto-start — kiosk mode shows limit picker + start button

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setFetchedCount(0);
  }, []);

  const isProcessing = state === 'fetching' || state === 'parsing' || state === 'saving' || state === 'complete';

  return (
    <div className="space-y-4">
      {/* Auto-channel kiosk: message limit picker + start */}
      {autoChannelId && !isProcessing && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Ile wiadomości pobrać?</label>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_LIMITS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMessageLimit(opt.value)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    messageLimit === opt.value
                      ? opt.warning
                        ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                        : 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-card-hover'
                  }`}
                >
                  {opt.label}
                  {opt.recommended && messageLimit !== opt.value && (
                    <span className="ml-1 text-[10px] text-muted-foreground/60">*</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Szacowany czas: {MESSAGE_LIMITS.find((o) => o.value === messageLimit)?.time ?? '?'}
              </p>
              {messageLimit > 10000 && (
                <p className="text-xs text-yellow-400">
                  Ponad 10k wiadomości = długie pobieranie
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={() => startFetch(autoChannelId)}
            className="w-full gap-2"
          >
            <Server className="size-4" />
            Rozpocznij analizę
          </Button>
        </div>
      )}

      {/* PIN gate — shown before guilds load */}
      {!autoChannelId && !pinVerified && !isProcessing && (
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 text-primary" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">PIN dostępu</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Wpisz PIN żeby uzyskać dostęp do serwerów bota.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && pin.trim()) verifyPin(pin.trim()); }}
                  placeholder="PIN"
                  className="w-40 rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
                />
                <Button
                  onClick={() => verifyPin(pin.trim())}
                  disabled={!pin.trim()}
                  size="sm"
                >
                  Weryfikuj
                </Button>
              </div>
              {pinError && (
                <p className="text-xs text-red-400">{pinError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full UI only when NOT in auto-channel mode AND PIN verified */}
      {!autoChannelId && pinVerified && (
        <>
          {/* Step 1: Invite bot CTA */}
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 size-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Dodaj PodTeksT BoT na swój serwer Discord
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bot potrzebuje dostępu do kanału żeby pobrać wiadomości do analizy.
                </p>
                <a
                  href="https://discord.com/api/oauth2/authorize?client_id=1474456884013694986&permissions=66560&scope=bot%20applications.commands"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#5865F2] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#4752C4]"
                >
                  <Bot className="size-3.5" />
                  Dodaj na serwer
                </a>
              </div>
            </div>
          </div>

          {/* Step 2: Server + Channel picker */}
          {state === 'loading_guilds' && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <Loader2 className="size-4 animate-spin text-primary" />
              <p className="text-sm text-foreground">Ładowanie serwerów...</p>
            </div>
          )}

          {state !== 'loading_guilds' && guilds.length > 0 && !isProcessing && (
            <div className="space-y-3">
              {/* Server selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Serwer</label>
                <div className="grid gap-2">
                  {guilds.map((guild) => (
                    <button
                      key={guild.id}
                      onClick={() => {
                        setSelectedGuild(guild);
                        setSelectedChannel(null);
                      }}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selectedGuild?.id === guild.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:bg-card-hover'
                      }`}
                    >
                      {guild.iconUrl ? (
                        <img src={guild.iconUrl} alt="" className="size-8 rounded-full" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-border text-xs font-bold text-muted-foreground">
                          {guild.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{guild.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {guild.channels.length} kanałów tekstowych
                        </p>
                      </div>
                      {selectedGuild?.id === guild.id && (
                        <div className="size-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  onClick={loadGuilds}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RefreshCw className="size-3" />
                  Odśwież listę serwerów
                </button>
              </div>

              {/* Channel selector */}
              {selectedGuild && selectedGuild.channels.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Kanał</label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card">
                    {selectedGuild.channels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          selectedChannel?.id === channel.id
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-card-hover'
                        }`}
                      >
                        <Hash className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{channel.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedGuild && selectedGuild.channels.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Bot nie widzi żadnych kanałów tekstowych na tym serwerze. Sprawdź uprawnienia bota.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Message limit selector */}
          {(selectedChannel || showManual) && !isProcessing && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Ile wiadomości pobrać?</label>
              <div className="flex flex-wrap gap-1.5">
                {MESSAGE_LIMITS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMessageLimit(opt.value)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      messageLimit === opt.value
                        ? opt.warning
                          ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                          : 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-card-hover'
                    }`}
                  >
                    {opt.label}
                    {opt.recommended && messageLimit !== opt.value && (
                      <span className="ml-1 text-[10px] text-muted-foreground/60">*</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Szacowany czas: {MESSAGE_LIMITS.find((o) => o.value === messageLimit)?.time ?? '?'}
                </p>
                {messageLimit > 10000 && (
                  <p className="text-xs text-yellow-400">
                    Ponad 10k wiadomości = długie pobieranie
                  </p>
                )}
              </div>
            </div>
          )}

          {/* No guilds — bot not on any server */}
          {state === 'idle' && guilds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Bot nie jest jeszcze na żadnym serwerze. Kliknij &quot;Dodaj na serwer&quot; powyżej.
            </p>
          )}
        </>
      )}

      {/* Progress display */}
      {isProcessing && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="size-4 animate-spin text-primary" />
          <div className="flex-1">
            {state === 'fetching' && (
              <p className="text-sm text-foreground">
                Pobrano <span className="font-mono font-bold text-primary">{fetchedCount.toLocaleString()}</span> wiadomości
                {channelName && <span className="text-muted-foreground"> z #{channelName}</span>}
                ...
              </p>
            )}
            {state === 'parsing' && (
              <p className="text-sm text-foreground">Parsowanie wiadomości...</p>
            )}
            {state === 'saving' && (
              <p className="text-sm text-foreground">Zapisywanie analizy...</p>
            )}
            {state === 'complete' && (
              <p className="text-sm text-foreground">Gotowe! Przekierowuję...</p>
            )}
          </div>
          {state === 'fetching' && (
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Anuluj
            </Button>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Action buttons — hidden in auto-channel mode, requires PIN */}
      {!autoChannelId && pinVerified && !isProcessing && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowManual(!showManual)}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className="size-3 transition-transform"
              style={{ transform: showManual ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            Wpisz ID kanału ręcznie
          </button>

          <div className="flex gap-2">
            {state === 'error' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setState('idle'); setError(''); }}
              >
                Spróbuj ponownie
              </Button>
            )}
            <Button
              onClick={() => {
                if (showManual && manualChannelId.trim()) {
                  startFetch(manualChannelId.trim());
                } else if (selectedChannel) {
                  startFetch(selectedChannel.id);
                }
              }}
              disabled={showManual ? !manualChannelId.trim() : !selectedChannel}
              className="gap-2"
              size="sm"
            >
              <Server className="size-4" />
              Analizuj kanał
            </Button>
          </div>
        </div>
      )}

      {/* Manual channel ID input — hidden in auto-channel mode, requires PIN */}
      {!autoChannelId && pinVerified && showManual && !isProcessing && (
        <div className="space-y-1.5">
          <input
            type="text"
            value={manualChannelId}
            onChange={(e) => setManualChannelId(e.target.value)}
            placeholder="ID kanału (np. 1234567890123456789)"
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
          />
          <p className="text-xs text-muted-foreground/60">
            Prawy klik na kanał &rarr; Kopiuj ID kanału (wymaga trybu dewelopera w Discord)
          </p>
        </div>
      )}
    </div>
  );
}
