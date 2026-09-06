// src/indexDB/db.ts
// IndexedDB schema definition and store mapping for Material & StudentQuery Sync Queue
import {
  initDB,
  recreateDB,
  MATERIAL_STORE,
  MATERIAL_SYNC_QUEUE_STORE,
  MATERIAL_CACHE_STORE,
  STUDENT_QUERY_STORE,
  STUDENT_QUERY_SYNC_QUEUE_STORE,
  STUDENT_QUERY_CACHE_STORE,
} from "./DBConnect";
import type { IMaterial, IMaterialSyncQueueItem } from "../types/material";
import type { StudentQueryItem, StudentQuerySyncQueueItem } from "../types/studentQuery";

export {
  initDB,
  recreateDB,
  MATERIAL_STORE,
  MATERIAL_SYNC_QUEUE_STORE,
  MATERIAL_CACHE_STORE,
  STUDENT_QUERY_STORE,
  STUDENT_QUERY_SYNC_QUEUE_STORE,
  STUDENT_QUERY_CACHE_STORE,
};

/**
 * Database Schema definition:
 * material: '++id, uuid, instituteId, departmentId, createdBy'
 * material_sync_queue: '++id, uuid, action, status, instituteId, departmentId, createdBy'
 * studentQuery: '++id, uuid, instituteId, departmentId, createdBy'
 * studentQuery_sync_queue: '++id, uuid, action, status, instituteId, departmentId, createdBy'
 */
export const DB_SCHEMA = {
  material: '++id, uuid, instituteId, departmentId, createdBy',
  material_sync_queue: '++id, uuid, action, status, instituteId, departmentId, createdBy',
  studentQuery: '++id, uuid, instituteId, departmentId, createdBy',
  studentQuery_sync_queue: '++id, uuid, action, status, instituteId, departmentId, createdBy',
} as const;

export type DBStores = {
  material: IMaterial;
  material_sync_queue: IMaterialSyncQueueItem;
  studentQuery: StudentQueryItem;
  studentQuery_sync_queue: StudentQuerySyncQueueItem;
};
