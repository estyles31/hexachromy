import StaticBoardLayer from "./StaticBoardLayer";
import { ThroneworldSystemLayer } from "./components/ThroneworldSystemLayer";
import { ThroneworldInfoPanel } from "./components/ThroneworldInfoPanel";
import { ThroneworldPlayerArea } from "./components/ThroneworldPlayerArea";
import type { ThroneworldGameView } from "../shared/models/GameState.Throneworld";
import { computeBoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld";
import { parsePlayerCountFromScenario } from "../shared/utils/scenario";

function getBoardGeometry(gameState: ThroneworldGameView) {
  const playerCount = parsePlayerCountFromScenario(
    typeof gameState.scenario === "string" ? gameState.scenario : undefined,
    gameState && typeof gameState.players === "object"
      ? Object.keys(gameState.players).length
      : 0,
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
  PlayerArea: ThroneworldPlayerArea,
  InfoPanel: ThroneworldInfoPanel,
  getBoardGeometry,
};

export default frontend;
