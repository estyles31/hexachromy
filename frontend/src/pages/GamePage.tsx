import { useState } from "react";
import "./GamePage.css";
import BoardCanvas from "./ui/BoardCanvas";
import PlayerArea from "./ui/PlayerArea";
import InfoPanel from "./ui/InfoPanel";

export default function GamePage({ gameState }: any) {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);

  return (
    <div className="game-root">
      <BoardCanvas
        gameState={gameState}
        selectedSystem={selectedSystem}
        selectedObject={selectedObject}
        onSelectSystem={setSelectedSystem}
        onSelectObject={setSelectedObject}
      />
      <PlayerArea gameState={gameState} />
      <InfoPanel
        gameState={gameState}
        selectedSystem={selectedSystem}
        selectedObject={selectedObject}
      />
    </div>
  );
}
