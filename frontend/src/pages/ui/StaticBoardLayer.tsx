export default function StaticBoardLayer({ boardSvgUrl }: { boardSvgUrl: string }) {
  return (
    <image
      href={boardSvgUrl}
      x={0}
      y={0}
      width={800}
      height={800}
    />
  );
}
