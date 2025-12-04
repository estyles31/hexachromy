import { Firestore } from "firebase-admin/firestore";
import throneworld from "./throneworld";
import { GameModule } from "./types";

const gameModules: GameModule[] = [throneworld];

export function getGameModule(type: string): GameModule | undefined {
  return gameModules.find(module => module.type === type);
}

export async function seedGameModules(db: Firestore): Promise<void> {
  await Promise.all(gameModules.map(async module => module.seed?.(db)));
}
