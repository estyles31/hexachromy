// functions/src/services/database.ts
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import type { GameDatabaseAdapter, Transaction } from "../../../shared/models/GameDatabaseAdapter";

// Initialize Firebase Admin
const app = admin.apps.length ? admin.app() : admin.initializeApp();
export const db = getFirestore(app);

// Transaction wrapper for Firestore
class FirestoreTransaction implements Transaction {
  constructor(private firestoreTransaction: FirebaseFirestore.Transaction) {}

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

  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    return db.runTransaction(async (firestoreTransaction) => {
      const wrappedTransaction = new FirestoreTransaction(firestoreTransaction);
      return await updateFunction(wrappedTransaction);
    });
  },
};