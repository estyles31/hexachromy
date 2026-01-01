// functions/src/services/profiles.ts
import { db } from "./database.js";
import admin from "firebase-admin";
import type {
  PlayerPublicProfile,
  PlayerPrivateProfile,
} from "../../../shared/models/PlayerProfile.js";
import { getGravatarUrl } from "../../../shared/utils/gravatar.js";

export async function ensurePlayerProfile(params: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}): Promise<PlayerPublicProfile> {
  const now = Date.now();

  const publicRef = db.doc(`profiles/${params.uid}`);
  const privateRef = db.doc(`profiles/${params.uid}/private/data`);

  let publicProfile: PlayerPublicProfile;
  let privateProfile: PlayerPrivateProfile;

  const publicSnap = await publicRef.get();

  if (!publicSnap.exists) {
    const displayName =
      params.displayName?.trim()
      ?? params.email?.split("@")[0]
      ?? `Player ${params.uid.slice(0, 6)}`;

    publicProfile = {
      uid: params.uid,
      displayName,
      avatarSource: "gravatar",
      profileComplete: false,
      updatedAt: now,
    };

    privateProfile = {
      uid: params.uid,
      email: params.email ?? null,
      hideEmail: false,
      preferredColors: [],
      updatedAt: now,
    };

    await Promise.all([
      publicRef.set(publicProfile),
      privateRef.set(privateProfile),
    ]);
  } else {
    publicProfile = publicSnap.data() as PlayerPublicProfile;

    const privateSnap = await privateRef.get();
    if (privateSnap.exists) {
      privateProfile = privateSnap.data() as PlayerPrivateProfile;
    } else {
      privateProfile = {
        uid: params.uid,
        email: params.email ?? null,
        hideEmail: false,
        preferredColors: [],
        updatedAt: now,
      };
      await privateRef.set(privateProfile);
    }
  }

  return buildPublicProfile({
    uid: params.uid,
    publicProfile,
    privateProfile,
  });
}

export async function buildPublicProfile(params: {
  uid: string;
  publicProfile: PlayerPublicProfile;
  privateProfile: PlayerPrivateProfile | null;
}): Promise<PlayerPublicProfile> {
  const profile: PlayerPublicProfile = { ...params.publicProfile };

  switch (profile.avatarSource) {
    case "gravatar":
      if (params.privateProfile?.email) {
        profile.avatarUrl = getGravatarUrl(params.privateProfile.email);
      }
      break;

    case "google": {
      const authUser = await admin.auth().getUser(params.uid);
      if (authUser.photoURL) {
        profile.avatarUrl = authUser.photoURL;
      }
      break;
    }

    case "initial":
    default:
      // no avatarUrl
      break;
  }

  return profile;
}

export async function loadPublicProfile(uid: string): Promise<PlayerPublicProfile> {
  const publicRef = db.doc(`profiles/${uid}`);
  const privateRef = db.doc(`profiles/${uid}/private/data`);

  const [publicSnap, privateSnap] = await Promise.all([
    publicRef.get(),
    privateRef.get(),
  ]);

  if (!publicSnap.exists) {
    throw new Error("Profile not found");
  }

  return buildPublicProfile({
    uid,
    publicProfile: publicSnap.data() as PlayerPublicProfile,
    privateProfile: privateSnap.exists
      ? (privateSnap.data() as PlayerPrivateProfile)
      : null,
  });
}

export async function loadPrivateProfile(
  uid: string
): Promise<PlayerPrivateProfile> {
  const ref = db.doc(`profiles/${uid}/private/data`);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Private profile not found");
  }

  return snap.data() as PlayerPrivateProfile;
}