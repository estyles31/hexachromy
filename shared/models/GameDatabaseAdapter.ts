
export interface Transaction {
  get<T = any>(path: string): Promise<T | null>;
  set(path: string, data: any): void;
}

export interface GameDatabaseAdapter {
  /** Reads a Firestore document by path and returns the typed data or null. */
  getDocument<T = unknown>(path: string): Promise<T | null>;
  /** Creates or overwrites a Firestore document with the provided data. */
  setDocument<T = unknown>(path: string, data: T): Promise<void>;
  /** Merges the provided fields into an existing Firestore document. */
  updateDocument(path: string, data: Record<string, unknown>): Promise<void>;
  
  /** Deletes a Firestore document. */
  deleteDocument(path: string): Promise<void>;

  runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T>;
}