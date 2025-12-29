// /modules/throneworld/functions/actions/JumpAction.ts
import { ActionFinalize, ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { getHexesWithinRange } from "../../shared/models/BoardLayout.ThroneWorld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { getCargo, type Fleet } from "../../shared/models/Fleets.Throneworld";
import { findUnit, findFleet, IsInCommRange, getAvailableBunkers } from "./ActionHelpers";

interface JumpMetadata {
  targetHexId?: string;
  didScan?: boolean;
  willCombat?: boolean;
  commSupport?: boolean;
  canStandardInvade?: boolean;
}

function fleetIsJumpable(fleet: Fleet): boolean {
  const hasStatic = [...fleet.spaceUnits, ...fleet.groundUnits].some(u => UNITS[u.unitTypeId]?.Static);
  const hasMoved = [...fleet.spaceUnits, ...fleet.groundUnits].some(u => u.hasMoved);
  return !hasStatic && !hasMoved;
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
          message: "Select a Command Bunker to Jump",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            return getAvailableBunkers(tw, playerId);
          }
        },
        {
          name: "fleetId",
          type: "gamePiece",
          subtype: "fleet",
          dependsOn: "bunkerUnitId",
          message: "Select a Fleet to Jump",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            const bunkerUnitId = this.params.find(p => p.name === "bunkerUnitId")?.value;
            if (!bunkerUnitId) return [];

            const bunkerInfo = findUnit(tw, playerId, bunkerUnitId as string, true);
            if (!bunkerInfo) return [];

            const { hexId: bunkerHexId } = bunkerInfo;
            const player = tw.players[playerId];
            const commRange = player.tech.Comm || 0;
            const scenario = typeof tw.options.scenario === "string" && tw.options.scenario.trim().length > 0 ? tw.options.scenario : "6p";
            const inRangeHexes = getHexesWithinRange(bunkerHexId, commRange, scenario);

            const fleets: Array<{ id: string; hexId: string }> = [];
            for (const hexId of inRangeHexes) {
              const system = tw.state.systems[hexId];
              const playerFleets = system?.fleetsInSpace[playerId];
              if (!playerFleets) continue;
              for (const f of playerFleets) {
                if (fleetIsJumpable(f)) fleets.push({ id: f.id, hexId });
              }
            }

            return fleets.map(f => ({
              id: f.id,
              displayHint: { pieceId: f.id, hexId: f.hexId }
            }));
          }
        },
        {
          name: "targetHexId",
          type: "boardSpace",
          subtype: "hex",
          dependsOn: "fleetId",
          message: "Select destination hex",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            const fleetId = this.params.find(p => p.name === "fleetId")?.value;
            if (!fleetId) return [];

            const player = tw.players[playerId];
            const jumpRange = player.tech.Jump || 0;
            const fleetInfo = findFleet(tw, playerId, fleetId as string);
            if (!fleetInfo) return [];

            const { fleet, hexId: fleetHexId } = fleetInfo;
            const canExplore = fleet.spaceUnits.some(u => UNITS[u.unitTypeId]?.Explore);
            const scenario = typeof tw.options.scenario === "string" && tw.options.scenario.trim().length > 0 ? tw.options.scenario : "6p";
            const raw = getHexesWithinRange(fleetHexId, jumpRange, scenario);

            const choices: Array<{ id: string; willScan: boolean; willCombat: boolean }> = [];
            for (const hexId of raw) {
              const sys = tw.state.systems[hexId];
              if (!sys) continue;

              const alreadyScanned = sys.scannedBy?.includes(playerId);
              if (!alreadyScanned && !canExplore) continue;

              const willScan = !alreadyScanned && canExplore;
              const willCombat = Object.entries(sys.fleetsInSpace).some(([owner, fl]) => owner !== playerId && fl.length > 0);
              choices.push({ id: hexId, willScan, willCombat });
            }

            return choices.map(c => ({
              id: c.id,
              displayHint: { hexId: c.id },
              metadata: { willScan: c.willScan, willCombat: c.willCombat }
            }));
          }
        }
      ],
      finalize: { mode: "confirm", label: "Jump" }
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    if (!this.allParamsComplete()) return { action: this, success: false, error: "Missing params" };

    const tw = state as ThroneworldGameState;
    const bunkerUnitId = this.getStringParam("bunkerUnitId")!;
    const fleetId = this.getStringParam("fleetId")!;
    const targetHexId = this.getStringParam("targetHexId")!;

    const bunkerInfo = findUnit(tw, playerId, bunkerUnitId, true);
    if (!bunkerInfo) return { action: this, success: false, error: "Bunker not found" };
    const { unit: bunkerUnit, hexId: bunkerHexId } = bunkerInfo;

    const fleetInfo = findFleet(tw, playerId, fleetId);
    if (!fleetInfo) return { action: this, success: false, error: "Fleet not found" };
    const { fleet, hexId: fleetHex } = fleetInfo;

    const targetSystem = tw.state.systems[targetHexId];
    if (!targetSystem) return { action: this, success: false, error: "Invalid target hex" };

    if (bunkerUnit.hasMoved) return { action: this, success: false, error: "Command Bunker already used" };
    if (!fleetIsJumpable(fleet)) return { action: this, success: false, error: "Fleet cannot jump" };

    const player = tw.players[playerId];
    const comm = player.tech.Comm ?? 1;
    const jump = player.tech.Jump ?? 1;
    const scenario = typeof tw.options.scenario === "string" && tw.options.scenario.trim() ? tw.options.scenario : "6p";

    const commReach = getHexesWithinRange(bunkerHexId, comm, scenario);
    if (!commReach.includes(fleetHex)) return { action: this, success: false, error: "fleet_not_in_comm_range" };

    const jumpReach = getHexesWithinRange(fleetHex, jump, scenario);
    if (!jumpReach.includes(targetHexId)) return { action: this, success: false, error: "target_out_of_jump_range" };

    const canExplore = fleet.spaceUnits.every(u => UNITS[u.unitTypeId]?.Explore);
    if (!targetSystem.scannedBy?.includes(playerId) && !canExplore)
      return { action: this, success: false, error: "Cannot jump to unscanned hex" };

    if (getCargo(fleet) < 0) return { action: this, success: false, error: "Fleet has negative cargo capacity" };

    const alreadyScanned = targetSystem.scannedBy?.includes(playerId);
    const didScan = !alreadyScanned && canExplore;
    const willCombat = Object.entries(targetSystem.fleetsInSpace).some(([owner, fl]) => owner !== playerId && fl.length > 0);

    this.metadata.targetHexId = targetHexId;
    this.metadata.didScan = didScan;
    this.metadata.willCombat = willCombat;
    this.metadata.commSupport = IsInCommRange(bunkerHexId, targetHexId, playerId, tw);

    bunkerUnit.hasMoved = true;

    const sourceFleets = tw.state.systems[fleetHex].fleetsInSpace[playerId];
    const fleetIndex = sourceFleets.findIndex(f => f.id === fleetId);
    if (fleetIndex !== -1) sourceFleets.splice(fleetIndex, 1);

    fleet.spaceUnits.forEach(u => u.hasMoved = true);
    fleet.groundUnits.forEach(u => u.hasMoved = true);

    if (!targetSystem.fleetsInSpace[playerId]) targetSystem.fleetsInSpace[playerId] = [];
    targetSystem.fleetsInSpace[playerId].push(fleet);

    if (didScan) {
      if (!targetSystem.scannedBy) targetSystem.scannedBy = [];
      targetSystem.scannedBy.push(playerId);
    }

    return { action: this, success: true, message: `Fleet jumped from ${fleetHex} to ${targetHexId}`, undoable: true };
  }

  getFinalizeInfo(state: GameState, playerId: string): ActionFinalize {
    const bunkerUnitId = this.getStringParam("bunkerUnitId");
    const fleetId = this.getStringParam("fleetId");
    const targetHexId = this.getStringParam("targetHexId");

    if (!bunkerUnitId || !fleetId || !targetHexId) return this.finalize ?? { mode: "confirm", label: this.type };

    const tw = state as ThroneworldGameState;
    const bunkerInfo = findUnit(tw, playerId, bunkerUnitId, true);
    const fleetInfo = findFleet(tw, playerId, fleetId);
    const target = tw.state.systems[targetHexId];

    if (!bunkerInfo || !fleetInfo || !target) return this.finalize ?? { mode: "confirm", label: "Jump" };

    const { fleet } = fleetInfo;
    const alreadyScanned = target.scannedBy?.includes(playerId);
    const hasExplore = fleet.spaceUnits.some(u => UNITS[u.unitTypeId]?.Explore);
    const willScan = !alreadyScanned && hasExplore;
    const willCombat = Object.entries(target.fleetsInSpace).some(([owner, fl]) => owner !== playerId && fl.length > 0);

    if (willCombat) return { mode: "confirm", label: "Jump (Combat)", warnings: ["This jump will initiate combat."] };
    if (willScan) return { mode: "confirm", label: "Jump & Scan" };
    return { mode: "confirm", label: "Jump" };
  }
}

registerAction("jump", JumpAction);