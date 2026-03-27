import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { badRequest, unauthorized, serverError, tooManyRequests } from '@/lib/api-response';
import { MongoRateLimiter } from '@/lib/rate-limit';
import UserEvent from '@/lib/models/UserEvent';
import { updateUserInsight } from '@/lib/insight-engine';

export const dynamic = 'force-dynamic';

// 30 events per minute per IP
const eventsLimiter = new MongoRateLimiter('events', 60 * 1000, 30);

// Valid event types
const VALID_EVENT_TYPES = ['quest_completed', 'chat_message', 'log_added'] as const;
type EventType = (typeof VALID_EVENT_TYPES)[number];

interface EventMetadata {
  category?: string;
  duration?: number;
  topic?: string;
}

interface CreateEventRequest {
  type: EventType;
  metadata?: EventMetadata;
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    if (!(await eventsLimiter.check(ip))) {
      return tooManyRequests('Too many event requests. Please try again later.');
    }

    await dbConnect();

    // Step 1: Authenticate user
    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized();
    }

    // Step 2: Parse and validate request body
    let body: CreateEventRequest;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON body.');
    }

    // Validate event type
    if (!body.type || !VALID_EVENT_TYPES.includes(body.type)) {
      return badRequest(
        `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}.`
      );
    }

    // Validate metadata if provided
    const metadata: EventMetadata = {};
    if (body.metadata) {
      if (body.metadata.category !== undefined) {
        if (typeof body.metadata.category !== 'string') {
          return badRequest('metadata.category must be a string.');
        }
        metadata.category = body.metadata.category.trim();
      }
      if (body.metadata.duration !== undefined) {
        if (typeof body.metadata.duration !== 'number' || body.metadata.duration < 0) {
          return badRequest('metadata.duration must be a non-negative number.');
        }
        metadata.duration = body.metadata.duration;
      }
      if (body.metadata.topic !== undefined) {
        if (typeof body.metadata.topic !== 'string') {
          return badRequest('metadata.topic must be a string.');
        }
        metadata.topic = body.metadata.topic.trim();
      }
    }

    // Step 3: Insert event into UserEvent collection
    const event = await UserEvent.create({
      userId: user.id,
      type: body.type,
      metadata,
      createdAt: new Date(),
    });

    // Step 4: Call updateUserInsight to update insight state
    const insightResult = await updateUserInsight(user.id);
    const insightUpdated = insightResult !== null;

    // Step 5: Return success response
    return NextResponse.json({
      success: true,
      event: {
        id: event._id,
        type: event.type,
        metadata: event.metadata,
        createdAt: event.createdAt,
      },
      insightUpdated,
    });
  } catch (error) {
    return serverError(error, 'Create event error');
  }
}
