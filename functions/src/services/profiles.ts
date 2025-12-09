// functions/src/services/profiles.ts
import { db } from "./database.js";
import type { PlayerPublicProfile, PlayerPrivateProfile } from "../../../shared/models/PlayerProfile.js";
import type { PlayerSummary } from "../../../shared/models/GameSummary.js";

export async function ensurePlayerProfile(params: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}): Promise<PlayerPublicProfile> {
  const now = Date.now();
  const publicRef = db.doc(`profiles/${params.uid}`);
  const privateRef = db.doc(`profiles/${params.uid}/private/data`);

  const existing = await publicRef.get();
  if (existing.exists) {
    return existing.data() as PlayerPublicProfile;
  }

  const displayName =
    params.displayName?.trim()
    ?? params.email?.split("@")[0]
    ?? `Player ${params.uid.slice(0, 6)}`;

  const publicProfile: PlayerPublicProfile = {
    uid: params.uid,
    displayName,
    photoURL: params.photoURL ?? null,
    updatedAt: now,
  };

  const privateProfile: PlayerPrivateProfile = {
    uid: params.uid,
    email: params.email ?? null,
    updatedAt: now,
  };

  await Promise.all([
    publicRef.set(publicProfile),
    privateRef.set(privateProfile),
  ]);

  return publicProfile;
}

export function buildPlayerSummaries(params: {
  players: Array<{
    uid: string;
    displayName: string;
    status?: "invited" | "joined" | "dummy";
    race?: string;
  }>;
}): PlayerSummary[] {
  return params.players.map(p => ({
    id: p.uid,
    name: p.displayName,
    status: p.status || "joined",
    race: p.race,
  }));
}