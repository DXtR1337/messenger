/**
 * /search — Discord slash command for searching messages by keyword.
 * Returns top matching messages in an embed. Instant command (no AI).
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { searchChannelMessages } from '../lib/discord-search';

const COLOR_BLUE = 0x3b82f6;
const COLOR_RED = 0xef4444;
const FOOTER = { text: 'PodTeksT Search • podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
    return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export function handleSearch(
    interaction: DiscordInteraction,
): Response {
    const queryOption = interaction.data?.options?.find((o) => o.name === 'query');
    const query = queryOption?.value ? String(queryOption.value).trim() : '';

    if (!query) {
        return Response.json({
            type: 4,
            data: {
                embeds: [{
                    title: '❌ Brak frazy',
                    description: 'Musisz podać frazę do wyszukania.',
                    color: COLOR_RED,
                }],
            },
        });
    }

    const channelId = interaction.channel_id;
    if (!channelId) {
        return Response.json({
            type: 4,
            data: { content: 'Nie mogę rozpoznać kanału.' },
        });
    }

    // Defer — search takes ~1-2s
    // Background search will be done in the deferred handler
    return Response.json({ type: 5 });
}

/**
 * Perform the actual search and edit the deferred response.
 */
export async function handleSearchDeferred(
    interaction: DiscordInteraction,
): Promise<void> {
    const { editDeferredResponse, warningEmbed } = await import('../lib/discord-respond');

    const queryOption = interaction.data?.options?.find((o) => o.name === 'query');
    const query = queryOption?.value ? String(queryOption.value).trim() : '';
    const channelId = interaction.channel_id;

    if (!query || !channelId) {
        await editDeferredResponse(interaction.token, 'Brak frazy lub kanału.');
        return;
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
        await editDeferredResponse(
            interaction.token,
            undefined,
            [warningEmbed('Błąd', 'Brak tokenu bota.')],
        );
        return;
    }

    try {
        const result = await searchChannelMessages(channelId, botToken, {
            content: query,
        }, 1);

        if (result.messages.length === 0) {
            await editDeferredResponse(
                interaction.token,
                undefined,
                [{
                    title: `🔍 Wyniki dla: "${query}"`,
                    description: 'Nie znaleziono żadnych wiadomości.',
                    color: COLOR_BLUE,
                    footer: FOOTER,
                }],
            );
            return;
        }

        // Format top 10 results
        const lines = result.messages.slice(0, 10).map((msg) => {
            const name = msg.author.global_name ?? msg.author.username;
            const date = new Date(msg.timestamp).toISOString().split('T')[0];
            const time = new Date(msg.timestamp).toTimeString().split(' ')[0].slice(0, 5);
            const content = msg.content.length > 150 ? msg.content.slice(0, 147) + '...' : msg.content;
            return `**[${date} ${time}]** ${name}:\n> ${content}`;
        });

        const embeds: DiscordEmbed[] = [{
            title: `🔍 Wyniki dla: "${query}" (${result.totalResults} znalezionych)`,
            description: trimToEmbed(lines.join('\n\n')),
            color: COLOR_BLUE,
            footer: FOOTER,
        }];

        await editDeferredResponse(interaction.token, undefined, embeds);
    } catch (err) {
        await editDeferredResponse(
            interaction.token,
            undefined,
            [warningEmbed('Błąd wyszukiwania', `${err instanceof Error ? err.message : 'Nieznany błąd'}`)],
        );
    }
}
