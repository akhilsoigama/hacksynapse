// src/indexDB/db.ts
// IndexedDB schema definition and store mapping for Material & Sync Queue
import {
  initDB,
  recreateDB,
  MATERIAL_STORE,
  MATERIAL_SYNC_QUEUE_STORE,
  MATERIAL_CACHE_STORE,
} from "./DBConnect";
import type { IMaterial, IMaterialSyncQueueItem } from "../types/material";

export {
  initDB,
  recreateDB,
  MATERIAL_STORE,
  MATERIAL_SYNC_QUEUE_STORE,
  MATERIAL_CACHE_STORE,
};

/**
 * Material Schema definition:
 * material: '++id, uuid, instituteId, departmentId, createdBy'
 * material_sync_queue: '++id, uuid, action, status, instituteId, departmentId, createdBy'
 */
export const DB_SCHEMA = {
  material: '++id, uuid, instituteId, departmentId, createdBy',
  material_sync_queue: '++id, uuid, action, status, instituteId, departmentId, createdBy',
} as const;

export type DBStores = {
  material: IMaterial;
  material_sync_queue: IMaterialSyncQueueItem;
};
