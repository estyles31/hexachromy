export default function InfoPanel({ gameState, selectedSystem, selectedObject }: any) {
  const phase = gameState?.phase ?? "—";
  const currentPlayer = gameState?.currentPlayer ?? "—";

  return (
    <div className="info-panel">
      <div>Phase: {phase}</div>
      <div>Current: {currentPlayer}</div>
      <hr />
      <div>Selected System: {selectedSystem ?? "—"}</div>
      <div>Selected Object: {selectedObject ?? "—"}</div>
    </div>
  );
}
