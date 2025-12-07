import {
  buildThroneworldDefinition,
  type ThroneworldBoardDefinition,
  type ThroneworldGameDefinition,
} from "../shared/models/GameDefinition.Throneworld.js";
import type { ThroneworldPlayerView } from "../shared/models/GameState.Throneworld";
import type {
  GameBackendApi,
  EnsureGameDefinitionContext,
  PrepareCreateGameContext,
  PrepareCreateGameResult,
} from "../../types.js";

async function ensureThroneworldDefinition({
  db,
}: EnsureGameDefinitionContext): Promise<ThroneworldGameDefinition> {
  const docPath = "gameDefinitions/throneworld";
  const existing = await db.getDocument<ThroneworldGameDefinition>(docPath);

  const defaultDefinition = buildThroneworldDefinition();

  if (existing) {
    const existingBoardIds = new Set((existing.boards ?? []).map(board => board.id));
    const missingBoards = defaultDefinition.boards.some(board => !existingBoardIds.has(board.id));
    const missingOptions = !Array.isArray(existing.options) || existing.options.length === 0;

    if (!missingBoards && !missingOptions) {
      return existing;
    }

    const merged: ThroneworldGameDefinition = {
      ...defaultDefinition,
      ...existing,
      boards: defaultDefinition.boards,
      options: defaultDefinition.options,
      defaultBoardId: defaultDefinition.defaultBoardId,
    };

    await db.setDocument(docPath, merged);
    return merged;
  }

  await db.setDocument(docPath, defaultDefinition);
  return defaultDefinition;
}

function selectBoard(
  definition: ThroneworldGameDefinition,
  resolvedBoardId?: string,
): ThroneworldBoardDefinition | undefined {
  return (
    definition.boards.find(board => board.id === resolvedBoardId) ??
    definition.boards.find(board => board.id === definition.defaultBoardId) ??
    definition.boards[0]
  );
}

function resolveStartScanned(
  ctx: PrepareCreateGameContext,
): boolean | undefined {
  const startScannedOption = ctx.definition?.options?.find(option => option.id === "startScannedForAll");
  const fromCreation = ctx.creationOptions.startScannedForAll;
  const fromRequest = (ctx.requestBody as { startScannedForAll?: unknown })?.startScannedForAll;

  if (typeof fromCreation === "boolean") return fromCreation;
  if (typeof fromRequest === "boolean") return fromRequest;
  if (startScannedOption && typeof (startScannedOption as { defaultValue?: unknown }).defaultValue === "boolean") {
    return (startScannedOption as { defaultValue?: boolean }).defaultValue;
  }

  return undefined;
}

function prepareThroneworldCreateGame(context: PrepareCreateGameContext): PrepareCreateGameResult {
  const definition: ThroneworldGameDefinition =
    (context.definition as ThroneworldGameDefinition | null) ?? buildThroneworldDefinition();

  const requestedBoardId = typeof context.resolvedBoardId === "string" ? context.resolvedBoardId : undefined;
  const selectedBoard = selectBoard(definition, requestedBoardId);
  const scenarioFromBoard = selectedBoard?.scenario ?? context.defaultScenario;
  const startScannedForAll = resolveStartScanned(context);

  const options: Record<string, unknown> = {
    ...context.creationOptions,
    boardId: selectedBoard?.id ?? requestedBoardId,
  };

  if (typeof startScannedForAll === "boolean") {
    options.startScannedForAll = startScannedForAll;
  }

  return {
    requiredPlayers: selectedBoard?.playerCount,
    scenario: scenarioFromBoard,
    options,
    players: context.players,
  } satisfies PrepareCreateGameResult;
}

export const throneworldApi: GameBackendApi = {
  ensureGameDefinition: ensureThroneworldDefinition,
  prepareCreateGame: prepareThroneworldCreateGame,
  buildPlayerResponse: async ({ gameId, playerId, db }) => {
    const playerView = await db.getDocument<ThroneworldPlayerView>(`games/${gameId}/playerViews/${playerId}`);
    return { playerView: playerView ?? { playerId, systems: {} } } as Record<string, unknown>;
  },
};
