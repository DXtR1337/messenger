/**
 * Discord Interactions Endpoint.
 * Handles slash commands via HTTP POST — no WebSocket needed.
 */

import { verifyDiscordSignature } from '../lib/verify-signature';
import { InteractionType } from '../lib/discord-types';
import type { DiscordInteraction, InteractionResponse } from '../lib/discord-types';
import { pongResponse, deferredResponse, immediateResponse, editDeferredResponse, sendFollowUp, warningEmbed, websiteLinkRow } from '../lib/discord-respond';
import { fetchAndCacheAnalysis, getCachedAnalysis, invalidateCache } from '../lib/channel-cache';

// Command handlers
import { handleStats } from '../commands/stats';
import { handleVersus } from '../commands/versus';
import { handleWhoSimps } from '../commands/whosimps';
import { handleGhostCheck } from '../commands/ghostcheck';
import { handleBestTime } from '../commands/besttime';
import { handleCatchphrase } from '../commands/catchphrase';
import { handleEmoji } from '../commands/emoji';
import { handleNightOwl } from '../commands/nightowl';
import { handleRanking } from '../commands/ranking';
import { handleRoast } from '../commands/roast';
import { handleMegaroast } from '../commands/megaroast';
import { handlePersonality } from '../commands/personality';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('DISCORD_BOT_TOKEN not set');
  return token;
}

/** Extract the 'messages' option value (number of messages to fetch). */
function getMessageLimit(interaction: DiscordInteraction): number | undefined {
  const opt = interaction.data?.options?.find((o) => o.name === 'messages');
  if (!opt?.value) return undefined;
  const parsed = parseInt(String(opt.value), 10);
  return isNaN(parsed) ? undefined : parsed;
}

export async function POST(request: Request): Promise<Response> {
  // Read body as text for signature verification
  const body = await request.text();
  const signature = request.headers.get('X-Signature-Ed25519') ?? '';
  const timestamp = request.headers.get('X-Signature-Timestamp') ?? '';

  // Verify signature
  const isValid = await verifyDiscordSignature(signature, timestamp, body);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Handle PING (Discord verification)
  if (interaction.type === InteractionType.PING) {
    return pongResponse();
  }

  // Handle Application Commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data) {
    const commandName = interaction.data.name;
    const channelId = interaction.channel_id;

    if (!channelId) {
      return immediateResponse('Nie mogę rozpoznać kanału.');
    }

    // Extract optional message limit
    const messageLimit = getMessageLimit(interaction);

    // Instant commands — try cache first, if miss return loading message
    const instantCommands = new Set([
      'stats', 'versus', 'whosimps', 'ghostcheck',
      'besttime', 'catchphrase', 'emoji', 'nightowl', 'ranking',
    ]);

    // AI commands — always defer
    const aiCommands = new Set(['roast', 'megaroast', 'personality']);

    // Website link button — appended to every command response
    const linkComponents = websiteLinkRow(channelId);

    // /analyze — sends a link to the website for full analysis
    if (commandName === 'analyze') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://chatscope-9278095424.europe-west1.run.app';
      const url = `${baseUrl}/analysis/new?channel=${channelId}`;
      return immediateResponse(
        undefined,
        [{
          title: '\u{1F4CA} Pe\u0142na analiza kana\u0142u',
          description: [
            'Kliknij link poni\u017Cej, aby otworzy\u0107 pe\u0142n\u0105 analiz\u0119 z wykresami, heatmap\u0105, profilami osobowo\u015Bci i wi\u0119cej.',
            '',
            `**[\u{1F517} Otw\u00F3rz analiz\u0119 na PodTeksT](${url})**`,
            '',
            '*Bot automatycznie pobierze wiadomo\u015Bci i przeanalizuje kana\u0142.*',
          ].join('\n'),
          color: 0x3b82f6,
          footer: { text: 'PodTeksT \u2022 podtekst.app' },
        }],
        linkComponents,
      );
    }

    if (instantCommands.has(commandName)) {
      // If user specified a message limit, invalidate cache to re-fetch
      if (messageLimit) {
        invalidateCache(channelId);
      }

      // Check cache
      const cached = getCachedAnalysis(channelId);

      if (cached && !messageLimit) {
        // Cache hit — respond immediately with website link button
        try {
          let handlerResponse: Response;
          switch (commandName) {
            case 'stats': handlerResponse = handleStats(interaction, cached); break;
            case 'versus': handlerResponse = handleVersus(interaction, cached); break;
            case 'whosimps': handlerResponse = handleWhoSimps(interaction, cached); break;
            case 'ghostcheck': handlerResponse = handleGhostCheck(interaction, cached); break;
            case 'besttime': handlerResponse = handleBestTime(interaction, cached); break;
            case 'catchphrase': handlerResponse = handleCatchphrase(interaction, cached); break;
            case 'emoji': handlerResponse = handleEmoji(interaction, cached); break;
            case 'nightowl': handlerResponse = handleNightOwl(interaction, cached); break;
            case 'ranking': handlerResponse = handleRanking(interaction, cached); break;
            default: return immediateResponse('Nieznana komenda.');
          }
          // Inject website link button into response
          const json = await handlerResponse.json() as InteractionResponse;
          if (json.data) json.data.components = linkComponents;
          return Response.json(json);
        } catch (err) {
          return immediateResponse(`Błąd: ${err instanceof Error ? err.message : 'nieznany'}`);
        }
      }

      // Cache miss — defer and fetch in background
      const botToken = getBotToken();

      // Fire and forget: fetch, cache, then edit deferred response
      fetchAndCacheAnalysis(channelId, botToken, messageLimit)
        .then((data) => {
          let resultResponse: Response;
          switch (commandName) {
            case 'stats': resultResponse = handleStats(interaction, data); break;
            case 'versus': resultResponse = handleVersus(interaction, data); break;
            case 'whosimps': resultResponse = handleWhoSimps(interaction, data); break;
            case 'ghostcheck': resultResponse = handleGhostCheck(interaction, data); break;
            case 'besttime': resultResponse = handleBestTime(interaction, data); break;
            case 'catchphrase': resultResponse = handleCatchphrase(interaction, data); break;
            case 'emoji': resultResponse = handleEmoji(interaction, data); break;
            case 'nightowl': resultResponse = handleNightOwl(interaction, data); break;
            case 'ranking': resultResponse = handleRanking(interaction, data); break;
            default: resultResponse = immediateResponse('Nieznana komenda.');
          }
          // Extract embeds from the response body to send via webhook
          return resultResponse.json().then((json: { data?: { embeds?: unknown[]; content?: string } }) => {
            return editDeferredResponse(
              interaction.token,
              json.data?.content as string | undefined,
              json.data?.embeds as import('../lib/discord-types').DiscordEmbed[] | undefined,
              linkComponents,
            );
          });
        })
        .catch((err) => {
          editDeferredResponse(
            interaction.token,
            undefined,
            [warningEmbed('Błąd', `Nie udało się pobrać wiadomości: ${err instanceof Error ? err.message : 'nieznany błąd'}`)],
          );
        });

      return deferredResponse();
    }

    if (aiCommands.has(commandName)) {
      // AI commands always defer — they need Gemini API call
      const botToken = getBotToken();

      // If user specified a message limit, invalidate cache to re-fetch
      if (messageLimit) {
        invalidateCache(channelId);
      }

      // Fire and forget: fetch/cache + AI call, then edit deferred
      (async () => {
        try {
          const data = await fetchAndCacheAnalysis(channelId, botToken, messageLimit);

          switch (commandName) {
            case 'roast':
              await handleRoast(interaction, data);
              break;
            case 'megaroast':
              await handleMegaroast(interaction, data);
              break;
            case 'personality':
              await handlePersonality(interaction, data);
              break;
          }
          // Send website link button as follow-up after AI response
          await sendFollowUp(interaction.token, undefined, undefined, linkComponents);
        } catch (err) {
          await editDeferredResponse(
            interaction.token,
            undefined,
            [warningEmbed('Błąd', err instanceof Error ? err.message : 'Nieznany błąd')],
          );
        }
      })();

      return deferredResponse();
    }

    return immediateResponse('Nieznana komenda. U\u017Cyj /stats, /roast, /personality, /versus, /whosimps, /ghostcheck, /besttime, /catchphrase, /emoji, /nightowl, /ranking lub /analyze.');
  }

  return new Response('Unknown interaction type', { status: 400 });
}
