import "./PlayerArea.css";

export default function PlayerArea({ gameState }: any) {
  return (
    <div className="player-area">
      {gameState.players.map((p: any) => (
        <div className="player-panel" key={p.id}>
          <strong>{p.name}</strong>
          <div>Systems: {p.systems}</div>
          <div>Credits: {p.credits}</div>
          <div>Tech: {p.tech.join(", ")}</div>
        </div>
      ))}
    </div>
  );
}
