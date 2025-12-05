const BOARD_IMAGE = "/modules/throneworld/boards/throneworld-6p.svg";

export default function StaticBoardLayer() {
  return (
    <image
      href={BOARD_IMAGE}
      x={0}
      y={0}
      width={800}
      height={800}
    />
  );
}
