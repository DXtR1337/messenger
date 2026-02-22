/**
 * In-memory channel analysis cache.
 * Stores parsed conversations + quantitative analysis with TTL.
 * LRU eviction when max entries exceeded.
 */

import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { parseDiscordMessages } from '@/lib/parsers/discord';
import type { DiscordMessage } from '@/lib/parsers/discord';
import { computeQuantitativeAnalysis } from '@/lib/analysis/quantitative';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 50;
const DISCORD_API = 'https://discord.com/api/v10';
const MESSAGES_PER_PAGE = 100;
const DELAY_BETWEEN_REQUESTS_MS = 200;
const MAX_MESSAGES_FOR_BOT = 5_000;

interface CacheEntry {
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  createdAt: number;
  expiresAt: number;
  lastAccess: number;
}

const cache = new Map<string, CacheEntry>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function evictLRU(): void {
  if (cache.size < MAX_ENTRIES) return;

  let oldestKey: string | null = null;
  let oldestAccess = Infinity;

  for (const [key, entry] of cache) {
    if (entry.lastAccess < oldestAccess) {
      oldestAccess = entry.lastAccess;
      oldestKey = key;
    }
  }

  if (oldestKey) cache.delete(oldestKey);
}

function cleanExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}

/** Get cached analysis for a channel, or null if not cached/expired */
export function getCachedAnalysis(channelId: string): { conversation: ParsedConversation; quantitative: QuantitativeAnalysis } | null {
  cleanExpired();
  const entry = cache.get(channelId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(channelId);
    return null;
  }
  entry.lastAccess = Date.now();
  return { conversation: entry.conversation, quantitative: entry.quantitative };
}

/** Fetch all messages from a channel, parse, compute quant, and cache */
export async function fetchAndCacheAnalysis(
  channelId: string,
  botToken: string,
  maxMessages: number = MAX_MESSAGES_FOR_BOT,
): Promise<{ conversation: ParsedConversation; quantitative: QuantitativeAnalysis }> {
  // Check cache first
  const cached = getCachedAnalysis(channelId);
  if (cached) return cached;

  const headers: HeadersInit = {
    'Authorization': `Bot ${botToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'PodTeksT/1.0',
  };

  // Fetch channel name
  let channelName = 'Discord';
  try {
    const channelRes = await fetch(`${DISCORD_API}/channels/${channelId}`, { headers });
    if (channelRes.ok) {
      const data = await channelRes.json();
      channelName = data.name ?? 'Discord';
    }
  } catch {
    // Use default name
  }

  // Paginate messages
  const allMessages: DiscordMessage[] = [];
  let beforeId: string | undefined;

  while (true) {
    const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
    url.searchParams.set('limit', String(MESSAGES_PER_PAGE));
    if (beforeId) url.searchParams.set('before', beforeId);

    const res = await fetch(url.toString(), { headers });

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      await sleep(retryAfter ? parseFloat(retryAfter) * 1000 + 200 : 5000);
      continue;
    }

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Bot nie ma uprawnień do czytania wiadomości na tym kanale. Sprawdź uprawnienia: View Channel + Read Message History.');
      }
      if (res.status === 404) {
        throw new Error('Kanał nie istnieje lub bot nie ma do niego dostępu.');
      }
      console.error(`[channel-cache] Fetch failed: ${res.status} ${res.statusText}`);
      break;
    }

    const remaining = res.headers.get('X-RateLimit-Remaining');
    const resetAfter = res.headers.get('X-RateLimit-Reset-After');
    if (remaining === '0' && resetAfter) {
      await sleep(parseFloat(resetAfter) * 1000 + 200);
    }

    const messages = (await res.json()) as DiscordMessage[];
    if (!Array.isArray(messages) || messages.length === 0) break;

    allMessages.push(...messages);
    beforeId = messages[messages.length - 1].id;

    if (allMessages.length >= maxMessages) break;
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  if (allMessages.length === 0) {
    throw new Error('Brak wiadomości w tym kanale.');
  }

  // Parse and compute
  const conversation = parseDiscordMessages(allMessages, channelName);
  const quantitative = computeQuantitativeAnalysis(conversation);

  // Cache result
  evictLRU();
  const now = Date.now();
  cache.set(channelId, {
    conversation,
    quantitative,
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
    lastAccess: now,
  });

  return { conversation, quantitative };
}

/** Force invalidate cache for a channel */
export function invalidateCache(channelId: string): void {
  cache.delete(channelId);
}

/** Get cache stats */
export function getCacheStats(): { size: number; maxSize: number } {
  cleanExpired();
  return { size: cache.size, maxSize: MAX_ENTRIES };
}
