/**
 * Discord slash command registration script.
 * Run with: npx tsx src/app/api/discord/lib/register-commands.ts
 *
 * Registers global commands (available in all guilds the bot is in).
 * Only needs to be run once, or when command definitions change.
 */

import type { CommandDefinition } from './discord-types';
import { CommandOptionType } from './discord-types';
import { logger } from '@/lib/logger';

const MESSAGES_OPTION = {
  name: 'messages',
  description: 'Ile ostatnich wiadomości analizować',
  type: CommandOptionType.STRING,
  required: false,
  choices: [
    { name: '200 (szybki)', value: '200' },
    { name: '500 (domyślnie)', value: '500' },
    { name: '1000 (dokładny)', value: '1000' },
    { name: '2000', value: '2000' },
    { name: '5000', value: '5000' },
    { name: '10000', value: '10000' },
    { name: '20000', value: '20000' },
  ],
};

const COMMANDS: CommandDefinition[] = [
  {
    name: 'stats',
    description: 'Statystyki użytkownika na tym kanale',
    options: [
      { name: 'user', description: 'Użytkownik', type: CommandOptionType.USER, required: false },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'roast',
    description: 'Roast całego kanału — wszyscy dostaną w kość',
    options: [MESSAGES_OPTION],
  },
  {
    name: 'personality',
    description: 'Profil osobowości (MBTI + Big Five) na podstawie wiadomości',
    options: [
      { name: 'user', description: 'Użytkownik', type: CommandOptionType.USER, required: false },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'versus',
    description: 'Porównanie dwóch użytkowników',
    options: [
      { name: 'user1', description: 'Pierwsza osoba', type: CommandOptionType.USER, required: true },
      { name: 'user2', description: 'Druga osoba', type: CommandOptionType.USER, required: true },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'whosimps',
    description: 'Ranking entuzjastów — kto double-textuje najbardziej',
    options: [MESSAGES_OPTION],
  },
  {
    name: 'ghostcheck',
    description: 'Sprawdź ryzyko ghostingu dla użytkownika',
    options: [
      { name: 'user', description: 'Użytkownik do sprawdzenia', type: CommandOptionType.USER, required: false },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'besttime',
    description: 'Kiedy najlepiej napisać do tej osoby',
    options: [
      { name: 'user', description: 'Użytkownik', type: CommandOptionType.USER, required: false },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'catchphrase',
    description: 'Co ta osoba ciągle powtarza',
    options: [
      { name: 'user', description: 'Użytkownik', type: CommandOptionType.USER, required: false },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'emoji',
    description: 'Analiza emoji — czego używa ta osoba',
    options: [
      { name: 'user', description: 'Użytkownik', type: CommandOptionType.USER, required: false },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'nightowl',
    description: 'Kto pisze o 3 w nocy — ranking nocnych marków',
    options: [MESSAGES_OPTION],
  },
  {
    name: 'ranking',
    description: 'Ranking serwera po wybranej metryce',
    options: [
      {
        name: 'metric',
        description: 'Metryka do rankingu',
        type: CommandOptionType.STRING,
        required: true,
        choices: [
          { name: 'Wiadomości', value: 'messages' },
          { name: 'Słowa', value: 'words' },
          { name: 'Emoji', value: 'emoji' },
          { name: 'Pytania', value: 'questions' },
          { name: 'Double texty', value: 'double_texts' },
          { name: 'Nocne wiadomości', value: 'night_messages' },
          { name: 'Czas odpowiedzi', value: 'response_time' },
        ],
      },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'megaroast',
    description: 'Mega roast jednej osoby — pełny kontekst grupowy, bez litości',
    options: [
      { name: 'user', description: 'Użytkownik do zroastowania', type: CommandOptionType.USER, required: true },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'cwel',
    description: 'Cwel Tygodnia — AI wybiera kto zasłużył na tytuł',
    options: [MESSAGES_OPTION],
  },
  {
    name: 'tinder',
    description: 'Profil randkowy na podstawie wiadomości — brutalna prawda',
    options: [
      { name: 'user', description: 'Użytkownik (domyślnie: wszyscy)', type: CommandOptionType.USER, required: false },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'court',
    description: 'Sąd Chatowy — rozprawa za komunikacyjne zbrodnie',
    options: [MESSAGES_OPTION],
  },
  {
    name: 'subtext',
    description: 'Dekoder podtekstów — co NAPRAWDĘ mieli na myśli',
    options: [MESSAGES_OPTION],
  },
  {
    name: 'simulate',
    description: 'Symuluj odpowiedź użytkownika na wiadomość',
    options: [
      { name: 'user', description: 'Kogo symulować', type: CommandOptionType.USER, required: true },
      { name: 'message', description: 'Wiadomość do odpowiedzi', type: CommandOptionType.STRING, required: true },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'standup',
    description: 'Stand-Up Comedy — 7-aktowy występ o kanale',
    options: [MESSAGES_OPTION],
  },
  {
    name: 'deeproast',
    description: 'Deep roast — psychologiczny roast z mechanizmami obronnymi',
    options: [
      { name: 'user', description: 'Użytkownik (domyślnie: najaktywniejszy)', type: CommandOptionType.USER, required: false },
      MESSAGES_OPTION,
    ],
  },
  {
    name: 'analyze',
    description: 'Otwórz pełną analizę tego kanału na stronie PodTeksT',
  },
  {
    name: 'search',
    description: 'Szukaj wiadomości w kanale po frazie',
    options: [
      { name: 'query', description: 'Fraza do wyszukania', type: CommandOptionType.STRING, required: true },
    ],
  },
];

async function registerToUrl(label: string, url: string, botToken: string) {
  logger.log(`[${label}] Registering ${COMMANDS.length} commands...`);

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[${label}] Failed: ${res.status} ${text}`);
    return false;
  }

  const result = await res.json();
  logger.log(`[${label}] Successfully registered ${(result as unknown[]).length} commands.`);
  return true;
}

async function registerCommands() {
  const appId = process.env.DISCORD_APP_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !botToken) {
    console.error('Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in environment');
    process.exit(1);
  }

  // Guild ID from env or CLI arg (guild commands appear instantly)
  const guildId = process.argv[2] || process.env.DISCORD_GUILD_ID;

  const globalUrl = `https://discord.com/api/v10/applications/${appId}/commands`;

  // Register global commands (propagate in ~1h)
  const globalOk = await registerToUrl('Global', globalUrl, botToken);

  // Register guild commands (instant) if guild ID provided
  if (guildId) {
    const guildUrl = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`;
    await registerToUrl(`Guild ${guildId}`, guildUrl, botToken);
  } else {
    logger.log('No DISCORD_GUILD_ID set — skipping instant guild registration.');
    logger.log('Pass guild ID as argument: npx tsx register-commands.ts <GUILD_ID>');
  }

  if (!globalOk) process.exit(1);
}

registerCommands();
