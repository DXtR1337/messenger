/**
 * Discord file upload helper for sending images via webhook follow-ups.
 */

import type { DiscordEmbed } from './discord-types';

const DISCORD_API = 'https://discord.com/api/v10';

function getAppId(): string {
  const appId = process.env.DISCORD_APP_ID;
  if (!appId) throw new Error('DISCORD_APP_ID not set');
  return appId;
}

/** Send a follow-up message with a file attachment (for image uploads) */
export async function sendFollowUpWithFile(
  interactionToken: string,
  fileBuffer: Uint8Array,
  fileName: string,
  mimeType: string,
  content?: string,
  embeds?: DiscordEmbed[],
): Promise<string | null> {
  const appId = getAppId();
  const url = `${DISCORD_API}/webhooks/${appId}/${interactionToken}`;

  const formData = new FormData();

  const payloadJson: Record<string, unknown> = {};
  if (content) payloadJson.content = content;
  if (embeds) {
    payloadJson.embeds = embeds.map((e) => ({
      ...e,
      image: e.image ? { url: e.image.url } : undefined,
    }));
    payloadJson.attachments = [{ id: 0, filename: fileName }];
  }
  formData.append('payload_json', JSON.stringify(payloadJson));

  const ab = new ArrayBuffer(fileBuffer.byteLength);
  new Uint8Array(ab).set(fileBuffer);
  const blob = new Blob([ab], { type: mimeType });
  formData.append('files[0]', blob, fileName);

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to send follow-up with file: ${res.status} ${text}`);
    return null;
  }

  return fileName;
}
