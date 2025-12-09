// shared/models/PlayerSlot.ts

/**
 * Represents a player slot that can be filled with a human, bot, or left open
 */
export type PlayerSlotType = "human" | "bot" | "open";

export interface PlayerSlotBase {
  slotIndex: number;
}

export interface HumanPlayerSlot extends PlayerSlotBase {
  type: "human";
  uid: string;
  displayName: string;
}

export interface BotPlayerSlot extends PlayerSlotBase {
  type: "bot";
  botId: string;  // Generated ID for the bot
  displayName: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface OpenPlayerSlot extends PlayerSlotBase {
  type: "open";
}

export type PlayerSlot = HumanPlayerSlot | BotPlayerSlot | OpenPlayerSlot;

/**
 * Type guard functions
 */
export function isHumanSlot(slot: PlayerSlot): slot is HumanPlayerSlot {
  return slot.type === "human";
}

export function isBotSlot(slot: PlayerSlot): slot is BotPlayerSlot {
  return slot.type === "bot";
}

export function isOpenSlot(slot: PlayerSlot): slot is OpenPlayerSlot {
  return slot.type === "open";
}

export function isFilledSlot(slot: PlayerSlot): slot is HumanPlayerSlot | BotPlayerSlot {
  return slot.type === "human" || slot.type === "bot";
}