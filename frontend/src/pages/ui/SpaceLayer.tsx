export default function SpaceLayer({
  systems,
  selectedSystem,
  onSelectSystem
}: any) {
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

