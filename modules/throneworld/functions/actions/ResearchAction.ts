// /modules/throneworld/functions/actions/ResearchAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import {
  type TechCategory,
  getEffectiveLevel,
  attemptAdvance,
  canAutoAdvance,
  getAdvanceTarget,
  isAtMaxBox,
} from "../../shared/models/Tech.Throneworld";
import { Factions } from "../../shared/models/Factions.Throneworld";
import { ActionLogAnimation } from "../../../../shared/models/ActionHistoryEntry";

interface ResearchMetadata {
  techCategory?: TechCategory;
  roll?: number;
  reroll?: number;
  success?: boolean;
  autoAdvance?: boolean;
}

export class ResearchAction extends GameAction<ResearchMetadata> {
  constructor() {
    super({
      type: "research",
      undoable: true,
      params: [
        {
          name: "techCategory",
          type: "choice",
          message: "Select technology to research",
          populateChoices: (state: GameState, playerId: string) => {
            const tw = state as ThroneworldGameState;
            const player = tw.players[playerId];

            const choices: Array<{ id: TechCategory; label: string }> = [];

            for (const category of ["Ground", "Space", "Jump", "Comm"] as TechCategory[]) {
              const tech = player.tech[category];

              if (isAtMaxBox(tech)) continue; // Can't advance past max

              const effectiveLevel = getEffectiveLevel(tech);
              const target = getAdvanceTarget(tech);
              const auto = canAutoAdvance(tech);

              choices.push({
                id: category,
                label: `${category} (${effectiveLevel}) - ${auto ? "Auto" : `Need ${target}+`}`,
              });
            }

            return choices;
          },
        },
      ],
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    if (!this.allParamsComplete()) {
      return { action: this, success: false, error: "Missing parameters" };
    }

    const tw = state as ThroneworldGameState;
    const player = tw.players[playerId];
    const techCategory = this.getStringParam("techCategory") as TechCategory;

    if (!techCategory) {
      return { action: this, success: false, error: "Invalid tech category" };
    }

    const tech = player.tech[techCategory];

    if (isAtMaxBox(tech)) {
      return { action: this, success: false, error: "Tech already at maximum" };
    }

    // Check if player already researched this turn
    const phaseData = tw.state.phaseMetadata?.Empire as { playersResearched?: string[] } | undefined;
    if (phaseData?.playersResearched?.includes(playerId)) {
      return { action: this, success: false, error: "You have already researched this turn" };
    }

    // Roll the die
    const autoAdvance = canAutoAdvance(tech);
    const roll = autoAdvance ? 0 : Math.floor(Math.random() * 6) + 1;
    this.metadata.roll = roll;
    this.metadata.techCategory = techCategory;
    this.metadata.autoAdvance = autoAdvance;

    let finalRoll = roll;
    let success = autoAdvance;
    let reroll: number | undefined;

    if (!autoAdvance) {
      const target = getAdvanceTarget(tech);
      success = roll >= target;

      // Veneb gets a reroll
      const faction = Factions[player.race!];
      if (!success && faction?.SpecialAbility?.TechReroll) {
        reroll = Math.floor(Math.random() * 6) + 1;
        this.metadata.reroll = reroll;
        finalRoll = reroll;
        success = reroll >= target;
      }
    }

    this.metadata.success = success;

    // Apply the advance (MUTATE STATE)
    if (success) {
      const newTech = attemptAdvance(tech, finalRoll);
      if (newTech) {
        player.tech[techCategory] = newTech;

        // const oldLevel = getEffectiveLevel(tech);
        const newLevel = getEffectiveLevel(newTech);

        // Track that player researched (MUTATE STATE)
        if (!tw.state.phaseMetadata) tw.state.phaseMetadata = {};
        if (!tw.state.phaseMetadata.Empire) tw.state.phaseMetadata.Empire = {};
        const empireData = tw.state.phaseMetadata.Empire as { playersResearched?: string[] };
        if (!empireData.playersResearched) empireData.playersResearched = [];
        empireData.playersResearched.push(playerId);

        // Build message
        let messageText = `Researched ${techCategory}`;
        if (autoAdvance) {
          messageText += ` (automatic advance to level ${newLevel})`;
        } else if (reroll !== undefined) {
          messageText += ` (rolled ${roll}, rerolled ${reroll} → advanced to level ${newLevel})`;
        } else {
          messageText += ` (rolled ${roll} → advanced to level ${newLevel})`;
        }

        // Build animations
        const animations: ActionLogAnimation[] = [];
        if (!autoAdvance) {
          animations.push({
            animation: "diceRoll",
            params: { roll, target: getAdvanceTarget(tech), success: roll >= getAdvanceTarget(tech) },
          });
          if (reroll !== undefined) {
            animations.push({
              animation: "diceRoll",
              params: {
                roll: reroll,
                target: getAdvanceTarget(tech),
                success: reroll >= getAdvanceTarget(tech),
                isReroll: true,
              },
            });
          }
        }

        return {
          action: this,
          success: true,
          logEntries: [
            {
              messages: [{ text: messageText, visibility: "public" }],
              animations: animations.length > 0 ? animations : undefined,
            },
          ],
          undoable: true,
        };
      }
    }

    // Failed research
    let failMessage = `Research ${techCategory} failed`;
    if (reroll !== undefined) {
      failMessage += ` (rolled ${roll}, rerolled ${reroll})`;
    } else if (!autoAdvance) {
      failMessage += ` (rolled ${roll})`;
    }

    // Still track that player attempted research
    if (!tw.state.phaseMetadata) tw.state.phaseMetadata = {};
    if (!tw.state.phaseMetadata.Empire) tw.state.phaseMetadata.Empire = {};
    const empireData = tw.state.phaseMetadata.Empire as { playersResearched?: string[] };
    if (!empireData.playersResearched) empireData.playersResearched = [];
    empireData.playersResearched.push(playerId);

    // Build animations for failed roll
    const animations: ActionLogAnimation[] = [];
    if (!autoAdvance) {
      const target = getAdvanceTarget(tech);
      animations.push({
        animation: "diceRoll",
        params: { roll, target, success: false },
      });
      if (reroll !== undefined) {
        animations.push({
          animation: "diceRoll",
          params: { roll: reroll, target, success: false, isReroll: true },
        });
      }
    }

    return {
      action: this,
      success: true, // Action succeeded even though research failed
      logEntries: [
        {
          messages: [{ text: failMessage, visibility: "public" }],
          animations: animations.length > 0 ? animations : undefined,
        },
      ],
      undoable: true,
    };
  }
}

registerAction("research", ResearchAction);
