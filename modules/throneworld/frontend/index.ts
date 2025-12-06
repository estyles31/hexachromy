import StaticBoardLayer from "./StaticBoardLayer";
import { ThroneworldSystemLayer } from "./components/ThroneworldSystemLayer";
import type { ThroneworldGameView } from "../shared/models/GameState.Throneworld";
import { computeBoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld";
import { parsePlayerCountFromScenario } from "../shared/utils/scenario";

function getBoardGeometry(gameState: ThroneworldGameView) {
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
