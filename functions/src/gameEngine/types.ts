export interface ViewerContext {
  /** Authenticated user ID or `undefined` when called from a system context. */
  playerId?: string;
  /** Indicates the caller can bypass player/observer visibility checks. */
  isAdmin?: boolean;
}

export interface ActionEnvelope<ActionType = string, Payload = unknown> {
  /** Machine-readable action identifier (e.g., "purchase", "moveFleet"). */
  type: ActionType;
  /** Serialized action payload coming from the client. */
  payload: Payload;
  /** UID of the user who initiated the action. */
  performedBy?: string;
  /** State version the client observed when it requested the action list. */
  stateVersion: number;
}

export interface GameStateMetadata {
  /** Current turn counter. */
  turn: number;
  /** Name of the currently active phase (e.g., "ProductionPhase"). */
  phase: string;
  /** Monotonically increasing state version used for optimistic concurrency. */
  stateVersion: number;
}

export interface GameState<State = unknown> extends GameStateMetadata {
  /** Game-specific state tree, already redacted for public visibility. */
  state: State;
  /** Player UID list or map (used by Firestore rules to gate access). */
  players: string[] | Record<string, boolean>;
  /** Optional observer UID list or map. */
  observers?: string[] | Record<string, boolean>;
}

export interface RedactedState<State = unknown> extends GameStateMetadata {
  /** State tree trimmed for the specific viewer. */
  state: State;
}

export interface PlayerFogView<State = unknown> extends RedactedState<State> {
  /** UID the fogged overlay belongs to. */
  playerId: string;
}

export interface ActionLogEntry<ActionType = string, Payload = unknown> {
  /** Numeric sequence/turn ordering. */
  index: number;
  /** Machine-readable action identifier. */
  type: ActionType;
  /** UID that initiated the action (if any). */
  performedBy?: string;
  /** Serialized action body. */
  payload: Payload;
  /** References a prior action when reversing it. */
  undoOf?: string;
  /** Timestamp of when the action was committed (epoch millis). */
  appliedAt: number;
}

export interface ActionRequestContext<State = unknown, ActionType = string, Payload = unknown>
  extends ViewerContext {
  game: GameState<State>;
  actionEnvelope: ActionEnvelope<ActionType, Payload>;
}

export interface ApplyActionContext<State = unknown, ActionType = string, Payload = unknown>
  extends ViewerContext {
  game: GameState<State>;
  actionEnvelope: ActionEnvelope<ActionType, Payload>;
}

export interface GamePhase<State = unknown, ActionType = string, Payload = unknown> {
  /** Human-friendly name for logging and UI. */
  name: string;
  /** Returns the legal actions available to a viewer for this phase. */
  getLegalActions(
    context: ActionRequestContext<State, ActionType, Payload>,
  ): Promise<ActionEnvelope<ActionType, Payload>[]> | ActionEnvelope<ActionType, Payload>[];
  /** Applies an action to the current state and returns the next state. */
  applyAction(
    context: ApplyActionContext<State, ActionType, Payload>,
  ): Promise<GameState<State>> | GameState<State>;
  /** Optional hook to redact fogged data for this phase. */
  redactState?(state: GameState<State>, viewer: ViewerContext): RedactedState<State>;
}

export interface GameModule<State = unknown, ActionType = string, Payload = unknown> {
  /** Unique identifier for the game implementation (e.g., "throne-world"). */
  id: string;
  /** Ordered list of phases that drive the turn structure. */
  phases: GamePhase<State, ActionType, Payload>[];
  /** Delegates to the active phase to compute available actions. */
  getLegalActions(
    context: ActionRequestContext<State, ActionType, Payload>,
  ): Promise<ActionEnvelope<ActionType, Payload>[]> | ActionEnvelope<ActionType, Payload>[];
  /** Applies an action and advances the state/phase/turn as needed. */
  applyAction(
    context: ApplyActionContext<State, ActionType, Payload>,
  ): Promise<GameState<State>> | GameState<State>;
  /** Redacts fogged data into a viewer-specific state snapshot. */
  redactState(state: GameState<State>, viewer: ViewerContext): RedactedState<State>;
}
