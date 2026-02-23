/**
 * Drama search sampler — orchestrates keyword searches across a Discord channel
 * and returns the most dramatic/interesting messages for AI prompt enrichment.
 */

import { searchChannelMessages } from './discord-search';
import { selectDramaKeywords } from './drama-keywords';

const DISCORD_EPOCH = 1420070400000;

/** Convert a Unix timestamp (ms) to the minimum Discord Snowflake ID for that moment.
 *  float64 precision loss (~60μs) is negligible for day-level time filters. */
function timestampToSnowflake(timestampMs: number): string {
  const diff = Math.max(0, timestampMs - DISCORD_EPOCH);
  // << 22 = * 4194304; snowflake IDs use ms since Discord epoch shifted left 22 bits
  return (diff * 4194304).toFixed(0);
}

export interface DramaMessage {
    sender: string;
    content: string;
    timestamp: number;
    keyword: string;
    messageId: string;
}

export interface DramaSearchResult {
    dramaMessages: DramaMessage[];
    totalDramaFound: number;
    keywordsSearched: string[];
}

/**
 * Search channel for drama keywords and return deduplicated, sorted results.
 * @param channelId Discord channel ID
 * @param botToken Bot token for API access
 * @param options.maxKeywords Number of keywords to search (default 6)
 * @param options.maxTotalMessages Max messages to return (default 100)
 * @param options.since Restrict search to messages after this timestamp (ms). Default: all time.
 * @returns Drama messages sorted by timestamp (newest first)
 */
export async function findDramaMessages(
    channelId: string,
    botToken: string,
    options?: { maxKeywords?: number; maxTotalMessages?: number; since?: number },
): Promise<DramaSearchResult> {
    const maxKeywords = options?.maxKeywords ?? 6;
    const maxTotal = options?.maxTotalMessages ?? 100;
    const minId = options?.since ? timestampToSnowflake(options.since) : undefined;

    const keywords = selectDramaKeywords(maxKeywords);
    const seenIds = new Set<string>();
    const allMessages: DramaMessage[] = [];
    let totalFound = 0;

    // Search keywords sequentially (rate limit: ~1 req/s)
    for (const keyword of keywords) {
        try {
            const result = await searchChannelMessages(channelId, botToken, {
                content: keyword,
                ...(minId ? { minId } : {}),
            }, 1); // 1 page = up to 25 results per keyword

            totalFound += result.totalResults;

            for (const msg of result.messages) {
                if (seenIds.has(msg.id)) continue;
                if (msg.author.bot) continue;
                seenIds.add(msg.id);

                const displayName = msg.author.global_name ?? msg.author.username;

                allMessages.push({
                    sender: displayName,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp).getTime(),
                    keyword,
                    messageId: msg.id,
                });
            }
        } catch {
            // Individual keyword failure — skip and continue
            continue;
        }
    }

    // Sort newest first, then cap
    allMessages.sort((a, b) => b.timestamp - a.timestamp);
    const capped = allMessages.slice(0, maxTotal);

    return {
        dramaMessages: capped,
        totalDramaFound: totalFound,
        keywordsSearched: keywords,
    };
}
