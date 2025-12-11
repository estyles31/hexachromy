import type { ThroneworldBoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld";
import type { ThroneworldGameState } from "../shared/models/GameState.Throneworld";

const BOARD_IMAGE_BASE = "/modules/throneworld/boards";

export default function StaticBoardLayer({
  gameState,
  boardGeometry,
}: { gameState: ThroneworldGameState; boardGeometry?: ThroneworldBoardGeometry }) {
  const scenario = typeof gameState.options.scenario === "string" && gameState.options.scenario.trim().length > 0
    ? gameState.options.scenario
    : "6p";

  const boardImage = `${BOARD_IMAGE_BASE}/throneworld-${scenario}.svg`;

  const width = boardGeometry?.width ?? 800;
  const height = boardGeometry?.height ?? 800;

  return (
    <image
      href={boardImage}
      x={0}
      y={0}
      width={width}
      height={height}
    />
  );
}
