/**
 * Discord Search API wrapper.
 * Uses GET /channels/{channelId}/messages/search — undocumented but stable since years.
 * Returns matched messages with surrounding context.
 */

import type { DiscordMessage } from '@/lib/parsers/discord';

const DISCORD_API = 'https://discord.com/api/v10';
const MIN_DELAY_MS = 1300; // ~1 req/s with safety margin

let lastSearchTime = 0;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SearchOptions {
    content?: string;
    authorId?: string;
    has?: 'link' | 'embed' | 'file' | 'image' | 'video';
    minId?: string;
    maxId?: string;
    offset?: number;
    sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
    messages: DiscordMessage[];
    contextMessages: DiscordMessage[];
    totalResults: number;
}

/**
 * Search channel messages using Discord Search API.
 * Each "result" from Discord is an array of messages — the match + surrounding context.
 * @param maxPages - max pages to fetch (25 results per page). Default 2.
 */
export async function searchChannelMessages(
    channelId: string,
    botToken: string,
    options: SearchOptions,
    maxPages = 2,
): Promise<SearchResult> {
    const allMatched: DiscordMessage[] = [];
    const allContext: DiscordMessage[] = [];
    let totalResults = 0;
    const seenIds = new Set<string>();

    for (let page = 0; page < maxPages; page++) {
        // Rate limiting — module-level throttle
        const now = Date.now();
        const elapsed = now - lastSearchTime;
        if (elapsed < MIN_DELAY_MS) {
            await sleep(MIN_DELAY_MS - elapsed);
        }
        lastSearchTime = Date.now();

        const url = new URL(`${DISCORD_API}/channels/${channelId}/messages/search`);
        if (options.content) url.searchParams.set('content', options.content);
        if (options.authorId) url.searchParams.set('author_id', options.authorId);
        if (options.has) url.searchParams.set('has', options.has);
        if (options.minId) url.searchParams.set('min_id', options.minId);
        if (options.maxId) url.searchParams.set('max_id', options.maxId);

        const offset = (options.offset ?? 0) + page * 25;
        if (offset > 0) url.searchParams.set('offset', String(offset));
        if (options.sortOrder) url.searchParams.set('sort_order', options.sortOrder);

        const headers: HeadersInit = {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'PodTeksT/1.0',
        };

        const res = await fetch(url.toString(), { headers });

        // Rate limit: reactive
        if (res.status === 429) {
            const retryAfter = res.headers.get('Retry-After');
            const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 + 500 : 5000;
            await sleep(waitMs);
            page--; // retry this page
            continue;
        }

        if (!res.ok) {
            // 403/404 = no access or search not available — fail gracefully
            if (res.status === 403 || res.status === 404) {
                break;
            }
            throw new Error(`Discord Search API error: ${res.status} ${res.statusText}`);
        }

        // Proactive rate limit
        const remaining = res.headers.get('X-RateLimit-Remaining');
        const resetAfter = res.headers.get('X-RateLimit-Reset-After');
        if (remaining === '0' && resetAfter) {
            await sleep(parseFloat(resetAfter) * 1000 + 300);
        }

        const data = await res.json() as {
            total_results: number;
            messages: DiscordMessage[][];  // array of arrays — each inner array is [context, MATCH, context]
        };

        totalResults = data.total_results ?? 0;

        if (!data.messages || data.messages.length === 0) break;

        for (const messageGroup of data.messages) {
            if (!Array.isArray(messageGroup) || messageGroup.length === 0) continue;

            // Discord returns messages in context order — the "hit" is marked with `hit: true`
            // but since the type doesn't include it, the middle message is typically the match
            const midIndex = Math.floor(messageGroup.length / 2);

            for (let i = 0; i < messageGroup.length; i++) {
                const msg = messageGroup[i];
                if (seenIds.has(msg.id)) continue;
                seenIds.add(msg.id);

                if (i === midIndex) {
                    allMatched.push(msg);
                } else {
                    allContext.push(msg);
                }
            }
        }

        // If we got fewer than 25 results, no more pages
        if (data.messages.length < 25) break;
    }

    return {
        messages: allMatched,
        contextMessages: allContext,
        totalResults,
    };
}
