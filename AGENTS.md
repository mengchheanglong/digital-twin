# Digital Twin — Agent Routing

This is the current active Digital Twin implementation, even though its path is under `archive/retired`.

## Project identity

Next.js App Router app for personal reflection, check-ins, quests, profile/progression, analytics, journal, focus, companion chat, data export, and account/data erasure.

## Current product direction

Continue the existing app. Do not create a duplicate Vite/local-only app.

The current active slice is phone-first Profile/Me + Ascension/dashboard refinement:

- Mobile bottom nav should fit and include `Me`.
- Profile/Me is the overview for identity/progress/settings.
- Ascension/progression detail opens only from Profile/Me header/card.
- Data export and erase controls remain visible and intentional.
- Avoid DCT/consciousness-transfer claims in UI copy.

## Startup order

When asked what to do next here:

1. Read `.active/CURRENT.md`.
2. Read `.active/NEXT.md`.
3. Read `README.md` and `package.json`.
4. Inspect `git status --short` and `git diff --stat` before editing.
5. Run verification before broad changes when possible.

## Commands

```bash
pnpm test
pnpm lint
pnpm build
pnpm dev:reset
```

## Guardrails

- Do not reset or discard uncommitted work.
- Do not move the repo unless the user explicitly asks.
- Keep fixes narrow and evidence-backed.
- If changing product direction, update Mission Control in `C:/Users/User/projects/transcendiverse-research/mission-control/missions/digital-twin-v0/`.
