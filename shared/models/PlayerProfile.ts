export interface PlayerPublicProfile {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  updatedAt: number;
}

export interface PlayerPrivateProfile {
  uid: string;
  email?: string | null;
  updatedAt: number;
}
