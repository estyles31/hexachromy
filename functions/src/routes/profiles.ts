// functions/src/routes/profiles.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../services/database.js";
import type { PlayerPublicProfile, PlayerPrivateProfile } from "../../../shared/models/PlayerProfile.js";
import type { AuthenticatedRequest } from "../auth.js";
import { ensurePlayerProfile, loadPrivateProfile, loadPublicProfile } from "../services/profiles.js";

export const profilesRouter = Router();

// GET /profiles/me - Get current user's public profile
profilesRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    
    const profile = await ensurePlayerProfile({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
    });

    res.json(profile);
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(404).json({ error: "Profile not found" });
  }
});

// GET /profiles/me/private - Get current user's private data
profilesRouter.get("/me/private", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.uid;
    const profile = await loadPrivateProfile(userId);
    res.json(profile);
  } catch (err) {
    console.error("Error loading private profile:", err);
    res.status(404).json({ error: "Private profile not found" });
  }
});

// GET /profiles/:uid - Get another user's public profile
profilesRouter.get("/:uid", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const profile = await loadPublicProfile(uid);
    res.json(profile);
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(404).json({ error: "Profile not found" });
  }
});

// PUT /profiles/me - Update current user's profile
profilesRouter.put("/me", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.uid;
    const { displayName, hideEmail, preferredColors, profileComplete, avatarSource } = req.body;
    
    const publicUpdates: Partial<PlayerPublicProfile> = { updatedAt: Date.now() };
    const privateUpdates: Partial<PlayerPrivateProfile> = { updatedAt: Date.now() };
    
    // Build public updates
    if (typeof displayName === "string" && displayName.trim()) {
      publicUpdates.displayName = displayName.trim();
    }
    if (typeof profileComplete === "boolean") {
      publicUpdates.profileComplete = profileComplete;
    }
    if(typeof avatarSource === "string") {
      publicUpdates.avatarSource = avatarSource as any;
    }
    
    // Build private updates
    if (typeof hideEmail === "boolean") {
      privateUpdates.hideEmail = hideEmail;
    }
    if (Array.isArray(preferredColors)) {
      privateUpdates.preferredColors = preferredColors
        .filter(c => typeof c === "string" && /^#[0-9A-Fa-f]{6}$/.test(c))
        .slice(0, 5);
    }
    
    // Update both documents
    await Promise.all([
      db.doc(`profiles/${userId}`).update(publicUpdates),
      db.doc(`profiles/${userId}/private/data`).update(privateUpdates),
    ]);
    
    // Return updated public profile
    const updated = await loadPublicProfile(userId);
    res.json(updated);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});