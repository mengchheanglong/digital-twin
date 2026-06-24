import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError, badRequest } from '@/lib/api-response';
import User from '@/lib/models/User';
import { readJsonBody } from '@/lib/request';

export const dynamic = 'force-dynamic';

const DEFAULT_DIMENSIONS = [
  { key: 'energy', label: 'Energy', emoji: '\u26a1' },
  { key: 'focus', label: 'Focus', emoji: '\ud83c\udfaf' },
  { key: 'stressControl', label: 'Stress Control', emoji: '\ud83e\uddd8' },
  { key: 'socialConnection', label: 'Social Connection', emoji: '\ud83e\udd1d' },
  { key: 'optimism', label: 'Optimism', emoji: '\ud83c\udf1f' },
];

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const uid = new mongoose.Types.ObjectId(user.id);
    const userDoc = await User.findById(uid).select('customDimensions').lean();

    const dimensions =
      Array.isArray(userDoc?.customDimensions) && userDoc.customDimensions.length === 5
        ? userDoc.customDimensions
        : DEFAULT_DIMENSIONS;

    return NextResponse.json({ success: true, dimensions });
  } catch (error) {
    return serverError(error, 'Get dimensions error');
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const parsed = await readJsonBody<{ dimensions?: unknown[] }>(req);
    if (parsed.ok === false) return parsed.response;

    const dims = parsed.data.dimensions;

    if (!Array.isArray(dims) || dims.length !== 5) {
      return badRequest('Must provide exactly 5 dimensions.');
    }

    const validated = dims.map((dimension, index) => {
      if (typeof dimension !== 'object' || dimension === null) {
        throw new Error(`Dimension ${index} is not an object`);
      }

      const obj = dimension as Record<string, unknown>;
      const key = String(obj.key ?? '').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 50);
      const label = String(obj.label ?? '').trim().slice(0, 50);
      const emoji = String(obj.emoji ?? '').trim().slice(0, 10);

      if (!key || !label) {
        throw new Error(`Dimension ${index} missing key or label`);
      }

      return { key, label, emoji: emoji || '\u2b50' };
    });

    const uid = new mongoose.Types.ObjectId(user.id);
    await User.findByIdAndUpdate(uid, { $set: { customDimensions: validated } });

    return NextResponse.json({ success: true, dimensions: validated });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Dimension')) {
      return badRequest(error.message);
    }
    return serverError(error, 'Update dimensions error');
  }
}
