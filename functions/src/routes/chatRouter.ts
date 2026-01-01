// routes/chatRouter.ts
import { Router } from "express";
import { getRecentChatMessages, getChatMessagesBefore } from "../services/ChatHistoryService";

export const chatRouter = Router();

chatRouter.get("/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const limit = Number(req.query.limit) || 50;
    const before = req.query.before ? Number(req.query.before) : null;

    let messages;
    if (before) {
      messages = await getChatMessagesBefore(gameId, before, limit);
    } else {
      messages = await getRecentChatMessages(gameId, limit);
    }

    res.json({ success: true, messages });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "chat_read_failed",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
