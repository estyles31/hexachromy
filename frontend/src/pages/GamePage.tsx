import { useState } from "react";
import "./GamePage.css";
import BoardCanvas from "./ui/BoardCanvas";
import PlayerArea from "./ui/PlayerArea";
import InfoPanel from "./ui/InfoPanel";
import { getFrontendModule } from "../modules/getFrontendModule";

type GamePageProps = {
  gameState: {
    gameType: string;
    [key: string]: unknown;
  };
};

export default function GamePage({ gameState }: GamePageProps) {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);

  const module = getFrontendModule(gameState.gameType);

  if (!module) {
    return <div>Unsupported game type: {gameState.gameType}</div>;
  }

  return (
    <div className="game-root">
      <BoardCanvas
        gameState={gameState}
        module={module}
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
