# Digital Twin

Digital Twin is a Next.js 14 application for personal reflection and habit tracking. It combines JWT-based authentication, daily check-ins, quest progression, profile stats, event-driven insight generation, and a Gemini-powered companion chat in a single dashboard.

## Current Product Scope

- Authentication with sign in, sign up, forgot password, and OTP-based reset flow
- Daily check-in flow with one submission per day and historical review
- Quest system with create, progress, complete, delete, and daily reset support
- Insight dashboard with daily status, reflection, trend, focus, and entertainment ratio
- Companion chat with persisted conversations and Gemini model fallback handling
- Profile page with level, XP, streak, mood, quest stats, and earned badges
- Event ingestion endpoint for updating insight state from app activity

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- MongoDB with Mongoose
- Google Gemini API

## App Routes

- `/` authentication screen for sign in and sign up
- `/auth/forgot-password`
- `/auth/reset-password`
- `/dashboard` redirects to `/dashboard/insight`
- `/dashboard/insight`
- `/dashboard/checkin`
- `/dashboard/quest`
- `/dashboard/chat`
- `/dashboard/profile`
- `/dashboard/history`

## API Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Profile

- `GET /api/profile`

### Check-in

- `GET /api/checkin/questions`
- `POST /api/checkin/submit`
- `GET /api/checkin/history`

### Quest

- `GET /api/quest/all`
- `POST /api/quest/create`
- `GET /api/quest/log`
- `POST /api/quest/reset`
- `PUT /api/quest/progress/[id]`
- `PUT /api/quest/complete/[id]`
- `DELETE /api/quest/delete/[id]`

### Insight

- `GET /api/insight/state`

### Chat

- `POST /api/chat/send`
- `GET /api/chat/history`

### Events

- `POST /api/events`

Protected endpoints expect:

```http
Authorization: Bearer <token>
```

## Environment Variables

Create a `.env` file in the project root.

```env
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/digital-twin
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Optional:

```env
GEMINI_FALLBACK_MODELS=gemini-2.0-flash,gemini-flash-latest
```

Notes:

- `JWT_SECRET` is required for auth.
- `MONGODB_URI` is required for all app data.
- `GEMINI_API_KEY` is required for companion chat.
- Insight reflection falls back to static text when Gemini is unavailable.
- `GEMINI_MODEL` is used first, then fallback models are tried in order.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Start development:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` starts the development server
- `npm run clean:next` removes the `.next` cache
- `npm run dev:reset` clears the cache and starts dev mode
- `npm run build` creates a production build
- `npm run start` runs the production server
- `npm run lint` runs ESLint
- `npm test` runs the Jest test suite

## Data Model Summary

The application persists data for:

- users
- quests
- quest logs
- daily check-ins
- user events
- insight state
- chat conversations
- chat messages
- extracted chat signals

## Operational Notes

- Login and forgot-password routes are rate-limited in memory.
- Password reset uses an OTP flow.
- The companion chat stores conversation history per user.
- Insight state is refreshed from check-ins, events, and chat activity.
- Core utilities (date, math, validation, progression) are covered by a Jest test suite (`npm test`).
