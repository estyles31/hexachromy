import { ensureThroneworldSeed } from "../seed/throneworldSeed";
import { GameModule, GameStateContext } from "./types";

async function getThroneworldGameState(
  { gameId, gameData, definitionData }: GameStateContext,
): Promise<Record<string, unknown>> {
  const boardsByPlayerCount = definitionData?.boardsByPlayerCount ?? gameData.boardsByPlayerCount ?? {};
  const boardSvgByPlayerCount = definitionData?.boardSvgByPlayerCount ?? gameData.boardSvgByPlayerCount ?? {};

  const playerCount = gameData.playerCount ?? gameData.players?.length ?? 0;
  const boardHexes = boardsByPlayerCount[String(playerCount)] ?? [];
  const boardSvgUrl = boardSvgByPlayerCount[String(playerCount)] ?? null;

  return {
    id: gameId,
    name: gameData.name,
    status: gameData.status,
    playerCount,
    boardsByPlayerCount,
    boardSvgUrl,
    boardHexes,
    ...gameData.state,
  };
}

const throneworldModule: GameModule = {
  type: "throneworld",
  seed: ensureThroneworldSeed,
  getGameState: getThroneworldGameState,
};

export default throneworldModule;
export { getThroneworldGameState };
