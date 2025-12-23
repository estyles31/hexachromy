import { FieldValue } from "firebase-admin/firestore";
import { getActionFromJson } from "../../../shared-backend/ActionRegistry";
import { ActionContext, ActionHistoryEntry } from "../../../shared/models/ApiContexts";
import { ActionResponse, StateDelta } from "../../../shared/models/GameAction";
import { db } from "../services/database";
import { IPhaseManager } from "../../../shared-backend/BackendModuleDefinition";
import { ThroneworldGameState } from "../../../modules/throneworld/shared/models/GameState.Throneworld";
import { randomUUID } from "crypto";

export async function baseActionHandler(
  ctx: ActionContext,
  modulePhaseManager: IPhaseManager
): Promise<ActionResponse> {

  const { gameId, playerId, action } = ctx;

  // Chat fast-path — no game rules, no turn math
  if (action.type === "chat") {
    const instance = getActionFromJson(action);
    instance.gameId = gameId;
    return instance.execute({} as any, playerId);
  }

  // 1) Load state using the module
  const state = await modulePhaseManager.getGameState();
  if (!state) {
    return { action, success: false, error: "game_not_found" };
  }

  // 2) Version safety
  if (action.expectedVersion !== undefined &&
      action.expectedVersion !== state.version) {
    return { action, success: false, error: "stale_state" };
  }

  // 3) Create action instance
  const instance = getActionFromJson(action);
  instance.gameId = gameId;

  // 4) Phase legality check
  const legality = await modulePhaseManager.validateAction(
    playerId,
    instance,
  );

  if (!legality.success) {
    return { ...legality, action };
  }

  // 5) Execute → returns deltas, undo info, message
  const result = await instance.execute(state, playerId);

  if (!result.success) {
    return result;
  }

  if(result.stateChanges) {
    await applyDeltasToDatabase(gameId, state.version, result.stateChanges);
  }

  // 6) DB write + history write + undo update
  await modulePhaseManager.postExecuteAction(playerId, result);

  // 7) Return final shape
  return {
    action,
    success: true,
    message: result.message,
    undoable: result.undoable,
  };
}


export async function applyDeltasToDatabase(
  gameId: string,
  expectedVersion: number,
  deltas: StateDelta[],
) {

  const gameRef = db.doc(`games/${gameId}`);

  await db.runTransaction(async (tx) => {

    const snap = await tx.get(gameRef);
    if (!snap.exists) throw new Error("game_not_found");

    const game = snap.data()!;

    // ✔ optimistic concurrency
    if (game.version !== expectedVersion)
      throw new Error("stale_state");

    const updates: Record<string, any> = {};
    // ✔ apply every delta
    for (const d of deltas) {
      updates[d.path] = d.newValue;
    }

    // ✔ bump version
    tx.update(gameRef, updates);
    tx.update(gameRef, { version: FieldValue.increment(1) });
  });
}

export async function appendActionHistory(
  db: any,
  game: ThroneworldGameState,
  playerId: string,
  actionJson: any,       // raw JSON request
  result: ActionResponse
) {

  const seq = game.actionSequence;
  const entryId = randomUUID();

  const entry: ActionHistoryEntry = {
    actionId: entryId,
    sequence: seq,
    timestamp: Date.now(),
    playerId,
    action: actionJson,                       // raw input request for replay
    stateChanges: result.stateChanges ?? [],             // ← core event sourcing
    undoable: result.undoable ?? false,
    undone: false,
    resultingPhase: game.state.currentPhase,
  };

  await db.setDocument(
    `games/${game.gameId}/actionLog/${seq}`,
    entry
  );

  await db.updateDocument(`games/${game.gameId}`, {
    actionSequence: seq + 1
  });
}

