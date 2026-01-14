import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { FileEntry, VaultMetadata } from "../types";

interface MyVaultDB extends DBSchema {
  files: {
    key: string;
    value: { id: string; blob: Blob | ArrayBuffer }; // Store content separately
  };
  metadata: {
    key: string;
    value: FileEntry;
  };
  vault: {
    key: string;
    value: VaultMetadata;
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = "myvault-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MyVaultDB>>;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MyVaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("vault")) {
          db.createObjectStore("vault");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
      },
    });
  }
  return dbPromise;
};

export const Storage = {
  async saveFile(entry: FileEntry, content: Blob | ArrayBuffer) {
    const db = await getDB();
    const tx = db.transaction(["files", "metadata"], "readwrite");
    await Promise.all([
      tx.objectStore("files").put({ id: entry.id, blob: content }),
      tx.objectStore("metadata").put(entry),
      tx.done,
    ]);
  },

  async getFile(id: string) {
    const db = await getDB();
    return db.get("files", id);
  },

  async getMetadata(id: string) {
    const db = await getDB();
    return db.get("metadata", id);
  },

  async getAllMetadata() {
    const db = await getDB();
    return db.getAll("metadata");
  },

  async deleteFile(id: string) {
    const db = await getDB();
    const tx = db.transaction(["files", "metadata"], "readwrite");
    await Promise.all([
      tx.objectStore("files").delete(id),
      tx.objectStore("metadata").delete(id),
      tx.done,
    ]);
  },

  async saveVaultMetadata(metadata: VaultMetadata) {
    const db = await getDB();
    await db.put("vault", metadata, "meta");
  },

  async getVaultMetadata() {
    const db = await getDB();
    return db.get("vault", "meta");
  },
};
