import { FieldValue } from "firebase-admin/firestore";
import { getActionFromJson } from "../../../shared-backend/ActionRegistry";
import { ActionContext } from "../../../shared/models/ApiContexts";
import { ActionResponse } from "../../../shared/models/GameAction";
import { db, dbAdapter } from "../services/database";
import { IPhaseManager } from "../../../shared-backend/BackendModuleDefinition";
import { randomUUID } from "crypto";
import { GameState } from "../../../shared/models/GameState";
import { computeStateDiff, diffToFirestoreUpdates, StateDiff } from "../../../shared-backend/StateDiff";
import { GameDatabaseAdapter } from "../../../shared/models/GameDatabaseAdapter";
import { ChatAction } from "./ChatAction";

export async function baseActionHandler(
  ctx: ActionContext,
  modulePhaseManager: IPhaseManager
): Promise<ActionResponse> {

  const { gameId, playerId, action } = ctx;

  // Chat fast-path — no game rules, no turn math
  if (action.type === "chat") {
    const instance = getActionFromJson(action) as ChatAction;
    return instance.execute({} as any, playerId);
  }

  const state = await modulePhaseManager.getGameState();
  if (!state) {
    return { action, success: false, error: "game_not_found" };
  }

  // version check - optimistic concurrency
  if (action.expectedVersion !== undefined &&
      action.expectedVersion !== state.version) {
    return { action, success: false, error: "stale_state" };
  }

  //create and validate action
  const instance = getActionFromJson(action);

  const legality = await modulePhaseManager.validateAction(playerId, instance);
  if (!legality.success) {
    return { ...legality, action };
  }

  const result = await instance.execute(state, playerId);
  if (!result.success) {
    return result;
  }

  await modulePhaseManager.postExecuteAction(playerId, result);

  // DB write + history write
  const diff = await applyStateChangesToDatabase(gameId, state.version, state);

  await appendActionHistory(
    dbAdapter,
    state,
    playerId,
    action,
    diff,
    result,
  );

  return { ...result };
}

export async function applyStateChangesToDatabase(
  gameId: string,
  expectedVersion: number,
  newState: GameState
): Promise<StateDiff> {
  const gameRef = db.doc(`games/${gameId}`);

  let diff: StateDiff;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists) throw new Error("game_not_found");

    const currentState = snap.data()! as GameState;

    // Optimistic concurrency check
    if (currentState.version !== expectedVersion) {
      throw new Error("stale_state");
    }

    // Compute diff from current DB state to new state
    diff = computeStateDiff(currentState, newState);

    // Convert to Firestore updates
    const updates = diffToFirestoreUpdates(diff, newState);
    updates.version = FieldValue.increment(1);

    tx.update(gameRef, updates);
  });

  return diff!;
}

export interface ActionHistoryEntry {
  actionId: string;
  sequence: number;  // Global sequence number for ordering
  timestamp: number;
  playerId: string;
  action: any;
  diffs: string;
  message: string;   // Summary message for this action
  undoable: boolean; // Can this be undone at this point in time?
  undone?: boolean;  // Has this action been undone? (for audit trail)
  resultingPhase: string;
}

export async function appendActionHistory(
  db: GameDatabaseAdapter,
  game: GameState,
  playerId: string,
  actionJson: any,
  diffs: StateDiff,
  result?: ActionResponse,
) {

  const seq = game.actionSequence;
  const entryId = randomUUID();

  const entry: ActionHistoryEntry = {
    actionId: entryId,
    sequence: seq,
    timestamp: Date.now(),
    playerId,
    action: JSON.stringify(actionJson),
    diffs: JSON.stringify(diffs),
    message: result?.message ?? "",
    undoable: result?.undoable ?? false,
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

