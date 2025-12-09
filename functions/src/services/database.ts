// functions/src/services/database.ts
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import type { GameDatabaseAdapter } from "../../../modules/types.js";

// Initialize Firebase Admin
const app = admin.apps.length ? admin.app() : admin.initializeApp();
export const db = getFirestore(app);

// Database adapter for game modules
export const dbAdapter: GameDatabaseAdapter = {
  async getDocument<T = unknown>(path: string): Promise<T | null> {
    const snap = await db.doc(path).get();
    return snap.exists ? (snap.data() as T) : null;
  },
  
  async setDocument<T = unknown>(path: string, data: T): Promise<void> {
    await db.doc(path).set(data as Record<string, unknown>);
  },
  
  async updateDocument(path: string, data: Record<string, unknown>): Promise<void> {
    await db.doc(path).set(data, { merge: true });
  },
  
  async deleteDocument(path: string): Promise<void> {
    await db.doc(path).delete();
  },
};