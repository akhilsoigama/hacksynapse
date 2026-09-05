import { IDBPDatabase } from "idb";
import type { User } from "../types/user";
import type { IAssignmentItem } from "../types/assignment";
import {
  ASSIGNMENT_CACHE_STORE,
  ASSIGNMENT_UPLOAD_CACHE_STORE,
  FACULTY_LEAVE_CACHE_STORE,
  DEPARTMENT_CACHE_STORE,
  FACULTY_CACHE_STORE,
  GOVT_EVENT_CACHE_STORE,
  INSTITUTE_EVENT_CACHE_STORE,
  MATERIAL_CACHE_STORE,
  LECTURE_CACHE_STORE,
  QUIZ_ATTEMPT_CACHE_STORE,
  QUIZ_CACHE_STORE,
  STUDENT_QUERY_CACHE_STORE,
  STUDENT_CACHE_STORE,
  initDB,
} from "./DBConnect";

export type ModuleCacheEntry<T = unknown> = {
  key: string;
  data: T;
  updatedAt: number;
};

export type ModuleCacheStoreName =
  | typeof LECTURE_CACHE_STORE
  | typeof FACULTY_CACHE_STORE
  | typeof DEPARTMENT_CACHE_STORE
  | typeof STUDENT_CACHE_STORE
  | typeof GOVT_EVENT_CACHE_STORE
  | typeof INSTITUTE_EVENT_CACHE_STORE
  | typeof ASSIGNMENT_CACHE_STORE
  | typeof ASSIGNMENT_UPLOAD_CACHE_STORE
  | typeof QUIZ_CACHE_STORE
  | typeof QUIZ_ATTEMPT_CACHE_STORE
  | typeof MATERIAL_CACHE_STORE
  | typeof FACULTY_LEAVE_CACHE_STORE
  | typeof STUDENT_QUERY_CACHE_STORE;

const moduleStoreByEndpoint: Array<{ pattern: RegExp; store: ModuleCacheStoreName }> = [
  { pattern: /^\/lectures(?:\/|\?|$)/, store: LECTURE_CACHE_STORE },
  { pattern: /^\/faculty(?:\/|\?|$)/, store: FACULTY_CACHE_STORE },
  { pattern: /^\/departments?(?:\/|\?|$)/, store: DEPARTMENT_CACHE_STORE },
  { pattern: /^\/student(?:\/|\?|$)/, store: STUDENT_CACHE_STORE },
  { pattern: /^\/govtEvent(?:\/|\?|$)/, store: GOVT_EVENT_CACHE_STORE },
  { pattern: /^\/instituteEvent(?:\/|\?|$)/, store: INSTITUTE_EVENT_CACHE_STORE },
  { pattern: /^\/assignments(?:\/|\?|$)/, store: ASSIGNMENT_CACHE_STORE },
  { pattern: /^\/assignment-uploads(?:\/|\?|$)/, store: ASSIGNMENT_UPLOAD_CACHE_STORE },
  { pattern: /^\/materials(?:\/|\?|$)/, store: MATERIAL_CACHE_STORE },
  { pattern: /^\/faculty-leaves(?:\/|\?|$)/, store: FACULTY_LEAVE_CACHE_STORE },
  { pattern: /^\/student-queries(?:\/|\?|$)/, store: STUDENT_QUERY_CACHE_STORE },
  { pattern: /^\/quizzes(?:\/|\?|$)/, store: QUIZ_CACHE_STORE },
  { pattern: /^\/quiz-attempts(?:\/|\?|$)/, store: QUIZ_ATTEMPT_CACHE_STORE },
];

export const getModuleCacheStoreName = (url: string): ModuleCacheStoreName | null => {
  const normalizedUrl = url.split("?")[0];
  const match = moduleStoreByEndpoint.find(({ pattern }) => pattern.test(normalizedUrl));
  return match?.store ?? null;
};

export const buildModuleCacheKey = (url: string, params?: unknown): string => {
  return `${url}::${JSON.stringify(params ?? null)}`;
};

const getStore = async (): Promise<IDBPDatabase | null> => {
  const db = await initDB();
  return db ?? null;
};

export const setModuleCacheDB = async <T>(
  storeName: ModuleCacheStoreName,
  key: string,
  data: T,
): Promise<void> => {
  const db = await getStore();
  if (!db) return;

  await db.put(storeName, {
    key,
    data,
    updatedAt: Date.now(),
  } as ModuleCacheEntry<T>);
};

export const getModuleCacheDB = async <T = unknown>(
  storeName: ModuleCacheStoreName,
  key: string,
): Promise<ModuleCacheEntry<T> | null> => {
  const db = await getStore();
  if (!db) return null;

  const cached = await db.get(storeName, key);
  return (cached as ModuleCacheEntry<T> | undefined) ?? null;
};

export const clearModuleCacheDB = async (storeName: ModuleCacheStoreName): Promise<void> => {
  const db = await getStore();
  if (!db) return;

  await db.clear(storeName);
};

// ==========================================
// Assignment IndexedDB Access & Offline Scope
// ==========================================

export const extractAssignmentsFromEntry = (entryData: unknown): IAssignmentItem[] => {
  if (!entryData) return [];
  if (Array.isArray(entryData)) return entryData as IAssignmentItem[];
  if (typeof entryData === "object" && entryData !== null) {
    const candidate = entryData as { data?: unknown; status?: boolean };
    if (Array.isArray(candidate.data)) {
      return candidate.data as IAssignmentItem[];
    }
    if (candidate.data && typeof candidate.data === "object" && "id" in (candidate.data as object)) {
      return [candidate.data as IAssignmentItem];
    }
    if ("id" in entryData && ("assignmentTitle" in entryData || "instituteId" in entryData)) {
      return [entryData as IAssignmentItem];
    }
  }
  return [];
};

export const verifyAssignmentTenantAndScope = (
  assignment: IAssignmentItem | null | undefined,
  currentUser: User | null | undefined,
  action: "view" | "update" | "delete" = "view",
): boolean => {
  if (!assignment || !currentUser) {
    return false;
  }

  const role = String(
    currentUser.userType ?? currentUser.authType ?? currentUser.roleName ?? "",
  ).toLowerCase();

  // Super admin has unrestricted access
  if (
    role === "super_admin" ||
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
  const assignmentInstituteId = assignment.instituteId ?? assignment.institute_id;

  // Institute isolation check
  if (
    userInstituteId === undefined ||
    userInstituteId === null ||
    assignmentInstituteId === undefined ||
    assignmentInstituteId === null
  ) {
    return false;
  }

  if (Number(userInstituteId) !== Number(assignmentInstituteId)) {
    return false;
  }

  // Student checks
  if (role === "student") {
    // Students can NEVER update or delete assignments
    if (action === "update" || action === "delete") {
      return false;
    }

    const userDepartmentId =
      currentUser.departmentId ??
      rawUser.department_id ??
      currentUser.data?.departmentId ??
      (currentUser.data as Record<string, unknown> | undefined)?.department_id;
    const assignmentDepartmentId = assignment.departmentId ?? assignment.department_id;

    if (
      userDepartmentId === undefined ||
      userDepartmentId === null ||
      assignmentDepartmentId === undefined ||
      assignmentDepartmentId === null
    ) {
      return false;
    }

    if (Number(userDepartmentId) !== Number(assignmentDepartmentId)) {
      return false;
    }

    return true;
  }

  // Institute admin checks: can view, update, delete all in their institute
  if (role === "institute") {
    return true;
  }

  // Faculty ownership checks:
  const currentUserId = currentUser.id ?? currentUser.data?.id;
  const assignmentCreatedBy = assignment.createdBy ?? assignment.created_by;

  if (
    assignmentCreatedBy !== undefined &&
    assignmentCreatedBy !== null &&
    currentUserId !== undefined &&
    currentUserId !== null
  ) {
    if (Number(assignmentCreatedBy) !== Number(currentUserId)) {
      return false;
    }
  } else if (role === "faculty") {
    const userFacultyId =
      currentUser.facultyId ??
      rawUser.faculty_id ??
      currentUser.data?.facultyId ??
      (currentUser.data as Record<string, unknown> | undefined)?.faculty_id;
    const assignmentFacultyId = assignment.facultyId ?? assignment.faculty_id;
    if (
      userFacultyId !== undefined &&
      assignmentFacultyId !== undefined &&
      Number(userFacultyId) !== Number(assignmentFacultyId)
    ) {
      return false;
    }
  }

  return true;
};

export const getAssignmentByIdDB = async (
  id: number,
  currentUser?: User | null,
): Promise<IAssignmentItem | null> => {
  const db = await getStore();
  if (!db) return null;

  // Direct lookup by cache key
  const directKey = `/assignments/${id}::null`;
  const cachedDirect = await db.get(ASSIGNMENT_CACHE_STORE, directKey);
  let assignment: IAssignmentItem | null = null;

  if (cachedDirect?.data) {
    const extracted = extractAssignmentsFromEntry(cachedDirect.data);
    assignment = extracted.find((item) => Number(item.id) === Number(id)) ?? null;
  }

  // Fallback: search all cached entries
  if (!assignment) {
    const allEntries = await db.getAll(ASSIGNMENT_CACHE_STORE);
    for (const entry of allEntries) {
      const extracted = extractAssignmentsFromEntry(entry.data);
      const found = extracted.find((item) => Number(item.id) === Number(id));
      if (found) {
        assignment = found;
        break;
      }
    }
  }

  if (!assignment) {
    return null;
  }

  if (currentUser) {
    if (!verifyAssignmentTenantAndScope(assignment, currentUser, "view")) {
      return null;
    }
  }

  return assignment;
};

export const getAssignmentDB = async (
  currentUser?: User | null,
): Promise<IAssignmentItem[]> => {
  const db = await getStore();
  if (!db) return [];

  const allEntries = await db.getAll(ASSIGNMENT_CACHE_STORE);
  const assignmentMap = new Map<number, IAssignmentItem>();

  for (const entry of allEntries) {
    const items = extractAssignmentsFromEntry(entry.data);
    for (const item of items) {
      if (item && item.id) {
        assignmentMap.set(item.id, item);
      }
    }
  }

  const allAssignments = Array.from(assignmentMap.values());

  if (!currentUser) {
    return allAssignments;
  }

  return allAssignments.filter((item) =>
    verifyAssignmentTenantAndScope(item, currentUser, "view"),
  );
};

export const setAssignmentDB = async (
  data: IAssignmentItem | IAssignmentItem[],
): Promise<void> => {
  const db = await getStore();
  if (!db) return;

  if (Array.isArray(data)) {
    const key = `/assignments::null`;
    await setModuleCacheDB(ASSIGNMENT_CACHE_STORE, key, { data, status: true });
    for (const item of data) {
      if (item?.id) {
        await setModuleCacheDB(ASSIGNMENT_CACHE_STORE, `/assignments/${item.id}::null`, {
          data: item,
          status: true,
        });
      }
    }
  } else if (data?.id) {
    await setModuleCacheDB(ASSIGNMENT_CACHE_STORE, `/assignments/${data.id}::null`, {
      data,
      status: true,
    });
  }
};

export const clearAssignmentDB = async (): Promise<void> => {
  await clearModuleCacheDB(ASSIGNMENT_CACHE_STORE);
};
