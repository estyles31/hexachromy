// /modules/throneworld/functions/phases/OutreachPhase.ts
import { Phase, type PhaseContext } from "./Phase";
import type { LegalActionsResponse, ActionResponse, GameAction, ParameterValuesResponse } from "../../../../shared/models/ApiContexts";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { BOARD_HEXES } from "../../shared/models/BoardLayout.ThroneWorld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import type { Fleet } from "../../shared/models/Fleets.Throneworld";

interface ScanAction extends GameAction {
  type: "scan";
  bunkerId?: string;
  targetHex?: string;
}

interface JumpAction extends GameAction {
  type: "jump";
  bunkerId?: string;
  fleetId?: string;
  targetHex?: string;
}

export class OutreachPhase extends Phase {
  readonly name = "Outreach";

  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const actions: GameAction[] = [];

    // Check how many actions the player has taken this phase
    const actionsThisPhase = this.countPlayerActionsThisPhase(state, playerId);
    
    if (actionsThisPhase >= 2) {
      return {
        actions: [],
        message: "You have used both actions this turn. Waiting for other players...",
      };
    }

    // Scan action
    actions.push({
      type: "scan",
      undoable: false,
      parameters: [
        {
          name: "bunkerId",
          required: true,
          renderHint: {
            category: "hex-select",
            message: "Select an unused Command Bunker to scan from",
          },
        },
        {
          name: "targetHex",
          required: true,
          dependsOn: ["bunkerId"],
          renderHint: {
            category: "hex-select",
            message: "Select a hex to scan",
          },
        },
      ],
      renderHint: {
        category: "button",
        label: "Scan",
        description: "Use a Command Bunker to scan a nearby hex",
      },
    });

    // Jump action
    actions.push({
      type: "jump",
      undoable: false,
      parameters: [
        {
          name: "bunkerId",
          required: true,
          renderHint: {
            category: "hex-select",
            message: "Select an unused Command Bunker to coordinate jump",
          },
        },
        {
          name: "fleetId",
          required: true,
          dependsOn: ["bunkerId"],
          renderHint: {
            category: "custom",
            message: "Select a fleet to jump",
            customComponent: "fleet-select",
          },
        },
        {
          name: "targetHex",
          required: true,
          dependsOn: ["bunkerId", "fleetId"],
          renderHint: {
            category: "hex-select",
            message: "Select destination hex",
          },
        },
      ],
      renderHint: {
        category: "button",
        label: "Jump",
        description: "Use a Command Bunker to jump a fleet",
      },
    });

    // Reorganize fleet - always available
    actions.push({
      type: "reorganize_fleet",
      undoable: true,
      renderHint: {
        category: "button",
        label: "Reorganize Fleets",
        description: "Move units between fleets (doesn't use an action)",
      },
    });

    return {
      actions,
      message: `Actions remaining: ${2 - actionsThisPhase}/2`,
    };
  }

  async getParameterValues(
    ctx: PhaseContext,
    playerId: string,
    actionType: string,
    parameterName: string,
    partialParameters: Record<string, unknown>
  ): Promise<ParameterValuesResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    if (actionType === "scan") {
      if (parameterName === "bunkerId") {
        return this.getAvailableBunkers(state, playerId);
      }
      if (parameterName === "targetHex" && partialParameters.bunkerId) {
        return this.getScannableHexes(state, playerId, partialParameters.bunkerId as string);
      }
    }

    if (actionType === "jump") {
      if (parameterName === "bunkerId") {
        return this.getAvailableBunkers(state, playerId);
      }
      if (parameterName === "fleetId" && partialParameters.bunkerId) {
        return this.getJumpableFleets(state, playerId, partialParameters.bunkerId as string);
      }
      if (parameterName === "targetHex" && partialParameters.fleetId) {
        return this.getJumpDestinations(state, playerId, partialParameters.fleetId as string);
      }
    }

    return { values: [], error: "Unknown parameter" };
  }

  protected async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    switch (action.type) {
      case "scan":
        return this.handleScan(state, playerId, action as ScanAction);
      case "jump":
        return this.handleJump(state, playerId, action as JumpAction);
      case "reorganize_fleet":
        return this.handleReorganizeFleet(state, playerId, action);
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  // ========== Action Counter ==========

  private countPlayerActionsThisPhase(state: ThroneworldGameState, playerId: string): number {
    // Count bunkers that have hasMoved = true
    let usedBunkers = 0;
    
    for (const system of Object.values(state.state.systems)) {
      const playerUnits = system.unitsOnPlanet[playerId];
      if (!playerUnits) continue;

      for (const unit of playerUnits) {
        const unitDef = UNITS[unit.unitTypeId];
        if (unitDef?.Command && unit.hasMoved) {
          usedBunkers++;
        }
      }
    }
    
    return usedBunkers;
  }

  // ========== Parameter Queries ==========

  private getAvailableBunkers(state: ThroneworldGameState, playerId: string): ParameterValuesResponse {
    const bunkerHexes: string[] = [];

    for (const [hexId, system] of Object.entries(state.state.systems)) {
      const playerUnits = system.unitsOnPlanet[playerId];
      if (!playerUnits) continue;

      // Check for unused Command Bunker
      const hasUnusedBunker = playerUnits.some(unit => {
        const unitDef = UNITS[unit.unitTypeId];
        return unitDef?.Command && !unit.hasMoved;
      });

      if (hasUnusedBunker) {
        bunkerHexes.push(hexId);
      }
    }

    return {
      values: bunkerHexes,
      renderHint: {
        category: "hex-select",
        highlightHexes: bunkerHexes,
        message: `Select a Command Bunker (${bunkerHexes.length} available)`,
      },
    };
  }

  private getScannableHexes(
    state: ThroneworldGameState,
    playerId: string,
    bunkerId: string
  ): ParameterValuesResponse {
    const player = state.players[playerId];
    if (!player) {
      return { values: [], error: "Player not found" };
    }

    const commRange = player.tech.Comm || 0;
    const scannableHexes: string[] = [];

    for (const [hexId, system] of Object.entries(state.state.systems)) {
      // Skip if already scanned
      if (system.scannedBy?.includes(playerId)) continue;

      // Check if within range
      const distance = this.calculateHexDistance(bunkerId, hexId);
      if (distance <= commRange) {
        scannableHexes.push(hexId);
      }
    }

    return {
      values: scannableHexes,
      renderHint: {
        category: "hex-select",
        highlightHexes: scannableHexes,
        message: `Select hex to scan (Comm range: ${commRange}, ${scannableHexes.length} hexes available)`,
      },
    };
  }

  private getJumpableFleets(
    state: ThroneworldGameState,
    playerId: string,
    bunkerId: string
  ): ParameterValuesResponse {
    const player = state.players[playerId];
    if (!player) {
      return { values: [], error: "Player not found" };
    }

    const commRange = player.tech.Comm || 0;
    const jumpableFleets: Array<{ fleetId: string; hexId: string }> = [];

    for (const [hexId, system] of Object.entries(state.state.systems)) {
      // Check if within Comm range
      const distance = this.calculateHexDistance(bunkerId, hexId);
      if (distance > commRange) continue;

      const playerFleets = system.fleetsInSpace[playerId];
      if (!playerFleets) continue;

      for (const fleet of playerFleets) {
        // Check if fleet has Static units
        const hasStatic = [...fleet.spaceUnits, ...fleet.groundUnits].some(unit =>
          UNITS[unit.unitTypeId]?.Static
        );
        if (hasStatic) continue;

        // Check if fleet has moved
        const hasMoved = [...fleet.spaceUnits, ...fleet.groundUnits].some(unit => unit.hasMoved);
        if (hasMoved) continue;

        jumpableFleets.push({ fleetId: fleet.fleetId, hexId });
      }
    }

    return {
      values: jumpableFleets,
      renderHint: {
        category: "custom",
        customComponent: "fleet-select",
        message: `Select fleet to jump (${jumpableFleets.length} available)`,
      },
    };
  }

  private getJumpDestinations(
    state: ThroneworldGameState,
    playerId: string,
    fleetId: string
  ): ParameterValuesResponse {
    const player = state.players[playerId];
    if (!player) {
      return { values: [], error: "Player not found" };
    }

    // Find the fleet
    let fleet: Fleet | undefined;
    let fleetHex: string | undefined;
    
    for (const [hexId, system] of Object.entries(state.state.systems)) {
      const playerFleets = system.fleetsInSpace[playerId];
      if (!playerFleets) continue;
      
      fleet = playerFleets.find(f => f.fleetId === fleetId);
      if (fleet) {
        fleetHex = hexId;
        break;
      }
    }

    if (!fleet || !fleetHex) {
      return { values: [], error: "Fleet not found" };
    }

    const jumpRange = player.tech.Jump || 0;
    const destinationHexes: string[] = [];

    // Check if fleet has Explore capability (Survey Teams)
    const canExplore = fleet.spaceUnits.some(unit => UNITS[unit.unitTypeId]?.Explore);

    for (const [hexId, system] of Object.entries(state.state.systems)) {
      const distance = this.calculateHexDistance(fleetHex, hexId);
      if (distance > jumpRange) continue;

      // If hex not scanned and fleet can't explore, skip it
      if (!system.scannedBy?.includes(playerId) && !canExplore) continue;

      destinationHexes.push(hexId);
    }

    return {
      values: destinationHexes,
      renderHint: {
        category: "hex-select",
        highlightHexes: destinationHexes,
        message: `Select destination (Jump range: ${jumpRange}, ${destinationHexes.length} hexes available)`,
      },
    };
  }

  // ========== Hex Distance ==========

  private calculateHexDistance(hex1: string, hex2: string): number {
    if (hex1 === hex2) return 0;

    const h1 = BOARD_HEXES.find(h => h.id === hex1);
    const h2 = BOARD_HEXES.find(h => h.id === hex2);
    
    if (!h1 || !h2) return Infinity;

    // Cube coordinates for flat-top hexagons
    const q1 = h1.colIndex;
    const r1 = h1.row - Math.floor(h1.colIndex / 2);
    const s1 = -q1 - r1;

    const q2 = h2.colIndex;
    const r2 = h2.row - Math.floor(h2.colIndex / 2);
    const s2 = -q2 - r2;

    return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
  }

  // ========== Action Handlers ==========

  private handleScan(state: ThroneworldGameState, playerId: string, action: ScanAction): ActionResponse {
    if (!action.bunkerId || !action.targetHex) {
      return { success: false, error: "Missing required parameters" };
    }

    const bunkerSystem = state.state.systems[action.bunkerId];
    const targetSystem = state.state.systems[action.targetHex];
    
    if (!bunkerSystem || !targetSystem) {
      return { success: false, error: "Invalid hex" };
    }

    // Mark bunker as used
    const playerUnits = bunkerSystem.unitsOnPlanet[playerId];
    if (playerUnits) {
      for (const unit of playerUnits) {
        const unitDef = UNITS[unit.unitTypeId];
        if (unitDef?.Command && !unit.hasMoved) {
          unit.hasMoved = true;
          break; // Only mark one bunker
        }
      }
    }

    // Add player to scannedBy list
    if (!targetSystem.scannedBy) {
      targetSystem.scannedBy = [];
    }
    if (!targetSystem.scannedBy.includes(playerId)) {
      targetSystem.scannedBy.push(playerId);
    }

    return {
      success: true,
      stateChanges: state,
      message: `Scanned ${action.targetHex}`,
    };
  }

  private handleJump(state: ThroneworldGameState, playerId: string, action: JumpAction): ActionResponse {
    if (!action.bunkerId || !action.fleetId || !action.targetHex) {
      return { success: false, error: "Missing required parameters" };
    }

    const bunkerSystem = state.state.systems[action.bunkerId];
    const targetSystem = state.state.systems[action.targetHex];

    if (!bunkerSystem || !targetSystem) {
      return { success: false, error: "Invalid hex" };
    }

    // Find and remove fleet from source
    let fleet: Fleet | undefined;
    let sourceHex: string | undefined;

    for (const [hexId, system] of Object.entries(state.state.systems)) {
      const playerFleets = system.fleetsInSpace[playerId];
      if (!playerFleets) continue;

      const index = playerFleets.findIndex(f => f.fleetId === action.fleetId);
      if (index >= 0) {
        fleet = playerFleets.splice(index, 1)[0];
        sourceHex = hexId;
        break;
      }
    }

    if (!fleet || !sourceHex) {
      return { success: false, error: "Fleet not found" };
    }

    // Mark all units in fleet as moved
    for (const unit of [...fleet.spaceUnits, ...fleet.groundUnits]) {
      unit.hasMoved = true;
    }

    // Mark bunker as used
    const playerUnits = bunkerSystem.unitsOnPlanet[playerId];
    if (playerUnits) {
      for (const unit of playerUnits) {
        const unitDef = UNITS[unit.unitTypeId];
        if (unitDef?.Command && !unit.hasMoved) {
          unit.hasMoved = true;
          break;
        }
      }
    }

    // Add fleet to target
    if (!targetSystem.fleetsInSpace[playerId]) {
      targetSystem.fleetsInSpace[playerId] = [];
    }
    targetSystem.fleetsInSpace[playerId].push(fleet);

    // Scan target if not already scanned
    if (!targetSystem.scannedBy) {
      targetSystem.scannedBy = [];
    }
    if (!targetSystem.scannedBy.includes(playerId)) {
      targetSystem.scannedBy.push(playerId);
    }

    // Auto-capture empty 0-dev systems
    if (!targetSystem.revealed && targetSystem.details?.dev === 0) {
      const hasOtherUnits = Object.entries(targetSystem.fleetsInSpace)
        .some(([owner, fleets]) => owner !== playerId && fleets.length > 0);
      
      if (!hasOtherUnits && !targetSystem.details.owner) {
        targetSystem.details.owner = playerId;
        targetSystem.revealed = true;
      }
    }

    return {
      success: true,
      stateChanges: state,
      message: `Jumped fleet from ${sourceHex} to ${action.targetHex}`,
    };
  }

  private handleReorganizeFleet(state: ThroneworldGameState, playerId: string, action: GameAction): ActionResponse {
    // TODO: Implement fleet reorganization UI
    return {
      success: false,
      error: "Reorganize fleet not yet implemented - needs UI",
    };
  }
}