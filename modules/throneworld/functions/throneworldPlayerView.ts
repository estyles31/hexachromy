// /modules/throneworld/functions/throneworldPlayerView.ts
import { GameDatabaseAdapter } from "../../../shared/models/GameDatabaseAdapter";
import { ThroneworldPlayerView } from "../shared/models/GameState.Throneworld";

export async function getPlayerViews({ gameId, playerId, db}: {
  gameId: string; playerId: string; db: GameDatabaseAdapter}) {
  const view =
    await db.getDocument<ThroneworldPlayerView>(
      `games/${gameId}/playerViews/${playerId}`,
    );

    const views : Record<string, ThroneworldPlayerView> = {};
    if(view) {
      views[playerId] = view;
    }

  return { playerViews: views };
}
