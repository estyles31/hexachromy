# Firestore data model and access rules

This project stores Throne World game sessions in Firestore with a public game document, per-player fogged overlays, and an append-only action log. All reads require authentication; admin users (custom claim `admin: true`) may read any document.

## Collections

### `games/{gameId}` (public, redacted state)
Represents the current turn state that any permitted viewer can subscribe to. Expected fields:

- `state`: redacted game state snapshot used by the client to render the current board.
- `stateVersion`: monotonically increasing version that the client sends when asking for legal actions.
- `turn`: numeric turn/round counter.
- `phase`: string identifier for the active phase.
- `players`: map or array of player UIDs participating in the game.
- `observers` (optional): map or array of UIDs that may observe but not act.
- `visibility.public` (optional): `true` when the game should be readable by all authenticated users; otherwise reads are limited to players/observers.
- Metadata such as `updatedAt`, `createdAt`, and any other derived summaries safe for public consumption.

Only admin users are expected to write this document directly; the Functions backend should fan out authoritative state updates here.

### `games/{gameId}/views/{playerId}` (fogged overlays)
Contains private overlays for a specific player. When a piece becomes public it should be removed from these overlays and reflected in the base `games/{gameId}` document.

- `state`: redacted game state merged with the fogged information the player is allowed to see.
- `stateVersion`: mirrors the version from the parent game document.
- Additional per-player metadata as needed for client rendering.

Readable by the owning player (`playerId`) or admins only **and** only when that `playerId` is listed in the `players` array/map on the parent game. Writes are restricted to admins/backend code.

### `games/{gameId}/actions/{actionId}` (action history)
Append-only log for navigating history.

- `index`: numeric sequence/turn ordering.
- `type`: machine-readable action identifier.
- `performedBy`: UID that initiated the action (if any).
- `payload`: serialized action body.
- `undoOf` (optional): references a prior `actionId` when reversing an earlier action.
- `appliedAt`: timestamp of when the action was committed.

Readable by the same audience as the parent game document (public games allow any authenticated reader; otherwise only players/observers/admins). Writes are restricted to admins/backend code.

## Security rules summary
- **Authentication required** for all reads.
- **Admin users** (custom claim `admin: true`) bypass game-level visibility restrictions.
- **Public games** (`visibility.public: true` or `public: true`) allow any authenticated user to read the parent game document and its `actions` subcollection.
- **Private games** require the user to be listed in `players` or `observers` on the game document.
- **Fogged overlays** under `views/{playerId}` are only readable by the matching player or an admin, and only when the player belongs to the game.
- **Writes/updates/deletes** are restricted to admins; the Functions backend should write via the Admin SDK so it is not subject to these rules.

## Client subscriptions
- Subscribe to `games/{gameId}` for the redacted public state.
- Subscribe to `games/{gameId}/views/{auth.uid}` for private fogged details.
- Subscribe to `games/{gameId}/actions` for the action history visible to the viewer.

When requesting legal actions from Functions, include `stateVersion` (and optionally `turn`) so the backend can detect staleness before responding.
