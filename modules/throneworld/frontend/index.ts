import StaticBoardLayer from "./StaticBoardLayer";
import { ThroneworldSystemLayer } from "./components/ThroneworldSystemLayer";
import type { ThroneworldGameState } from "../shared/models/GameState.Throneworld.ts";
import { computeBoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld.ts";
import { parsePlayerCountFromScenario } from "../shared/utils/scenario.ts";

function getBoardGeometry(gameState: ThroneworldGameState) {
  const playerCount = parsePlayerCountFromScenario(
    typeof gameState.scenario === "string" ? gameState.scenario : undefined,
    Array.isArray(gameState.playerIds) ? gameState.playerIds.length : 0,
  );
  const geometry = computeBoardGeometry(playerCount);

  return {
    boardGeometry: geometry,
    width: geometry.width,
    height: geometry.height,
  };
}

const frontend = {
  StaticBoardLayer,
  SpaceLayer: ThroneworldSystemLayer,
  getBoardGeometry,
};

export default frontend;
