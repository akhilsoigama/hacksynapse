import { initDB, GOVT_EVENT_CACHE_STORE, GOVT_EVENT_SYNC_QUEUE_STORE } from "./DBConnect";

// --- Cache Helpers ---

export const setGovtEventDB = async (data: any[]) => {
  const db = await initDB();
  if (db) {
    const tx = db.transaction(GOVT_EVENT_CACHE_STORE, "readwrite");
    await tx.store.put({ key: "all_govt_events", data });
    await tx.done;
  }
};

export const getGovtEventDB = async () => {
  const db = await initDB();
  if (db) {
    const result = await db.get(GOVT_EVENT_CACHE_STORE, "all_govt_events");
    return result ? result.data : [];
  }
  return [];
};

export const clearGovtEventDB = async () => {
  const db = await initDB();
  if (db) {
    await db.clear(GOVT_EVENT_CACHE_STORE);
  }
};

export const getGovtEventByIdDB = async (id: number) => {
  const data = await getGovtEventDB();
  return data.find((event: any) => event.id === id) || null;
};

export const mutateGovtEventCache = async (action: 'CREATE' | 'UPDATE' | 'DELETE', govtEvent: any) => {
  const db = await initDB();
  if (!db) return;

  const tx = db.transaction(GOVT_EVENT_CACHE_STORE, 'readwrite');
  const store = tx.objectStore(GOVT_EVENT_CACHE_STORE);
  const allKeys = await store.getAllKeys();

  for (const key of allKeys) {
    const record = await store.get(key);
    if (!record) continue;

    let isModified = false;
    let newRecord = { ...record };

    if (record.data && Array.isArray(record.data.data)) {
        let arr = [...record.data.data];
        if (action === 'CREATE' && !arr.some((e: any) => e.id === govtEvent.id)) {
            arr.unshift(govtEvent);
            isModified = true;
        } else if (action === 'UPDATE') {
            arr = arr.map((e: any) => (e.id === govtEvent.id ? { ...e, ...govtEvent } : e));
            isModified = true;
        } else if (action === 'DELETE') {
            arr = arr.filter((e: any) => e.id !== govtEvent.id);
            isModified = true;
        }
        if (isModified) {
            newRecord.data = { ...record.data, data: arr };
            newRecord.updatedAt = Date.now();
        }
    } else if (Array.isArray(record.data)) {
        let arr = [...record.data];
        if (action === 'CREATE' && !arr.some((e: any) => e.id === govtEvent.id)) {
            arr.unshift(govtEvent);
            isModified = true;
        } else if (action === 'UPDATE') {
            arr = arr.map((e: any) => (e.id === govtEvent.id ? { ...e, ...govtEvent } : e));
            isModified = true;
        } else if (action === 'DELETE') {
            arr = arr.filter((e: any) => e.id !== govtEvent.id);
            isModified = true;
        }
        if (isModified) {
            newRecord.data = arr;
            newRecord.updatedAt = Date.now();
        }
    }

    if (isModified) {
        await store.put(newRecord);
    }
  }
  await tx.done;
};

// --- Sync Queue Helpers ---

export const addToGovtEventSyncQueue = async (task: any) => {
  const db = await initDB();
  if (db) {
    const tx = db.transaction(GOVT_EVENT_SYNC_QUEUE_STORE, "readwrite");
    await tx.store.put(task);
    await tx.done;
  }
};

export const getGovtEventSyncQueue = async () => {
  const db = await initDB();
  if (db) {
    return await db.getAll(GOVT_EVENT_SYNC_QUEUE_STORE);
  }
  return [];
};

export const removeFromGovtEventSyncQueue = async (uuid: string) => {
  const db = await initDB();
  if (db) {
    const tx = db.transaction(GOVT_EVENT_SYNC_QUEUE_STORE, "readwrite");
    await tx.store.delete(uuid);
    await tx.done;
  }
};

export const clearGovtEventSyncQueue = async () => {
  const db = await initDB();
  if (db) {
    await db.clear(GOVT_EVENT_SYNC_QUEUE_STORE);
  }
};
