import { db } from "./database";

export async function writeChatMessage(
  gameId: string,
  playerId: string,
  message: string
) {

  const entry = {
    playerId,
    message,
    timestamp: Date.now()
  };

  await db.collection(`games/${gameId}/chat`).add(entry);

  return entry;
}

export async function getRecentChatMessages(
  gameId: string,
  limitCount = 50
) {
  const snap = await db
    .collection(`games/${gameId}/chat`)
    .orderBy("timestamp", "desc")
    .limit(limitCount)
    .get();

  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

export async function getChatMessagesBefore(
  gameId: string,
  beforeTimestamp: number,
  limitCount = 50
) {
  const snap = await db
    .collection(`games/${gameId}/chat`)
    .orderBy("timestamp", "desc")
    .startAfter(beforeTimestamp)
    .limit(limitCount)
    .get();

  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

