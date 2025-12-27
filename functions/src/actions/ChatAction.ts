import { GameAction, ActionResponse } from "../../../shared/models/GameAction";
import type { GameState } from "../../../shared/models/GameState";
import { writeChatMessage } from "../services/ChatHistoryService";
import { registerAction } from "../../../shared-backend/ActionRegistry";

export class ChatAction extends GameAction {

  constructor() {
    super({
      type: "chat",
      undoable: false,
      params: [
        {
          name: "message",
          type: "text",
          message: "Enter chat message",
        },
      ],
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    const text = this.getStringParam("message");
    if (!text) return { action: this, success: false, error: "empty_message" };

    await writeChatMessage(state.gameId, playerId, text);

    return { action: this, success: true, message: "chat_sent" };
  }

  getParamChoices(): [] {
    return [];
  }
}

registerAction("chat", ChatAction);