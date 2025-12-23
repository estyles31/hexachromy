// /modules/throneworld/functions/actions/JumpAction.ts

import { ActionFinalize, ActionResponse, GameAction, StateDelta } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { ParamChoicesResponse, GameObject } from "../../../../shared/models/ActionParams";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { getHexesWithinRange } from "../../shared/models/BoardLayout.ThroneWorld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { getCargo, type Fleet } from "../../shared/models/Fleets.Throneworld";
import { findUnit, findFleet, IsInCommRange, markBunkerUsed, markFleetMoved } from "./ActionHelpers";
import { getAvailableBunkers } from "./ActionHelpers";

export class JumpAction extends GameAction {
  constructor() {
    super({
      type: "jump",
      undoable: true,
      params: [
        {
          name: "bunkerUnitId",
          type: "gamePiece",
          subtype: "unit",
          message: "Select a Command Bunker"
        },
        {
          name: "fleetId",
          type: "gamePiece",
          subtype: "fleet",
          dependsOn: "bunkerUnitId",
          message: "Select a fleet to jump"
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

  async execute(state: GameState, playerId: string) : Promise<ActionResponse> {
    if (!this.allParamsComplete())
      return { action: this, success: false, error: "Missing params" };

    const bunkerUnitId = this.getStringParam("bunkerUnitId")!;
    const fleetId = this.getStringParam("fleetId")!;
    const targetHexId = this.getStringParam("targetHexId")!;

    return executeJump(
      state as ThroneworldGameState,
      playerId,
      state.version,
      { bunkerUnitId, fleetId, targetHexId },
      this
    );
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

    // Not all params filled yet → default finalize
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

  const raw = getHexesWithinRange(
    fleetHexId,
    jumpRange,
    scenario
  );

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

  // --------------------------------------------------------
  // 1️⃣ SCAN CHECK
  // --------------------------------------------------------
  const alreadyScanned = target.scannedBy?.includes(playerId);

  const hasExplore = fleet.spaceUnits.some(
    u => UNITS[u.unitTypeId]?.Explore
  );

  const willScan = !alreadyScanned && hasExplore;

  // --------------------------------------------------------
  // 2️⃣ COMBAT CHECK
  // --------------------------------------------------------
  const willCombat = Object.entries(target.fleetsInSpace)
    .some(([owner, fl]) =>
      owner !== playerId && fl.length > 0
    );

  // --------------------------------------------------------
  // 3️⃣ INVASION PERMISSION CHECK:
  // Normal invasion allowed only if target hex is
  // within original bunker Comm range
  // --------------------------------------------------------
  const player = state.players[playerId];
  const commRange = player.tech.Comm || 0;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim()
    ? state.options.scenario
    : "6p";

  const reachableFromBunker = getHexesWithinRange(
    bunkerHexId,
    commRange,
    scenario
  );

  const canStandardInvade = reachableFromBunker.includes(targetHexId);

  return {
    willScan,
    willCombat,
    canStandardInvade
  };
}

async function executeJump(
  state: ThroneworldGameState,
  playerId: string,
  expectedVersion: number,
  params: { bunkerUnitId: string; fleetId: string; targetHexId: string },
  action: JumpAction
): Promise<ActionResponse> {

  const { bunkerUnitId, fleetId, targetHexId } = params;

  // ─────────────────────────────────────────────
  // 1️⃣ LOOKUPS
  // ─────────────────────────────────────────────
  const bunkerInfo = findUnit(state, playerId, bunkerUnitId, true);
  if (!bunkerInfo)
    return { action, success: false, error: "Bunker not found" };

  const { unit: bunkerUnit, hexId: bunkerHexId } = bunkerInfo;

  const fleetInfo = findFleet(state, playerId, fleetId);
  if (!fleetInfo)
    return { action, success: false, error: "Fleet not found" };

  const { fleet, hexId: fleetHex } = fleetInfo;

  const targetSystem = state.state.systems[targetHexId];
  if (!targetSystem)
    return { action, success: false, error: "Invalid target hex" };

  // ─────────────────────────────────────────────
  // 2️⃣ MOVE VALIDATION
  // ─────────────────────────────────────────────
  if (bunkerUnit.hasMoved)
    return { action, success: false, error: "Command Bunker already used" };

  const canExplore = fleet.spaceUnits.some(
    u => UNITS[u.unitTypeId]?.Explore
  );

  if (!targetSystem.scannedBy?.includes(playerId) && !canExplore)
    return { action, success: false, error: "Cannot jump to unscanned hex" };

  if (getCargo(fleet) < 0)
    return { action, success: false, error: "Fleet has negative cargo capacity" };

  // store comm-support flag
  action["commSupport"] = IsInCommRange(bunkerHexId, targetHexId, playerId, state);

  // ─────────────────────────────────────────────
  // 3️⃣ BUILD DELTAS
  // ─────────────────────────────────────────────
  const deltas: StateDelta[] = [];

  //
  // mark bunker used
  //
  deltas.push({
    path: `state.systems.${bunkerHexId}.unitsOnPlanet.${playerId}`,
    oldValue: state.state.systems[bunkerHexId].unitsOnPlanet[playerId],
    newValue: markBunkerUsed(
      state.state.systems[bunkerHexId].unitsOnPlanet[playerId],
      bunkerUnitId
    ),
    visibility: "public",
  });

  //
  // remove fleet from source
  //
  deltas.push({
    path: `state.systems.${fleetHex}.fleetsInSpace.${playerId}`,
    oldValue: state.state.systems[fleetHex].fleetsInSpace[playerId],
    newValue: state.state.systems[fleetHex].fleetsInSpace[playerId]
      .filter(f => f.id !== fleetId),
    visibility: "public",
  });

  //
  // add fleet to target
  //
  const targetFleets =
    (state.state.systems[targetHexId].fleetsInSpace[playerId] ?? []);

  deltas.push({
    path: `state.systems.${targetHexId}.fleetsInSpace.${playerId}`,
    oldValue: targetFleets,
    newValue: [...targetFleets, markFleetMoved(fleet)],
    visibility: "public",
  });

  //
  // scanned mark if needed
  //
  if (!targetSystem.scannedBy?.includes(playerId) && canExplore) {
    deltas.push({
      path: `state.systems.${targetHexId}.scannedBy`,
      oldValue: targetSystem.scannedBy ?? [],
      newValue: [...(targetSystem.scannedBy ?? []), playerId],
      visibility: "public",
    });
  }

  //
  // reveal in player view (owner-only)
  //
  deltas.push({
    path: `playerViews.${playerId}.revealed.${targetHexId}`,
    oldValue: undefined,
    newValue: state.state.systems[targetHexId],
    visibility: "owner",
    ownerId: playerId,
  });

  // ─────────────────────────────────────────────
  // 4️⃣ RETURN
  // ─────────────────────────────────────────────
  return {
    action,
    success: true,
    stateChanges: deltas,
    message: `Fleet jumped from ${fleetHex} to ${targetHexId}`,
    undoable: true,
  };
}


registerAction("jump", JumpAction);