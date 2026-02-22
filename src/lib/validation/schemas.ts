import { z } from 'zod/v4';

// --- Shared building blocks ---

/** AnalysisSamples is deeply nested — validate it's a non-null object, allow any keys */
const samplesSchema = z.object({}).passthrough();

const participantsSchema = z.array(z.string().min(1)).min(1, 'participants must contain at least one entry');

// --- Route schemas ---

export const analyzeRequestSchema = z.object({
  samples: samplesSchema,
  participants: participantsSchema,
  relationshipContext: z.optional(z.enum(['romantic', 'friendship', 'colleague', 'professional', 'family', 'other'])),
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
    pass1: z.object({}).passthrough(),
    pass2: z.object({}).passthrough(),
    pass3: z.object({}).passthrough(),
    pass4: z.object({}).passthrough(),
  }),
});
export type EnhancedRoastRequestParsed = z.infer<typeof enhancedRoastRequestSchema>;

const conversationExcerptItemSchema = z.object({
  sender: z.string(),
  content: z.string(),
});

export const imageRequestSchema = z.object({
  participants: participantsSchema,
  conversationExcerpt: z.array(conversationExcerptItemSchema).min(1, 'conversationExcerpt must not be empty'),
  executiveSummary: z.optional(z.string()),
  healthScore: z.optional(z.number()),
  roastContext: z.optional(
    z.object({
      verdict: z.string(),
      roastSnippets: z.array(z.string()),
      superlativeTitles: z.array(z.string()),
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

// --- Helper to format Zod errors into a user-friendly string ---

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `"${issue.path.join('.')}"` : '(root)';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
