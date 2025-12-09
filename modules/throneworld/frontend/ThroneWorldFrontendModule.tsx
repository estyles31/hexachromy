import StaticBoardLayer from "./StaticBoardLayer";
import ThroneworldSystemLayer from "./components/ThroneworldSystemLayer";
import ThroneworldInfoPanel from "./components/ThroneworldInfoPanel";
import ThroneworldPlayerArea from "./components/ThroneworldPlayerArea";
import ThroneworldGameInfoArea from "./components/ThroneworldGameInfoArea";
import { buildThroneworldBoardView } from "./models/ThroneworldBoardView";
import type { ThroneworldGameState, ThroneworldState } from "../shared/models/GameState.Throneworld";
import { computeBoardGeometry, type BoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld";

import type { FrontendModuleDefinition } from "../../FrontendModuleDefinition";
import type InspectContext from "../../../shared/models/InspectContext";
import type { GameState } from "../../../shared/models/GameState";
import type HoveredSystemInfo from "./models/HoveredSystemInfo";
import type { VictoryPoints } from "../../FrontendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";


export const ThroneworldFrontendModule: FrontendModuleDefinition<ThroneworldState, HoveredSystemInfo> = {
  // should probably get from scenario, but just leave it for now
  getBoardGeometry: (gameState : ThroneworldGameState) => { 
    const playerCount = Object.keys(gameState.players).length;
    var geo = computeBoardGeometry(playerCount);
    return {
      boardGeometry: geo,
      width: geo.width,
      height: geo.height
    };
  },
  getGameDefinition: () => ThroneworldGameDefinition,
  renderBoard,
  renderPlayerArea,
  renderGameInfoArea,
  renderInfoPanel,
  getVictoryPoints,
};

function renderBoard(params: {
    gameState: GameState<ThroneworldState>;
    boardGeometry?: BoardGeometry;
    onInspect?: (context: InspectContext<HoveredSystemInfo> | null) => void;
  }) {
    const { boardGeometry, onInspect } = params;
    const gameState = params.gameState as ThroneworldGameState;
      
    if(!boardGeometry) {
        <div>ERROR RENDERING BOARD</div>
      }

      var colors = Object.fromEntries(Object.entries(gameState.players).map(([uid, player]) => [uid, player.color]));

      var boardview = buildThroneworldBoardView({ 
        game: gameState, 
        boardGeometry: boardGeometry!, 
        playerColors: colors
      });

  return (
    <>
      {/* Static board art */}
      <StaticBoardLayer gameState={gameState} boardGeometry={boardGeometry} />
      <ThroneworldSystemLayer boardView={boardview}
          onInspect={(hover:InspectContext<HoveredSystemInfo> | null) => { onInspect && onInspect(hover)}} />
    </>
    );
  }

function renderPlayerArea(params: { gameState: GameState<ThroneworldState>, playerId: string}) {
  const gameState = params.gameState as ThroneworldGameState;
  return (
    <>
      <ThroneworldPlayerArea gameState={gameState} playerId={params.playerId} />
    </>
  );
} 

function renderGameInfoArea(params: {gameState: GameState<ThroneworldState>})
{
  const gameState = params.gameState as ThroneworldGameState;
  return (
    <>
      <ThroneworldGameInfoArea gameState={gameState} />
    </>
  );
}

function renderInfoPanel(params: {gameState: GameState<ThroneworldState>, inspected: InspectContext<HoveredSystemInfo> | null }) 
{
  const gameState = params.gameState as ThroneworldGameState;
  return (
    <>
      <ThroneworldInfoPanel gameState={gameState} inspected={params.inspected} />
    </>
  );
}

function getVictoryPoints(params: { gameState: GameState<ThroneworldState> }) {
  const vp : VictoryPoints = {};
  const gameState = params.gameState as ThroneworldGameState;
  
  //todo: calculate vps
  Object.entries(gameState.players).map(([playerId]) => {
    vp[playerId] = 1;
  });
  
  return vp;
}