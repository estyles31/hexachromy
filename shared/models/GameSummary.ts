export type GameStatus = "waiting" | "in-progress" | "completed";

export type PlayerSlotStatus = "joined" | "invited" | "dummy";

export interface PlayerSummary {
  id: string;
  name: string;
  status: PlayerSlotStatus;
  race?: string;
}

export interface GameSummary {
  id: string;
  name: string;
  players: PlayerSummary[];
  status: GameStatus;
  gameType: string;
  boardId?: string;
  options?: {
    startScannedForAll?: boolean;
    raceAssignment?: "random" | "playerChoice";
    forceRandomRaces?: boolean;
    homeworldAssignment?: "random" | "playerOrder";
  };
}
