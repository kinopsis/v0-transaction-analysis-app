import { openDB, type IDBPDatabase } from "idb";
import type { AppState } from "./types";

const DB_NAME = "datafonos-app-db";
const DB_VERSION = 1;
const STORE_NAME = "app-state";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveStateToIndexedDB(state: AppState): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, state, "current");
  } catch (error) {
    console.error("Error saving state to IndexedDB:", error);
    throw error;
  }
}

export async function loadStateFromIndexedDB(): Promise<AppState | null> {
  try {
    const db = await getDB();
    const state = await db.get(STORE_NAME, "current");
    return state || null;
  } catch (error) {
    console.error("Error loading state from IndexedDB:", error);
    return null;
  }
}

export async function clearIndexedDBState(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, "current");
  } catch (error) {
    console.error("Error clearing IndexedDB state:", error);
    throw error;
  }
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}
