export default function OverlayLayer({
  selectedSystem,
  selectedObject,
  systems,
  objects
}: any) {
  const sys = systems.find((s: any) => s.id === selectedSystem);
  const obj = objects.find((o: any) => o.id === selectedObject);

  return (
    <>
      {sys && (
        <circle
          cx={sys.x}
          cy={sys.y}
          r={26}
          className="selection-ring"
        />
      )}

      {obj && (
        <rect
          x={obj.x - 4}
          y={obj.y - 4}
          width={40}
          height={40}
          className="selection-rect"
        />
      )}
    </>
  );
}
