# Twin Core v0 Privacy Notes

Twin Core v0 is intentionally a limited context contract. It summarizes selected profile, progress, activity, pattern, goal, and memory fields for trusted companion and world-context features.

## Excluded Data

The context pack excludes:

- Passwords
- Reset tokens
- Auth tokens
- Email addresses
- Raw journal content
- Raw chat messages
- Focus notes
- Full database documents

Journal entries contribute only `tags` and `mood`. Chat contributes only aggregate `ChatSignal` summaries by signal type.

Allowed text fields are also content-redacted before output. Email addresses, bearer/JWT-looking tokens, common API key prefixes, long token-like strings, and `password`/`token`/`secret` key-value patterns are replaced with redaction markers before truncation.

## User Controls

The pack includes links to existing account data controls:

- Export: `/api/export`
- Delete: `/api/user`

The export endpoint remains the full user-controlled data download path. The Twin Context Pack is not a replacement for export; it is a smaller, privacy-aware operational summary.

## Consumer Expectations

Consumers should:

- Treat `generatedAt` as the snapshot time.
- Respect `privacy.excludes`.
- Avoid requesting hidden raw sources when the pack is sufficient.
- Expect strings and arrays to be truncated or capped.
