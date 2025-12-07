import type { ColumnId } from "./BoardLayout.ThroneWorld";
import type { SystemDefinition } from "./Systems.ThroneWorld";

export type ThroneworldWorldType = "outer" | "inner" | "fringe" | "throneworld" | "homeworld";

export interface HexLocation {
  col: ColumnId;
  row: number;
}

export interface ThroneworldSystemDetails extends SystemDefinition {
  systemId: string;
  owner: string | null;
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

export interface ThroneworldPlayerView {
  playerId: string;
  systems: Record<string, ThroneworldSystemDetails>;
}

export type ThroneworldPlayerStatus = "joined" | "invited" | "dummy";
export type ThroneworldGameStatus = "waiting" | "in-progress";

export interface ThroneworldGameState {
  gameId: string;
  name?: string;
  createdAt: number;
  scenario: string;
  boardId: string;
  playerIds: string[];
  playerStatuses: Record<string, ThroneworldPlayerStatus>;
  systems: Record<string, ThroneworldPublicSystemState>;
  gameType: "throneworld";
  status: ThroneworldGameStatus;
  options?: {
    startScannedForAll?: boolean;
  };
}

export interface ThroneworldGameView extends ThroneworldGameState {
  /** Private information for the requesting player only. */
  playerView?: ThroneworldPlayerView;
}
