export default function ObjectLayer({ objects }: { objects: any[] }) {
  return (
    <>
      {objects.map((obj: any) => (
        <image
          key={obj.id}
          href={obj.image}
          x={obj.x}
          y={obj.y}
          width={32}
          height={32}
          className="game-object"
        />
      ))}
    </>
  );
}
