import { z } from 'zod/v4';

// --- Shared building blocks ---

const samplesSchema = z.object({}).passthrough().refine(
  (val) => {
    const rec = val as Record<string, unknown>;
    const arr = rec['all'] ?? rec['overview'];
    return Array.isArray(arr) && arr.length > 0;
  },
  'samples must contain an "overview" (or "all") array with at least one message',
);

const participantsSchema = z.array(z.string().min(1)).min(1, 'participants must contain at least one entry');

// --- Route schemas ---

export const analyzeRequestSchema = z.object({
  samples: samplesSchema,
  participants: participantsSchema,
  relationshipContext: z.optional(z.enum(['romantic', 'friendship', 'colleague', 'professional', 'family', 'other', 'eks'])),
  mode: z.optional(z.enum(['standard', 'roast'])),
  quantitativeContext: z.optional(z.string()),
});
export type AnalyzeRequestParsed = z.infer<typeof analyzeRequestSchema>;

export const cpsRequestSchema = z.object({
  samples: samplesSchema,
  participantName: z.string().min(1, 'participantName must not be empty'),
});
export type CpsRequestParsed = z.infer<typeof cpsRequestSchema>;

export const standUpRequestSchema = z.object({
  samples: samplesSchema,
  participants: participantsSchema,
  quantitativeContext: z.string(),
});
export type StandUpRequestParsed = z.infer<typeof standUpRequestSchema>;

export const enhancedRoastRequestSchema = z.object({
  samples: samplesSchema,
  participants: participantsSchema,
  quantitativeContext: z.string(),
  qualitative: z.object({
    pass1: z.union([z.object({}).passthrough(), z.array(z.unknown())]),
    pass2: z.union([z.object({}).passthrough(), z.array(z.unknown())]),
    pass3: z.union([z.object({}).passthrough(), z.array(z.unknown())]),
    pass4: z.union([z.object({}).passthrough(), z.array(z.unknown())]),
  }),
  deepScanMaterial: z.optional(z.string()),
});
export type EnhancedRoastRequestParsed = z.infer<typeof enhancedRoastRequestSchema>;

export const megaRoastRequestSchema = z.object({
  samples: samplesSchema,
  targetPerson: z.string().min(1, 'targetPerson must not be empty'),
  participants: participantsSchema,
  quantitativeContext: z.string(),
});
export type MegaRoastRequestParsed = z.infer<typeof megaRoastRequestSchema>;

export const cwelTygodniaRequestSchema = z.object({
  samples: samplesSchema,
  participants: participantsSchema,
  quantitativeContext: z.string(),
});
export type CwelTygodniaRequestParsed = z.infer<typeof cwelTygodniaRequestSchema>;

const conversationExcerptItemSchema = z.object({
  sender: z.string(),
  content: z.string(),
});

export const imageRequestSchema = z.object({
  participants: z.optional(participantsSchema),
  conversationExcerpt: z.optional(z.array(conversationExcerptItemSchema)),
  executiveSummary: z.optional(z.string()),
  healthScore: z.optional(z.number()),
  roastContext: z.optional(
    z.object({
      verdict: z.string(),
      roastSnippets: z.array(z.string()),
      superlativeTitles: z.array(z.string()),
    }),
  ),
  datingProfileContext: z.optional(
    z.object({
      name: z.string(),
      bio: z.string(),
      ageVibe: z.string(),
      personality: z.optional(z.string()),
      mbti: z.optional(z.string()),
      bigFive: z.optional(z.string()),
      attachmentStyle: z.optional(z.string()),
      communicationStyle: z.optional(z.string()),
      dominantEmotions: z.optional(z.string()),
      appearanceClues: z.optional(z.string()),
      redFlags: z.optional(z.string()),
      worstStats: z.optional(z.string()),
    }),
  ),
});
export type ImageRequestParsed = z.infer<typeof imageRequestSchema>;

const simplifiedMessageSchema = z.object({
  sender: z.string(),
  content: z.string(),
  timestamp: z.number(),
  index: z.number(),
});

export const subtextRequestSchema = z.object({
  messages: z.array(simplifiedMessageSchema).min(100, 'Minimum 100 messages required for subtext analysis'),
  participants: participantsSchema,
  relationshipContext: z.optional(z.object({}).passthrough()),
  quantitativeContext: z.optional(z.string()),
});
export type SubtextRequestParsed = z.infer<typeof subtextRequestSchema>;

export const courtRequestSchema = z.object({
  samples: samplesSchema,
  participants: participantsSchema,
  quantitativeContext: z.string(),
  existingAnalysis: z.optional(z.object({
    pass1: z.optional(z.unknown()),
    pass2: z.optional(z.unknown()),
    pass4: z.optional(z.unknown()),
  })),
});
export type CourtRequestParsed = z.infer<typeof courtRequestSchema>;

export const eksRequestSchema = z.object({
  samples: samplesSchema,
  participants: participantsSchema,
  quantitativeContext: z.string(),
  phase: z.optional(z.enum(['recon', 'autopsy', 'psychogram'])).default('autopsy'),
  // Pass 4 input: completed EksResult from Pass 2+3
  eksResult: z.optional(z.object({}).passthrough()),
  cpsContext: z.optional(z.object({}).passthrough()),
  recon: z.optional(z.unknown()),
  targetedSamples: z.optional(z.object({}).passthrough()),
  finalMessages: z.optional(z.array(z.object({
    sender: z.string(),
    content: z.string(),
    timestamp: z.number(),
    index: z.number(),
  }))),
  existingAnalysis: z.optional(z.object({
    pass1: z.optional(z.unknown()),
    pass2: z.optional(z.unknown()),
    pass4: z.optional(z.unknown()),
  })),
});
export type EksRequestParsed = z.infer<typeof eksRequestSchema>;

export const discordFetchRequestSchema = z.object({
  channelId: z.string().regex(/^\d{17,20}$/, 'Invalid channel ID (must be Discord snowflake)'),
  messageLimit: z.optional(z.number().int().min(100).max(200_000)),
  pin: z.optional(z.string()),
});
export type DiscordFetchRequestParsed = z.infer<typeof discordFetchRequestSchema>;

// --- Helper to format Zod errors into a user-friendly string ---

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `"${issue.path.join('.')}"` : '(root)';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
