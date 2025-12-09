// functions/src/routes/profiles.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../services/database.js";
import type { PlayerPublicProfile } from "../../../shared/models/PlayerProfile.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const profilesRouter = Router();

// GET /profiles/me - Get current user's profile
profilesRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.uid;
    
    const publicDoc = await db.doc(`profiles/${userId}`).get();
    
    if (!publicDoc.exists) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    
    res.json(publicDoc.data() as PlayerPublicProfile);
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// GET /profiles/:uid - Get another user's public profile
profilesRouter.get("/:uid", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    
    const publicDoc = await db.doc(`profiles/${uid}`).get();
    
    if (!publicDoc.exists) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    
    res.json(publicDoc.data() as PlayerPublicProfile);
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// PUT /profiles/me - Update current user's profile
profilesRouter.put("/me", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.uid;
    const { displayName, photoURL } = req.body;
    
    const updates: Partial<PlayerPublicProfile> = {
      updatedAt: Date.now(),
    };
    
    if (typeof displayName === "string" && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    
    if (typeof photoURL === "string") {
      updates.photoURL = photoURL;
    }
    
    await db.doc(`profiles/${userId}`).update(updates);
    
    const updated = await db.doc(`profiles/${userId}`).get();
    res.json(updated.data() as PlayerPublicProfile);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});