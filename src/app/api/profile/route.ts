import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { buildProfile } from '@/lib/profile-service';
import { badRequest, notFound, serverError } from '@/lib/api-response';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, _context, user) => {
  try {
    await dbConnect();

    const profile = await buildProfile(user.id);
    if (!profile) {
      return NextResponse.json({ msg: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ msg: 'Server error.' }, { status: 500 });
  }
});

interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  location?: string;
  age?: number;
  timezone?: string;
}

export const PUT = withAuth(async (req, _context, user) => {
  try {
    await dbConnect();

    const body = (await req.json()) as UpdateProfilePayload;

    const updates: Partial<{ name: string; bio: string; location: string; age: number; timezone: string }> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return badRequest('Name cannot be empty.');
      if (name.length > 40) return badRequest('Name must be 40 characters or less.');
      updates.name = name;
    }

    if (body.bio !== undefined) {
      const bio = String(body.bio).trim();
      if (bio.length > 200) return badRequest('Bio must be 200 characters or less.');
      updates.bio = bio;
    }

    if (body.location !== undefined) {
      const location = String(body.location).trim();
      if (location.length > 60) return badRequest('Location must be 60 characters or less.');
      updates.location = location;
    }

    if (body.age !== undefined) {
      const age = Number(body.age);
      if (!Number.isInteger(age) || age < 1 || age > 120) {
        return badRequest('Age must be a whole number between 1 and 120.');
      }
      updates.age = age;
    }

    if (body.timezone !== undefined) {
      const timezone = String(body.timezone).trim();
      if (timezone.length > 60) return badRequest('Timezone must be 60 characters or less.');
      if (timezone) updates.timezone = timezone;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('No valid fields to update.');
    }

    const updated = await User.findByIdAndUpdate(
      user.id,
      { $set: updates },
      { new: true, select: 'name bio location age timezone avatarStage' },
    ).lean();

    if (!updated) {
      return notFound('User not found.');
    }

    return NextResponse.json({
      msg: 'Profile updated.',
      profile: updated,
    });
  } catch (error) {
    return serverError(error, 'Update profile error');
  }
});
