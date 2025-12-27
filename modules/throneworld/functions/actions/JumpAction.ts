// /modules/throneworld/functions/actions/JumpAction.ts
import { ActionFinalize, ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { ParamChoicesResponse, GameObject } from "../../../../shared/models/ActionParams";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { getHexesWithinRange } from "../../shared/models/BoardLayout.ThroneWorld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { getCargo, type Fleet } from "../../shared/models/Fleets.Throneworld";
import { findUnit, findFleet, IsInCommRange } from "./ActionHelpers";
import { getAvailableBunkers } from "./ActionHelpers";

interface JumpMetadata {
  targetHexId?: string;
  didScan?: boolean;
  willCombat?: boolean;
  commSupport?: boolean;
  canStandardInvade?: boolean;
}

export class JumpAction extends GameAction<JumpMetadata> {
  constructor() {
    super({
      type: "jump",
      undoable: true,
      params: [
        {
          name: "bunkerUnitId",
          type: "gamePiece",
          subtype: "unit",
          message: "Select a Command Bunker to Jump"
        },
        {
          name: "fleetId",
          type: "gamePiece",
          subtype: "fleet",
          dependsOn: "bunkerUnitId",
          message: "Select a Fleet to Jump"
        },
        {
          name: "targetHexId",
          type: "boardSpace",
          subtype: "hex",
          dependsOn: "fleetId",
          message: "Select destination hex"
        }
      ],
      finalize: {
        mode: "confirm",
        label: "Jump"
      }
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    if (!this.allParamsComplete())
      return { action: this, success: false, error: "Missing params" };

    const tw = state as ThroneworldGameState;
    const bunkerUnitId = this.getStringParam("bunkerUnitId")!;
    const fleetId = this.getStringParam("fleetId")!;
    const targetHexId = this.getStringParam("targetHexId")!;

    // Lookups
    const bunkerInfo = findUnit(tw, playerId, bunkerUnitId, true);
    if (!bunkerInfo)
      return { action: this, success: false, error: "Bunker not found" };

    const { unit: bunkerUnit, hexId: bunkerHexId } = bunkerInfo;

    const fleetInfo = findFleet(tw, playerId, fleetId);
    if (!fleetInfo)
      return { action: this, success: false, error: "Fleet not found" };

    const { fleet, hexId: fleetHex } = fleetInfo;

    const targetSystem = tw.state.systems[targetHexId];
    if (!targetSystem)
      return { action: this, success: false, error: "Invalid target hex" };

    // Validation
    if (bunkerUnit.hasMoved)
      return { action: this, success: false, error: "Command Bunker already used" };

    // Fleet jumpable validation
    if (!fleetIsJumpable(fleet)) {
      return { action: this, success: false, error: "Fleet cannot jump" };
    }

    const player = tw.players[playerId];
    const comm = player.tech.Comm ?? 1;
    const jump = player.tech.Jump ?? 1;
    const scenario =
      typeof tw.options.scenario === "string" && tw.options.scenario.trim()
        ? tw.options.scenario
        : "6p";

    // Comm-range validation
    const commReach = getHexesWithinRange(bunkerHexId, comm, scenario);
    if (!commReach.includes(fleetHex)) {
      return { action: this, success: false, error: "fleet_not_in_comm_range" };
    }

    // Jump-range validation
    const jumpReach = getHexesWithinRange(fleetHex, jump, scenario);
    if (!jumpReach.includes(targetHexId)) {
      return { action: this, success: false, error: "target_out_of_jump_range" };
    }

    const canExplore = fleet.spaceUnits.every(
      u => UNITS[u.unitTypeId]?.Explore
    );

    if (!targetSystem.scannedBy?.includes(playerId) && !canExplore)
      return { action: this, success: false, error: "Cannot jump to unscanned hex" };

    if (getCargo(fleet) < 0) 
      return { action: this, success: false, error: "Fleet has negative cargo capacity" };

    const alreadyScanned = targetSystem.scannedBy?.includes(playerId);
    const didScan = !alreadyScanned && canExplore;

    const willCombat = Object.entries(targetSystem.fleetsInSpace)
      .some(([owner, fl]) => owner !== playerId && fl.length > 0);

    // Store metadata
    this.metadata.targetHexId = targetHexId;
    this.metadata.didScan = didScan;
    this.metadata.willCombat = willCombat;
    this.metadata.commSupport = IsInCommRange(bunkerHexId, targetHexId, playerId, tw);

    // Mutate state
    bunkerUnit.hasMoved = true;

    const sourceFleets = tw.state.systems[fleetHex].fleetsInSpace[playerId];
    const fleetIndex = sourceFleets.findIndex(f => f.id === fleetId);
    if (fleetIndex !== -1) {
      sourceFleets.splice(fleetIndex, 1);
    }

    fleet.spaceUnits.forEach(u => u.hasMoved = true);
    fleet.groundUnits.forEach(u => u.hasMoved = true);

    if (!targetSystem.fleetsInSpace[playerId]) {
      targetSystem.fleetsInSpace[playerId] = [];
    }
    targetSystem.fleetsInSpace[playerId].push(fleet);

    if (didScan) {
      if (!targetSystem.scannedBy) {
        targetSystem.scannedBy = [];
      }
      targetSystem.scannedBy.push(playerId);
    }

    return {
      action: this,
      success: true,
      message: `Fleet jumped from ${fleetHex} to ${targetHexId}`,
      undoable: true,
    };
  }

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
        return getJumpableBunkerChoices(state, playerId);

      case "fleetId": {
        const bunkerUnitId = filled.bunkerUnitId;
        return bunkerUnitId
          ? getFleetChoices(state, playerId, bunkerUnitId)
          : { choices: [], error: "Select bunker first" };
      }

      case "targetHexId": {
        const fleetId = filled.fleetId;
        return fleetId
          ? getDestinationChoices(state, playerId, fleetId)
          : { choices: [], error: "Select fleet first" };
      }

      default:
        return { choices: [], error: "Unknown param" };
    }
  }

  getFinalizeInfo(state: GameState, playerId: string): ActionFinalize {
    const bunkerUnitId = this.getStringParam("bunkerUnitId");
    const fleetId = this.getStringParam("fleetId");
    const targetHexId = this.getStringParam("targetHexId");

    if (!bunkerUnitId || !fleetId || !targetHexId) {
      return this.finalize ?? { mode: "confirm", label: this.type };
    }

    const { willScan, willCombat } = evaluateJumpConsequences(
      state as ThroneworldGameState,
      playerId,
      bunkerUnitId,
      fleetId,
      targetHexId
    );

    if (willCombat) {
      return {
        mode: "confirm",
        label: "Jump (Combat)",
        warnings: ["This jump will initiate combat."]
      };
    }

    if (willScan) {
      return {
        mode: "confirm",
        label: "Jump & Scan"
      };
    }

    return {
      mode: "confirm",
      label: "Jump"
    };
  }
}

function getJumpableBunkerChoices(
  state: ThroneworldGameState,
  playerId: string
): ParamChoicesResponse {
  const bunkers = getAvailableBunkers(state, playerId);

  return {
    choices: bunkers.map(b => ({
      id: b.id,
      type: "gamePiece",
      subtype: "unit",
      displayHint: {
        pieceId: b.id,
        hexId: (b.metadata as { hexId: string }).hexId
      }
    })),
    message: `Select Command Bunker (${bunkers.length} available)`
  }
}

function getFleetChoices(
  state: ThroneworldGameState,
  playerId: string,
  bunkerUnitId: string
): ParamChoicesResponse {
  const bunkerInfo = findUnit(state, playerId, bunkerUnitId, true);
  if (!bunkerInfo) {
    return { choices: [], error: "Bunker not found" };
  }

  const { hexId: bunkerHexId } = bunkerInfo;
  const player = state.players[playerId];
  const commRange = player.tech.Comm || 0;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
    ? state.options.scenario
    : "6p";
  const inRangeHexes = getHexesWithinRange(bunkerHexId, commRange, scenario);

  const fleets: GameObject[] = [];

  for (const hexId of inRangeHexes) {
    const system = state.state.systems[hexId];
    const playerFleets = system?.fleetsInSpace[playerId];

    if (!playerFleets) continue;

    for (const f of playerFleets) {
      if (fleetIsJumpable(f)) {
        fleets.push({
          id: f.id,
          type: "gamePiece",
          subtype: "fleet",
          metadata: { hexId }
        });
      }
    }
  }

  return {
    choices: fleets.map(f => ({
      id: f.id,
      type: "gamePiece",
      subtype: "fleet",
      displayHint: {
        pieceId: f.id,
        hexId: (f.metadata as { hexId: string }).hexId
      }
    })),
    message: `Select fleet (${fleets.length} in range)`
  };
}

function fleetIsJumpable(fleet: Fleet): boolean {
  const hasStatic = [...fleet.spaceUnits, ...fleet.groundUnits]
    .some(u => UNITS[u.unitTypeId]?.Static);

  const hasMoved = [...fleet.spaceUnits, ...fleet.groundUnits]
    .some(u => u.hasMoved);

  return !hasStatic && !hasMoved;
}

function getDestinationChoices(
  state: ThroneworldGameState,
  playerId: string,
  fleetId: string
): ParamChoicesResponse {
  const player = state.players[playerId];
  const jumpRange = player.tech.Jump || 0;

  const fleetInfo = findFleet(state, playerId, fleetId);
  if (!fleetInfo) {
    return { choices: [], error: "Fleet not found" };
  }

  const { fleet, hexId: fleetHexId } = fleetInfo;

  const canExplore = fleet.spaceUnits.some(
    u => UNITS[u.unitTypeId]?.Explore
  );

  const scenario =
    typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
      ? state.options.scenario
      : "6p";

  const raw = getHexesWithinRange(fleetHexId, jumpRange, scenario);

  const choices: ParamChoicesResponse["choices"] = [];

  for (const hexId of raw) {
    const sys = state.state.systems[hexId];
    if (!sys) continue;

    const alreadyScanned = sys.scannedBy?.includes(playerId);
    if (!alreadyScanned && !canExplore) continue;

    const willScan = !alreadyScanned && canExplore;
    const willCombat = Object.entries(sys.fleetsInSpace)
      .some(([owner, fl]) => owner !== playerId && fl.length > 0);

    choices.push({
      id: hexId,
      type: "boardSpace",
      subtype: "hex",
      displayHint: { hexId },
      metadata: {
        willScan,
        willCombat,
      }
    });
  }

  return {
    choices,
    message: `Select destination (${choices.length} valid)`,
  };
}

function evaluateJumpConsequences(
  state: ThroneworldGameState,
  playerId: string,
  bunkerUnitId: string,
  fleetId: string,
  targetHexId: string
): {
  willScan: boolean;
  willCombat: boolean;
  canStandardInvade: boolean;
} {
  const bunkerInfo = findUnit(state, playerId, bunkerUnitId, true);
  const fleetInfo = findFleet(state, playerId, fleetId);
  const target = state.state.systems[targetHexId];

  if (!bunkerInfo || !fleetInfo || !target) {
    return { willScan: false, willCombat: false, canStandardInvade: false };
  }

  const { hexId: bunkerHexId } = bunkerInfo;
  const { fleet } = fleetInfo;

  const alreadyScanned = target.scannedBy?.includes(playerId);
  const hasExplore = fleet.spaceUnits.some(u => UNITS[u.unitTypeId]?.Explore);
  const willScan = !alreadyScanned && hasExplore;

  const willCombat = Object.entries(target.fleetsInSpace)
    .some(([owner, fl]) => owner !== playerId && fl.length > 0);

  const player = state.players[playerId];
  const commRange = player.tech.Comm || 0;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim()
    ? state.options.scenario
    : "6p";

  const reachableFromBunker = getHexesWithinRange(bunkerHexId, commRange, scenario);
  const canStandardInvade = reachableFromBunker.includes(targetHexId);

  return {
    willScan,
    willCombat,
    canStandardInvade
  };
}

registerAction("jump", JumpAction);