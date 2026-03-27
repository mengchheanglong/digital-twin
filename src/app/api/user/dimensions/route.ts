import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError, badRequest } from '@/lib/api-response';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

const DEFAULT_DIMENSIONS = [
  { key: 'energy', label: 'Energy', emoji: '⚡' },
  { key: 'focus', label: 'Focus', emoji: '🎯' },
  { key: 'stressControl', label: 'Stress Control', emoji: '🧘' },
  { key: 'socialConnection', label: 'Social Connection', emoji: '🤝' },
  { key: 'optimism', label: 'Optimism', emoji: '🌟' },
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

    const body = (await req.json()) as { dimensions?: unknown[] };
    const dims = body.dimensions;

    if (!Array.isArray(dims) || dims.length !== 5) {
      return badRequest('Must provide exactly 5 dimensions.');
    }

    const validated = dims.map((d, i) => {
      if (typeof d !== 'object' || d === null) throw new Error(`Dimension ${i} is not an object`);
      const obj = d as Record<string, unknown>;
      const key = String(obj.key ?? '').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 50);
      const label = String(obj.label ?? '').trim().slice(0, 50);
      const emoji = String(obj.emoji ?? '').trim().slice(0, 10);
      if (!key || !label) throw new Error(`Dimension ${i} missing key or label`);
      return { key, label, emoji: emoji || '⭐' };
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
