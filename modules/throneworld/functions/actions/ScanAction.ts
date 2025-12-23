// /modules/throneworld/functions/actions/ScanAction.ts

import { GameObject, ParamChoicesResponse } from "../../../../shared/models/ActionParams";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { GameAction, ActionFinalize, ActionResponse, StateDelta } from "../../../../shared/models/GameAction";
import { GameState } from "../../../../shared/models/GameState";
import { getHexesWithinRange } from "../../shared/models/BoardLayout.ThroneWorld";
import { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { findUnit, markUnitsMoved } from "./ActionHelpers";

/**
 * SCAN ACTION
 * Command bunker → scan hex within Comm range → mark bunker used
 */
export class ScanAction extends GameAction {

  constructor() {
    super({
      type: "scan",
      undoable: false,
      params: [
        {
          name: "bunkerUnitId",
          type: "gamePiece",
          subtype: "unit",
          message: "Select a Command Bunker"
        },
        {
          name: "targetHexId",
          type: "boardSpace",
          subtype: "hex",
          dependsOn: "bunkerUnitId",
          message: "Select hex to scan"
        }
      ],
      finalize: {
        mode: "confirm",
        label: "Scan"
      }
    });
  }


  /**
   * FINALIZE text
   */
  getFinalizeInfo(state: GameState, playerId: string): ActionFinalize {

    const bunkerUnitId = this.params.find(p => p.name === "bunkerUnitId")?.value;
    const targetHexId = this.params.find(p => p.name === "targetHexId")?.value;

    if (!bunkerUnitId || !targetHexId)
      return this.finalize!;

    const tw = state as ThroneworldGameState;
    const target = tw.state.systems[targetHexId];
    const already = target?.scannedBy?.includes(playerId);

    return {
      mode: "confirm",
      label: already ? "Rescan?" : "Scan",
      warnings: already ? ["You already scanned this hex"] : []
    };
  }


  /**
   * EXECUTE (produce StateDelta[])
   */
  async execute(state: GameState, playerId: string): Promise<ActionResponse> {

    if (!this.allParamsComplete()) {
      return { action: this, success: false, error: "missing_parameters" };
    }

    const tw = state as ThroneworldGameState;

    const bunkerUnitId = this.params.find(p => p.name === "bunkerUnitId")!.value as string;
    const targetHexId = this.params.find(p => p.name === "targetHexId")!.value as string;

    const bunkerInfo = findUnit(tw, playerId, bunkerUnitId, true);
    if (!bunkerInfo)
      return { action: this, success: false, error: "bunker_not_found" };

    const { unit: bunkerUnit, hexId: bunkerHexId } = bunkerInfo;

    const system = tw.state.systems[targetHexId];
    if (!system)
      return { action: this, success: false, error: "invalid_hex" };

    if (bunkerUnit.hasMoved)
      return { action: this, success: false, error: "bunker_used" };

    const already = system.scannedBy?.includes(playerId);
    if (already)
      return { action: this, success: false, error: "hex_scanned" };


    // ===============
    // BUILD DELTAS
    // ===============

    const deltas: StateDelta[] = [];


    // 1️⃣ mark bunker used
    const bunkerUnits =
      tw.state.systems[bunkerHexId].unitsOnPlanet[playerId];

    const newUnits = markUnitsMoved(bunkerUnits, [bunkerUnitId]);

    deltas.push({
      path: `state.systems.${bunkerHexId}.unitsOnPlanet.${playerId}`,
      oldValue: bunkerUnits,
      newValue: newUnits,
      visibility: "public"
    });


    // 2️⃣ record scannedBy list
    const oldScan = system.scannedBy ?? [];

    deltas.push({
      path: `state.systems.${targetHexId}.scannedBy`,
      oldValue: oldScan,
      newValue: [...oldScan, playerId],
      visibility: "public",
    });


    // 3️⃣ reveal data to playerView
    deltas.push({
      path: `playerViews.${playerId}.revealed.${targetHexId}`,
      oldValue: undefined,
      newValue: system,
      visibility: "owner",
      ownerId: playerId
    });


    return {
      action: this, 
      success: true,
      stateChanges: deltas,
      undoable: false,
      message: `hex ${targetHexId} scanned`
    };
  }


  /**
   * PARAM CHOICES
   */
  getParamChoices(
    state: ThroneworldGameState,
    playerId: string,
    paramName: string
  ): ParamChoicesResponse {

    const filled = Object.fromEntries(
      this.params
        .filter(p => p.value !== undefined)
        .map(p => [p.name, p.value as string])
    );

    switch (paramName) {

      case "bunkerUnitId":
        return getScanBunkerChoices(state, playerId);

      case "targetHexId":
        if (!filled.bunkerUnitId)
          return { choices: [], error: "select_bunker" };

        return getScanTargetChoices(state, playerId, filled.bunkerUnitId);

      default:
        return { choices: [], error: "unknown_param" };
    }
  }
}

function getScanBunkerChoices(
  state: ThroneworldGameState,
  playerId: string
): ParamChoicesResponse {

  const out: GameObject[] = [];

  for (const [hexId, system] of Object.entries(state.state.systems)) {

    const units = system.unitsOnPlanet[playerId];
    if (!units) continue;

    for (const u of units) {

      const def = UNITS[u.unitTypeId];
      if (!def?.Command) continue;
      if (u.hasMoved) continue;

      out.push({
        id: u.id,
        type: "gamePiece",
        subtype: "unit",
        metadata: { hexId }
      });
    }
  }

  return {
    choices: out.map(o => ({
      id: o.id,
      type: "gamePiece",
      subtype: "unit",
      displayHint: o.metadata
    })),
    message: `Select Command Bunker (${out.length})`
  };
}


export function getScanTargetChoices(
  state: ThroneworldGameState,
  playerId: string,
  bunkerUnitId: string
): ParamChoicesResponse {

  const bunker = findUnit(state, playerId, bunkerUnitId, true);
  if (!bunker)
    return { choices: [], error: "bunker_not_found" };

  const player = state.players[playerId];
  const comm = player.tech.Comm ?? 1;

  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim()
    ? state.options.scenario
    : "6p";

  const reachable = getHexesWithinRange(bunker.hexId, comm, scenario);

  return {
    choices: reachable.map(hexId => ({
      id: hexId,
      type: "boardSpace",
      subtype: "hex",
      displayHint: { hexId }
    })),
    message: `Select target (${reachable.length})`
  };
}

registerAction("scan", ScanAction);
