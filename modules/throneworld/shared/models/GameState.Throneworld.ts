import type { GameState, Player } from "../../../../shared/models/GameState.js";
import type { ColumnId } from "./BoardLayout.ThroneWorld";
import type { SystemDefinition } from "./Systems.ThroneWorld";

export type ThroneworldWorldType = "outer" | "inner" | "fringe" | "throneworld" | "homeworld";

export interface HexLocation {
  col: ColumnId;
  row: number;
}

export interface ThroneworldSystemDetails extends SystemDefinition {
  systemId: string;
  owner?: string;
}

export interface ThroneworldPublicSystemState {
  hexId: string;
  location: HexLocation;
  worldType: ThroneworldWorldType;
  revealed: boolean;
  scannedBy: string[];
  /** Present when the hex has been revealed publicly. */
  details?: ThroneworldSystemDetails;
}

export interface ThroneworldPlayerState extends Player {
  race?: string;
  color: string;
  tech: { Ground: number, Space: number, Comm: number, Jump: number };
  resources: number;  //current resources
}

export interface ThroneworldPlayerView {
  playerId: string;
  systems: Record<string, ThroneworldSystemDetails>;
}

export type ThroneworldRaceAssignment = "random" | "playerChoice";
export type ThroneworldHomeworldAssignment = "random" | "playerOrder";

export interface ThroneworldGameState extends GameState<ThroneworldState> 
{
  gameType: "throneworld";
  players: Record<string, ThroneworldPlayerState>;
  playerView?: ThroneworldPlayerView;
}

export type ThroneworldState = {
  currentPhase: string;
  currentPlayer?: string;

  turnOrder?: string[];
  systems: Record<string, ThroneworldPublicSystemState>;
}
