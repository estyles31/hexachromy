// /modules/throneworld/functions/actions/ProductionAction.ts
import { GameAction, ActionResponse, ActionFinalize } from "../../../../shared/models/GameAction";
import { GameState } from "../../../../shared/models/GameState";
import { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { UNITS, UnitTypeId, ThroneworldUnitType, buildUnit } from "../../shared/models/Units.Throneworld";
import { addUnitToSystem } from "../../shared/models/Systems.Throneworld";
import { Factions } from "../../shared/models/Factions.Throneworld";
import { createFleet, addUnitToFleet, getCargo, type Fleet } from "../../shared/models/Fleets.Throneworld";
import { PhaseContext } from "../../../../shared/models/PhaseContext";
import { isPlanetConnected } from "../../shared/models/Production.Throneworld";

interface ProductionMetadata {
  hexId?: string;
  unitTypeId?: UnitTypeId;
  cost?: number;
  localProduction?: boolean;
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
    if (unitDef.Domain === "Space" && (unitDef.Cargo ?? 0) < 0) {
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
  if (!unitDef || unitDef.Domain !== "Space") return null;

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
                glpyh: unitDef.Glyph,
                cost: getUnitCost(unitDef.id, player.race),
                unitType: unitDef.Domain,
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

    // Check production limits
    const pending = pendingProduction ?? [];
    const alreadySpentAtPlanet = pending
      .filter((p) => p.getStringParam("hexId") === hexId)
      .reduce((sum, action) => {
        const uId = action.getStringParam("unitTypeId") as UnitTypeId;
        return sum + getUnitCost(uId, player.race);
      }, 0);

    // Determine if this is local production (isolated planet)
    const isConnected = isPlanetConnected(tw, hexId, playerId);
    const isLocalProduction = !isConnected;

    if (isLocalProduction) {
      // Isolated planet - check local production limit (free up to dev value)
      const planetLimit = system.details?.dev ?? 0;
      const remainingAtPlanet = planetLimit - alreadySpentAtPlanet;
      if (cost > remainingAtPlanet) {
        return {
          action: this,
          success: false,
          error: `Exceeds local production limit (${remainingAtPlanet} remaining)`,
        };
      }
    } else {
      // Connected planet or homeworld - check treasury
      const isHomeworld = system.worldType === "Homeworld";
      if (!isHomeworld) {
        // Non-homeworld connected planets have a dev limit too (but uses treasury)
        const planetLimit = system.details?.dev ?? 0;
        const remainingAtPlanet = planetLimit - alreadySpentAtPlanet;
        if (cost > remainingAtPlanet) {
          return {
            action: this,
            success: false,
            error: `Exceeds planet production limit (${remainingAtPlanet} remaining)`,
          };
        }
      }

      if (cost > player.resources) {
        return { action: this, success: false, error: "Insufficient resources" };
      }
    }

    // Deduct resources immediately (for connected planets only)
    if (!isLocalProduction) {
      player.resources -= cost;
    }

    // Store metadata for executeConsequences
    this.metadata.hexId = hexId;
    this.metadata.unitTypeId = unitTypeId;
    this.metadata.cost = cost;
    this.metadata.localProduction = isLocalProduction;

    return {
      action: this,
      success: true,
      message: `Queued ${unitDef.Name} at ${hexId} (${isLocalProduction ? "local" : cost + " ⚡"})`,
      undoable: true,
    };
  }

  async executeConsequences(ctx: PhaseContext, playerId: string): Promise<void> {
    const tw = ctx.gameState as ThroneworldGameState;
    const { hexId, unitTypeId } = this.metadata;

    if (!hexId || !unitTypeId) {
      throw new Error("Production action missing metadata");
    }

    const system = tw.state.systems[hexId];
    if (!system) throw new Error("Invalid hex in production consequences");

    const unitDef = UNITS[unitTypeId];
    if (!unitDef) throw new Error("Invalid unit type in production consequences");

    const unit = buildUnit(unitTypeId, playerId);

    // Handle space units with fleet placement logic
    if (unitDef.Domain === "Space") {
      if (!system.fleetsInSpace[playerId]) system.fleetsInSpace[playerId] = [];

      const targetFleet = findFleetForUnit(system.fleetsInSpace[playerId], unitTypeId, playerId);

      if (targetFleet) {
        addUnitToFleet(targetFleet, unit);
      } else {
        const newFleet = createFleet(unit);
        system.fleetsInSpace[playerId].push(newFleet);
      }
    } else {
      addUnitToSystem(system, unit);
    }
  }
}

registerAction("production", ProductionAction);
