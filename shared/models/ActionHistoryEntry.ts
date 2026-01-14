// /shared/models/ActionHistoryEntry.ts

export interface ActionLogMessage {
  text: string;
  visibility: "public" | "private";
  visibleTo?: string[]; // If private, which players see it
}

export interface ActionLogAnimation {
  animation: string; // Module-specific animation name (e.g. "diceRoll", "combatRound")
  params: Record<string, any>;
}

export interface ActionHistoryEntry {
  actionId: string;
  sequence: number; // Global sequence number for ordering
  timestamp: number;
  playerId: string;
  actionType: string;
  action: string; // Serialized action with filled params only
  diffs: string; // Serialized state diff
  undoable: boolean;
  undone?: boolean;
  resultingPhase: string;

  // NEW: Multiple messages with visibility
  messages?: ActionLogMessage[];

  // NEW: Multiple animations
  animations?: ActionLogAnimation[];

  // NEW: For grouping related entries
  groupId?: string;

  // DEPRECATED: Single message for backward compatibility
  message?: string;
}

// Helper to extract only filled parameter values from action
export function getActionParams(action: any): Record<string, any> {
  const params: Record<string, any> = {};
  if (action.params) {
    for (const param of action.params) {
      if (param.value !== undefined && param.value !== null) {
        params[param.name] = param.value;
      }
    }
  }
  return params;
}

// Create minimal action object for logging (no choices, just filled values)
export function createMinimalAction(action: any): any {
  return {
    type: action.type,
    params:
      action.params
        ?.map((p: any) => ({
          name: p.name,
          value: p.value,
        }))
        .filter((p: any) => p.value !== undefined && p.value !== null) || [],
  };
}
