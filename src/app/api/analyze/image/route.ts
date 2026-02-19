import { generateAnalysisImage, generateRoastImage } from '@/lib/analysis/gemini';
import { rateLimit } from '@/lib/rate-limit';
import { imageRequestSchema, formatZodError } from '@/lib/validation/schemas';

const checkLimit = rateLimit(10, 10 * 60 * 1000); // 10 requests per 10 min

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
    const { allowed, retryAfter } = checkLimit(ip);
    if (!allowed) {
        return Response.json(
            { error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } },
        );
    }

    const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
        return Response.json(
            { error: 'Request body too large. Maximum size is 2MB.' },
            { status: 413 },
        );
    }

    let rawBody: unknown;
    try {
        rawBody = await request.json();
    } catch {
        return Response.json(
            { error: 'Invalid JSON in request body.' },
            { status: 400 },
        );
    }

    const parsed = imageRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
        return Response.json(
            { error: `Validation error: ${formatZodError(parsed.error)}` },
            { status: 400 },
        );
    }

    const body = parsed.data;

    const result = body.roastContext
        ? await generateRoastImage({
            participants: body.participants,
            conversationExcerpt: body.conversationExcerpt,
            roastVerdict: body.roastContext.verdict,
            roastSnippets: body.roastContext.roastSnippets,
            superlativeTitles: body.roastContext.superlativeTitles,
        })
        : await generateAnalysisImage({
            participants: body.participants,
            conversationExcerpt: body.conversationExcerpt,
            executiveSummary: body.executiveSummary ?? '',
            healthScore: body.healthScore ?? 50,
        });

    if ('error' in result) {
        return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
        imageBase64: result.imageBase64,
        mimeType: result.mimeType,
    });
}
