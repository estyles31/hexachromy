// functions/src/services/database.ts
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import type { GameDatabaseAdapter, Transaction } from "../../../shared/models/GameDatabaseAdapter";

// Initialize Firebase Admin
const app = admin.apps.length ? admin.app() : admin.initializeApp();
export const db = getFirestore(app);

// Enable ignoreUndefinedProperties to allow undefined values
db.settings({ ignoreUndefinedProperties: true });

// Transaction wrapper for Firestore
class FirestoreTransaction implements Transaction {
  constructor(private firestoreTransaction: FirebaseFirestore.Transaction) { }

  async get<T = any>(path: string): Promise<T | null> {
    const docRef = db.doc(path);
    const snapshot = await this.firestoreTransaction.get(docRef);
    return snapshot.exists ? (snapshot.data() as T) : null;
  }

  set(path: string, data: any): void {
    const docRef = db.doc(path);
    this.firestoreTransaction.set(docRef, data);
  }
}

// Database adapter for game modules
export const dbAdapter: GameDatabaseAdapter = {
  async getDocument<T = unknown>(path: string): Promise<T | null> {
    try {
      const snap = await db.doc(path).get();
      return snap.exists ? (snap.data() as T) : null;
    } catch (error) {
      console.error(`Error fetching document ${path} - `, error);
      throw error;
    }
  },

  async setDocument<T = unknown>(path: string, data: T, merge?: boolean): Promise<void> {
    try {
      await db.doc(path).set(data as Record<string, unknown>, { merge });
    } catch (error) {
      console.error(`Error setting document ${path}`, safePreview(data), error);
      throw error;
    }
  },

  async updateDocument(path: string, data: Record<string, unknown>): Promise<void> {
    try {
      await db.doc(path).update(data);
    } catch (error) {
      console.error(`Error updating document ${path}`, safePreview(data), error);
      throw error;
    }
  },

  async deleteDocument(path: string): Promise<void> {
    try {
      await db.doc(path).delete();
    } catch (error) {
      console.error(`Error deleting document ${path}`, error);
      throw error;
    }
  },

  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    return db.runTransaction(async (firestoreTransaction) => {
      const wrappedTransaction = new FirestoreTransaction(firestoreTransaction);
      return await updateFunction(wrappedTransaction);
    });
  },
};

function safePreview(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[Unserializable object]";
  }
}