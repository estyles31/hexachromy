export default function SpaceLayer({
  gameState,
  selectedSystem,
  onSelectSystem
}: {
  gameState: any;
  boardGeometry?: unknown;
  selectedSystem: string | null;
  onSelectSystem: (system: string) => void;
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
          className={"system-circle" + (selectedSystem === s.id ? " selected" : "")}
          onClick={() => onSelectSystem(s.id)}
        />
      ))}
    </>
  );
}
