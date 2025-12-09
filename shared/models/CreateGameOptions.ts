// shared/models/CreateGameOptions.ts
import type { PlayerSlot } from "./PlayerSlot";

export type CreateGameOptions = {
  gameType: string;
  scenarioId: string;
  playerSlots: PlayerSlot[];
  options: Record<string, unknown>;
  name?: string;
};