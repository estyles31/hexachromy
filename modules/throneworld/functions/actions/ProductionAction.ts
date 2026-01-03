// /modules/throneworld/functions/actions/ProductionAction.ts
import { GameAction, ActionResponse, ActionFinalize } from "../../../../shared/models/GameAction";
import { GameState } from "../../../../shared/models/GameState";
import { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { UNITS, UnitTypeId, ThroneworldUnitType } from "../../shared/models/UnitTypes.ThroneWorld";
import { buildUnit } from "../../shared/models/Unit.Throneworld";
import { addUnitToSystem } from "../../shared/models/Systems.ThroneWorld";
import { Factions } from "../../shared/models/Factions.ThroneWorld";
import { createFleet, addUnitToFleet, getCargo, type Fleet } from "../../shared/models/Fleets.Throneworld";

interface ProductionMetadata {
  cost?: number;
}

function getBuildableUnits(factionId?: string, maxCost?: number, fleetsInSpace?: Fleet[]): ThroneworldUnitType[] {
  const faction = factionId ? Factions[factionId] : undefined;
  if (!faction) return [];

  if (process.env.DEBUG === "true") {
    console.log("Getting buildable units.  Fleets:", JSON.stringify(fleetsInSpace));
  }

  return Object.values(UNITS).filter((unitDef) => {
    if (unitDef.Restricted && !faction.CanBuild?.includes(unitDef.id)) return false;
    if (faction.CannotBuild?.includes(unitDef.id)) return false;
    if (maxCost !== undefined) {
      const cost = getUnitCost(unitDef.id, factionId);
      if (cost > maxCost) return false;
    }

    // Filter out fighters if no fleet has cargo capacity
    if (unitDef.Type === "Space" && (unitDef.Cargo ?? 0) < 0) {
      const fighterSize = Math.abs(unitDef.Cargo ?? 0);
      const hasCapacity = fleetsInSpace?.some((fleet) => {
        const currentCargo = getCargo(fleet);
        return currentCargo >= fighterSize;
      });
      if (!hasCapacity) return false;
    }

    return true;
  });
}

function getUnitCost(unitTypeId: UnitTypeId, factionId?: string): number {
  const baseCost = UNITS[unitTypeId]?.Cost ?? 0;
  const faction = factionId ? Factions[factionId] : undefined;
  const discount = faction?.BuildDiscount?.[unitTypeId] ?? 0;
  return Math.max(0, baseCost - discount);
}

function findFleetForUnit(fleetsInSpace: Fleet[], unitTypeId: UnitTypeId, playerId: string): Fleet | null {
  const unitDef = UNITS[unitTypeId];
  if (!unitDef || unitDef.Type !== "Space") return null;

  // Shields and Survey Teams get their own fleet
  if (unitDef.Static || unitDef.Explore) {
    return null; // Create new fleet
  }

  // Fighters need a fleet with cargo capacity
  if ((unitDef.Cargo ?? 0) < 0) {
    const fighterSize = Math.abs(unitDef.Cargo ?? 0);
    return fleetsInSpace.find((fleet) => fleet.owner === playerId && getCargo(fleet) >= fighterSize) ?? null;
  }

  // Other space units go into first available non-special fleet
  return (
    fleetsInSpace.find((fleet) => {
      if (fleet.owner !== playerId) return false;
      // Avoid fleets with shields or survey teams
      return !fleet.spaceUnits.some((u) => {
        const def = UNITS[u.unitTypeId];
        return def.Static || def.Explore;
      });
    }) ?? null
  );
}

type ProductionActionOptions = { requireConcurrency?: boolean };
export class ProductionAction extends GameAction<ProductionMetadata> {
  constructor(options?: ProductionActionOptions) {
    const { requireConcurrency = false } = options ?? {};

    super({
      type: "production",
      undoable: true,
      requireConcurrency: requireConcurrency,
      params: [
        {
          name: "hexId",
          type: "boardSpace",
          subtype: "hex",
          message: "Select planet to build at",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            const ownedPlanets: string[] = [];
            for (const [hexId, system] of Object.entries(tw.state.systems)) {
              if (system.details?.owner === playerId) ownedPlanets.push(hexId);
            }
            return ownedPlanets.map((hexId) => ({ id: hexId, displayHint: { hexId } }));
          },
        },
        {
          name: "unitTypeId",
          type: "choice",
          subtype: "unitType",
          dependsOn: "hexId",
          message: "Select unit to build",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            const player = tw.players[playerId];

            // Get the hexId to check for available fleets
            const hexId = this.getStringParam("hexId");
            const fleetsInSpace = hexId ? tw.state.systems[hexId]?.fleetsInSpace[playerId] : undefined;

            const buildableUnits = getBuildableUnits(player.race, player.resources, fleetsInSpace);

            return buildableUnits.map((unitDef) => ({
              id: unitDef.id,
              label: unitDef.Name,
              metadata: {
                symbol: unitDef.Symbol,
                cost: getUnitCost(unitDef.id, player.race),
                unitType: unitDef.Type,
              },
            }));
          },
        },
      ],
      finalize: { mode: "confirm", label: "Build Unit" },
    });
  }

  getFinalizeInfo(state: GameState, playerId: string): ActionFinalize {
    const tw = state as ThroneworldGameState;
    const unitTypeId = this.getStringParam("unitTypeId");
    if (!unitTypeId) return this.finalize ?? { mode: "confirm", label: "Build" };
    const player = tw.players[playerId];
    const cost = getUnitCost(unitTypeId as UnitTypeId, player.race);
    const unitDef = UNITS[unitTypeId as UnitTypeId];
    return { mode: "confirm", label: `Build ${unitDef?.Name} (${cost} resources)` };
  }

  async execute(state: GameState, playerId: string, pendingProduction?: ProductionAction[]): Promise<ActionResponse> {
    if (!this.allParamsComplete()) return { action: this, success: false, error: "Missing parameters" };
    const tw = state as ThroneworldGameState;
    const player = tw.players[playerId];
    const hexId = this.getStringParam("hexId")!;
    const unitTypeId = this.getStringParam("unitTypeId")! as UnitTypeId;
    const system = tw.state.systems[hexId];
    if (!system) return { action: this, success: false, error: "Invalid hex" };
    if (system.details?.owner !== playerId) return { action: this, success: false, error: "You don't own this planet" };
    const unitDef = UNITS[unitTypeId];
    if (!unitDef) return { action: this, success: false, error: "Invalid unit type" };

    const fleetsInSpace = system.fleetsInSpace[playerId] ?? [];
    const buildable = getBuildableUnits(player.race, undefined, fleetsInSpace);
    if (!buildable.some((u) => u.id === unitTypeId))
      return { action: this, success: false, error: `Cannot build ${unitDef.Name}` };

    const cost = getUnitCost(unitTypeId, player.race);
    const pending = pendingProduction ?? [];
    const alreadySpentAtPlanet = pending
      .filter((p) => p.getStringParam("hexId") === hexId)
      .reduce((sum, action) => {
        const uId = action.getStringParam("unitTypeId") as UnitTypeId;
        return sum + getUnitCost(uId, player.race);
      }, 0);
    const isHomeworld = system.worldType === "Homeworld";
    const planetLimit = isHomeworld ? undefined : (system.details?.dev ?? 0);
    const remainingAtPlanet = planetLimit === undefined ? Infinity : planetLimit - alreadySpentAtPlanet;
    if (cost > remainingAtPlanet) return { action: this, success: false, error: "Exceeds planet production limit" };
    if (cost > player.resources) return { action: this, success: false, error: "Insufficient resources" };

    player.resources -= cost;
    const unit = buildUnit(unitTypeId, playerId);

    // Handle space units with fleet placement logic
    if (unitDef.Type === "Space") {
      if (!system.fleetsInSpace[playerId]) system.fleetsInSpace[playerId] = [];

      const targetFleet = findFleetForUnit(system.fleetsInSpace[playerId], unitTypeId, playerId);

      if (targetFleet) {
        // Add to existing fleet
        addUnitToFleet(targetFleet, unit);
      } else {
        // Create new fleet
        const newFleet = createFleet(unit);
        system.fleetsInSpace[playerId].push(newFleet);
      }
    } else {
      // Ground units use existing addUnitToSystem
      addUnitToSystem(system, unit);
    }

    this.metadata.cost = cost;
    return {
      action: this,
      success: true,
      message: `Built ${unitDef.Name} at ${hexId} for ${cost} resources`,
      undoable: true,
    };
  }
}

registerAction("production", ProductionAction);
