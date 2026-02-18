import { generateAnalysisImage, generateRoastImage } from '@/lib/analysis/gemini';
import { rateLimit } from '@/lib/rate-limit';

const checkLimit = rateLimit(10, 10 * 60 * 1000); // 10 requests per 10 min

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ImageRequest {
    participants: string[];
    conversationExcerpt: Array<{ sender: string; content: string }>;
    executiveSummary?: string;
    healthScore?: number;
    roastContext?: {
        verdict: string;
        roastSnippets: string[];
        superlativeTitles: string[];
    };
}

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

    let body: ImageRequest;
    try {
        body = (await request.json()) as ImageRequest;
    } catch {
        return Response.json(
            { error: 'Invalid JSON in request body.' },
            { status: 400 },
        );
    }

    if (!Array.isArray(body.participants) || body.participants.length === 0) {
        return Response.json(
            { error: 'Missing or empty "participants" array in request body.' },
            { status: 400 },
        );
    }

    if (!Array.isArray(body.conversationExcerpt) || body.conversationExcerpt.length === 0) {
        return Response.json(
            { error: 'Missing or empty "conversationExcerpt" array in request body.' },
            { status: 400 },
        );
    }

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
