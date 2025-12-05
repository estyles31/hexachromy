import type { BoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld.ts";

const BOARD_IMAGE_BASE = "/modules/throneworld/boards";

export default function StaticBoardLayer({
  gameState,
  boardGeometry,
}: { gameState: any; boardGeometry?: BoardGeometry }) {
  const scenario = typeof gameState.scenario === "string" && gameState.scenario.trim().length > 0
    ? gameState.scenario
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
