import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { badRequest, unauthorized, serverError } from '@/lib/api-response';
import Quest from '@/lib/models/Quest';
import dbConnect from '@/lib/db';
import { hasDeepSeekApiKey, requestDeepSeekChat, stripJsonCodeFences } from '@/lib/deepseek';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const body = (await req.json()) as { questId?: string };
    const questId = String(body.questId ?? '').trim();

    if (!questId || !mongoose.Types.ObjectId.isValid(questId)) {
      return badRequest('Valid questId is required.');
    }

    const quest = await Quest.findOne({
      _id: questId,
      userId: new mongoose.Types.ObjectId(user.id),
    })
      .select('goal duration')
      .lean();

    if (!quest) {
      return badRequest('Quest not found.');
    }

    if (!hasDeepSeekApiKey()) {
      return NextResponse.json({
        steps: [
          'Break your goal into small daily actions',
          'Track progress consistently',
          'Review and adjust weekly',
          'Celebrate small wins',
        ],
      });
    }

    const prompt = `Break down this ${quest.duration} quest goal into 4-5 concrete, actionable sub-steps:
Goal: "${quest.goal}"
Return ONLY a JSON array of strings, each being one specific action step.
Example: ["Step 1 description", "Step 2 description"]
Keep each step concise (under 15 words). Do not include markdown or explanation.`;

    let text = '[]';
    try {
      const result = await requestDeepSeekChat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 300,
      });
      text = result.text;
    } catch {
      return NextResponse.json({
        steps: [
          'Define your first milestone',
          'Break into weekly targets',
          'Track daily progress',
          'Review and adjust',
        ],
      });
    }

    const clean = stripJsonCodeFences(text);

    let steps: string[] = [];
    try {
      const parsed: unknown = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        steps = parsed
          .filter((s): s is string => typeof s === 'string')
          .slice(0, 6);
      }
    } catch {
      steps = [];
    }

    if (steps.length === 0) {
      steps = [
        'Define clear milestones',
        'Break into daily actions',
        'Track progress weekly',
        'Review and adjust monthly',
      ];
    }

    return NextResponse.json({ steps });
  } catch (error) {
    return serverError(error, 'Error decomposing quest');
  }
}
