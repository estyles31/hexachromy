import type { BaseState, GameState, Player } from "../../../../shared/models/GameState.js";
import type { ThroneworldPublicSystemState, ThroneworldSystemDetails } from "./Systems.ThroneWorld";

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

export interface ThroneworldState extends BaseState {
  systems: Record<string, ThroneworldPublicSystemState>;
}
