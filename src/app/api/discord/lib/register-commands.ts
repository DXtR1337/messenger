/**
 * Discord slash command registration script.
 * Run with: npx tsx src/app/api/discord/lib/register-commands.ts
 *
 * Registers global commands (available in all guilds the bot is in).
 * Only needs to be run once, or when command definitions change.
 */

import type { CommandDefinition } from './discord-types';
import { CommandOptionType } from './discord-types';

const MESSAGES_OPTION = {
  name: 'messages',
  description: 'Ile ostatnich wiadomości analizować',
  type: CommandOptionType.STRING,
  required: false,
  choices: [
    { name: '200 (szybki)', value: '200' },
    { name: '500 (domyślnie)', value: '500' },
    { name: '1000 (dokładny)', value: '1000' },
    { name: '2000 (mega)', value: '2000' },
    { name: '5000 (max)', value: '5000' },
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
    description: 'Ranking simpów — kto double-textuje najbardziej',
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
    name: 'analyze',
    description: 'Otwórz pełną analizę tego kanału na stronie PodTeksT',
  },
];

async function registerCommands() {
  const appId = process.env.DISCORD_APP_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !botToken) {
    console.error('Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in environment');
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${appId}/commands`;

  console.log(`Registering ${COMMANDS.length} commands...`);

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
    console.error(`Failed to register commands: ${res.status} ${text}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log(`Successfully registered ${(result as unknown[]).length} commands.`);
}

registerCommands();
