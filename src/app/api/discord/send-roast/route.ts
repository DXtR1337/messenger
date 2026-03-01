/**
 * POST /api/discord/send-roast
 * Sends a mega roast or cwel tygodnia result to a Discord channel as embeds via bot token.
 * Discriminates payload type via `type` field (default: 'megaRoast').
 */

import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod/v4';
import { verifyDiscordPin } from '../lib/verify-pin';

const checkLimit = rateLimit(10, 10 * 60 * 1000);

const DISCORD_API = 'https://discord.com/api/v10';

const megaRoastSchema = z.object({
  channelId: z.string().min(1),
  pin: z.optional(z.string()),
  type: z.optional(z.literal('megaRoast')),
  megaRoast: z.object({
    targetName: z.string(),
    opening: z.string(),
    roast_lines: z.array(z.string()),
    what_others_say: z.array(z.string()),
    self_owns: z.array(z.string()),
    superlatives: z.array(z.object({ title: z.string(), roast: z.string() })),
    verdict: z.string(),
    tldr: z.string().optional(),
  }),
});

const datingProfilePersonSchema = z.object({
  name: z.string(),
  age_vibe: z.string(),
  bio: z.string(),
  stats: z.array(z.object({ label: z.string(), value: z.string(), emoji: z.string() })),
  prompts: z.array(z.object({ prompt: z.string(), answer: z.string() })),
  red_flags: z.array(z.string()),
  green_flags: z.array(z.string()),
  match_prediction: z.string(),
  dealbreaker: z.string(),
  overall_rating: z.string(),
});

const datingProfileSchema = z.object({
  channelId: z.string().min(1),
  pin: z.optional(z.string()),
  type: z.literal('datingProfile'),
  profiles: z.record(z.string(), datingProfilePersonSchema),
});

const cwelSchema = z.object({
  channelId: z.string().min(1),
  pin: z.optional(z.string()),
  type: z.literal('cwelTygodnia'),
  cwelTygodnia: z.object({
    winner: z.string(),
    winnerScore: z.number(),
    winnerCategories: z.number(),
    nominations: z.array(z.object({
      categoryTitle: z.string(),
      emoji: z.string(),
      winner: z.string(),
      reason: z.string(),
      evidence: z.array(z.string()),
      runnerUp: z.string().optional(),
    })),
    ranking: z.array(z.object({
      name: z.string(),
      score: z.number(),
      oneLiner: z.string(),
    })),
    intro: z.string(),
    crowningSpeech: z.string(),
    verdict: z.string(),
    hallOfShame: z.array(z.object({
      person: z.string(),
      quote: z.string(),
      commentary: z.string(),
    })),
  }),
});

const requestSchema = z.union([megaRoastSchema, cwelSchema, datingProfileSchema]);

const COLOR_ORANGE = 0xf97316;
const COLOR_RED = 0xef4444;
const COLOR_DARK_RED = 0xdc2626;
const COLOR_PURPLE = 0xa855f7;
const COLOR_BLUE = 0x3b82f6;
const FOOTER_MEGA = { text: 'PodTeksT Mega Roast \u2022 podtekst.app' };
const FOOTER_CWEL = { text: 'PodTeksT Cwel Tygodnia \u2022 podtekst.app' };
const FOOTER_DATING = { text: 'PodTeksT Dating Profile \u2022 podtekst.app' };
const COLOR_PINK = 0xff006e;

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, retryAfter } = checkLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: 'Zbyt wiele requestow. Sprobuj za chwile.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return Response.json({ error: 'Bot token not configured.' }, { status: 500 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: 'Validation error.' }, { status: 400 });
  }

  // PIN protection — mandatory, blocks all unauthenticated access
  const pinError = verifyDiscordPin(parsed.data.pin);
  if (pinError) return pinError;

  const { channelId } = parsed.data;
  const payloadType = ('type' in parsed.data && parsed.data.type) || 'megaRoast';

  const embeds: Array<Record<string, unknown>> = [];

  if (payloadType === 'datingProfile' && 'profiles' in parsed.data) {
    const profiles = parsed.data.profiles;
    for (const [, profile] of Object.entries(profiles)) {
      // Main embed: bio + stats
      const statsText = profile.stats.map(s => `${s.emoji} **${s.label}:** ${s.value}`).join('\n');
      const mainLines = [
        `*${profile.age_vibe}*`,
        '',
        profile.bio,
        '',
        '\u2500'.repeat(30),
        '',
        statsText,
      ].join('\n');

      embeds.push({
        title: `\u{1F48C} ${profile.name}`,
        description: trimToEmbed(mainLines),
        color: COLOR_PINK,
        footer: FOOTER_DATING,
      });

      // Prompts embed
      if (profile.prompts.length > 0) {
        const promptText = profile.prompts.map(p => `**${p.prompt}**\n${p.answer}`).join('\n\n');
        embeds.push({
          title: `\u{1F4AC} Prompty \u2014 ${profile.name}`,
          description: trimToEmbed(promptText),
          color: COLOR_PURPLE,
        });
      }

      // Flags + dealbreaker + rating embed
      const redFlags = profile.red_flags.map(f => `\u{1F6A9} ${f}`).join('\n');
      const greenFlags = profile.green_flags.map(f => `\u{1F49A} ${f}`).join('\n');
      const flagLines = [
        redFlags,
        '',
        greenFlags,
        '',
        '\u2500'.repeat(30),
        '',
        `\u{1F52E} **Prognoza:** ${profile.match_prediction}`,
        `\u{1F6AB} **Dealbreaker:** ${profile.dealbreaker}`,
        '',
        `\u{2B50} **Overall:** ${profile.overall_rating}`,
      ].join('\n');

      embeds.push({
        title: `\u{1F6A9} Flagi \u2014 ${profile.name}`,
        description: trimToEmbed(flagLines),
        color: COLOR_RED,
      });
    }
  } else if (payloadType === 'cwelTygodnia' && 'cwelTygodnia' in parsed.data) {
    const cwel = parsed.data.cwelTygodnia;

    // Embed 1: Winner + intro + verdict
    const mainLines = [
      cwel.intro,
      '',
      '\u2500'.repeat(30),
      '',
      `\u{1F480} **${cwel.winner}** \u2014 Cwelowatość: **${cwel.winnerScore}/100** | Wygrane kategorie: **${cwel.winnerCategories}/8**`,
      '',
      `**WERDYKT:** ${cwel.verdict}`,
    ].join('\n');

    embeds.push({
      title: `\u{1F480} CWEL TYGODNIA: ${cwel.winner} \u{1F480}`,
      description: trimToEmbed(mainLines),
      color: COLOR_RED,
      footer: FOOTER_CWEL,
    });

    // Embed 2: Nominations
    if (cwel.nominations.length > 0) {
      const catLines = cwel.nominations.map((nom) => {
        const evidence = nom.evidence.length > 0
          ? `\n> ${nom.evidence.slice(0, 2).join('\n> ')}`
          : '';
        const runner = nom.runnerUp ? ` *(runner-up: ${nom.runnerUp})*` : '';
        return `${nom.emoji} **${nom.categoryTitle}**\n**${nom.winner}**${runner} — ${nom.reason}${evidence}`;
      }).join('\n\n');

      embeds.push({
        title: '\u{1F3C6} Nominacje',
        description: trimToEmbed(catLines),
        color: COLOR_PURPLE,
      });
    }

    // Embed 3: Hall of Shame
    if (cwel.hallOfShame.length > 0) {
      const shameLines = cwel.hallOfShame.map((h) =>
        `**${h.person}:** "${h.quote}"\n\u{1F525} ${h.commentary}`
      ).join('\n\n');

      embeds.push({
        title: '\u{1F6A8} Hall of Shame',
        description: trimToEmbed(shameLines),
        color: COLOR_ORANGE,
      });
    }

    // Embed 4: Crowning speech
    if (cwel.crowningSpeech) {
      embeds.push({
        title: '\u{1F451} Koronacja',
        description: trimToEmbed(cwel.crowningSpeech),
        color: COLOR_DARK_RED,
      });
    }

    // Embed 5: Ranking
    if (cwel.ranking.length > 0) {
      const rankLines = cwel.ranking
        .sort((a, b) => b.score - a.score)
        .map((r, i) => {
          const medal = i === 0 ? '\u{1F480}' : i === 1 ? '\u{1F4A9}' : i === 2 ? '\u{1F921}' : `${i + 1}.`;
          return `${medal} **${r.name}** — ${r.score}/100 — ${r.oneLiner}`;
        })
        .join('\n');

      embeds.push({
        title: '\u{1F4CA} Ranking Cwelowatości',
        description: trimToEmbed(rankLines),
        color: COLOR_BLUE,
        footer: FOOTER_CWEL,
      });
    }
  } else if ('megaRoast' in parsed.data) {
    const megaRoast = parsed.data.megaRoast;

    // Embed 1: Opening + verdict
    const mainLines = [
      megaRoast.opening,
      '',
      '\u2500'.repeat(30),
      '',
      `**WERDYKT:** ${megaRoast.verdict}`,
    ].join('\n');

    embeds.push({
      title: `\u{1F525} MEGA ROAST: ${megaRoast.targetName} \u{1F525}`,
      description: trimToEmbed(mainLines),
      color: COLOR_ORANGE,
      footer: FOOTER_MEGA,
    });

    // Embed 2: Roast lines
    const roastText = megaRoast.roast_lines.map((line, i) => `${i + 1}. ${line}`).join('\n\n');
    embeds.push({
      title: '\u{1F525} Roast',
      description: trimToEmbed(roastText),
      color: COLOR_RED,
    });

    // Embed 3: What others say
    if (megaRoast.what_others_say.length > 0) {
      const othersText = megaRoast.what_others_say.map((line) => `\u2022 ${line}`).join('\n\n');
      embeds.push({
        title: '\u{1F4AC} Co mowia inni',
        description: trimToEmbed(othersText),
        color: COLOR_PURPLE,
      });
    }

    // Embed 4: Self owns
    if (megaRoast.self_owns.length > 0) {
      const selfText = megaRoast.self_owns.map((line) => `\u{1F480} ${line}`).join('\n\n');
      embeds.push({
        title: '\u{26B0}\u{FE0F} Samobojcze gole',
        description: trimToEmbed(selfText),
        color: COLOR_RED,
      });
    }

    // Embed 5: Superlatives
    if (megaRoast.superlatives.length > 0 && embeds.length < 10) {
      const supText = megaRoast.superlatives.map((s) => `**${s.title}**\n${s.roast}`).join('\n\n');
      embeds.push({
        title: '\u{1F3C6} Nagrody specjalne',
        description: trimToEmbed(supText),
        color: COLOR_ORANGE,
        footer: FOOTER_MEGA,
      });
    }
  }

  // Send to Discord channel via bot token
  const url = `${DISCORD_API}/channels/${channelId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: embeds.slice(0, 10) }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Discord send failed: ${res.status} ${text}`);
      return Response.json(
        { error: `Discord API error: ${res.status}` },
        { status: 502 },
      );
    }

    // If overflow embeds, send a second message
    if (embeds.length > 10) {
      try {
        const overflowRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ embeds: embeds.slice(10) }),
        });
        if (!overflowRes.ok) {
          console.error('[Discord/send-roast] Overflow embed failed:', overflowRes.status);
        }
      } catch (err) {
        console.error('[Discord/send-roast] Overflow embed error:', err);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Discord send error:', err);
    return Response.json(
      { error: 'Failed to send to Discord.' },
      { status: 502 },
    );
  }
}
