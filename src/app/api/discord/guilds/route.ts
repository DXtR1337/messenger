/**
 * GET /api/discord/guilds — List all servers the PodTeksT bot is on + their text channels.
 * Uses server-side DISCORD_BOT_TOKEN — no user token needed.
 * Includes retry logic for Discord 429 rate limits.
 */

export const dynamic = 'force-dynamic';

const DISCORD_API = 'https://discord.com/api/v10';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface DiscordChannelRaw {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string | null;
}

interface GuildWithChannels {
  id: string;
  name: string;
  icon: string | null;
  iconUrl: string | null;
  channels: Array<{
    id: string;
    name: string;
    type: number;
    position: number;
    categoryId: string | null;
  }>;
}

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('DISCORD_BOT_TOKEN not set');
  return token;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch with automatic 429 retry (up to 2 retries). */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
): Promise<globalThis.Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;

    const retryAfter = res.headers.get('Retry-After');
    const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 + 200 : 2000;
    if (attempt < maxRetries) {
      await sleep(waitMs);
    } else {
      return res;
    }
  }
  // unreachable, but TS needs it
  return fetch(url, options);
}

function guildIconUrl(guildId: string, icon: string | null): string | null {
  return icon ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=64` : null;
}

export async function GET(request: Request): Promise<Response> {
  // PIN protection — only authorized users can list bot servers
  const requiredPin = process.env.DISCORD_ACCESS_PIN;
  if (requiredPin) {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin');
    if (pin !== requiredPin) {
      return Response.json(
        { error: 'Nieprawidłowy PIN dostępu.' },
        { status: 401 },
      );
    }
  }

  let botToken: string;
  try {
    botToken = getBotToken();
  } catch {
    return Response.json(
      { error: 'Bot nie jest skonfigurowany.' },
      { status: 500 },
    );
  }

  const headers: HeadersInit = {
    'Authorization': `Bot ${botToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'PodTeksT/1.0',
  };

  // Fetch guilds the bot is in (with retry for 429)
  const guildsRes = await fetchWithRetry(`${DISCORD_API}/users/@me/guilds`, { headers });
  if (!guildsRes.ok) {
    return Response.json(
      { error: `Nie udało się pobrać serwerów: ${guildsRes.status}` },
      { status: guildsRes.status },
    );
  }

  const guilds = (await guildsRes.json()) as DiscordGuild[];

  // Fetch channels for each guild SEQUENTIALLY to avoid rate limits
  const limitedGuilds = guilds.slice(0, 10);
  const results: GuildWithChannels[] = [];

  for (const guild of limitedGuilds) {
    try {
      const channelsRes = await fetchWithRetry(
        `${DISCORD_API}/guilds/${guild.id}/channels`,
        { headers },
      );

      if (!channelsRes.ok) {
        results.push({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          iconUrl: guildIconUrl(guild.id, guild.icon),
          channels: [],
        });
        continue;
      }

      const channels = (await channelsRes.json()) as DiscordChannelRaw[];

      const textChannels = channels
        .filter((c) => c.type === 0)
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          position: c.position,
          categoryId: c.parent_id,
        }));

      results.push({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        iconUrl: guildIconUrl(guild.id, guild.icon),
        channels: textChannels,
      });
    } catch {
      results.push({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        iconUrl: guildIconUrl(guild.id, guild.icon),
        channels: [],
      });
    }
  }

  return Response.json({ guilds: results });
}
