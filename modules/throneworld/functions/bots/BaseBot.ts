// /modules/throneworld/functions/bots/BaseBot.ts
import { pickRandom } from "../../../../shared/utils/RandomUtils";
import { ActionHandler } from "../../../../functions/src/actions/ActionHandler";
import { PassAction } from "../actions/PassAction";
import { GameAction } from "../../../../shared/models/GameAction";
import { ThroneworldPhaseManager } from "../phases/PhaseManager";

const MAX_ACTIONS_PER_TURN = 50; // Safety limit to prevent infinite loops
const ACTION_DELAY_MS = 1000; // Delay between bot actions (1 second)

export class BaseBot {
    private actionDelayMs: number;

    constructor(actionDelayMs: number = ACTION_DELAY_MS) {
        this.actionDelayMs = actionDelayMs;
    }

    /**
     * Execute bot turn - keeps taking actions until only Pass is available
     */
    async takeTurn(
        botPlayerId: string,
        phaseManager: ThroneworldPhaseManager
    ): Promise<void> {
        let actionCount = 0;

        while (actionCount < MAX_ACTIONS_PER_TURN) {
            // Add delay before each action (except first)
            if (actionCount > 0 && this.actionDelayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, this.actionDelayMs));
            }

            // Reload fresh state before each action
            const gameState = await phaseManager.reloadGameState();

            const legalActions = await phaseManager.getLegalActions(botPlayerId);

            if (legalActions.actions.length === 0) {
                // No actions available, turn is over
                break;
            }

            // Filter out Pass actions unless it's the only option
            const nonPassActions = legalActions.actions.filter(a => a.type !== "pass");
            const availableActions = nonPassActions.length > 0 ? nonPassActions : legalActions.actions;

            // Try to execute an action with retry logic
            let success = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 2;

            while (!success && attempts < MAX_ATTEMPTS) {
                attempts++;

                try {
                    // Pick random action
                    const action = pickRandom(availableActions);

                    // Fill params randomly - may throw if action becomes invalid
                    await this.fillParamsRandomly(action, botPlayerId, phaseManager);

                    // Reload state ONE MORE TIME right before execution to get latest version
                    const freshState = await phaseManager.reloadGameState();
                    action.expectedVersion = freshState.version;

                    // Execute action through baseActionHandler
                    const response = await ActionHandler(
                        {
                            gameId: gameState.gameId,
                            playerId: botPlayerId,
                            action,
                            db: phaseManager.db,
                        },
                        phaseManager
                    );

                    if (!response.success) {
                        console.warn(`Bot action failed: ${response.error}, attempt ${attempts}/${MAX_ATTEMPTS}`);
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error(response.error || "Action failed");
                        }
                        continue; // Retry with a different random action
                    }

                    success = true;
                    actionCount++;

                    // If we just passed, we're done
                    if (action.type === "pass") {
                        return;
                    }
                } catch (err) {
                    console.warn(`Bot ${botPlayerId} action error: ${err}, attempt ${attempts}/${MAX_ATTEMPTS}`);

                    if (attempts >= MAX_ATTEMPTS) {
                        // After retries fail, try to pass
                        console.log(`Bot ${botPlayerId} attempting to pass after ${MAX_ATTEMPTS} failures`);
                        try {
                            const passAction = legalActions.actions.find(a => a.type === "pass")
                                ?? new PassAction();

                            const passResponse = await ActionHandler(
                                {
                                    gameId: gameState.gameId,
                                    playerId: botPlayerId,
                                    action: passAction,
                                    db: phaseManager.db
                                },
                                phaseManager
                            );
                            if (passResponse.success) {
                                console.log(`Bot ${botPlayerId} passed after failures`);
                                return; // Successfully passed, done
                            }
                        } catch (passErr) {
                            console.error(`Bot ${botPlayerId} failed to pass:`, passErr);
                        }
                        // Give up this turn
                        console.error(`Bot ${botPlayerId} giving up after all attempts failed`);
                        return;
                    }
                }
            }
        }

        if (actionCount >= MAX_ACTIONS_PER_TURN) {
            console.warn(`Bot ${botPlayerId} hit max action limit (${MAX_ACTIONS_PER_TURN})`);
        }
    }

    /**
     * Fill action params by picking random choices
     */
    private async fillParamsRandomly(
        action: GameAction,
        playerId: string,
        phaseManager: ThroneworldPhaseManager
    ): Promise<void> {
        // Keep filling params until action is complete
        while (!action.allParamsComplete()) {
            const nextParam = action.params.find(p => !p.optional && (p.value === undefined || p.value === null));

            if (!nextParam) break;

            // Build filledParams from current action state
            const filledParams: Record<string, string> = {};
            for (const param of action.params) {
                if (param.value !== undefined && param.value !== null) {
                    filledParams[param.name] = param.value as string;
                }
            }

            // Get legal actions with filled params to populate choices for next param
            const legalActionsResponse = await phaseManager.getLegalActions(playerId, filledParams);
            const matchingAction = legalActionsResponse.actions.find(a => a.type === action.type);

            if (!matchingAction) {
                throw new Error(`Action ${action.type} not available with current params`);
            }

            const paramWithChoices = matchingAction.params.find(p => p.name === nextParam.name);

            if (!paramWithChoices?.choices || paramWithChoices.choices.length === 0) {
                throw new Error(`No choices available for param ${nextParam.name} on action ${action.type}`);
            }

            // Pick random choice
            const choice = pickRandom(paramWithChoices.choices);
            action.setParamValue(nextParam.name, choice.id);
        }
    }
}