import { Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { buildBoardSvgByPlayerCount, buildBoardsByPlayerCount } from "./throneworldBoard";
import seed from "../../../shared/data/firestoreSeed.throneworld.json";

interface SeedGameDefinition {
  id: string;
  name: string;
  type: string;
  description?: string;
  playerCounts: number[];
}

interface SeedGame {
  id: string;
  name: string;
  status: string;
  gameDefinitionId: string;
  playerCount: number;
  players: string[];
  currentPlayer?: string;
  turn?: number;
  phase?: string;
  stateVersion?: number;
  state?: unknown;
}

interface ThroneworldSeed {
  gameDefinition: SeedGameDefinition;
  games: SeedGame[];
}

const throneworldSeed = seed as ThroneworldSeed;

export async function ensureThroneworldSeed(db: Firestore): Promise<void> {
  const boardsByPlayerCount = buildBoardsByPlayerCount(throneworldSeed.gameDefinition.playerCounts);
  const boardSvgByPlayerCount = buildBoardSvgByPlayerCount(throneworldSeed.gameDefinition.playerCounts);

  const definitionRef = db.doc(`gameDefinitions/${throneworldSeed.gameDefinition.id}`);
  const definitionSnap = await definitionRef.get();

  if (!definitionSnap.exists) {
    await definitionRef.set({
      ...throneworldSeed.gameDefinition,
      boardsByPlayerCount,
      boardSvgByPlayerCount,
    });
    logger.info("Seeded throneworld game definition", { gameDefinitionId: throneworldSeed.gameDefinition.id });
  }

  await Promise.all(throneworldSeed.games.map(async game => {
    const gameRef = db.doc(`games/${game.id}`);
    const snap = await gameRef.get();

    if (snap.exists) return;

    await gameRef.set({
      ...game,
      boardsByPlayerCount,
      boardSvgByPlayerCount,
    });
    logger.info("Seeded throneworld mock game", { gameId: game.id });
  }));
}
