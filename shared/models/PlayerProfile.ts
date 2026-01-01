// shared/models/PlayerProfile.ts
export type AvatarSource = "initial" | "gravatar" | "google";

export interface PlayerPublicProfile {
  uid: string;
  displayName: string;
  profileComplete: boolean;
  avatarSource?: AvatarSource;
  avatarUrl?: string;   //derived, never persisted
  updatedAt: number;
}

export interface PlayerPrivateProfile {
  uid: string;
  email?: string | null;
  hideEmail: boolean;
  preferredColors: string[];
  updatedAt: number;
}