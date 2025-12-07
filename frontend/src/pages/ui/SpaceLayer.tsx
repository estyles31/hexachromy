export default function SpaceLayer({
  gameState,
  onHoverSystem
}: {
  gameState: any;
  boardGeometry?: unknown;
  onHoverSystem?: (info: { hexId: string; worldType?: string; details?: any } | null) => void;
}) {
  const systems = Array.isArray(gameState?.systems) ? gameState.systems : [];

  return (
    <>
      {systems.map((s: any) => (
        <circle
          key={s.id}
          cx={s.x}
          cy={s.y}
          r={18}
          fill={s.ownerColor}
          className="system-circle"
          onMouseEnter={() => onHoverSystem?.({ hexId: s.id, worldType: s.worldType, details: s })}
          onMouseLeave={() => onHoverSystem?.(null)}
        />
      ))}
    </>
  );
}
