/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'velox-local-db';
const DB_VERSION = 1;
const STORE_NAME = 'records';

export interface LocalDatabaseRecord<T> {
  key: string;
  value: T;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDbAvailable() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB could not be opened.'));
  });

  return dbPromise;
}

function runStoreOperation<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB operation failed.'));
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  }));
}

export const LocalDatabase = {
  isAvailable: isIndexedDbAvailable,

  async get<T>(key: string): Promise<LocalDatabaseRecord<T> | null> {
    const record = await runStoreOperation<LocalDatabaseRecord<T> | undefined>('readonly', store => store.get(key));
    return record || null;
  },

  async set<T>(key: string, value: T, updatedAt = Date.now()): Promise<void> {
    await runStoreOperation<IDBValidKey>('readwrite', store => store.put({ key, value, updatedAt }));
  },

  async remove(key: string): Promise<void> {
    await runStoreOperation<undefined>('readwrite', store => store.delete(key));
  }
};
