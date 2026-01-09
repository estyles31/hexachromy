// /modules/throneworld/functions/actions/ReorganizeAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { getCargo, createEmptyFleet } from "../../shared/models/Fleets.Throneworld";
import type { ThroneworldUnit } from "../../shared/models/Unit.Throneworld";

export class ReorganizeAction extends GameAction {
  constructor() {
    super({
      type: "reorganize",
      undoable: true,
      params: [
        {
          name: "sourceFleetId",
          type: "gamePiece",
          subtype: "fleet",
          message: "Select fleet to reorganize",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            const choices: Array<{ id: string; hexId: string }> = [];

            for (const [hexId, system] of Object.entries(tw.state.systems)) {
              const fleets = system.fleetsInSpace[playerId] || [];
              for (const fleet of fleets) {
                // Skip fleets with only static units
                const allUnits = [...fleet.spaceUnits, ...fleet.groundUnits];
                const hasMovableUnits = allUnits.some((u) => !UNITS[u.unitTypeId].Static);
                if (!hasMovableUnits) continue;

                choices.push({ id: fleet.id, hexId });
              }
            }

            return choices.map((c) => ({
              id: c.id,
              displayHint: { pieceId: c.id, hexId: c.hexId },
            }));
          },
        },
        {
          name: "targetEntity",
          type: "choice",
          dependsOn: "sourceFleetId",
          message: "Reorganize with...",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            const sourceFleetId = this.params.find((p) => p.name === "sourceFleetId")?.value as string;
            if (!sourceFleetId) return [];

            // Find source fleet's hex
            let sourceHexId: string | null = null;
            for (const [hexId, system] of Object.entries(tw.state.systems)) {
              if (system.fleetsInSpace[playerId]?.some((f) => f.id === sourceFleetId)) {
                sourceHexId = hexId;
                break;
              }
            }

            if (!sourceHexId) return [];

            const system = tw.state.systems[sourceHexId];
            const choices: Array<{ id: string; label: string }> = [];

            // Other fleets in same hex
            const fleets = system.fleetsInSpace[playerId] || [];
            for (const fleet of fleets) {
              if (fleet.id !== sourceFleetId) {
                // Skip fleets with only static units
                const allUnits = [...fleet.spaceUnits, ...fleet.groundUnits];
                const hasMovableUnits = allUnits.some((u) => !UNITS[u.unitTypeId].Static);
                if (!hasMovableUnits) continue;

                const unitCount = fleet.spaceUnits.length + fleet.groundUnits.length;
                choices.push({
                  id: fleet.id,
                  label: `Fleet ${fleet.id.slice(0, 8)} (${unitCount} units)`,
                });
              }
            }

            // New fleet option
            choices.push({ id: "new_fleet", label: "New Fleet" });

            // Planet option (if owned)
            if (system.details?.owner === playerId) {
              const planetUnits = system.unitsOnPlanet[playerId]?.length || 0;
              choices.push({
                id: sourceHexId, // Use hexId to identify planet
                label: `Planet (${planetUnits} units)`,
              });
            }

            return choices.map((c) => ({ id: c.id, label: c.label }));
          },
        },
        {
          name: "targetUnits",
          type: "custom",
          subtype: "reorganizeFleet",
          dependsOn: "targetEntity",
          message: "Select units to move to target",
          hasValidChoices: true,
        },
      ],
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    if (!this.allParamsComplete()) {
      return { action: this, success: false, error: "Missing parameters" };
    }

    const tw = state as ThroneworldGameState;
    const sourceFleetId = this.getStringParam("sourceFleetId")!;
    const targetEntityId = this.getStringParam("targetEntity")!;
    const targetUnitIds = (this.getParamValue("targetUnits") as string[]) || [];

    // Find source fleet
    let sourceHexId: string | null = null;
    let sourceFleet = null;
    for (const [hexId, system] of Object.entries(tw.state.systems)) {
      const fleet = system.fleetsInSpace[playerId]?.find((f) => f.id === sourceFleetId);
      if (fleet) {
        sourceHexId = hexId;
        sourceFleet = fleet;
        break;
      }
    }

    if (!sourceHexId || !sourceFleet) {
      return { action: this, success: false, error: "Source fleet not found" };
    }

    const system = tw.state.systems[sourceHexId];
    const isTargetPlanet = targetEntityId === sourceHexId;
    const isNewFleet = targetEntityId === "new_fleet";

    // Validate planet ownership
    if (isTargetPlanet && system.details?.owner !== playerId) {
      return { action: this, success: false, error: "You don't own this planet" };
    }

    // Get all units from both entities
    const sourceUnits = [...sourceFleet.spaceUnits, ...sourceFleet.groundUnits];
    let targetUnits: ThroneworldUnit[] = [];
    let targetFleet = null;

    if (isTargetPlanet) {
      targetUnits = system.unitsOnPlanet[playerId] || [];
    } else if (!isNewFleet) {
      targetFleet = system.fleetsInSpace[playerId]?.find((f) => f.id === targetEntityId);
      if (!targetFleet) {
        return { action: this, success: false, error: "Target fleet not found" };
      }
      targetUnits = [...targetFleet.spaceUnits, ...targetFleet.groundUnits];
    }

    const allUnits = [...sourceUnits, ...targetUnits];

    // Split units, keeping Static units in their original location
    const unitsForTarget = allUnits.filter((u) => {
      if (UNITS[u.unitTypeId].Static) {
        // Keep Static units in their original location
        return targetUnits.some((tu) => tu.id === u.id);
      }
      return targetUnitIds.includes(u.id);
    });

    const unitsForSource = allUnits.filter((u) => {
      if (UNITS[u.unitTypeId].Static) {
        // Keep Static units in their original location
        return sourceUnits.some((su) => su.id === u.id);
      }
      return !targetUnitIds.includes(u.id);
    });

    // Helper to split units by domain
    const splitByDomain = (units: ThroneworldUnit[]) => ({
      space: units.filter((u) => UNITS[u.unitTypeId].Domain === "Space"),
      ground: units.filter((u) => UNITS[u.unitTypeId].Domain === "Ground"),
    });

    // Validate units can be moved
    for (const unit of unitsForTarget) {
      const unitDef = UNITS[unit.unitTypeId];

      if (!isTargetPlanet && unitDef.Static) {
        return { action: this, success: false, error: "Cannot move Static units into fleets" };
      }

      if (isTargetPlanet && unitDef.Domain !== "Ground") {
        return { action: this, success: false, error: "Only ground units can go to planet" };
      }
    }

    // Validate cargo for source fleet (if not empty)
    if (unitsForSource.length > 0) {
      const { space, ground } = splitByDomain(unitsForSource);
      const sourceCargo = getCargo({ ...sourceFleet, spaceUnits: space, groundUnits: ground });
      if (sourceCargo < 0) {
        return { action: this, success: false, error: "Source fleet would have negative cargo" };
      }
    }

    // Validate cargo for target fleet (if it's a fleet)
    if (!isTargetPlanet && unitsForTarget.length > 0) {
      const { space, ground } = splitByDomain(unitsForTarget);
      const baseFleet = isNewFleet ? createEmptyFleet(playerId) : targetFleet!;
      const targetCargo = getCargo({ ...baseFleet, spaceUnits: space, groundUnits: ground });
      if (targetCargo < 0) {
        return { action: this, success: false, error: "Target fleet would have negative cargo" };
      }
    }

    // Execute reorganization
    const sourceUnitsBy = splitByDomain(unitsForSource);
    const targetUnitsBy = splitByDomain(unitsForTarget);

    // Update source fleet
    sourceFleet.spaceUnits = sourceUnitsBy.space;
    sourceFleet.groundUnits = sourceUnitsBy.ground;

    // Remove empty source fleet
    if (unitsForSource.length === 0) {
      system.fleetsInSpace[playerId] = system.fleetsInSpace[playerId]!.filter((f) => f.id !== sourceFleetId);
    }

    // Update target
    if (isTargetPlanet) {
      system.unitsOnPlanet[playerId] = unitsForTarget;
    } else if (isNewFleet) {
      const newFleet = createEmptyFleet(playerId);
      newFleet.spaceUnits = targetUnitsBy.space;
      newFleet.groundUnits = targetUnitsBy.ground;
      if (!system.fleetsInSpace[playerId]) system.fleetsInSpace[playerId] = [];
      system.fleetsInSpace[playerId].push(newFleet);
    } else {
      targetFleet!.spaceUnits = targetUnitsBy.space;
      targetFleet!.groundUnits = targetUnitsBy.ground;
    }

    // Remove empty target fleet
    if (targetUnitsBy.space.length === 0 && targetUnitsBy.ground.length === 0) {
      system.fleetsInSpace[playerId] = system.fleetsInSpace[playerId]!.filter((f) => f.id !== targetEntityId);
    }

    return {
      action: this,
      success: true,
      message: `Reorganized ${unitsForTarget.length} units to target, ${unitsForSource.length} to source`,
      undoable: true,
    };
  }
}

registerAction("reorganize", ReorganizeAction);
