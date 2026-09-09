import { VaultError } from "./errors";

const memory = new Map<string, unknown>();
let database: Promise<IDBDatabase | undefined> | undefined;
let memoryForTests = false;

export function useMemoryStoreForTesting(): () => void {
  const previous = memoryForTests;
  memoryForTests = true;
  memory.clear();
  return () => {
    memory.clear();
    memoryForTests = previous;
  };
}

function memoryKey(store: string, key: string): string {
  return `${store}:${key}`;
}

async function openDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") {
    if (memoryForTests) return undefined;
    throw new VaultError("io", "IndexedDB is required for local recovery and demo persistence.");
  }
  if (database) return database;
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open("md-web-editor", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ["drafts", "vaults", "demo"]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

export async function readStored(store: string, key: string): Promise<unknown | undefined> {
  const db = await openDatabase();
  if (!db) return memory.get(memoryKey(store, key));
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(recordValue(request.result));
    request.onerror = () => reject(request.error);
  });
}

export async function writeStored<T>(store: string, key: string, value: T): Promise<void> {
  const db = await openDatabase();
  if (!db) {
    memory.set(memoryKey(store, key), value);
    return;
  }
  await transaction(db, store, "readwrite", (records) => records.put({ key, value }));
}

export async function deleteStored(store: string, key: string): Promise<void> {
  const db = await openDatabase();
  if (!db) {
    memory.delete(memoryKey(store, key));
    return;
  }
  await transaction(db, store, "readwrite", (records) => records.delete(key));
}

export async function listStored(store: string, prefix: string): Promise<readonly unknown[]> {
  const db = await openDatabase();
  if (!db) {
    return [...memory.entries()]
      .filter(([key]) => key.startsWith(`${store}:${prefix}`))
      .map(([, value]) => value);
  }
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () =>
      resolve(
        request.result.flatMap((record) => {
          if (!hasKeyAndValue(record) || !record.key.startsWith(prefix)) return [];
          return [record.value];
        }),
      );
    request.onerror = () => reject(request.error);
  });
}

function recordValue(value: unknown): unknown | undefined {
  return hasKeyAndValue(value) ? value.value : undefined;
}

function hasKeyAndValue(
  value: unknown,
): value is { readonly key: string; readonly value: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    typeof value.key === "string" &&
    "value" in value
  );
}

function transaction(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  operation: (records: IDBObjectStore) => IDBRequest,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = operation(transaction.objectStore(store));
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? request.error);
    transaction.onerror = () => reject(transaction.error ?? request.error);
  });
}
