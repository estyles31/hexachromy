// shared-backend/StateDiff.ts
import * as jsondiffpatch from "jsondiffpatch";
import type { GameState } from "../shared/models/GameState";
import { FieldValue } from "firebase-admin/firestore";

/**
 * The diff format we store in action history.
 * This is jsondiffpatch's native format - no need to convert.
 */
export type StateDiff = jsondiffpatch.Delta | undefined;

/**
 * Configuration for the differ
 */
const differ = jsondiffpatch.create({
  objectHash: (obj: any) => {
    // Use id/uid fields for object identity when available
    return obj?.id || obj?.uid || undefined;
  },
  arrays: { detectMove: false },
  diffFilter: ((context: any) => {
    const { left, right } = context;

    // Treat arrays as atomic values (don’t generate _t:"a" diffs)
    if (Array.isArray(left) || Array.isArray(right)) return false;

    return true;
  }) as any,
} as any);

/**
 * Compute the difference between two game states
 *
 * @param before - State before changes
 * @param after - State after changes
 * @returns Diff in jsondiffpatch format, or undefined if no changes
 */
export function computeStateDiff(before: GameState, after: GameState): StateDiff {
  //never diff player views
  before.playerViews = undefined;
  after.playerViews = undefined;
  const diff = differ.diff(before, after);
  if (process.env.DEBUG === "true") {
    console.log("before state:", JSON.stringify(before));
    console.log("after state:", JSON.stringify(after));
    console.log("computed diff:", JSON.stringify(diff));
  }
  return diff;
}

/**
 * Apply a diff to a state object in-place (mutates the state)
 *
 * @param state - State to mutate
 * @param diff - Diff to apply (from computeStateDiff or reverse)
 */
export function applyDiffToState(state: GameState, diff: StateDiff): void {
  if (!diff) return;
  jsondiffpatch.patch(state, diff);
}

/**
 * Reverse a diff for undo operations
 *
 * @param diff - Original diff
 * @returns Reversed diff that undoes the original changes
 */
export function reverseDiff(diff: StateDiff): StateDiff {
  if (!diff) return undefined;
  return jsondiffpatch.reverse(diff);
}

/**
 * Convert jsondiffpatch diff to Firestore update object
 *
 * @param diff - jsondiffpatch diff
 * @param finalState - The final state after applying the diff
 * @returns Object suitable for Firestore update()
 */
export function diffToFirestoreUpdates(diff: StateDiff, finalState: GameState): Record<string, any> {
  return objectDiffToFirestoreUpdates(diff, finalState);
}

/**
 * Recursively walk jsondiffpatch diff and build Firestore update paths
 * - Collapses ALL array diffs (_t:"a") into full replacements
 */
function walkDiff(diffNode: any, afterNode: any, path: string, updates: Record<string, any>): void {
  // Nothing to do
  if (!diffNode || typeof diffNode !== "object") {
    return;
  }

  // 🔥 ARRAY DIFF: replace the entire value at this path
  if (diffNode._t === "a") {
    updates[path] = afterNode;
    return;
  }

  // jsondiffpatch primitive leaf: [new] | [old,new] | [old,0,0]
  if (Array.isArray(diffNode)) {
    // deletion
    if (diffNode.length === 3 && diffNode[1] === 0 && diffNode[2] === 0) {
      updates[path] = FieldValue.delete();
      return;
    }

    const newValue = diffNode.length === 1 ? diffNode[0] : diffNode[1];
    updates[path] = newValue;
    return;
  }

  // Walk object children
  for (const [key, value] of Object.entries(diffNode)) {
    if (key.startsWith("_")) continue;

    const newPath = path ? `${path}.${key}` : key;
    const nextAfter = afterNode?.[key];

    walkDiff(value, nextAfter, newPath, updates);
  }
}

/**
 * Check if a diff represents any actual changes
 *
 * @param diff - Diff to check
 * @returns true if there are changes, false otherwise
 */
export function hasChanges(diff: StateDiff): boolean {
  return diff !== undefined && Object.keys(diff).length > 0;
}

/**
 * Compute a diff between two arbitrary objects (for playerViews, etc.)
 * Uses the same jsondiffpatch instance as computeStateDiff
 */
export function computeObjectDiff(oldObj: Record<string, any>, newObj: Record<string, any>): StateDiff {
  // Use the same jsondiffpatch instance/configuration as computeStateDiff
  return differ.diff(oldObj, newObj) || {};
}

/**
 * Convert object diff to Firestore update format
 */
export function objectDiffToFirestoreUpdates(diff: StateDiff, newObj: Record<string, any>): Record<string, any> {
  if (!diff) return {};

  const updates: Record<string, any> = {};
  // Walk the diff tree and build Firestore paths
  walkDiff(diff, newObj, "", updates);
  return updates;
}
