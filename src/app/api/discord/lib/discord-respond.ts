/**
 * Discord response helpers.
 * Handles deferred responses and webhook follow-ups.
 */

import type { DiscordEmbed, DiscordComponent, InteractionResponse } from './discord-types';
import { InteractionResponseType } from './discord-types';

const DISCORD_API = 'https://discord.com/api/v10';

function getAppId(): string {
  const appId = process.env.DISCORD_APP_ID;
  if (!appId) throw new Error('DISCORD_APP_ID not set');
  return appId;
}

// ── Immediate Responses ─────────────────────────────────────

/** Respond with PONG (for Discord's ping verification) */
export function pongResponse(): Response {
  return Response.json({ type: InteractionResponseType.PONG });
}

/** Respond immediately with content/embeds/components */
export function immediateResponse(content?: string, embeds?: DiscordEmbed[], components?: DiscordComponent[]): Response {
  const data: InteractionResponse = {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {},
  };
  if (content) data.data!.content = content;
  if (embeds) data.data!.embeds = embeds;
  if (components) data.data!.components = components;
  return Response.json(data);
}

/** Respond with "thinking..." (deferred), then follow up later */
export function deferredResponse(): Response {
  return Response.json({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  });
}

// ── Follow-up (after deferred) ──────────────────────────────

/** Edit the deferred response with final content */
export async function editDeferredResponse(
  interactionToken: string,
  content?: string,
  embeds?: DiscordEmbed[],
  components?: DiscordComponent[],
): Promise<void> {
  const appId = getAppId();
  const url = `${DISCORD_API}/webhooks/${appId}/${interactionToken}/messages/@original`;

  const body: Record<string, unknown> = {};
  if (content) body.content = content;
  if (embeds) body.embeds = embeds;
  if (components) body.components = components;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to edit deferred response: ${res.status} ${text}`);
  }
}

/** Send a follow-up message (additional message after deferred) */
export async function sendFollowUp(
  interactionToken: string,
  content?: string,
  embeds?: DiscordEmbed[],
  components?: DiscordComponent[],
): Promise<void> {
  const appId = getAppId();
  const url = `${DISCORD_API}/webhooks/${appId}/${interactionToken}`;

  const body: Record<string, unknown> = {};
  if (content) body.content = content;
  if (embeds) body.embeds = embeds;
  if (components) body.components = components;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to send follow-up: ${res.status} ${text}`);
  }
}

// ── Embed builders ──────────────────────────────────────────

/** Brand colors */
const COLOR_BLUE = 0x3b82f6;
const COLOR_PURPLE = 0xa855f7;
const COLOR_GREEN = 0x10b981;
const COLOR_RED = 0xef4444;
const COLOR_YELLOW = 0xf59e0b;

export function statsEmbed(title: string, fields: Array<{ name: string; value: string; inline?: boolean }>): DiscordEmbed {
  return {
    title,
    color: COLOR_BLUE,
    fields,
    footer: { text: 'PodTeksT \u2022 podtekst.app' },
  };
}

export function roastEmbed(title: string, description: string): DiscordEmbed {
  return {
    title,
    description,
    color: COLOR_PURPLE,
    footer: { text: 'PodTeksT Roast Machine \u2022 podtekst.app' },
  };
}

export function rankingEmbed(title: string, description: string): DiscordEmbed {
  return {
    title,
    description,
    color: COLOR_GREEN,
    footer: { text: 'PodTeksT \u2022 podtekst.app' },
  };
}

export function warningEmbed(title: string, description: string): DiscordEmbed {
  return {
    title,
    description,
    color: COLOR_RED,
    footer: { text: 'PodTeksT \u2022 podtekst.app' },
  };
}

export function alertEmbed(title: string, description: string): DiscordEmbed {
  return {
    title,
    description,
    color: COLOR_YELLOW,
    footer: { text: 'PodTeksT \u2022 podtekst.app' },
  };
}

// ── Website link button ─────────────────────────────────────

/** Build ACTION_ROW with a LINK button to the website analysis page */
export function websiteLinkRow(channelId: string): DiscordComponent[] {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? '';
  return [
    {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2,    // BUTTON
          style: 5,   // LINK
          label: 'Otwórz pełną analizę na stronie',
          url: `${baseUrl}/analysis/new?channel=${channelId}`,
          emoji: { name: '\uD83D\uDD17' },
        },
      ],
    },
  ];
}
