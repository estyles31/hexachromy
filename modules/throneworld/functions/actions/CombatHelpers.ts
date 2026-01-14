// /modules/throneworld/functions/actions/CombatHelpers.ts
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { ThroneworldUnit } from "../../shared/models/Units.Throneworld";
import type { Fleet } from "../../shared/models/Fleets.Throneworld";
import { UNITS } from "../../shared/models/Units.Throneworld";
import { getHexesWithinRange } from "../../shared/models/BoardLayout.Throneworld";
import { getCargo } from "../../shared/models/Fleets.Throneworld";
import { PassAction } from "./PassAction";
import { ActionResponse } from "../../../../shared/models/GameAction";
import { getEffectiveLevel } from "../../shared/models/Tech.Throneworld";

export interface CombatMetadata {
  hexId: string;
  attackerId: string;
  defenderId: string;
  actingPlayerId: string;
  roundNumber: number;
  firstGroundRound: boolean;
  spaceCombatActive: boolean;
  groundCombatActive: boolean;
  inCommRange: boolean;
  sourceHexId?: string;
  playersPassed: string[];
  lastRoundResults?: {
    combatType: "space" | "ground";
    attackerHits: number;
    defenderHits: number;
    attackerCasualties: string[];
    defenderCasualties: string[];
  };
}

interface CombatRoundResult {
  attackerHits: number;
  defenderHits: number;
  attackerCasualties: ThroneworldUnit[];
  defenderCasualties: ThroneworldUnit[];
}

/**
 * Transition from current phase to CombatSubPhase
 * Saves current phase state and initializes combat
 */
export function transitionToCombatSubPhase(state: ThroneworldGameState, combat: CombatMetadata): ActionResponse {
  // Save current phase
  (state.state as any).previousPhase = state.state.currentPhase;
  (state.state as any).previousPhaseMetadata = state.state.phaseMetadata;

  // Switch to combat
  state.state.currentPhase = "CombatSubPhase";
  state.state.phaseMetadata = combat as any;

  return {
    action: new PassAction(),
    success: true,
    message: `Combat initiated at ${combat.hexId}`,
    phaseTransition: {
      nextPhase: "CombatSubPhase",
      transitionType: "nextPhase",
    },
  };
}

// ============================================================================
// Combat Detection
// ============================================================================

/**
 * Scan all hexes and find combat situations
 * Returns array of all combat hexes (randomized order)
 */
export function findAllCombatHexes(
  state: ThroneworldGameState,
  actingPlayerId: string
): Array<{
  hexId: string;
  attackerId: string;
  defenderId: string;
}> {
  const combats: Array<{ hexId: string; attackerId: string; defenderId: string }> = [];

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    const playersWithForces = new Set<string>();

    // Check space forces
    for (const [playerId, fleets] of Object.entries(system.fleetsInSpace)) {
      if (fleets.length > 0 && fleets.some((f) => f.spaceUnits.length > 0)) {
        playersWithForces.add(playerId);
      }
    }

    // Check ground forces
    for (const [playerId, units] of Object.entries(system.unitsOnPlanet)) {
      if (units && units.length > 0) {
        playersWithForces.add(playerId);
      }
    }

    // Combat if 2+ players present
    if (playersWithForces.size >= 2) {
      const players = Array.from(playersWithForces);

      // Acting player is always the attacker
      const attackerId = actingPlayerId;

      // Defender is first other player (prefer non-neutral if possible)
      const defenderId =
        players.find((p) => p !== attackerId && p !== "neutral") || players.find((p) => p !== attackerId) || "neutral";

      combats.push({ hexId, attackerId, defenderId });
    }
  }

  // Randomize combat order
  for (let i = combats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combats[i], combats[j]] = [combats[j], combats[i]];
  }

  return combats;
}

// ============================================================================
// Combat Initialization
// ============================================================================

export function initiateCombat(
  state: ThroneworldGameState,
  hexId: string,
  attackerId: string,
  defenderId: string,
  actingPlayerId: string,
  inCommRange: boolean = false,
  sourceHexId?: string
): CombatMetadata | null {
  const system = state.state.systems[hexId];
  if (!system) return null;

  const hasSpaceCombat = hasSpaceForces(system, attackerId) && hasSpaceForces(system, defenderId);
  const hasGroundCombat = hasGroundForces(system, attackerId) && hasGroundForces(system, defenderId);

  if (!hasSpaceCombat && !hasGroundCombat) return null;

  return {
    hexId,
    attackerId,
    defenderId,
    actingPlayerId,
    roundNumber: 0,
    firstGroundRound: true,
    spaceCombatActive: hasSpaceCombat,
    groundCombatActive: false,
    inCommRange,
    sourceHexId,
    playersPassed: [],
  };
}

// ============================================================================
// Combat Round Execution
// ============================================================================

export function executeOneCombatRound(state: ThroneworldGameState, combat: CombatMetadata): void {
  const system = state.state.systems[combat.hexId];
  if (!system) return;

  combat.roundNumber++;

  if (combat.spaceCombatActive) {
    const result = resolveSpaceCombatRound(state, combat);

    combat.lastRoundResults = {
      combatType: "space",
      attackerHits: result.attackerHits,
      defenderHits: result.defenderHits,
      attackerCasualties: result.attackerCasualties.map((u) => u.id),
      defenderCasualties: result.defenderCasualties.map((u) => u.id),
    };

    removeCasualties(state, combat.hexId, combat.attackerId, result.attackerCasualties, "space");
    removeCasualties(state, combat.hexId, combat.defenderId, result.defenderCasualties, "space");

    checkCargoCapacity(state, combat.hexId, combat.attackerId);
    checkCargoCapacity(state, combat.hexId, combat.defenderId);

    if (!hasSpaceForces(system, combat.attackerId) || !hasSpaceForces(system, combat.defenderId)) {
      combat.spaceCombatActive = false;
    }
  }

  // After space combat ends, check for normal invasion or ground combat start
  if (!combat.spaceCombatActive && !combat.groundCombatActive) {
    // Check if attacker won space and can do normal invasion
    if (combat.inCommRange && !hasSpaceForces(system, combat.defenderId)) {
      const attackerFleets = system.fleetsInSpace[combat.attackerId] || [];
      const hasGroundUnitsInFleets = attackerFleets.some((f) => f.groundUnits.length > 0);

      if (hasGroundUnitsInFleets) {
        // Move ground units from fleets to planet
        if (!system.unitsOnPlanet[combat.attackerId]) {
          system.unitsOnPlanet[combat.attackerId] = [];
        }

        for (const fleet of attackerFleets) {
          system.unitsOnPlanet[combat.attackerId].push(...fleet.groundUnits);
          fleet.groundUnits = [];
        }
      }
    }

    // Check if ground combat should start
    if (hasGroundForces(system, combat.attackerId) && hasGroundForces(system, combat.defenderId)) {
      combat.groundCombatActive = true;
    }
  }

  if (combat.groundCombatActive) {
    const result = resolveGroundCombatRound(state, combat);

    combat.lastRoundResults = {
      combatType: "ground",
      attackerHits: result.attackerHits,
      defenderHits: result.defenderHits,
      attackerCasualties: result.attackerCasualties.map((u) => u.id),
      defenderCasualties: result.defenderCasualties.map((u) => u.id),
    };

    removeCasualties(state, combat.hexId, combat.attackerId, result.attackerCasualties, "ground");
    removeCasualties(state, combat.hexId, combat.defenderId, result.defenderCasualties, "ground");

    combat.firstGroundRound = false;

    if (!hasGroundForces(system, combat.attackerId) || !hasGroundForces(system, combat.defenderId)) {
      combat.groundCombatActive = false;
    }
  }
}

export function isCombatOver(state: ThroneworldGameState, combat: CombatMetadata): boolean {
  return !combat.spaceCombatActive && !combat.groundCombatActive;
}

// ============================================================================
// Player Actions
// ============================================================================

export function canRetreat(combat: CombatMetadata, playerId: string): boolean {
  return combat.spaceCombatActive && playerId !== "neutral";
}

export function canDropInvade(state: ThroneworldGameState, combat: CombatMetadata): boolean {
  if (!combat.spaceCombatActive) return false;
  if (combat.attackerId === "neutral") return false;

  const system = state.state.systems[combat.hexId];
  if (!system) return false;

  const attackerFleets = system.fleetsInSpace[combat.attackerId] || [];
  const hasDropUnits = attackerFleets.some((fleet) => fleet.groundUnits.some((u) => UNITS[u.unitTypeId].DropAttack));

  if (!hasDropUnits) return false;

  const defenderFleets = system.fleetsInSpace[combat.defenderId] || [];
  const hasShields = defenderFleets.some((fleet) => fleet.spaceUnits.some((u) => u.unitTypeId === "Sh"));

  if (!hasShields) return true;

  const attackerJump = state.players[combat.attackerId]?.tech?.Jump ?? 0;
  const defenderSpace = state.players[combat.defenderId]?.tech?.Space ?? 0;

  return attackerJump > defenderSpace;
}

export function executeDropInvade(state: ThroneworldGameState, combat: CombatMetadata): void {
  const system = state.state.systems[combat.hexId];
  if (!system) return;

  const attackerFleets = system.fleetsInSpace[combat.attackerId] || [];
  const unitsToMove: ThroneworldUnit[] = [];

  for (const fleet of attackerFleets) {
    for (let i = fleet.groundUnits.length - 1; i >= 0; i--) {
      const unit = fleet.groundUnits[i];
      if (UNITS[unit.unitTypeId].DropAttack) {
        unitsToMove.push(unit);
        fleet.groundUnits.splice(i, 1);
      }
    }
  }

  if (unitsToMove.length > 0) {
    if (!system.unitsOnPlanet[combat.attackerId]) {
      system.unitsOnPlanet[combat.attackerId] = [];
    }
    system.unitsOnPlanet[combat.attackerId].push(...unitsToMove);

    if (hasGroundForces(system, combat.defenderId)) {
      combat.groundCombatActive = true;
      combat.firstGroundRound = true;
    }
  }
}

export function executeRetreat(state: ThroneworldGameState, combat: CombatMetadata, playerId: string): string | null {
  const system = state.state.systems[combat.hexId];
  if (!system) return null;

  const fleets = system.fleetsInSpace[playerId] || [];
  if (fleets.length === 0) return null;

  let targetHexId: string | null = null;

  if (playerId === combat.attackerId) {
    targetHexId = combat.sourceHexId || null;
  } else {
    const jumpRange = getEffectiveLevel(state.players[playerId]?.tech?.Jump);
    const scenario =
      typeof state.options.scenario === "string" && state.options.scenario.trim() ? state.options.scenario : "6p";

    const inRange = getHexesWithinRange(combat.hexId, jumpRange, scenario);

    for (const hexId of inRange) {
      const targetSystem = state.state.systems[hexId];
      if (!targetSystem) continue;

      if (targetSystem.details?.owner !== playerId) continue;

      const hasEnemyFleets = Object.entries(targetSystem.fleetsInSpace).some(
        ([owner, fleets]) => owner !== playerId && fleets.length > 0
      );

      if (!hasEnemyFleets) {
        targetHexId = hexId;
        break;
      }
    }
  }

  if (!targetHexId) return null;

  const targetSystem = state.state.systems[targetHexId];
  if (!targetSystem.fleetsInSpace[playerId]) {
    targetSystem.fleetsInSpace[playerId] = [];
  }

  targetSystem.fleetsInSpace[playerId].push(...fleets);
  system.fleetsInSpace[playerId] = [];

  combat.spaceCombatActive = false;

  return targetHexId;
}

// ============================================================================
// Dice Rolling
// ============================================================================

function getUnitDefense(unit: ThroneworldUnit, alliedUnits: ThroneworldUnit[]): number {
  const unitDef = UNITS[unit.unitTypeId];
  let defense = unitDef.Defense ?? 0;

  if (unitDef.DefenseBonus) {
    for (const bonusType of Object.keys(unitDef.DefenseBonus)) {
      const bonusMap = unitDef.DefenseBonus[bonusType];
      for (const [requiredUnitId, bonus] of Object.entries(bonusMap)) {
        if (alliedUnits.some((u) => u.unitTypeId === requiredUnitId)) {
          defense += bonus;
        }
      }
    }
  }

  return defense;
}

function rollCombatDice(
  units: ThroneworldUnit[],
  alliedUnits: ThroneworldUnit[],
  useAttack: boolean,
  ownTech: number,
  enemyTech: number
): { rolls: number[]; hits: number } {
  const techMod = Math.max(0, ownTech - enemyTech);
  const rolls: number[] = [];
  let hits = 0;

  for (const unit of units) {
    const unitDef = UNITS[unit.unitTypeId];
    if (!unitDef || unitDef.NonCombat) continue;

    const diceCount = useAttack ? (unitDef.Attack ?? 0) : getUnitDefense(unit, alliedUnits);

    for (let i = 0; i < diceCount; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      const modifiedRoll = roll + techMod;
      rolls.push(modifiedRoll);

      if (modifiedRoll >= 6) {
        hits++;
      }
    }
  }

  return { rolls, hits };
}

function applyAbsorb(units: ThroneworldUnit[], enemyHits: number): number {
  let totalAbsorb = 0;

  for (const unit of units) {
    const unitDef = UNITS[unit.unitTypeId];
    totalAbsorb += unitDef.Absorb ?? 0;
  }

  return Math.max(0, enemyHits - totalAbsorb);
}

function assignCasualties(units: ThroneworldUnit[], hits: number): ThroneworldUnit[] {
  if (hits === 0) return [];

  const casualties: ThroneworldUnit[] = [];
  const remaining = [...units];
  let hitsToAssign = hits;

  // 1. NonCombat units die first
  for (let i = remaining.length - 1; i >= 0 && hitsToAssign > 0; i--) {
    const unit = remaining[i];
    const unitDef = UNITS[unit.unitTypeId];

    if (unitDef.NonCombat) {
      casualties.push(unit);
      remaining.splice(i, 1);
      hitsToAssign -= unitDef.HP ?? 1;
    }
  }

  // 2. Fighters next
  for (let i = remaining.length - 1; i >= 0 && hitsToAssign > 0; i--) {
    const unit = remaining[i];
    if (unit.unitTypeId === "F" || unit.unitTypeId === "pF") {
      casualties.push(unit);
      remaining.splice(i, 1);
      hitsToAssign -= 1;
    }
  }

  // 3. Sort by Attack+Defense (lowest first)
  remaining.sort((a, b) => {
    const aDef = UNITS[a.unitTypeId];
    const bDef = UNITS[b.unitTypeId];
    const aValue = (aDef.Attack ?? 0) + (aDef.Defense ?? 0);
    const bValue = (bDef.Attack ?? 0) + (bDef.Defense ?? 0);

    if (aValue !== bValue) return aValue - bValue;

    const aHP = aDef.HP ?? 1;
    const bHP = bDef.HP ?? 1;

    if (aHP === hitsToAssign && bHP !== hitsToAssign) return -1;
    if (bHP === hitsToAssign && aHP !== hitsToAssign) return 1;

    return aHP - bHP;
  });

  // 4. Assign remaining hits
  while (hitsToAssign > 0 && remaining.length > 0) {
    const unit = remaining[0];
    const unitDef = UNITS[unit.unitTypeId];
    const hp = unitDef.HP ?? 1;

    casualties.push(unit);
    remaining.splice(0, 1);
    hitsToAssign -= hp;
  }

  return casualties;
}

function assignGroundCasualties(units: ThroneworldUnit[], hits: number): ThroneworldUnit[] {
  if (hits === 0) return [];

  const casualties: ThroneworldUnit[] = [];
  const remaining = [...units];
  let hitsToAssign = hits;

  // FirstDefend units take hits first
  for (let i = remaining.length - 1; i >= 0 && hitsToAssign > 0; i--) {
    const unit = remaining[i];
    const unitDef = UNITS[unit.unitTypeId];

    if (unitDef.FirstDefend) {
      const hp = unitDef.HP ?? 1;
      const hitsTaken = Math.min(hitsToAssign, hp);

      if (hitsTaken >= hp) {
        casualties.push(unit);
        remaining.splice(i, 1);
      }

      hitsToAssign -= hitsTaken;
    }
  }

  if (hitsToAssign > 0) {
    const moreCasualties = assignCasualties(remaining, hitsToAssign);
    casualties.push(...moreCasualties);
  }

  return casualties;
}

function resolveSpaceCombatRound(state: ThroneworldGameState, combat: CombatMetadata): CombatRoundResult {
  const attackerUnits = getSpaceUnits(state, combat.hexId, combat.attackerId);
  const defenderUnits = getSpaceUnits(state, combat.hexId, combat.defenderId);

  const attackerTech = getEffectiveLevel(state.players[combat.attackerId]?.tech?.Space);
  const defenderTech = getEffectiveLevel(state.players[combat.defenderId]?.tech?.Space);

  const attackerRoll = rollCombatDice(attackerUnits, attackerUnits, true, attackerTech, defenderTech);
  const defenderRoll = rollCombatDice(defenderUnits, defenderUnits, false, defenderTech, attackerTech);

  const attackerHitsAfterAbsorb = applyAbsorb(defenderUnits, attackerRoll.hits);
  const defenderHitsAfterAbsorb = applyAbsorb(attackerUnits, defenderRoll.hits);

  const defenderCasualties = assignCasualties(defenderUnits, attackerHitsAfterAbsorb);
  const attackerCasualties = assignCasualties(attackerUnits, defenderHitsAfterAbsorb);

  return {
    attackerHits: attackerRoll.hits,
    defenderHits: defenderRoll.hits,
    attackerCasualties,
    defenderCasualties,
  };
}

function resolveGroundCombatRound(state: ThroneworldGameState, combat: CombatMetadata): CombatRoundResult {
  let attackerUnits = getGroundUnits(state, combat.hexId, combat.attackerId);
  let defenderUnits = getGroundUnits(state, combat.hexId, combat.defenderId);

  const attackerTech = getEffectiveLevel(state.players[combat.attackerId]?.tech?.Ground);
  const defenderTech = getEffectiveLevel(state.players[combat.defenderId]?.tech?.Ground);

  let attackerHits = 0;
  let defenderHits = 0;
  const attackerCasualties: ThroneworldUnit[] = [];
  const defenderCasualties: ThroneworldUnit[] = [];

  // FirstFire on first round only
  if (combat.firstGroundRound) {
    const attackerFirstFire = attackerUnits.filter((u) => UNITS[u.unitTypeId].FirstFire);
    const defenderFirstFire = defenderUnits.filter((u) => UNITS[u.unitTypeId].FirstFire);

    if (attackerFirstFire.length > 0) {
      const roll = rollCombatDice(attackerFirstFire, attackerUnits, true, attackerTech, defenderTech);
      const hitsAfterAbsorb = applyAbsorb(defenderUnits, roll.hits);
      const casualties = assignGroundCasualties(defenderUnits, hitsAfterAbsorb);

      defenderCasualties.push(...casualties);
      defenderUnits = defenderUnits.filter((u) => !casualties.includes(u));
    }

    if (defenderFirstFire.length > 0) {
      const roll = rollCombatDice(defenderFirstFire, defenderUnits, false, defenderTech, attackerTech);
      const hitsAfterAbsorb = applyAbsorb(attackerUnits, roll.hits);
      const casualties = assignGroundCasualties(attackerUnits, hitsAfterAbsorb);

      attackerCasualties.push(...casualties);
      attackerUnits = attackerUnits.filter((u) => !casualties.includes(u));
    }

    if (attackerUnits.length === 0 || defenderUnits.length === 0) {
      return { attackerHits, defenderHits, attackerCasualties, defenderCasualties };
    }
  }

  // Normal ground combat
  const attackerRoll = rollCombatDice(attackerUnits, attackerUnits, true, attackerTech, defenderTech);
  const defenderRoll = rollCombatDice(defenderUnits, defenderUnits, false, defenderTech, attackerTech);

  attackerHits += attackerRoll.hits;
  defenderHits += defenderRoll.hits;

  const attackerHitsAfterAbsorb = applyAbsorb(defenderUnits, attackerHits);
  const defenderHitsAfterAbsorb = applyAbsorb(attackerUnits, defenderHits);

  const moreDefenderCasualties = assignGroundCasualties(defenderUnits, attackerHitsAfterAbsorb);
  const moreAttackerCasualties = assignGroundCasualties(attackerUnits, defenderHitsAfterAbsorb);

  defenderCasualties.push(...moreDefenderCasualties);
  attackerCasualties.push(...moreAttackerCasualties);

  return { attackerHits, defenderHits, attackerCasualties, defenderCasualties };
}

// ============================================================================
// Helper Functions
// ============================================================================

function hasSpaceForces(system: any, playerId: string): boolean {
  const fleets = system.fleetsInSpace[playerId] || [];
  return fleets.some((fleet: Fleet) => fleet.spaceUnits.length > 0);
}

function hasGroundForces(system: any, playerId: string): boolean {
  const onPlanet = system.unitsOnPlanet[playerId] || [];
  return onPlanet.length > 0;
}

function getSpaceUnits(state: ThroneworldGameState, hexId: string, playerId: string): ThroneworldUnit[] {
  const system = state.state.systems[hexId];
  const fleets = system?.fleetsInSpace[playerId] || [];
  return fleets.flatMap((fleet: Fleet) => fleet.spaceUnits);
}

function getGroundUnits(state: ThroneworldGameState, hexId: string, playerId: string): ThroneworldUnit[] {
  const system = state.state.systems[hexId];
  return system?.unitsOnPlanet[playerId] || [];
}

function removeCasualties(
  state: ThroneworldGameState,
  hexId: string,
  playerId: string,
  casualties: ThroneworldUnit[],
  combatType: "space" | "ground"
): void {
  if (casualties.length === 0) return;

  const system = state.state.systems[hexId];
  const casualtyIds = new Set(casualties.map((u) => u.id));

  if (combatType === "space") {
    const fleets = system.fleetsInSpace[playerId] || [];
    for (const fleet of fleets) {
      fleet.spaceUnits = fleet.spaceUnits.filter((u) => !casualtyIds.has(u.id));
    }

    system.fleetsInSpace[playerId] = fleets.filter((f) => f.spaceUnits.length > 0 || f.groundUnits.length > 0);
  } else {
    const units = system.unitsOnPlanet[playerId] || [];
    system.unitsOnPlanet[playerId] = units.filter((u) => !casualtyIds.has(u.id));
  }
}

function checkCargoCapacity(state: ThroneworldGameState, hexId: string, playerId: string): void {
  const system = state.state.systems[hexId];
  const fleets = system.fleetsInSpace[playerId] || [];

  for (const fleet of fleets) {
    let cargo = getCargo(fleet);

    while (cargo < 0 && fleet.spaceUnits.length > 0) {
      const fighterIdx = fleet.spaceUnits.findIndex((u) => u.unitTypeId === "F" || u.unitTypeId === "pF");

      if (fighterIdx !== -1) {
        fleet.spaceUnits.splice(fighterIdx, 1);
      } else {
        const negativeCargoIdx = fleet.spaceUnits.findIndex((u) => (UNITS[u.unitTypeId].Cargo ?? 0) < 0);

        if (negativeCargoIdx !== -1) {
          fleet.spaceUnits.splice(negativeCargoIdx, 1);
        } else {
          break;
        }
      }

      cargo = getCargo(fleet);
    }

    while (cargo < 0 && fleet.groundUnits.length > 0) {
      fleet.groundUnits.pop();
      cargo = getCargo(fleet);
    }
  }
}
