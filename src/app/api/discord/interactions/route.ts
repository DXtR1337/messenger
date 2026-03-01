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
import { handleCwel } from '../commands/cwel';
import { handleSearchDeferred } from '../commands/search';
import { handleTinder } from '../commands/tinder';
import { handleCourt } from '../commands/court';
import { handleSubtext } from '../commands/subtext';
import { handleSimulate } from '../commands/simulate';
import { handleStandup } from '../commands/standup';
import { handleDeepRoast } from '../commands/deeproast';

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
    const aiCommands = new Set(['roast', 'megaroast', 'personality', 'cwel', 'tinder', 'court', 'subtext', 'simulate', 'standup', 'deeproast']);

    // Search command — deferred but no AI needed
    const searchCommands = new Set(['search']);

    // Website link button — appended to every command response
    const linkComponents = websiteLinkRow(channelId);

    // /analyze — sends a link to the website for full analysis
    if (commandName === 'analyze') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? '';
      const url = `${baseUrl}/analysis/new?channel=${channelId}`;
      return immediateResponse(
        undefined,
        [{
          title: '\u{1F4CA} Pełna analiza kanału',
          description: [
            'Kliknij link poniżej, aby otworzyć pełną analizę z wykresami, heatmapą, profilami osobowości i więcej.',
            '',
            `**[\u{1F517} Otwórz analizę na PodTeksT](${url})**`,
            '',
            '*Bot automatycznie pobierze wiadomości i przeanalizuje kanał.*',
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
          ).catch(editErr => console.error('[Discord/interactions] Failed to edit deferred response after fetch error:', editErr));
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
      // 4-minute safety timeout — must finish before maxDuration (300s)
      const AI_TIMEOUT_MS = 4 * 60 * 1000;
      (async () => {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI command timed out (4 min)')), AI_TIMEOUT_MS),
        );
        try {
          await Promise.race([
            (async () => {
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
                case 'cwel':
                  await handleCwel(interaction, data);
                  break;
                case 'tinder':
                  await handleTinder(interaction, data);
                  break;
                case 'court':
                  await handleCourt(interaction, data);
                  break;
                case 'subtext':
                  await handleSubtext(interaction, data);
                  break;
                case 'simulate':
                  await handleSimulate(interaction, data);
                  break;
                case 'standup':
                  await handleStandup(interaction, data);
                  break;
                case 'deeproast':
                  await handleDeepRoast(interaction, data);
                  break;
              }
              // Send website link button as follow-up after AI response
              await sendFollowUp(interaction.token, undefined, undefined, linkComponents);
            })(),
            timeout,
          ]);
        } catch (err) {
          await editDeferredResponse(
            interaction.token,
            undefined,
            [warningEmbed('Błąd', err instanceof Error ? err.message : 'Nieznany błąd')],
          );
        }
      })().catch(err => console.error('[Discord/interactions] Unhandled in AI command handler:', err));

      return deferredResponse();
    }

    if (searchCommands.has(commandName)) {
      // Search commands defer — search takes ~1-2s
      (async () => {
        try {
          await handleSearchDeferred(interaction);
        } catch (err) {
          await editDeferredResponse(
            interaction.token,
            undefined,
            [warningEmbed('Błąd', err instanceof Error ? err.message : 'Nieznany błąd')],
          );
        }
      })().catch(err => console.error('[Discord/interactions] Unhandled in search handler:', err));

      return deferredResponse();
    }

    return immediateResponse('Nieznana komenda. Użyj /stats, /roast, /megaroast, /cwel, /personality, /tinder, /court, /subtext, /simulate, /standup, /deeproast, /versus, /whosimps, /ghostcheck, /besttime, /catchphrase, /emoji, /nightowl, /ranking, /search lub /analyze.');
  }

  return new Response('Unknown interaction type', { status: 400 });
}
