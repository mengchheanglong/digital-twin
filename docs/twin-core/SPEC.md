# Twin Core v0 Specification

Twin Core v0 adds a backend contract for sharing a safe, structured view of a user's Digital Twin state with trusted future systems. It is designed for reflection, companion, and world-context use cases without giving those systems direct database access.

The first contract is the Twin Context Pack:

```http
GET /api/twin/context-pack
Authorization: Bearer <token>
```

The endpoint returns:

```json
{
  "success": true,
  "contextPack": {
    "version": "twin-core.v0"
  }
}
```

## Goals

- Provide a typed, portable summary of identity, avatar progress, current state, patterns, goals, and synthesized memory.
- Use existing app data only.
- Keep user data controls visible through references to `/api/export` and `/api/user`.
- Avoid raw private content in the contract.

## Non-Goals

- No UI changes.
- No embeddings, vector database, graph database, or new persistence.
- No raw journal entries or chat messages.
- No email, password, reset token, or auth token exposure.

## Data Sources

Twin Core v0 may derive the pack from:

- `User`
- `buildProfile(userId)`
- `CheckIn`
- `Quest`
- `QuestLog`
- `JournalEntry` metadata only
- `FocusSession`
- `UserInsightState`
- `UserMemory`
- `ChatSignal` aggregates only

Consumers should treat the pack as a bounded context snapshot generated at `generatedAt`, not as complete user history.
