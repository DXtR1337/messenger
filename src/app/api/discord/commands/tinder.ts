/**
 * /tinder — AI-powered dating profile generator.
 * Creates brutally honest, data-driven dating profiles per user.
 * Individual mode — one person at a time for maximum depth.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import { getTargetUser } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, sendFollowUp, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';
import { findDramaMessages } from '../lib/search-sampler';
import type { DramaMessage } from '../lib/search-sampler';
import { generateDatingProfileImage } from '@/lib/analysis/gemini';
import { sendFollowUpWithFile } from '../lib/discord-file-upload';

interface TinderProfile {
  name: string;
  age_vibe: string;
  bio: string;
  headline: string;
  prompts: Array<{ question: string; answer: string }>;
  stats: Array<{ label: string; value: string }>;
  green_flags: string[];
  red_flags: string[];
  dealbreakers: string[];
  texting_style: string;
  rating: { score: number; explanation: string };
  what_their_ex_would_say: string;
}

const COLOR_PINK = 0xe91e63;
const COLOR_PURPLE = 0xa855f7;
const COLOR_BLUE = 0x3b82f6;
const FOOTER = { text: 'PodTeksT Tinder \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

// ── System prompt — deep individual analysis ──

const TINDER_SYSTEM = `Jesteś EKSPERTEM OD PROFILI RANDKOWYCH z 10-letnim doświadczeniem w analizie komunikacji cyfrowej. Tworzysz JEDEN szczegółowy, BRUTALNIE szczery profil randkowy na podstawie PRAWDZIWYCH wzorców komunikacji z Discorda.

NIE jesteś miły. Jesteś BEZLITOSNY ale SPRAWIEDLIWY. Każde twierdzenie MUSI być oparte na danych.

════════════════════════════════════════
ZASADY:
════════════════════════════════════════
- JEDEN profil dla JEDNEJ osoby — maksymalna głębokość
- Każdy element profilu MUSI być poparty KONKRETNYMI danymi: cytatami, statystykami, wzorcami
- NIE generalizuj. "Dużo pisze" to NIE jest obserwacja. "Wysyła średnio 127 wiadomości dziennie, 40% z nich po 23:00" TO jest obserwacja.
- Cytuj DOSŁOWNE fragmenty wiadomości jako dowody (max 200 znaków per cytat)
- Ton: brutalnie szczery matchmaker który widzi wszystko
- PO POLSKU

════════════════════════════════════════
SEKCJE DO WYGENEROWANIA:
════════════════════════════════════════

1. headline: Jednozdaniowy nagłówek profilu — brutalna prawda w stylu Tinder (np. "Szukam kogoś kto wytrzyma moje 47 wiadomości z rzędu")
2. age_vibe: Nie wiek, a VIBE (np. "27 ale mentalnie 15 gdy odpowiada po 3 sekundach, 45 gdy ignoruje przez 3 dni")
3. bio: 3-4 zdania BIO oparte WYŁĄCZNIE na danych. Każde zdanie = jedno konkretne zachowanie z czatu.
4. prompts: 3 pytania w stylu Tinder z odpowiedziami opartymi na danych:
   - "Moja najlepsza cecha wg znajomych" — ale odpowiedź to prawda z danych
   - "Dealbreaker" — coś co ta osoba FAKTYCZNIE robi w komunikacji
   - "Moja niedzielna rutyna wg czatu" — oparta na wzorcach aktywności
5. stats: 5-6 brutalnych statystyk z DOKŁADNYMI liczbami (np. "Czas odpowiedzi: 3 min gdy chce, 6h gdy nie", "Nocne wiadomości: 73% aktywności po 23:00")
6. green_flags: 3 pozytywne cechy — ale KONKRETNE, z cytatem lub metryką
7. red_flags: 3 red flagi — KONKRETNE zachowania z danych
8. dealbreakers: 2-3 dealbreakery które ta osoba MA (nie które szuka) — oparte na wzorcach komunikacji
9. texting_style: 2-3 zdania opisujące DOKŁADNIE jak ta osoba pisze — czy używa wielkich liter, emoji, odpowiada pytaniem na pytanie, ghostuje, double-textuje, etc.
10. rating: 1-10 z UZASADNIENIEM opartym na danych
11. what_their_ex_would_say: Jedno zdanie które powiedziałby o tej osobie ex na podstawie wzorców komunikacji

OUTPUT: Valid JSON:
{
  "name": "string",
  "headline": "string",
  "age_vibe": "string",
  "bio": "string",
  "prompts": [{"question": "string", "answer": "string"}],
  "stats": [{"label": "string", "value": "string"}],
  "green_flags": ["string"],
  "red_flags": ["string"],
  "dealbreakers": ["string"],
  "texting_style": "string",
  "rating": {"score": 1-10, "explanation": "string"},
  "what_their_ex_would_say": "string"
}`;

// ── Build a deep per-person prompt ──

function buildTinderPromptForPerson(
  channelName: string,
  targetName: string,
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  quantitative: QuantitativeAnalysis,
  participantNames: string[],
  messageLimit: number,
  dramaMessages?: DramaMessage[],
): string {
  const lines: string[] = [];
  const totalMsgs = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalMessages, 0);

  lines.push(`KANAŁ: #${channelName}`);
  lines.push(`TARGET: ${targetName}`);
  lines.push(`Kontekst: ${participantNames.length} uczestników, ${totalMsgs} wiadomości łącznie`);
  lines.push('');

  // ── Target's detailed stats ──
  const pm = quantitative.perPerson[targetName];
  if (pm) {
    lines.push('═══ PEŁNE STATYSTYKI CELU ═══');
    lines.push(`Wiadomości: ${pm.totalMessages} (${((pm.totalMessages / Math.max(totalMsgs, 1)) * 100).toFixed(1)}% kanału)`);
    lines.push(`Słowa: ${pm.totalWords}, śr. ${pm.averageMessageLength.toFixed(1)} słów/msg`);
    lines.push(`Emoji: ${pm.emojiCount}, pytania: ${pm.questionsAsked}`);
    if (pm.topEmojis.length > 0) lines.push(`Top emoji: ${pm.topEmojis.slice(0, 8).map((e) => `${e.emoji}(${e.count})`).join(' ')}`);
    if (pm.topWords.length > 0) lines.push(`Top słowa: ${pm.topWords.slice(0, 10).map((w) => `${w.word}(${w.count})`).join(', ')}`);

    const dt = quantitative.engagement.doubleTexts[targetName];
    if (dt !== undefined) lines.push(`Double texty (>2min gap): ${dt}`);
    const nightMsgs = quantitative.timing.lateNightMessages[targetName];
    if (nightMsgs !== undefined) lines.push(`Nocne wiadomości (00:00-05:00): ${nightMsgs}`);
    const ghostRisk = quantitative.viralScores?.ghostRisk?.[targetName]?.score;
    if (ghostRisk !== undefined) lines.push(`Ghost risk: ${ghostRisk}/100`);

    // Response time stats
    const personTiming = quantitative.timing.perPerson[targetName];
    if (personTiming) {
      lines.push(`Śr. czas odpowiedzi: ${(personTiming.averageResponseTimeMs / 60000).toFixed(1)} min`);
    }

    // Initiation ratio
    const initiations = quantitative.timing.conversationInitiations;
    if (initiations) {
      const totalInit = Object.values(initiations).reduce((a, b) => a + b, 0);
      const personInit = initiations[targetName] ?? 0;
      if (totalInit > 0) lines.push(`Inicjacja rozmów: ${((personInit / totalInit) * 100).toFixed(1)}%`);
    }
  }

  // Catchphrases
  if (quantitative.catchphrases) {
    const phrases = quantitative.catchphrases.perPerson[targetName];
    if (phrases && phrases.length > 0) {
      lines.push('');
      lines.push('═══ ULUBIONE ZWROTY ═══');
      lines.push(phrases.slice(0, 6).map((p) => `"${p.phrase}" (${p.count}x)`).join(', '));
    }
  }

  // Activity pattern — use late night messages + conversation initiations as proxy
  {
    const lateNight = quantitative.timing.lateNightMessages[targetName];
    const inits = quantitative.timing.conversationInitiations[targetName];
    if (lateNight !== undefined || inits !== undefined) {
      lines.push('');
      lines.push('═══ WZORZEC AKTYWNOŚCI ═══');
      if (lateNight !== undefined) lines.push(`Nocne wiadomości (22:00-04:00): ${lateNight}`);
      if (inits !== undefined) lines.push(`Inicjowane rozmowy: ${inits}`);
    }
  }

  // ── Target's messages (60% of limit) ──
  lines.push('');
  lines.push('═══ WIADOMOŚCI CELU ═══');
  const targetMsgs = messages.filter((m) => m.sender === targetName && m.type !== 'system' && m.content.trim().length > 0);
  const sampleSize = Math.min(targetMsgs.length, Math.floor(messageLimit * 0.6));
  // Mix: 70% recent, 30% random from older
  const recentCount = Math.floor(sampleSize * 0.7);
  const randomCount = sampleSize - recentCount;
  const recent = targetMsgs.slice(-recentCount);
  const older = targetMsgs.slice(0, Math.max(0, targetMsgs.length - recentCount));
  const randomOlder = older.sort(() => Math.random() - 0.5).slice(0, randomCount);
  const sampled = [...randomOlder, ...recent].sort((a, b) => a.timestamp - b.timestamp);

  for (const m of sampled) {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    const time = new Date(m.timestamp).toTimeString().split(' ')[0].slice(0, 5);
    lines.push(`[${date} ${time}] ${m.sender}: ${m.content.slice(0, 200)}`);
  }

  // ── Context messages (conversations with the target) ──
  lines.push('');
  lines.push('═══ KONTEKST ROZMÓW (odpowiedzi na/od celu) ═══');
  const contextMsgs = messages.filter((m) => m.sender !== targetName && m.type !== 'system' && m.content.trim().length > 0);
  const contextSample = contextMsgs.slice(-Math.min(contextMsgs.length, Math.floor(messageLimit * 0.2)));
  for (const m of contextSample) {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    const time = new Date(m.timestamp).toTimeString().split(' ')[0].slice(0, 5);
    lines.push(`[${date} ${time}] ${m.sender}: ${m.content.slice(0, 150)}`);
  }

  // Drama messages about/from target
  if (dramaMessages && dramaMessages.length > 0) {
    const targetDrama = dramaMessages.filter((d) => d.sender === targetName);
    if (targetDrama.length > 0) {
      lines.push('');
      lines.push('═══ DRAMATYCZNE WIADOMOŚCI ═══');
      for (const d of targetDrama.slice(0, 10)) {
        const date = new Date(d.timestamp).toISOString().split('T')[0];
        lines.push(`[${date}] ${d.sender}: ${d.content.slice(0, 200)} [keyword: ${d.keyword}]`);
      }
    }
  }

  return lines.join('\n');
}

export async function handleTinder(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Promise<void> {
  const limitOption = interaction.data?.options?.find((o) => o.name === 'messages');
  const messageLimit = limitOption?.value ? parseInt(String(limitOption.value), 10) : 500;

  const participants = data.conversation.participants.map((p) => p.name);

  if (participants.length === 0) {
    await editDeferredResponse(interaction.token, 'Brak uczestników na kanale.');
    return;
  }

  const hasContent = data.conversation.messages.some((m) => m.content.trim().length > 0);
  if (!hasContent) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed(
      'Brak treści wiadomości',
      'Bot nie ma dostępu do treści wiadomości. Włącz **Message Content Intent** w Discord Developer Portal.',
    )]);
    return;
  }

  // Resolve target user — REQUIRED for deep analysis
  const target = getTargetUser(interaction, 'user');
  let targetName: string | null = null;

  if (target) {
    // Try exact match first, then case-insensitive, then partial
    targetName = participants.find((p) => p === target.name)
      ?? participants.find((p) => p.toLowerCase() === target.name.toLowerCase())
      ?? participants.find((p) => p.toLowerCase().includes(target.name.toLowerCase()))
      ?? participants.find((p) => target.name.toLowerCase().includes(p.toLowerCase()))
      ?? null;

    if (!targetName) {
      await editDeferredResponse(interaction.token, undefined, [warningEmbed(
        'Użytkownik nie znaleziony',
        `Nie znaleziono **${target.name}** w wiadomościach kanału.\n\nDostępni: ${participants.slice(0, 10).join(', ')}`,
      )]);
      return;
    }
  }

  // If no user specified, pick the most active person (not the command caller)
  if (!targetName) {
    const sorted = [...participants].sort((a, b) =>
      (data.quantitative.perPerson[b]?.totalMessages ?? 0) - (data.quantitative.perPerson[a]?.totalMessages ?? 0),
    );
    targetName = sorted[0];
  }

  if (!targetName) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed('Brak celu', 'Nie udało się wybrać osoby do analizy.')]);
    return;
  }

  const channelName = data.conversation.title ?? 'Discord';

  // Search for drama messages (optional)
  let dramaMessages: DramaMessage[] = [];
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (botToken && interaction.channel_id) {
      const drama = await findDramaMessages(interaction.channel_id, botToken, { maxKeywords: 4 });
      dramaMessages = drama.dramaMessages;
    }
  } catch (err) {
    console.warn('[Tinder] Drama search failed:', err instanceof Error ? err.message : err);
  }

  const prompt = buildTinderPromptForPerson(
    channelName,
    targetName,
    data.conversation.messages,
    data.quantitative,
    participants,
    messageLimit,
    dramaMessages,
  );

  console.log(`[Tinder] Generating profile for "${targetName}", prompt length: ${prompt.length} chars`);

  try {
    const raw = await callGeminiForDiscord(TINDER_SYSTEM, prompt, {
      maxOutputTokens: 4096,
      temperature: 0.7,
      maxRetries: 2,
    });

    console.log(`[Tinder] AI response length: ${raw.length} chars`);

    const profile = parseGeminiJSONSafe<TinderProfile>(raw);

    if (!profile || !profile.name) {
      console.error('[Tinder] Failed to parse profile. Raw:', raw.slice(0, 300));
      await editDeferredResponse(interaction.token, undefined, [warningEmbed(
        'Tinder Failed',
        `AI nie wygenerowało profilu dla **${targetName}**. Spróbuj ponownie.`,
      )]);
      return;
    }

    // Build embeds
    const embeds: DiscordEmbed[] = [];

    // Main profile embed
    const mainLines: string[] = [];
    if (profile.headline) {
      mainLines.push(`> *${profile.headline}*`);
      mainLines.push('');
    }
    mainLines.push(`**Vibe:** ${profile.age_vibe}`);
    mainLines.push('');
    mainLines.push(profile.bio);

    if (profile.texting_style) {
      mainLines.push('');
      mainLines.push(`**Styl pisania:** ${profile.texting_style}`);
    }

    embeds.push({
      title: `\u{1F525} ${profile.name} \u2014 Profil Randkowy`,
      description: trimToEmbed(mainLines.join('\n')),
      color: COLOR_PINK,
    });

    // Prompts embed
    if (profile.prompts && profile.prompts.length > 0) {
      const promptLines: string[] = [];
      for (const pr of profile.prompts.slice(0, 3)) {
        promptLines.push(`**${pr.question}**`);
        promptLines.push(`> ${pr.answer}`);
        promptLines.push('');
      }
      embeds.push({
        description: trimToEmbed(promptLines.join('\n')),
        color: COLOR_PURPLE,
      });
    }

    // Stats + flags embed
    const dataLines: string[] = [];
    if (profile.stats && profile.stats.length > 0) {
      dataLines.push('**\u{1F4CA} Statystyki:**');
      for (const s of profile.stats.slice(0, 6)) {
        dataLines.push(`\u2022 ${s.label}: **${s.value}**`);
      }
      dataLines.push('');
    }
    if (profile.green_flags && profile.green_flags.length > 0) {
      dataLines.push(`\u2705 **Green flags:** ${profile.green_flags.join(' \u2022 ')}`);
    }
    if (profile.red_flags && profile.red_flags.length > 0) {
      dataLines.push(`\u{1F6A9} **Red flags:** ${profile.red_flags.join(' \u2022 ')}`);
    }
    if (profile.dealbreakers && profile.dealbreakers.length > 0) {
      dataLines.push(`\u{1F4A3} **Dealbreakers:** ${profile.dealbreakers.join(' \u2022 ')}`);
    }
    if (dataLines.length > 0) {
      embeds.push({
        description: trimToEmbed(dataLines.join('\n')),
        color: COLOR_BLUE,
      });
    }

    // Rating + ex quote embed
    const ratingLines: string[] = [];
    if (profile.rating) {
      const stars = '\u2B50'.repeat(Math.min(Math.max(Math.round(profile.rating.score), 0), 10));
      ratingLines.push(`**Rating: ${profile.rating.score}/10** ${stars}`);
      ratingLines.push(profile.rating.explanation);
    }
    if (profile.what_their_ex_would_say) {
      ratingLines.push('');
      ratingLines.push(`**Co powiedziałby ex:** *"${profile.what_their_ex_would_say}"*`);
    }
    if (ratingLines.length > 0) {
      embeds.push({
        description: trimToEmbed(ratingLines.join('\n')),
        color: COLOR_PINK,
        footer: FOOTER,
      });
    }

    await editDeferredResponse(interaction.token, undefined, embeds);

    // Generate image (optional — don't block on failure)
    try {
      const imageResult = await generateDatingProfileImage({
        name: profile.name,
        bio: profile.bio,
        ageVibe: profile.age_vibe,
        redFlags: profile.red_flags?.join(', '),
        worstStats: profile.stats?.map((s) => `${s.label}: ${s.value}`).join(', '),
      });

      if ('imageBase64' in imageResult) {
        const rawBytes = atob(imageResult.imageBase64);
        const buffer = new Uint8Array(rawBytes.length);
        for (let j = 0; j < rawBytes.length; j++) buffer[j] = rawBytes.charCodeAt(j);
        const ext = imageResult.mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const fileName = `tinder-${profile.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`;

        await sendFollowUpWithFile(
          interaction.token,
          buffer,
          fileName,
          imageResult.mimeType,
          undefined,
          [{
            title: `\u{1F4F8} ${profile.name} \u2014 zdjęcie profilowe`,
            color: COLOR_PINK,
            image: { url: `attachment://${fileName}` },
            footer: FOOTER,
          }],
        );
      }
    } catch (imgErr) {
      console.warn('[Tinder] Image generation failed:', imgErr instanceof Error ? imgErr.message : imgErr);
    }
  } catch (err) {
    console.error('[Tinder] Error:', err);
    await editDeferredResponse(interaction.token, undefined, [warningEmbed(
      'Tinder Error',
      `Błąd generowania profilu dla **${targetName}**: ${err instanceof Error ? err.message : 'nieznany błąd'}`,
    )]);
  }
}
