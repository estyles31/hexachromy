import { ChatAction } from "./ChatAction";
import { FieldValue } from "firebase-admin/firestore";
import { getActionFromJson } from "../../../shared-backend/ActionRegistry";
import { ActionContext } from "../../../shared/models/ApiContexts";
import { ActionResponse, GameAction } from "../../../shared/models/GameAction";
import { db, dbAdapter } from "../services/database";
import { IPhaseManager } from "../../../shared-backend/BackendModuleDefinition";
import { randomUUID } from "crypto";
import { GameState } from "../../../shared/models/GameState";
import {
  computeObjectDiff,
  computeStateDiff,
  diffToFirestoreUpdates,
  objectDiffToFirestoreUpdates,
  StateDiff,
} from "../../../shared-backend/StateDiff";
import { GameDatabaseAdapter } from "../../../shared/models/GameDatabaseAdapter";
import {
  ActionHistoryEntry,
  ActionLogAnimation,
  ActionLogMessage,
  createMinimalAction,
} from "../../../shared/models/ActionHistoryEntry";

void ChatAction; //need to reference this or the compiler tree-shakes it away

export async function ActionHandler(ctx: ActionContext, modulePhaseManager: IPhaseManager): Promise<ActionResponse> {
  const { gameId, playerId, action } = ctx;
  let result;

  // Chat fast-path — no game rules, no turn math
  if (action.type === "chat") {
    const instance = getActionFromJson(action) as ChatAction;
    result = await instance.execute({ gameId } as any, playerId);
  } else {
    result = await handleNormalAction(ctx, modulePhaseManager);
  }

  if (modulePhaseManager.postCommitAction) {
    modulePhaseManager.postCommitAction().catch((err: Error) => {
      console.error("Post commit execution failed: ", err);
    });
  }

  return { ...result };
}

export async function applyStateChangesToDatabase({
  gameId,
  expectedVersion,
  newState,
}: {
  gameId: string;
  expectedVersion?: number;
  newState: GameState;
}): Promise<StateDiff> {
  const gameRef = db.doc(`games/${gameId}`);

  let diff: StateDiff;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists) throw new Error("game_not_found");

    const currentState = snap.data()! as GameState;

    // Optimistic concurrency check
    if (expectedVersion && currentState.version !== expectedVersion) {
      throw new Error("stale_state", { cause: `expected ${expectedVersion} but got ${currentState.version}` });
    }

    // Compute diff from current DB state to new state (PUBLIC STATE ONLY - no playerViews)
    // Create copies without playerViews for diffing
    const currentPublicState = { ...currentState };
    delete currentPublicState.playerViews;

    const newPublicState = { ...newState };
    delete newPublicState.playerViews;

    diff = computeStateDiff(currentPublicState, newPublicState);

    // Convert to Firestore updates
    const updates = diffToFirestoreUpdates(diff, newPublicState);
    updates.version = FieldValue.increment(1);

    tx.update(gameRef, updates);
  });

  // After transaction, handle playerView diffs separately
  if (newState.playerViews) {
    for (const [playerId, newView] of Object.entries(newState.playerViews)) {
      const playerViewRef = db.doc(`games/${gameId}/playerViews/${playerId}`);
      const currentViewSnap = await playerViewRef.get();
      const currentView = currentViewSnap.exists ? currentViewSnap.data() : {};

      const viewDiff = computeObjectDiff(currentView || {}, newView);

      if (viewDiff && Object.keys(viewDiff).length > 0) {
        const viewUpdates = objectDiffToFirestoreUpdates(viewDiff, newView);
        await playerViewRef.update(viewUpdates);
      }
    }
  }

  return diff!;
}

export async function appendActionHistory(
  db: GameDatabaseAdapter,
  game: GameState,
  playerId: string,
  actionJson: GameAction,
  diffs: StateDiff,
  result?: ActionResponse
) {
  const seq = game.actionSequence;
  const entryId = randomUUID();

  // Handle new logEntries format or fall back to old message
  let messages: ActionLogMessage[] | undefined;
  let animations: ActionLogAnimation[] | undefined;
  let groupId: string | undefined;

  if (result?.logEntries && result.logEntries.length > 0) {
    // Use first log entry (could emit multiple with different sequence numbers if needed)
    const firstEntry = result.logEntries[0];
    messages = firstEntry.messages;
    animations = firstEntry.animations;
    groupId = firstEntry.groupId;
  } else if (result?.message) {
    // Backward compatibility
    messages = [{ text: result.message, visibility: "public" }];
  }

  const entry: ActionHistoryEntry = {
    actionId: entryId,
    sequence: seq,
    timestamp: Date.now(),
    playerId,
    actionType: actionJson.type,
    action: JSON.stringify(createMinimalAction(actionJson)), // Only filled params
    diffs: JSON.stringify(diffs),
    undoable: result?.undoable ?? false,
    undone: false,
    resultingPhase: game.state.currentPhase,

    // NEW fields
    messages,
    animations,
    groupId,

    // DEPRECATED but keep for backward compatibility
    message: result?.message ?? "",
  };

  await db.setDocument(`games/${game.gameId}/actionLog/${seq}`, entry);

  await db.updateDocument(`games/${game.gameId}`, {
    actionSequence: seq + 1,
  });
}

export async function handleNormalAction(
  ctx: ActionContext,
  modulePhaseManager: IPhaseManager
): Promise<ActionResponse> {
  const { gameId, playerId, action } = ctx;
  const state = await modulePhaseManager.getGameState();
  if (!state) {
    return { action, success: false, error: "game_not_found" };
  }

  // version check - optimistic concurrency
  if (
    action.requireConcurrency !== false &&
    action.expectedVersion !== undefined &&
    action.expectedVersion !== state.version
  ) {
    return { action, success: false, error: "stale_state" };
  }

  //create and validate action
  const instance = getActionFromJson(action);

  const legality = await modulePhaseManager.validateAction(playerId, instance);
  if (!legality.success) {
    return { ...legality, action };
  }

  const phase = await modulePhaseManager.getCurrentPhase();
  const result = await phase.executeAction({ gameState: state, db: dbAdapter }, instance, playerId);

  if (!result.success) {
    return result;
  }

  await modulePhaseManager.postExecuteAction(playerId, result);

  // DB write + history write
  const diff = await applyStateChangesToDatabase({
    gameId,
    expectedVersion: action.requireConcurrency ? state.version : undefined,
    newState: state,
  });
  await appendActionHistory(dbAdapter, state, playerId, action, diff, result);

  return result;
}
