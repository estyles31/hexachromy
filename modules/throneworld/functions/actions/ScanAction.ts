// /modules/throneworld/functions/actions/ScanAction.ts
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { GameAction, ActionFinalize, ActionResponse } from "../../../../shared/models/GameAction";
import { GameState } from "../../../../shared/models/GameState";
import { getHexesWithinRange } from "../../shared/models/BoardLayout.ThroneWorld";
import { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { findUnit, getAvailableBunkers } from "./ActionHelpers";

interface ScanMetadata {
  targetHexId?: string;
  didScan?: boolean;
}

export class ScanAction extends GameAction<ScanMetadata> {

  constructor() {
    super({
      type: "scan",
      undoable: false,
      params: [
        {
          name: "bunkerUnitId",
          type: "gamePiece",
          subtype: "unit",
          message: "Select a Command Bunker to Scan",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            return getAvailableBunkers(tw, playerId);
          }
        },
        {
          name: "targetHexId",
          type: "boardSpace",
          subtype: "hex",
          dependsOn: "bunkerUnitId",
          message: "Select target hex to Scan",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            const bunkerUnitId = this.params.find(p => p.name === "bunkerUnitId")?.value;
            if (!bunkerUnitId) return [];

            const bunker = findUnit(tw, playerId, bunkerUnitId as string, true);
            if (!bunker) return [];

            const player = tw.players[playerId];
            const comm = player.tech.Comm ?? 1;
            const scenario = typeof tw.options.scenario === "string" && tw.options.scenario.trim() ? tw.options.scenario : "6p";
            const reachable = getHexesWithinRange(bunker.hexId, comm, scenario);

            return reachable.map(hexId => ({
              id: hexId,
              displayHint: { hexId }
            }));
          }
        }
      ],
      finalize: { mode: "confirm", label: "Scan" }
    });
  }

  getFinalizeInfo(state: GameState, playerId: string): ActionFinalize {
    const bunkerUnitId = this.params.find(p => p.name === "bunkerUnitId")?.value;
    const targetHexId = this.params.find(p => p.name === "targetHexId")?.value;

    if (!bunkerUnitId || !targetHexId) return this.finalize!;

    const tw = state as ThroneworldGameState;
    const target = tw.state.systems[targetHexId];
    const already = target?.scannedBy?.includes(playerId);

    return { mode: "confirm", label: already ? "Rescan?" : "Scan", warnings: already ? ["You already scanned this hex"] : [] };
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    if (!this.allParamsComplete()) return { action: this, success: false, error: "missing_parameters" };

    const tw = state as ThroneworldGameState;
    const bunkerUnitId = this.getStringParam("bunkerUnitId")!;
    const targetHexId = this.getStringParam("targetHexId")!;

    const bunkerInfo = findUnit(tw, playerId, bunkerUnitId, true);
    if (!bunkerInfo) return { action: this, success: false, error: "bunker_not_found" };

    const { unit: bunkerUnit, hexId: bunkerHexId } = bunkerInfo;
    const system = tw.state.systems[targetHexId];
    if (!system) return { action: this, success: false, error: "invalid_hex" };
    if (bunkerUnit.hasMoved) return { action: this, success: false, error: "bunker_used" };

    const already = system.scannedBy?.includes(playerId);
    if (already) return { action: this, success: false, error: "hex_scanned" };

    const player = tw.players[playerId];
    const comm = player.tech.Comm ?? 1;
    const scenario = typeof tw.options.scenario === "string" && tw.options.scenario.trim() ? tw.options.scenario : "6p";
    const reachable = getHexesWithinRange(bunkerHexId, comm, scenario);

    if (!reachable.includes(targetHexId)) return { action: this, success: false, error: "out_of_range" };

    bunkerUnit.hasMoved = true;
    if (!system.scannedBy) system.scannedBy = [];
    system.scannedBy.push(playerId);

    this.metadata.targetHexId = targetHexId;
    this.metadata.didScan = true;

    return { action: this, success: true, undoable: false, message: `Scanned hex ${targetHexId}` };
  }
}

registerAction("scan", ScanAction);