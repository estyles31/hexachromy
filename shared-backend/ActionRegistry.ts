// /shared/models/ActionRegistry.ts

import { GameAction } from "../shared/models/GameAction";

type ActionConstructor = new () => GameAction;

const registry = new Map<string, ActionConstructor>();

export function registerAction(type: string, ctor: ActionConstructor) {
  if (registry.has(type)) {
    throw new Error(`Action type '${type}' already registered`);
  }
  registry.set(type, ctor);
}

export function getActionFromJson(obj: any): GameAction {
  if (!obj || !obj.type) {
    throw new Error("Cannot get action: missing type");
  }

  const ctor = registry.get(obj.type);
  if (!ctor) {
    throw new Error(`Unknown action type: '${obj.type}'`);
  }

  // Build default instance
  const action = new ctor();

  // Copy data in (shallow merge)
  Object.assign(action, obj);

  return action;
}

export function createAction(type: string): GameAction | null {
  const ctor = registry.get(type);
  if (!ctor) {
    return null;
  } 
  return new ctor();
}

export function listRegisteredActions(): string[] {
  return Array.from(registry.keys());
}
