// functions/src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { ensurePlayerProfile } from "./services/profiles.js";

export interface AuthenticatedRequest extends Request {
  user: admin.auth.DecodedIdToken;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = getBearerToken(req);
  
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    
    // Ensure player profile exists
    await ensurePlayerProfile({
      uid: decoded.uid,
      displayName: decoded.name ?? decoded.email,
      email: decoded.email,
    });
    
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err) {
    console.error("Auth verification failed:", err);
    res.status(401).json({ error: "Invalid authentication token" });
  }
}