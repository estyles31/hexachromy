// /modules/throneworld/functions/phases/OutreachPhase.ts
import { Phase, type PhaseContext } from "./Phase";
import type { LegalActionsResponse, ActionResponse } from "../../../../shared/models/ApiContexts";
import type { GameAction, ParamChoicesResponse, LegalChoice } from "../../../../shared/models/ActionParams";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { 
  getAvailableBunkers, 
  getScannableHexes, 
  executeScan
} from "../actions/ScanAction";

import { 
  getJumpableFleets, 
  getJumpDestinations, 
  executeJump 
} from "../actions/JumpAction";

export class OutreachPhase extends Phase {
  readonly name = "Outreach";

  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const actions: GameAction[] = [];

    const actionsThisPhase = this.countPlayerActionsThisPhase(state, playerId);

    if (actionsThisPhase >= 2) {
      return {
        actions: [],
        message: "You have used both actions this turn. Waiting for other players...",
      };
    }

    const availableBunkers = getAvailableBunkers(state, playerId);

    if (availableBunkers.length > 0) {
      // Scan action
      actions.push({
        type: "scan",
        undoable: false,
        params: [
          {
            name: "bunkerHexId",
            type: "boardSpace",
            subtype: "hex",
            message: "Select a Command Bunker",
          },
          {
            name: "targetHexId",
            type: "boardSpace",
            subtype: "hex",
            dependsOn: "bunkerHexId",
            message: "Select a hex to scan",
          },
        ],
        initiatedBy: {
          type: "gamePiece",
          subtype: "commandBunker",
          fillsParam: "bunkerHexId",
        },
        finalize: {
          mode: "confirm",
          label: "Scan",
        },
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
        params: [
          {
            name: "bunkerHexId",
            type: "boardSpace",
            subtype: "hex",
            message: "Select a Command Bunker",
          },
          {
            name: "fleetId",
            type: "gamePiece",
            subtype: "fleet",
            dependsOn: "bunkerHexId",
            message: "Select a fleet to jump",
          },
          {
            name: "targetHexId",
            type: "boardSpace",
            subtype: "hex",
            dependsOn: "fleetId",
            message: "Select destination hex",
          },
        ],
        initiatedBy: {
          type: "gamePiece",
          subtype: "commandBunker",
          fillsParam: "bunkerHexId",
        },
        finalize: {
          mode: "confirm",
          // Label will be dynamic based on destination
        },
        renderHint: {
          category: "button",
          label: "Jump",
          description: "Use a Command Bunker to jump a fleet",
        },
      });
    }

    // Reorganize fleet - always available
    actions.push({
      type: "reorganize_fleet",
      undoable: true,
      params: [],
      finalize: {
        mode: "confirm",
        label: "Reorganize Fleets",
      },
      renderHint: {
        category: "button",
        label: "Reorganize Fleets",
        description: "Move units between fleets (doesn't use an action)",
      },
    });

    return {
      actions: actions as unknown as GameAction[],
      message: `Actions remaining: ${2 - actionsThisPhase}/2. Select a Command Bunker to scan or jump.`,
    };
  }

  async getParamChoices(
    ctx: PhaseContext,
    playerId: string,
    actionType: string,
    paramName: string,
    filledParams: Record<string, string>
  ): Promise<ParamChoicesResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    if (actionType === "scan") {
      return this.getScanParamChoices(state, playerId, paramName, filledParams);
    }

    if (actionType === "jump") {
      return this.getJumpParamChoices(state, playerId, paramName, filledParams);
    }

    return { choices: [], error: `Unknown action type: ${actionType}` };
  }

  private getScanParamChoices(
    state: ThroneworldGameState,
    playerId: string,
    paramName: string,
    filledParams: Record<string, string>
  ): ParamChoicesResponse {
    if (paramName === "bunkerHexId") {
      const bunkerHexes = getAvailableBunkers(state, playerId);
      return {
        choices: bunkerHexes.map(hexId => ({
          id: hexId,
          type: "boardSpace",
          subtype: "hex",
          displayHint: { hexId },
        })),
        message: `Select a Command Bunker (${bunkerHexes.length} available)`,
      };
    }

    if (paramName === "targetHexId") {
      const bunkerHexId = filledParams.bunkerHexId;
      if (!bunkerHexId) {
        return { choices: [], error: "Must select bunker first" };
      }

      const scannableHexes = getScannableHexes(state, playerId, bunkerHexId);
      const player = state.players[playerId];
      const commRange = player?.tech.Comm || 0;

      return {
        choices: scannableHexes.map(hexId => ({
          id: hexId,
          type: "boardSpace",
          subtype: "hex",
          displayHint: { hexId },
        })),
        message: `Select hex to scan (Comm range: ${commRange}, ${scannableHexes.length} in range)`,
        finalizeLabel: "Scan",
      };
    }

    return { choices: [], error: `Unknown param: ${paramName}` };
  }

  private getJumpParamChoices(
    state: ThroneworldGameState,
    playerId: string,
    paramName: string,
    filledParams: Record<string, string>
  ): ParamChoicesResponse {
    if (paramName === "bunkerHexId") {
      const bunkerHexes = getAvailableBunkers(state, playerId);
      return {
        choices: bunkerHexes.map(hexId => ({
          id: hexId,
          type: "boardSpace",
          subtype: "hex",
          displayHint: { hexId },
        })),
        message: `Select a Command Bunker (${bunkerHexes.length} available)`,
      };
    }

    if (paramName === "fleetId") {
      const bunkerHexId = filledParams.bunkerHexId;
      if (!bunkerHexId) {
        return { choices: [], error: "Must select bunker first" };
      }

      const jumpableFleets = getJumpableFleets(state, playerId, bunkerHexId);
      const player = state.players[playerId];
      const commRange = player?.tech.Comm || 0;

      return {
        choices: jumpableFleets.map(f => ({
          id: f.fleetId,
          type: "gamePiece",
          subtype: "fleet",
          displayHint: { 
            pieceId: f.fleetId,
            hexId: f.hexId,
          },
        })),
        message: `Select a fleet to jump (Comm range: ${commRange}, ${jumpableFleets.length} in range)`,
      };
    }

    if (paramName === "targetHexId") {
      const fleetId = filledParams.fleetId;
      if (!fleetId) {
        return { choices: [], error: "Must select fleet first" };
      }

      const destinations = getJumpDestinations(state, playerId, fleetId);
      const player = state.players[playerId];
      const jumpRange = player?.tech.Jump || 0;

      // Build metadata for each destination
      const choices: LegalChoice[] = destinations.map(hexId => {
        const system = state.state.systems[hexId];
        const hasEnemyUnits = this.checkForEnemies(state, hexId, playerId);
        const isScanned = system?.scannedBy?.includes(playerId) ?? false;
        const isRevealed = system?.revealed ?? false;

        return {
          id: hexId,
          type: "boardSpace",
          subtype: "hex",
          displayHint: { hexId },
          metadata: {
            hasEnemyUnits,
            isScanned,
            isRevealed,
          },
        };
      });

      // Determine dynamic finalize label based on likely outcomes
      let finalizeLabel = "Jump";
      const anyHasEnemies = choices.some(c => c.metadata?.hasEnemyUnits);
      const anyUnscanned = choices.some(c => !c.metadata?.isScanned);

      return {
        choices,
        message: `Select destination (Jump range: ${jumpRange}, ${destinations.length} in range)`,
        finalizeLabel,
        finalizeMetadata: {
          possibleCombat: anyHasEnemies,
          possibleScan: anyUnscanned,
        },
      };
    }

    return { choices: [], error: `Unknown param: ${paramName}` };
  }

  private checkForEnemies(state: ThroneworldGameState, hexId: string, playerId: string): boolean {
    const system = state.state.systems[hexId];
    if (!system) return false;

    // Check fleets
    for (const [owner, fleets] of Object.entries(system.fleetsInSpace)) {
      if (owner !== playerId && fleets.length > 0) return true;
    }

    // Check ground units
    for (const [owner, units] of Object.entries(system.unitsOnPlanet)) {
      if (owner !== playerId && units.length > 0) return true;
    }

    return false;
  }

  protected async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    switch (action.type) {
      case "scan":
        return this.handleScan(state, playerId, action);
      case "jump":
        return this.handleJump(state, playerId, action);
      case "reorganize_fleet":
        return this.handleReorganizeFleet(state, playerId, action);
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  private countPlayerActionsThisPhase(state: ThroneworldGameState, playerId: string): number {
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

  private handleScan(state: ThroneworldGameState, playerId: string, action: GameAction): ActionResponse {
    const bunkerHexId = action.bunkerHexId as string;
    const targetHexId = action.targetHexId as string;

    if (!bunkerHexId || !targetHexId) {
      return { success: false, error: "Missing required parameters: bunkerHexId and targetHexId" };
    }

    return executeScan(state, playerId, { bunkerHexId, targetHexId });
  }

  private handleJump(state: ThroneworldGameState, playerId: string, action: GameAction): ActionResponse {
    const bunkerHexId = action.bunkerHexId as string;
    const fleetId = action.fleetId as string;
    const targetHexId = action.targetHexId as string;

    if (!bunkerHexId || !fleetId || !targetHexId) {
      return { success: false, error: "Missing required parameters: bunkerHexId, fleetId, and targetHexId" };
    }

    return executeJump(state, playerId, { bunkerHexId, fleetId, targetHexId });
  }

  private handleReorganizeFleet(state: ThroneworldGameState, playerId: string, action: GameAction): ActionResponse {
    return {
      success: false,
      error: "Reorganize fleet not yet implemented",
    };
  }
}
