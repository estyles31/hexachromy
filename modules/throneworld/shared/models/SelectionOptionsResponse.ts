import type { JumpableFleet } from "../../functions/actions/JumpAction";

export interface SelectionOptionsResponse {
  availableBunkers?: string[];
  scannableHexes?: string[];
  jumpableFleets?: JumpableFleet[];
  jumpDestinations?: string[];
  availableActions: string[];
  message: string;
}