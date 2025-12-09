export type CreateGameOptions = {
  gameType: string;
  scenarioId: string;
  players: string[];
  options: Record<string, unknown>;
  name?: string;
};
