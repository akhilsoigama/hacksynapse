import { initDB, ASSIGNMENT_CACHE_STORE, ASSIGNMENT_SYNC_QUEUE_STORE } from "./DBConnect";
import { IAssignmentItem } from "../types/assignment";

const CACHE_KEY = "assignments_list";

export const getAssignmentDB = async (): Promise<IAssignmentItem[]> => {
  const db = await initDB();
  if (!db) return [];
  const data = await db.get(ASSIGNMENT_CACHE_STORE, CACHE_KEY);
  return data?.data || [];
};

export const setAssignmentDB = async (data: IAssignmentItem[]): Promise<void> => {
  const db = await initDB();
  if (!db) return;
  await db.put(ASSIGNMENT_CACHE_STORE, { key: CACHE_KEY, data });
};

export const clearAssignmentDB = async (): Promise<void> => {
  const db = await initDB();
  if (!db) return;
  await db.delete(ASSIGNMENT_CACHE_STORE, CACHE_KEY);
};

export const getAssignmentByIdDB = async (id: number): Promise<IAssignmentItem | null> => {
  const db = await initDB();
  if (!db) return null;
  const data = await db.get(ASSIGNMENT_CACHE_STORE, CACHE_KEY);
  const assignments = data?.data || [];
  return assignments.find((item: IAssignmentItem) => item.id === id) || null;
};

export const addToSyncQueue = async (payload: any): Promise<void> => {
  const db = await initDB();
  if (!db) return;
  await db.put(ASSIGNMENT_SYNC_QUEUE_STORE, payload);
};
