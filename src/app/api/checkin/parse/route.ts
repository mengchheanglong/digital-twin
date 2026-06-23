import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError, badRequest } from '@/lib/api-response';
import { hasDeepSeekApiKey, requestDeepSeekChat, stripJsonCodeFences } from '@/lib/deepseek';

export const dynamic = 'force-dynamic';

interface ParsedDimensions {
  energy: number;
  focus: number;
  stressControl: number;
  socialConnection: number;
  optimism: number;
}

interface ParsePayload {
  text?: string;
}

function clampRating(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

async function parseDimensionsFromText(text: string): Promise<ParsedDimensions | null> {
  if (!hasDeepSeekApiKey()) return null;

  const prompt = `You are a wellness assessment assistant. Given the following text describing how someone feels, extract scores for 5 wellness dimensions on a scale of 1-5 (1=very low, 3=neutral, 5=very high).

Dimensions:
- energy: Physical and mental energy level
- focus: Ability to concentrate and work effectively  
- stressControl: How well they are managing stress (5=calm/in control, 1=very stressed)
- socialConnection: Feeling of connection with others
- optimism: Positive outlook about the future

User text: "${text}"

Return ONLY valid JSON like: {"energy":4,"focus":3,"stressControl":2,"socialConnection":4,"optimism":3}
No explanation, no markdown.`;

  try {
    const result = await requestDeepSeekChat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      maxTokens: 100,
    });
    const cleaned = stripJsonCodeFences(result.text);

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch (e) {
      console.error('Error parsing check-in dimensions JSON:', e);
      return null;
    }
    return {
      energy: clampRating(parsed.energy),
      focus: clampRating(parsed.focus),
      stressControl: clampRating(parsed.stressControl),
      socialConnection: clampRating(parsed.socialConnection),
      optimism: clampRating(parsed.optimism),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const body = (await req.json()) as ParsePayload;
    const text = String(body.text ?? '').trim();
    if (!text) return badRequest('text is required.');
    if (text.length > 1000) return badRequest('text must be 1000 characters or less.');

    const dimensions = await parseDimensionsFromText(text);

    if (!dimensions) {
      // Fallback: return neutral scores
      return NextResponse.json({
        success: true,
        dimensions: { energy: 3, focus: 3, stressControl: 3, socialConnection: 3, optimism: 3 },
        fallback: true,
        message: 'AI parsing unavailable. Returning neutral scores as starting point.',
      });
    }

    return NextResponse.json({
      success: true,
      dimensions,
      fallback: false,
    });
  } catch (error) {
    return serverError(error, 'Parse check-in text error');
  }
}
