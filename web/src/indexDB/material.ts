// src/indexDB/material.ts
import { initDB } from "./DBConnect";
import {
  MATERIAL_STORE,
  MATERIAL_SYNC_QUEUE_STORE,
  MATERIAL_CACHE_STORE,
} from "./db";
import type { IMaterial, IMaterialSyncQueueItem } from "../types/material";
import type { User } from "../types/user";

// ============================================================================
// Authorization & Tenant Isolation Helpers
// ============================================================================

export const verifyMaterialTenantAndScope = (
  material: IMaterial | null | undefined,
  currentUser: User | null | undefined,
  action: "view" | "update" | "delete" = "view"
): boolean => {
  if (!material || !currentUser) {
    return false;
  }

  const role = String(
    currentUser.userType ?? currentUser.authType ?? currentUser.roleName ?? ""
  ).toLowerCase();

  // 1. Super Admin: full access
  if (
    role === "super_admin" ||
    role === "admin" ||
    currentUser.userType === "super_admin" ||
    currentUser.authType === "super_admin"
  ) {
    return true;
  }

  const rawUser = currentUser as Record<string, unknown>;
  const userInstituteId =
    currentUser.instituteId ??
    rawUser.institute_id ??
    currentUser.data?.instituteId ??
    (currentUser.data as Record<string, unknown> | undefined)?.institute_id;
  const materialInstituteId = material.instituteId ?? material.institute_id;

  // 2. Institute Boundary Check
  if (
    userInstituteId === undefined ||
    userInstituteId === null ||
    materialInstituteId === undefined ||
    materialInstituteId === null
  ) {
    return false;
  }

  if (Number(userInstituteId) !== Number(materialInstituteId)) {
    return false;
  }

  // 3. Student Scope Check
  if (role === "student" || currentUser.userType === "student") {
    // Students cannot update or delete study materials
    if (action === "update" || action === "delete") {
      return false;
    }

    const userDepartmentId =
      currentUser.departmentId ??
      rawUser.department_id ??
      currentUser.data?.departmentId ??
      (currentUser.data as Record<string, unknown> | undefined)?.department_id;
    const materialDepartmentId =
      material.departmentId ?? material.department_id;

    if (
      userDepartmentId === undefined ||
      userDepartmentId === null ||
      materialDepartmentId === undefined ||
      materialDepartmentId === null
    ) {
      return false;
    }

    if (Number(userDepartmentId) !== Number(materialDepartmentId)) {
      return false;
    }

    return true;
  }

  // 4. Institute Admin Check
  if (role === "institute" || currentUser.userType === "institute") {
    return true;
  }

  // 5. Ownership & Faculty Scope Check
  if (action === "update" || action === "delete") {
    const currentUserId = currentUser.id ?? currentUser.data?.id;
    const materialCreatedBy = material.createdBy ?? material.created_by;

    if (
      materialCreatedBy !== undefined &&
      materialCreatedBy !== null &&
      currentUserId !== undefined &&
      currentUserId !== null
    ) {
      if (Number(materialCreatedBy) !== Number(currentUserId)) {
        return false;
      }
    } else if (role === "faculty" || currentUser.userType === "faculty") {
      const userFacultyId =
        currentUser.facultyId ??
        rawUser.faculty_id ??
        currentUser.data?.facultyId ??
        (currentUser.data as Record<string, unknown> | undefined)?.faculty_id;
      const materialFacultyId = material.facultyId ?? material.faculty_id;

      if (
        userFacultyId !== undefined &&
        materialFacultyId !== undefined &&
        Number(userFacultyId) !== Number(materialFacultyId)
      ) {
        return false;
      }
    }
  }

  return true;
};

// ============================================================================
// Material IndexedDB Storage Functions
// ============================================================================

export const extractMaterialsFromEntry = (entryData: unknown): IMaterial[] => {
  if (!entryData) return [];
  if (Array.isArray(entryData)) return entryData as IMaterial[];
  if (typeof entryData === "object" && entryData !== null) {
    const candidate = entryData as { data?: unknown; status?: boolean };
    if (Array.isArray(candidate.data)) {
      return candidate.data as IMaterial[];
    }
    if (
      candidate.data &&
      typeof candidate.data === "object" &&
      ("id" in (candidate.data as object) || "uuid" in (candidate.data as object))
    ) {
      return [candidate.data as IMaterial];
    }
    if (
      "id" in entryData ||
      "title" in entryData ||
      "uuid" in entryData ||
      "contentType" in entryData
    ) {
      return [entryData as IMaterial];
    }
  }
  return [];
};

/**
 * Fetch all cached materials, strictly applying tenant and student department isolation
 */
export const getMaterialDB = async (
  currentUser?: User | null
): Promise<IMaterial[]> => {
  const db = await initDB();
  if (!db) return [];

  const materialMap = new Map<string | number, IMaterial>();

  // 1. Read from dedicated MATERIAL_STORE if populated
  try {
    if (db.objectStoreNames.contains(MATERIAL_STORE)) {
      const items = await db.getAll(MATERIAL_STORE);
      for (const item of items) {
        const key = item.id ?? item.uuid;
        if (key) {
          materialMap.set(key, item);
        }
      }
    }
  } catch {
    // Ignore store read error
  }

  // 2. Read from MATERIAL_CACHE_STORE (module cache)
  try {
    if (db.objectStoreNames.contains(MATERIAL_CACHE_STORE)) {
      const cacheEntries = await db.getAll(MATERIAL_CACHE_STORE);
      for (const entry of cacheEntries) {
        const items = extractMaterialsFromEntry(entry.data);
        for (const item of items) {
          const key = item.id ?? item.uuid;
          if (key && !materialMap.has(key)) {
            materialMap.set(key, item);
          }
        }
      }
    }
  } catch {
    // Ignore cache read error
  }

  const allMaterials = Array.from(materialMap.values());

  if (!currentUser) {
    return allMaterials;
  }

  // Apply tenant, student department, and ownership filtering
  return allMaterials.filter((item) =>
    verifyMaterialTenantAndScope(item, currentUser, "view")
  );
};

/**
 * Store materials in IndexedDB cache (both direct store and module cache)
 */
export const setMaterialDB = async (
  data: IMaterial | IMaterial[]
): Promise<void> => {
  const db = await initDB();
  if (!db) return;

  const items = Array.isArray(data) ? data : [data];

  // 1. Save into MATERIAL_STORE
  if (db.objectStoreNames.contains(MATERIAL_STORE)) {
    const tx = db.transaction(MATERIAL_STORE, "readwrite");
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  }

  // 2. Also keep MATERIAL_CACHE_STORE in sync for HTTP fetchers
  if (db.objectStoreNames.contains(MATERIAL_CACHE_STORE)) {
    const key = "/materials::null";
    await db.put(MATERIAL_CACHE_STORE, {
      key,
      data: items,
      updatedAt: Date.now(),
    });

    for (const item of items) {
      if (item.id) {
        await db.put(MATERIAL_CACHE_STORE, {
          key: `/materials/${item.id}::null`,
          data: item,
          updatedAt: Date.now(),
        });
        await db.put(MATERIAL_CACHE_STORE, {
          key: `/lectures/${item.id}::null`,
          data: item,
          updatedAt: Date.now(),
        });
      }
    }
  }
};

/**
 * Clear all cached materials (e.g. on logout or tenant switch)
 */
export const clearMaterialDB = async (): Promise<void> => {
  const db = await initDB();
  if (!db) return;

  if (db.objectStoreNames.contains(MATERIAL_STORE)) {
    await db.clear(MATERIAL_STORE);
  }
  if (db.objectStoreNames.contains(MATERIAL_CACHE_STORE)) {
    await db.clear(MATERIAL_CACHE_STORE);
  }
};

/**
 * Get cached material by ID with mandatory tenant/role verification
 */
export const getMaterialByIdDB = async (
  id: number | string,
  currentUser?: User | null
): Promise<IMaterial | null> => {
  const db = await initDB();
  if (!db) return null;

  let material: IMaterial | null = null;

  // 1. Try reading directly from MATERIAL_STORE
  if (db.objectStoreNames.contains(MATERIAL_STORE)) {
    try {
      if (typeof id === "number" || !isNaN(Number(id))) {
        material = (await db.get(MATERIAL_STORE, Number(id))) ?? null;
      }
      if (!material && typeof id === "string") {
        const all = await db.getAll(MATERIAL_STORE);
        material = all.find((m) => m.uuid === id || String(m.id) === id) ?? null;
      }
    } catch {}
  }

  // 2. Fallback: Search MATERIAL_CACHE_STORE
  if (!material && db.objectStoreNames.contains(MATERIAL_CACHE_STORE)) {
    try {
      const directKey = `/materials/${id}::null`;
      const cached = await db.get(MATERIAL_CACHE_STORE, directKey);
      if (cached?.data) {
        const extracted = extractMaterialsFromEntry(cached.data);
        material = extracted[0] ?? null;
      }

      if (!material) {
        const allEntries = await db.getAll(MATERIAL_CACHE_STORE);
        for (const entry of allEntries) {
          const items = extractMaterialsFromEntry(entry.data);
          const found = items.find(
            (item) =>
              Number(item.id) === Number(id) ||
              item.uuid === String(id)
          );
          if (found) {
            material = found;
            break;
          }
        }
      }
    } catch {}
  }

  if (!material) {
    return null;
  }

  // Mandatory Tenant and Scope Validation
  if (currentUser) {
    if (!verifyMaterialTenantAndScope(material, currentUser, "view")) {
      return null;
    }
  }

  return material;
};

// ============================================================================
// Sync Queue Functions
// ============================================================================

export const addToMaterialSyncQueue = async (
  item: Omit<IMaterialSyncQueueItem, "id" | "createdAt">
): Promise<number | undefined> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(MATERIAL_SYNC_QUEUE_STORE)) return undefined;

  const queueRecord: IMaterialSyncQueueItem = {
    ...item,
    createdAt: Date.now(),
    retryCount: item.retryCount ?? 0,
    status: item.status || "pending",
  };

  const id = await db.add(MATERIAL_SYNC_QUEUE_STORE, queueRecord);
  return Number(id);
};

export const getPendingMaterialSyncQueue = async (
  currentUser?: User | null
): Promise<IMaterialSyncQueueItem[]> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(MATERIAL_SYNC_QUEUE_STORE)) return [];

  const allQueueItems: IMaterialSyncQueueItem[] =
    await db.getAll(MATERIAL_SYNC_QUEUE_STORE);

  const pendingItems = allQueueItems.filter(
    (item) => item.status === "pending" || item.status === "failed"
  );

  if (!currentUser) return pendingItems;

  const rawUser = currentUser as Record<string, unknown>;
  const userInstituteId =
    currentUser.instituteId ??
    rawUser.institute_id ??
    currentUser.data?.instituteId;
  const currentUserId = currentUser.id ?? currentUser.data?.id;

  // Enforce tenant/ownership boundaries on queue items
  return pendingItems.filter((item) => {
    if (
      userInstituteId !== undefined &&
      userInstituteId !== null &&
      Number(item.instituteId) !== Number(userInstituteId)
    ) {
      return false;
    }

    if (
      currentUserId !== undefined &&
      currentUserId !== null &&
      Number(item.createdBy) !== Number(currentUserId)
    ) {
      return false;
    }

    const role = String(
      currentUser.userType ?? currentUser.authType ?? currentUser.roleName ?? ""
    ).toLowerCase();

    if (role === "student") {
      const userDeptId =
        currentUser.departmentId ??
        rawUser.department_id ??
        currentUser.data?.departmentId;
      if (
        userDeptId !== undefined &&
        item.departmentId !== undefined &&
        Number(userDeptId) !== Number(item.departmentId)
      ) {
        return false;
      }
    }

    return true;
  });
};

export const updateMaterialSyncQueueItem = async (
  id: number,
  updates: Partial<IMaterialSyncQueueItem>
): Promise<void> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(MATERIAL_SYNC_QUEUE_STORE)) return;

  const item: IMaterialSyncQueueItem | undefined =
    await db.get(MATERIAL_SYNC_QUEUE_STORE, id);
  if (!item) return;

  const updatedItem: IMaterialSyncQueueItem = {
    ...item,
    ...updates,
  };

  await db.put(MATERIAL_SYNC_QUEUE_STORE, updatedItem);
};

export const removeMaterialSyncQueueItem = async (
  id: number
): Promise<void> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(MATERIAL_SYNC_QUEUE_STORE)) return;

  await db.delete(MATERIAL_SYNC_QUEUE_STORE, id);
};

export const clearMaterialSyncQueue = async (): Promise<void> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(MATERIAL_SYNC_QUEUE_STORE)) return;

  await db.clear(MATERIAL_SYNC_QUEUE_STORE);
};
