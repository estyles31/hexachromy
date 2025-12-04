export default function InfoPanel({ gameState, selectedSystem, selectedObject }: any) {
  return (
    <div className="info-panel">
      <div>Phase: {gameState.phase}</div>
      <div>Current: {gameState.currentPlayer}</div>
      <hr />
      <div>Selected System: {selectedSystem ?? "—"}</div>
      <div>Selected Object: {selectedObject ?? "—"}</div>
    </div>
  );
}
