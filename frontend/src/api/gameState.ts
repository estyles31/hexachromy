const DEFAULT_FUNCTIONS_BASE = "https://us-central1-hexachromy.cloudfunctions.net/api";

function getFunctionsBaseUrl(): string {
  return import.meta.env.VITE_FUNCTIONS_BASE_URL ?? DEFAULT_FUNCTIONS_BASE;
}

function getApiBaseUrl(): string {
  const rawBase = getFunctionsBaseUrl().replace(/\/$/, "");
  return rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;
}

export async function fetchGameState(gameId: string): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}/gameState`);
  url.searchParams.set("gameId", gameId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch game state (${response.status})`);
  }

  return response.json();
}
