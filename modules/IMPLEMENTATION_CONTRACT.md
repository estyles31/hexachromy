# Module Implementation Contract

All game modules **must** expose a backend contract that the generic Functions API can invoke without leaking game-specific code into the shared layers.

## Required Interfaces

Implement the interfaces from `modules/types.ts`:

- `GameBackendModule` with:
  - `createGame(CreateGameContext)`
  - `commitMove(CommitMoveContext)`
  - `getLegalMoves(GetLegalMovesContext)`
- `GameModuleManifest` must include `backend: GameBackendModule` (plus optional `frontend`).
- Modules interact with Firestore **only** through the provided `GameDatabaseAdapter` callbacks.

## Usage Rules

1. **Do not import Firebase directly** inside modules. Use the `db` adapter from the context.
2. **Always return an initial state** from `createGame` (or via `returnState`), so the generic API can persist it.
3. **Register modules centrally** in `modules/index.ts`; the shared Functions API will look them up by ID.
4. **Legal moves and move commits** must go through this contract; the base API should never call game-specific helpers directly.

Future work on any module should verify adherence to this contract before adding new backend behavior.
