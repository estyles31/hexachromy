export function parsePlayerCountFromScenario(
  scenario: string | undefined,
  fallback: number,
): number {
  const match = scenario?.match(/(\d+)/);
  const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
