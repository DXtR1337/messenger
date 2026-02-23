/**
 * POST /api/discord/search — Web API endpoint for Discord channel search.
 * Proxies to Discord Search API using server-side bot token.
 */

import { rateLimit } from '@/lib/rate-limit';
import { searchChannelMessages } from '../lib/discord-search';

const checkLimit = rateLimit(5, 10 * 60 * 1000); // 5 requests per 10 min

export const dynamic = 'force-dynamic';

function isValidSnowflake(id: string): boolean {
    return /^\d{17,20}$/.test(id);
}

export async function POST(request: Request): Promise<Response> {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
    const { allowed, retryAfter } = checkLimit(ip);
    if (!allowed) {
        return Response.json(
            { error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } },
        );
    }

    let body: { channelId?: string; query?: string; offset?: number };
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { channelId, query, offset } = body;

    if (!channelId || !isValidSnowflake(channelId)) {
        return Response.json(
            { error: 'Nieprawidłowe ID kanału.' },
            { status: 400 },
        );
    }

    if (!query || query.trim().length === 0) {
        return Response.json(
            { error: 'Podaj frazę do wyszukania.' },
            { status: 400 },
        );
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
        return Response.json(
            { error: 'Brak tokenu bota.' },
            { status: 500 },
        );
    }

    try {
        const result = await searchChannelMessages(channelId, botToken, {
            content: query.trim(),
            offset: offset ?? 0,
        }, 1);

        const results = result.messages.map((msg) => ({
            sender: msg.author.global_name ?? msg.author.username,
            content: msg.content,
            timestamp: msg.timestamp,
            messageId: msg.id,
        }));

        return Response.json({
            results,
            totalResults: result.totalResults,
            query: query.trim(),
        });
    } catch (err) {
        return Response.json(
            { error: `Błąd wyszukiwania: ${err instanceof Error ? err.message : 'nieznany'}` },
            { status: 502 },
        );
    }
}
