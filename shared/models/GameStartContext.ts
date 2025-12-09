// /shared/models/GameStartContext.ts
import type { GameDatabaseAdapter } from "./GameDatabaseAdapter";
import type { PlayerSlot } from "./PlayerSlot";

export interface GameStartContext {
  gameId: string;
  gameType: string;

  scenario: {
    id: string;
    playerCount: number;
  };

  playerSlots: PlayerSlot[];

  options: Record<string, unknown | null>;
  name?: string;

  db: GameDatabaseAdapter;
}

/**
 * Helper to extract filled player slots (humans and bots)
 * Use this in your game modules to get actual players
 */
export function getFilledSlots(ctx: GameStartContext): PlayerSlot[] {
  return ctx.playerSlots.filter(slot => slot.type === "human" || slot.type === "bot");
}

/**
 * Helper to check if all slots are filled
 */
export function allSlotsFilled(ctx: GameStartContext): boolean {
  return ctx.playerSlots.every(slot => slot.type !== "open");
}