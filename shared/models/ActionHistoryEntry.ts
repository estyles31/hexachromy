export interface ActionHistoryEntry {
  actionId: string;
  sequence: number;  // Global sequence number for ordering
  timestamp: number;
  playerId: string;
  actionType: string;
  action: string;
  diffs: string;
  message: string;   // Summary message for this action
  undoable: boolean; // Can this be undone at this point in time?
  undone?: boolean;  // Has this action been undone? (for audit trail)
  resultingPhase: string;
}