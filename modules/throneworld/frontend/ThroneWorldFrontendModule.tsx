// /modules/throneworld/frontend/ThroneWorldFrontendModule.tsx
import { useCallback } from "react";
import ThroneworldInfoPanel from "./components/ThroneworldInfoPanel";
import ThroneworldPlayerArea from "./components/ThroneworldPlayerArea";
import ThroneworldGameInfoArea from "./components/ThroneworldGameInfoArea";
import ThroneworldMessagePanel from "./components/ThroneworldMessagePanel";
import type { ThroneworldGameState, ThroneworldState } from "../shared/models/GameState.Throneworld";
import { computeBoardGeometry, type ThroneworldBoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld";

import type { FrontendModuleDefinition } from "../../FrontendModuleDefinition";
import type InspectContext from "../../../shared/models/InspectContext";
import type { GameState } from "../../../shared/models/GameState";
import type HoveredSystemInfo from "./models/HoveredSystemInfo";
import type { VictoryPoints } from "../../FrontendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";
import type { BoardGeometry } from "../../../shared/models/BoardGeometry";
import ThroneworldBoard from "./components/ThroneworldBoard";
import type { GameAction } from "../../../shared/models/ApiContexts";
import type { ActionDefinition, ParamChoicesResponse } from "../../../shared/models/ActionParams";
import { SelectionProvider } from "../../../shared-frontend/contexts/SelectionContext";
import { useAuth } from "../../../frontend/src/auth/useAuth";
import { authFetch } from "../../../frontend/src/auth/authFetch";

export const ThroneworldFrontendModule: FrontendModuleDefinition<ThroneworldState, HoveredSystemInfo> = {
  getBoardGeometry: (gameState: ThroneworldGameState) => {
    const geometry = computeBoardGeometry(String(gameState.options.scenario));
    return geometry;
  },
  getGameDefinition: () => ThroneworldGameDefinition,
  MainBoardComponent,
  MessagePanelComponent: ThroneworldMessagePanel,
  PlayerAreaComponent: ThroneworldPlayerArea,
  GameInfoAreaComponent: ThroneworldGameInfoArea,
  InfoPanelComponent: ThroneworldInfoPanel,
  getVictoryPoints,
};

function MainBoardComponent(params: {
  gameState: GameState<ThroneworldState>;
  boardGeometry?: BoardGeometry;
  onInspect?: (context: InspectContext<HoveredSystemInfo> | null) => void;
  legalActions?: GameAction[];
  onExecuteAction: (action: GameAction) => void;
}) {
  const gameState = params.gameState as ThroneworldGameState;
  const geometry = params.boardGeometry as ThroneworldBoardGeometry;
  const user = useAuth();

  const actionDefinitions = (params.legalActions || []) as unknown as ActionDefinition[];

  const fetchParamChoices = useCallback(async (
    actionType: string,
    paramName: string,
    filledParams: Record<string, string>
  ): Promise<ParamChoicesResponse> => {
    if (!user) {
      return { choices: [], error: "Not authenticated" };
    }

    try {
      const response = await authFetch(user, `/api/games/${gameState.gameId}/param-choices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, paramName, filledParams }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        return { choices: [], error: error.error || "Failed to fetch choices" };
      }
    } catch (err) {
      console.error("Error fetching param choices:", err);
      return { choices: [], error: "Network error" };
    }
  }, [user, gameState.gameId]);

  if (!geometry || !geometry.hexes) {
    return <div>ERROR RENDERING BOARD</div>;
  }

  return (
    <SelectionProvider
      legalActions={actionDefinitions}
      fetchParamChoices={fetchParamChoices}
      onExecuteAction={params.onExecuteAction}
    >
      <ThroneworldBoard
        gameState={gameState}
        boardGeometry={geometry}
        onInspect={params.onInspect}
      />
    </SelectionProvider>
  );
}

function getVictoryPoints(params: { gameState: GameState<ThroneworldState> }) {
  const vp: VictoryPoints = {};
  const gameState = params.gameState as ThroneworldGameState;

  Object.entries(gameState.players).map(([playerId]) => {
    vp[playerId] = 1;
  });

  return vp;
}
