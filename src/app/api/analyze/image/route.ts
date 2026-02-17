import { generateAnalysisImage } from '@/lib/analysis/gemini';

export const maxDuration = 120;

interface ImageRequest {
    participants: string[];
    conversationExcerpt: Array<{ sender: string; content: string }>;
    executiveSummary: string;
    healthScore: number;
}

export async function POST(request: Request): Promise<Response> {
    const body = (await request.json()) as ImageRequest;

    if (!body.participants?.length || !body.conversationExcerpt?.length) {
        return Response.json(
            { error: 'Missing required analysis data' },
            { status: 400 },
        );
    }

    const result = await generateAnalysisImage(body);

    if ('error' in result) {
        return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
        imageBase64: result.imageBase64,
        mimeType: result.mimeType,
    });
}
