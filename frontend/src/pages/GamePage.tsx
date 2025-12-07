import { useState } from "react";
import "./GamePage.css";
import BoardCanvas from "./ui/BoardCanvas";
import PlayerArea from "./ui/PlayerArea";
import InfoPanel from "./ui/InfoPanel";
import { getFrontendModule } from "../modules/getFrontendModule";
import type { HoveredSystemInfo } from "../modules/types";

type GamePageProps = {
  gameState: {
    gameType: string;
    [key: string]: unknown;
  };
};

export default function GamePage({ gameState }: GamePageProps) {
  const [hoveredSystem, setHoveredSystem] = useState<HoveredSystemInfo | null>(null);

  const module = getFrontendModule(gameState.gameType);

  const PlayerAreaComponent = module?.PlayerArea ?? PlayerArea;
  const InfoPanelComponent = module?.InfoPanel ?? InfoPanel;

  if (!module) {
    return <div>Unsupported game type: {gameState.gameType}</div>;
  }

  return (
    <div className="game-root">
      <BoardCanvas
        gameState={gameState}
        module={module}
        onHoverSystem={setHoveredSystem}
      />
      <PlayerAreaComponent gameState={gameState} />
      <InfoPanelComponent gameState={gameState} hoveredSystem={hoveredSystem} />
    </div>
  );
}
