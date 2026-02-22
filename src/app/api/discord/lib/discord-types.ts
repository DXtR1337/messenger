/**
 * Discord Interactions API types.
 * Based on Discord API v10 — HTTP-only interactions (no gateway).
 */

// ── Interaction Request ─────────────────────────────────────

export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
} as const;

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

export interface DiscordMember {
  user: DiscordUser;
  nick?: string | null;
  roles: string[];
  joined_at: string;
}

export interface DiscordResolvedUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

export interface DiscordResolved {
  users?: Record<string, DiscordResolvedUser>;
  members?: Record<string, Omit<DiscordMember, 'user'>>;
}

export interface CommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
}

export interface InteractionData {
  id: string;
  name: string;
  type: number;
  options?: CommandOption[];
  resolved?: DiscordResolved;
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: InteractionData;
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember;
  user?: DiscordUser;
  token: string;
  version: number;
}

// ── Interaction Response ────────────────────────────────────

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordComponent {
  type: number;       // 1=ACTION_ROW, 2=BUTTON
  style?: number;     // 5=LINK (URL button)
  label?: string;
  url?: string;
  emoji?: { name: string };
  components?: DiscordComponent[];
}

export interface InteractionResponse {
  type: number;
  data?: {
    content?: string;
    embeds?: DiscordEmbed[];
    components?: DiscordComponent[];
    flags?: number;
  };
}

// ── Command Definitions ─────────────────────────────────────

export const CommandOptionType = {
  SUB_COMMAND: 1,
  SUB_COMMAND_GROUP: 2,
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8,
  MENTIONABLE: 9,
  NUMBER: 10,
} as const;

export interface CommandDefinition {
  name: string;
  description: string;
  options?: Array<{
    name: string;
    description: string;
    type: number;
    required?: boolean;
    choices?: Array<{ name: string; value: string }>;
  }>;
}

// ── Helper: get display name from interaction ───────────────

export function getInteractionUser(interaction: DiscordInteraction): { id: string; name: string } {
  if (interaction.member) {
    return {
      id: interaction.member.user.id,
      name: interaction.member.nick ?? interaction.member.user.global_name ?? interaction.member.user.username,
    };
  }
  if (interaction.user) {
    return {
      id: interaction.user.id,
      name: interaction.user.global_name ?? interaction.user.username,
    };
  }
  return { id: 'unknown', name: 'Unknown' };
}

export function getTargetUser(interaction: DiscordInteraction, optionName: string): { id: string; name: string } | null {
  const option = interaction.data?.options?.find((o) => o.name === optionName);
  if (!option || typeof option.value !== 'string') return null;

  const userId = option.value;
  const resolved = interaction.data?.resolved;

  if (resolved?.members?.[userId]) {
    const member = resolved.members[userId];
    const user = resolved.users?.[userId];
    return {
      id: userId,
      name: member.nick ?? user?.global_name ?? user?.username ?? userId,
    };
  }

  if (resolved?.users?.[userId]) {
    const user = resolved.users[userId];
    return {
      id: userId,
      name: user.global_name ?? user.username,
    };
  }

  return { id: userId, name: userId };
}
