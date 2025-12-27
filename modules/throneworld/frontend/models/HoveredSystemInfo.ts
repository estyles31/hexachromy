import type { ThroneworldSystemDetails } from "../../shared/models/GameState.Throneworld";

export default interface HoveredSystemInfo {
  hexId: string;
  worldType?: string;
  details?: ThroneworldSystemDetails;
  revealed?: boolean;
}
