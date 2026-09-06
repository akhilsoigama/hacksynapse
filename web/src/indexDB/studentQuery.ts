// src/indexDB/studentQuery.ts
import { initDB } from "./DBConnect";
import {
  STUDENT_QUERY_STORE,
  STUDENT_QUERY_SYNC_QUEUE_STORE,
  STUDENT_QUERY_CACHE_STORE,
} from "./db";
import type { StudentQueryItem, StudentQuerySyncQueueItem } from "../types/studentQuery";
import type { User } from "../types/user";

// ============================================================================
// Authorization & Tenant Isolation Helpers
// ============================================================================

export const verifyStudentQueryTenantAndScope = (
  query: StudentQueryItem | null | undefined,
  currentUser: User | null | undefined,
  action: "view" | "update" | "delete" = "view"
): boolean => {
  if (!query || !currentUser) {
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
  const rawQuery = query as unknown as Record<string, unknown>;
  const queryInstituteId = query.instituteId ?? rawQuery.institute_id;

  // 2. Institute Boundary Check
  if (
    userInstituteId === undefined ||
    userInstituteId === null ||
    queryInstituteId === undefined ||
    queryInstituteId === null
  ) {
    return false;
  }

  if (Number(userInstituteId) !== Number(queryInstituteId)) {
    return false;
  }

  const currentUserId = currentUser.id ?? currentUser.data?.id;
  const rawStudentId =
    currentUser.studentId ??
    rawUser.student_id ??
    (currentUser as unknown as Record<string, unknown>).student_id ??
    currentUser.data?.studentId ??
    (currentUser.data as Record<string, unknown> | undefined)?.student_id;
  const queryCreatedBy = query.createdBy ?? rawQuery.created_by;
  const queryStudentId = query.studentId ?? rawQuery.student_id;

  // 3. Student Scope Check
  if (role === "student" || currentUser.userType === "student") {
    // Check if query is owned by this student
    const isOwner =
      (currentUserId !== undefined &&
        queryCreatedBy !== undefined &&
        Number(currentUserId) === Number(queryCreatedBy)) ||
      (rawStudentId !== undefined &&
        queryStudentId !== undefined &&
        Number(rawStudentId) === Number(queryStudentId));

    if (action === "update" || action === "delete") {
      // Students can only update or delete their own open/pending queries
      if (!isOwner) return false;
      const isClosedOrResolved =
        query.status === "resolved" || query.status === "closed";
      if (isClosedOrResolved) return false;
      return true;
    }

    // View action: Student can view their own queries OR queries in their department
    if (isOwner) {
      return true;
    }

    const userDepartmentId =
      currentUser.departmentId ??
      rawUser.department_id ??
      currentUser.data?.departmentId ??
      (currentUser.data as Record<string, unknown> | undefined)?.department_id;
    const queryDepartmentId = query.departmentId ?? rawQuery.department_id;

    if (
      userDepartmentId !== undefined &&
      userDepartmentId !== null &&
      queryDepartmentId !== undefined &&
      queryDepartmentId !== null
    ) {
      return Number(userDepartmentId) === Number(queryDepartmentId);
    }

    return false;
  }

  // 4. Institute Admin Check
  if (role === "institute" || currentUser.userType === "institute") {
    return true;
  }

  // 5. Faculty Scope Check
  if (role === "faculty" || currentUser.userType === "faculty") {
    const facultyId =
      currentUser.facultyId ??
      rawUser.faculty_id ??
      currentUser.data?.facultyId ??
      (currentUser.data as Record<string, unknown> | undefined)?.faculty_id;
    const assignedFacultyId = query.assignedFacultyId ?? rawQuery.assigned_faculty_id;

    if (action === "delete") {
      // Only creator or admin can delete
      if (
        queryCreatedBy !== undefined &&
        currentUserId !== undefined &&
        Number(queryCreatedBy) === Number(currentUserId)
      ) {
        return true;
      }
      return false;
    }

    if (action === "update") {
      // Faculty can resolve/answer queries assigned to them or within institute
      if (
        facultyId !== undefined &&
        assignedFacultyId !== undefined &&
        Number(facultyId) === Number(assignedFacultyId)
      ) {
        return true;
      }
      return true;
    }

    return true;
  }

  // Creator check fallback
  if (action === "update" || action === "delete") {
    if (
      queryCreatedBy !== undefined &&
      currentUserId !== undefined &&
      Number(queryCreatedBy) !== Number(currentUserId)
    ) {
      return false;
    }
  }

  return true;
};

// ============================================================================
// StudentQuery Storage & Caching
// ============================================================================

export const extractStudentQueriesFromEntry = (entryData: unknown): StudentQueryItem[] => {
  if (!entryData) return [];
  if (Array.isArray(entryData)) return entryData as StudentQueryItem[];
  if (typeof entryData === "object" && entryData !== null) {
    const candidate = entryData as { data?: unknown; status?: boolean };
    if (Array.isArray(candidate.data)) {
      return candidate.data as StudentQueryItem[];
    }
    if (
      candidate.data &&
      typeof candidate.data === "object" &&
      ("id" in (candidate.data as object) || "uuid" in (candidate.data as object))
    ) {
      return [candidate.data as StudentQueryItem];
    }
    if (
      "id" in entryData ||
      "title" in entryData ||
      "uuid" in entryData
    ) {
      return [entryData as StudentQueryItem];
    }
  }
  return [];
};

/**
 * Fetch all cached student queries, strictly applying tenant and scope isolation
 */
export const getStudentQueryDB = async (
  currentUser?: User | null
): Promise<StudentQueryItem[]> => {
  const db = await initDB();
  if (!db) return [];

  const queryMap = new Map<string | number, StudentQueryItem>();

  // 1. Read from dedicated STUDENT_QUERY_STORE if populated
  try {
    if (db.objectStoreNames.contains(STUDENT_QUERY_STORE)) {
      const items = await db.getAll(STUDENT_QUERY_STORE);
      for (const item of items) {
        const key = item.id ?? item.uuid;
        if (key) {
          queryMap.set(key, item);
        }
      }
    }
  } catch {
    // Ignore store read error
  }

  // 2. Read from STUDENT_QUERY_CACHE_STORE (module cache)
  try {
    if (db.objectStoreNames.contains(STUDENT_QUERY_CACHE_STORE)) {
      const cacheEntries = await db.getAll(STUDENT_QUERY_CACHE_STORE);
      for (const entry of cacheEntries) {
        const items = extractStudentQueriesFromEntry(entry.data);
        for (const item of items) {
          const key = item.id ?? item.uuid;
          if (key && !queryMap.has(key)) {
            queryMap.set(key, item);
          }
        }
      }
    }
  } catch {
    // Ignore cache read error
  }

  const allQueries = Array.from(queryMap.values());

  if (!currentUser) {
    return allQueries;
  }

  // Apply strict tenant, student department, and ownership filtering
  return allQueries.filter((item) =>
    verifyStudentQueryTenantAndScope(item, currentUser, "view")
  );
};

/**
 * Store student queries in IndexedDB cache (both direct store and module cache)
 */
export const setStudentQueryDB = async (
  data: StudentQueryItem | StudentQueryItem[]
): Promise<void> => {
  const db = await initDB();
  if (!db) return;

  const items = Array.isArray(data) ? data : [data];

  // 1. Save into STUDENT_QUERY_STORE
  if (db.objectStoreNames.contains(STUDENT_QUERY_STORE)) {
    const tx = db.transaction(STUDENT_QUERY_STORE, "readwrite");
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  }

  // 2. Also keep STUDENT_QUERY_CACHE_STORE in sync for HTTP fetchers
  if (db.objectStoreNames.contains(STUDENT_QUERY_CACHE_STORE)) {
    const key = "/student-queries::null";
    await db.put(STUDENT_QUERY_CACHE_STORE, {
      key,
      data: items,
      updatedAt: Date.now(),
    });

    const apiKey = "/api/studentQuery::null";
    await db.put(STUDENT_QUERY_CACHE_STORE, {
      key: apiKey,
      data: items,
      updatedAt: Date.now(),
    });

    for (const item of items) {
      if (item.id) {
        await db.put(STUDENT_QUERY_CACHE_STORE, {
          key: `/student-queries/${item.id}::null`,
          data: item,
          updatedAt: Date.now(),
        });
        await db.put(STUDENT_QUERY_CACHE_STORE, {
          key: `/api/studentQuery/${item.id}::null`,
          data: item,
          updatedAt: Date.now(),
        });
      }
    }
  }
};

/**
 * Clear all cached student queries (e.g. on logout or tenant switch)
 */
export const clearStudentQueryDB = async (): Promise<void> => {
  const db = await initDB();
  if (!db) return;

  if (db.objectStoreNames.contains(STUDENT_QUERY_STORE)) {
    await db.clear(STUDENT_QUERY_STORE);
  }
  if (db.objectStoreNames.contains(STUDENT_QUERY_CACHE_STORE)) {
    await db.clear(STUDENT_QUERY_CACHE_STORE);
  }
};

/**
 * Get cached student query by ID with mandatory tenant/role verification
 */
export const getStudentQueryByIdDB = async (
  id: number | string,
  currentUser?: User | null
): Promise<StudentQueryItem | null> => {
  const db = await initDB();
  if (!db) return null;

  let query: StudentQueryItem | null = null;

  // 1. Try reading directly from STUDENT_QUERY_STORE
  if (db.objectStoreNames.contains(STUDENT_QUERY_STORE)) {
    try {
      if (typeof id === "number" || !isNaN(Number(id))) {
        query = (await db.get(STUDENT_QUERY_STORE, Number(id))) ?? null;
      }
      if (!query && typeof id === "string") {
        const all = await db.getAll(STUDENT_QUERY_STORE);
        query = all.find((q) => q.uuid === id || String(q.id) === id) ?? null;
      }
    } catch {}
  }

  // 2. Fallback: Search STUDENT_QUERY_CACHE_STORE
  if (!query && db.objectStoreNames.contains(STUDENT_QUERY_CACHE_STORE)) {
    try {
      const directKey = `/student-queries/${id}::null`;
      const cached = await db.get(STUDENT_QUERY_CACHE_STORE, directKey);
      if (cached?.data) {
        const extracted = extractStudentQueriesFromEntry(cached.data);
        query = extracted[0] ?? null;
      }

      if (!query) {
        const allEntries = await db.getAll(STUDENT_QUERY_CACHE_STORE);
        for (const entry of allEntries) {
          const items = extractStudentQueriesFromEntry(entry.data);
          const found = items.find(
            (item) =>
              Number(item.id) === Number(id) ||
              item.uuid === String(id)
          );
          if (found) {
            query = found;
            break;
          }
        }
      }
    } catch {}
  }

  if (!query) {
    return null;
  }

  // Mandatory Tenant and Scope Validation
  if (currentUser) {
    if (!verifyStudentQueryTenantAndScope(query, currentUser, "view")) {
      return null;
    }
  }

  return query;
};

// ============================================================================
// Sync Queue Functions
// ============================================================================

export const addToStudentQuerySyncQueue = async (
  item: Omit<StudentQuerySyncQueueItem, "id" | "createdAt">
): Promise<number | undefined> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(STUDENT_QUERY_SYNC_QUEUE_STORE)) return undefined;

  const queueRecord: StudentQuerySyncQueueItem = {
    ...item,
    createdAt: Date.now(),
    retryCount: item.retryCount ?? 0,
    status: item.status || "pending",
  };

  const id = await db.add(STUDENT_QUERY_SYNC_QUEUE_STORE, queueRecord);
  return Number(id);
};

export const getPendingStudentQuerySyncQueue = async (
  currentUser?: User | null
): Promise<StudentQuerySyncQueueItem[]> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(STUDENT_QUERY_SYNC_QUEUE_STORE)) return [];

  const allQueueItems: StudentQuerySyncQueueItem[] =
    await db.getAll(STUDENT_QUERY_SYNC_QUEUE_STORE);

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
        item.departmentId !== null &&
        Number(userDeptId) !== Number(item.departmentId)
      ) {
        return false;
      }
    }

    return true;
  });
};

export const updateStudentQuerySyncQueueItem = async (
  id: number,
  updates: Partial<StudentQuerySyncQueueItem>
): Promise<void> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(STUDENT_QUERY_SYNC_QUEUE_STORE)) return;

  const item: StudentQuerySyncQueueItem | undefined =
    await db.get(STUDENT_QUERY_SYNC_QUEUE_STORE, id);
  if (!item) return;

  const updatedItem: StudentQuerySyncQueueItem = {
    ...item,
    ...updates,
  };

  await db.put(STUDENT_QUERY_SYNC_QUEUE_STORE, updatedItem);
};

export const removeStudentQuerySyncQueueItem = async (
  id: number
): Promise<void> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(STUDENT_QUERY_SYNC_QUEUE_STORE)) return;

  await db.delete(STUDENT_QUERY_SYNC_QUEUE_STORE, id);
};

export const clearStudentQuerySyncQueue = async (): Promise<void> => {
  const db = await initDB();
  if (!db || !db.objectStoreNames.contains(STUDENT_QUERY_SYNC_QUEUE_STORE)) return;

  await db.clear(STUDENT_QUERY_SYNC_QUEUE_STORE);
};
