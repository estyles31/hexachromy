import { GameObject } from "../../../../shared/models/ActionParams";
import { getHexesWithinRange, hexGraphDistance } from "../../shared/models/BoardLayout.ThroneWorld";
import { Fleet } from "../../shared/models/Fleets.Throneworld";
import { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { ThroneworldUnit } from "../../shared/models/Unit.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";

/**
 * Find bunker unit by ID
 */
export function findUnit(
  state: ThroneworldGameState,
  playerId: string,
  unitId: string,
  reqCommand?: boolean,
): { unit: ThroneworldUnit; hexId: string } | null {

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    const playerUnits = system.unitsOnPlanet[playerId];
    if (!playerUnits) continue;

    const unit = playerUnits.find(u => u.id === unitId);
    if (!unit) continue;

    if(reqCommand) {
      const unitDef = UNITS[unit.unitTypeId];
      if(!unitDef.Command) continue;
    }

    return { unit, hexId };
  }

  return null;
}

/* Find Fleet by ID */
export function findFleet(
  state: ThroneworldGameState,
  playerId: string,
  fleetId: string
): { fleet: Fleet; hexId: string } | null {

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    const playerUnits = system.fleetsInSpace[playerId];
    if (!playerUnits) continue;

    const fleet = playerUnits.find(u => u.id === fleetId);
    if (!fleet) continue;

    return { fleet, hexId };
  }

  return null;
}

export function getHexesInCommRange(originHexId: string, playerId: string, state: ThroneworldGameState ) {
  const player = state.players[playerId];
  const commRange = player?.tech.Comm || 1;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
          ? state.options.scenario
          : "6p";
  return getHexesWithinRange(originHexId, commRange, scenario);
}

export function getHexesInJumpRange(originHexId: string, playerId: string, state: ThroneworldGameState ) {
  const player = state.players[playerId];
  const jumpRange = player?.tech.Jump || 1;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
          ? state.options.scenario
          : "6p";
  return getHexesWithinRange(originHexId, jumpRange, scenario);
}

export function IsInCommRange(bunkerHexId: string, targetHexId: string, playerId: string, state: ThroneworldGameState) {
  const player = state.players[playerId];
  const commRange = player?.tech.Comm || 1;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
          ? state.options.scenario
          : "6p";

  return hexGraphDistance(bunkerHexId, targetHexId, scenario) <= commRange;
}

export function markBunkerUsed(
  units: ThroneworldUnit[],
  bunkerUnitId: string
) {
  const possUnits = units.filter(u => u.id == bunkerUnitId && UNITS[u.unitTypeId]?.Command);

  if (possUnits.length < 1) {
    throw new Error(`Bunker unit '${bunkerUnitId}' not found in provided unit list`);
  }

  return markUnitsMoved(units, [possUnits[0].id]);
}

export function markUnitsMoved(units: ThroneworldUnit[], movedUnitIDs?: string[]) {
  const ret: ThroneworldUnit[] = [];

  for(const unit of units) {
    const copy = { ...unit };
    if(!movedUnitIDs || movedUnitIDs.includes(copy.id))  {
      copy.hasMoved = true;
    }
    ret.push(copy);
  }

  return ret;
}

export function markFleetMoved(fleet: Fleet): Fleet {
  const fleetSpaceUnits = markUnitsMoved(fleet.spaceUnits);
  const fleetGroundUnits = markUnitsMoved(fleet.groundUnits);
  return { ...fleet, groundUnits: fleetGroundUnits, spaceUnits: fleetSpaceUnits };
}

export function getAvailableBunkers(
  state: ThroneworldGameState,
  playerId: string
): GameObject[] {

  const result: GameObject[] = [];

  for (const [hexId, system] of Object.entries(state.state.systems)) {

    const units = system.unitsOnPlanet[playerId];
    if (!units) continue;

    for (const u of units) {

      const def = UNITS[u.unitTypeId];
      if (!def?.Command) continue;
      if (u.hasMoved) continue;

      result.push({
        id: u.id,
        type: "gamePiece",
        subtype: "unit",
        metadata: { hexId }
      });
    }
  }

  return result;
}
