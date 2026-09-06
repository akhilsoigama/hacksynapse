// src/action/studentQuery.ts
import useSWR, { mutate as globalMutate } from 'swr';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import axiosInstance, { endpoints, fetcher } from '../utils/axios';
import type {
  CreateStudentQueryPayload,
  StudentQueryItem,
  StudentQueryListFilters,
  StudentQueryPriority,
  StudentQueryStatus,
  StudentQuerySyncQueueItem,
  UpdateStudentQueryPayload,
} from '../types/studentQuery';
import type { User } from '../types/user';
import { useUser } from '../atoms/userAtom';
import { userAtom } from '../store/atoms/user.atoms';
import { getDefaultStore } from 'jotai';
import {
  addToStudentQuerySyncQueue,
  getPendingStudentQuerySyncQueue,
  getStudentQueryByIdDB,
  getStudentQueryDB,
  setStudentQueryDB,
  verifyStudentQueryTenantAndScope,
} from '@/indexDB/studentQuery';

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  keepPreviousData: true,
};

// UUID Generator for offline creation
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type ApiResponse<T> = {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: T;
  meta?: {
    total?: number;
    perPage?: number;
    currentPage?: number;
    lastPage?: number;
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const payload = error.response?.data as { message?: string } | undefined;
  return payload?.message || error.message || fallback;
};

// ============================================================================
// Active User Resolution
// ============================================================================

export const getActiveUser = (userOverride?: User | null): User | null => {
  if (userOverride) return userOverride;
  try {
    const storeUser = getDefaultStore().get(userAtom);
    if (storeUser) return storeUser;
  } catch {
    // Ignore store retrieval error
  }
  if (typeof window !== 'undefined') {
    try {
      const raw =
        localStorage.getItem('lms:user') || localStorage.getItem('cachedUserData');
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore parse error
    }
  }
  return null;
};

// ============================================================================
// Authorization & Scope Helpers
// ============================================================================

export const canViewStudentQuery = (
  query: StudentQueryItem | null | undefined,
  user: User | null | undefined
): boolean => {
  return verifyStudentQueryTenantAndScope(query, user, 'view');
};

export const canEditStudentQuery = (
  query: StudentQueryItem | null | undefined,
  user: User | null | undefined
): boolean => {
  return verifyStudentQueryTenantAndScope(query, user, 'update');
};

export const canDeleteStudentQuery = (
  query: StudentQueryItem | null | undefined,
  user: User | null | undefined
): boolean => {
  return verifyStudentQueryTenantAndScope(query, user, 'delete');
};

interface RawStudentQueryItem {
  id?: number;
  uuid?: string;
  studentId?: number;
  student_id?: number;
  instituteId?: number;
  institute_id?: number;
  departmentId?: number;
  department_id?: number;
  createdBy?: number;
  created_by?: number;
  assignedFacultyId?: number | null;
  assigned_faculty_id?: number | null;
  resolvedByUserId?: number | null;
  resolved_by_user_id?: number | null;
  title?: string;
  description?: string;
  subject?: string | null;
  category?: string | null;
  priority?: string;
  status?: string;
  response?: string | null;
  resolvedAt?: string | null;
  resolved_at?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  student?: unknown;
  assignedFaculty?: unknown;
  assigned_faculty?: unknown;
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'failed';
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  return undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  return undefined;
};

const isPriority = (value: unknown): value is StudentQueryPriority =>
  value === 'low' || value === 'medium' || value === 'high';

const isStatus = (value: unknown): value is StudentQueryStatus =>
  value === 'open' || value === 'in_progress' || value === 'resolved' || value === 'closed';

const toStudentMeta = (value: unknown): StudentQueryItem['student'] => {
  if (!value || typeof value !== 'object') return undefined;
  const student = value as { id?: unknown; studentName?: unknown; studentId?: unknown };
  return {
    id: toNumber(student.id),
    studentName: toStringValue(student.studentName),
    studentId: toStringValue(student.studentId),
  };
};

const toFacultyMeta = (value: unknown): StudentQueryItem['assignedFaculty'] => {
  if (!value || typeof value !== 'object') return undefined;
  const faculty = value as { id?: unknown; facultyName?: unknown; facultyId?: unknown };
  return {
    id: toNumber(faculty.id),
    facultyName: toStringValue(faculty.facultyName),
    facultyId: toStringValue(faculty.facultyId),
  };
};

export const normalizeStudentQueryItem = (item: RawStudentQueryItem): StudentQueryItem => ({
  id: toNumber(item?.id),
  uuid: toStringValue(item?.uuid),
  studentId: toNumber(item?.studentId ?? item?.student_id) ?? 0,
  instituteId: toNumber(item?.instituteId ?? item?.institute_id) ?? 0,
  departmentId: toNumber(item?.departmentId ?? item?.department_id) ?? null,
  createdBy: toNumber(item?.createdBy ?? item?.created_by ?? item?.studentId ?? item?.student_id) ?? 0,
  assignedFacultyId: toNumber(item?.assignedFacultyId ?? item?.assigned_faculty_id) ?? null,
  resolvedByUserId: toNumber(item?.resolvedByUserId ?? item?.resolved_by_user_id) ?? null,
  title: toStringValue(item?.title) ?? '',
  description: toStringValue(item?.description) ?? '',
  subject: item?.subject ?? null,
  category: item?.category ?? null,
  priority: isPriority(item?.priority) ? item.priority : 'medium',
  status: isStatus(item?.status) ? item.status : 'open',
  response: item?.response ?? null,
  resolvedAt: toStringValue(item?.resolvedAt ?? item?.resolved_at) ?? null,
  isActive: toBoolean(item?.isActive ?? item?.is_active) ?? true,
  createdAt: toStringValue(item?.createdAt ?? item?.created_at),
  updatedAt: toStringValue(item?.updatedAt ?? item?.updated_at),
  student: toStudentMeta(item?.student),
  assignedFaculty: toFacultyMeta(item?.assignedFaculty ?? item?.assigned_faculty),
  syncStatus: item?.syncStatus ?? 'synced',
});

const isRequestSuccess = (res?: ApiResponse<unknown>, statusCode: number = 200) => {
  if (!res) {
    return statusCode >= 200 && statusCode < 300;
  }
  if (typeof res.success === 'boolean') {
    return res.success;
  }
  if (typeof res.status === 'boolean') {
    return res.status;
  }
  return statusCode >= 200 && statusCode < 300;
};

// ============================================================================
// StudentQuery Fetch Hooks (Online + Offline Reading)
// ============================================================================

export function useStudentQueries(filters?: StudentQueryListFilters) {
  const { user } = useUser();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const params = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (filters?.page) searchParams.append('page', String(filters.page));
    if (filters?.limit) searchParams.append('limit', String(filters.limit));
    if (filters?.status) searchParams.append('status', filters.status);
    if (filters?.priority) searchParams.append('priority', filters.priority);
    return searchParams.toString();
  }, [filters]);

  const endpointUrl = endpoints.studentQuery?.getAll || '/student-queries';
  const url = params ? `${endpointUrl}?${params}` : endpointUrl;

  const { data, isLoading, error, isValidating, mutate } = useSWR<ApiResponse<RawStudentQueryItem[]>>(
    isOnline ? url : null,
    fetcher,
    swrOptions
  );

  const [cachedQueries, setCachedQueries] = useState<StudentQueryItem[]>([]);

  // Keep IndexedDB cache updated when online response arrives
  useEffect(() => {
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const normalized = data.data.map(normalizeStudentQueryItem);
      setStudentQueryDB(normalized).catch(() => {});
    }
  }, [data?.data]);

  // Fallback to IndexedDB when offline, on error, or during local inspection
  useEffect(() => {
    let isMounted = true;

    const fetchOffline = async () => {
      const offlineCached = await getStudentQueryDB(user);
      const pendingQueue = await getPendingStudentQuerySyncQueue(user);

      // Convert pending CREATE queue items to optimistic display queries
      const pendingQueries: StudentQueryItem[] = pendingQueue
        .filter((q) => q.action === 'CREATE')
        .map((q) => {
          const p = (q.payload || {}) as Record<string, unknown>;
          return {
            id: q.id,
            uuid: q.uuid,
            title: (p.title as string) || 'Offline Query',
            description: (p.description as string) || '',
            subject: (p.subject as string) || null,
            category: (p.category as string) || null,
            priority: (p.priority as StudentQueryPriority) || 'medium',
            status: (p.status as StudentQueryStatus) || 'open',
            instituteId: q.instituteId,
            departmentId: q.departmentId,
            createdBy: q.createdBy,
            studentId: Number(q.createdBy),
            syncStatus: 'pending',
            createdAt: new Date(q.createdAt || Date.now()).toISOString(),
            isActive: true,
            student: {
              studentName: user?.fullName || 'You',
            },
            ...p,
          };
        });

      // Merge cached queries and pending queries (deduplicating by uuid or id)
      const mergedMap = new Map<string | number, StudentQueryItem>();

      for (const q of offlineCached) {
        const key = q.uuid || q.id;
        if (key) {
          mergedMap.set(key, q);
        }
      }

      for (const p of pendingQueries) {
        const key = p.uuid || p.id;
        if (key && !mergedMap.has(key)) {
          mergedMap.set(key, p);
        }
      }

      let allLocal = Array.from(mergedMap.values());

      // Filter by status or priority if specified in filters
      if (filters?.status) {
        allLocal = allLocal.filter((q) => q.status === filters.status);
      }
      if (filters?.priority) {
        allLocal = allLocal.filter((q) => q.priority === filters.priority);
      }

      if (isMounted) {
        setCachedQueries(allLocal);
      }
    };

    if (!isOnline || error || (!data?.data && !isLoading)) {
      fetchOffline();
    }

    return () => {
      isMounted = false;
    };
  }, [data?.data, error, isLoading, isOnline, user, filters?.status, filters?.priority]);

  const activeQueries = useMemo(() => {
    if (isOnline && data?.data && Array.isArray(data.data)) {
      return data.data.map(normalizeStudentQueryItem);
    }
    return cachedQueries;
  }, [isOnline, data?.data, cachedQueries]);

  // Strict secondary protection: frontend scope filtering
  const filteredQueries = useMemo(() => {
    if (!user) return activeQueries;
    return activeQueries.filter((item) => canViewStudentQuery(item, user));
  }, [activeQueries, user]);

  return useMemo(
    () => ({
      queries: filteredQueries,
      meta: data?.meta,
      queriesLoading: isOnline ? isLoading && filteredQueries.length === 0 : false,
      queriesError: error,
      queriesValidating: isValidating,
      queriesEmpty: !isLoading && filteredQueries.length === 0,
      queriesMutate: mutate,
      queriesMessage: data?.message,
      isOnline,
    }),
    [filteredQueries, data?.meta, data?.message, isOnline, isLoading, error, isValidating, mutate]
  );
}

export function useGetStudentQuery(queryId: number | string | null) {
  const { user } = useUser();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const url = queryId ? (endpoints.studentQuery?.byId ? endpoints.studentQuery.byId(queryId) : `/api/studentQuery/${queryId}`) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    data?: RawStudentQueryItem;
  }>(isOnline && queryId ? url : null, fetcher, swrOptions);

  const [offlineQuery, setOfflineQuery] = useState<StudentQueryItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!queryId) return;

    if (!isOnline || error || !data?.data) {
      getStudentQueryByIdDB(queryId, user).then((cached) => {
        if (isMounted && cached) {
          setOfflineQuery(cached);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [queryId, data?.data, error, isOnline, user]);

  const rawItem = data?.data ? normalizeStudentQueryItem(data.data) : offlineQuery;

  const { authorizedQuery, accessDeniedError } = useMemo(() => {
    if (!rawItem) return { authorizedQuery: null, accessDeniedError: null };
    if (!user) return { authorizedQuery: null, accessDeniedError: null };

    const isAllowed = canViewStudentQuery(rawItem, user);
    if (!isAllowed) {
      return {
        authorizedQuery: null,
        accessDeniedError: new Error(
          'Access denied: You do not have permission to access this StudentQuery.'
        ),
      };
    }
    return { authorizedQuery: rawItem, accessDeniedError: null };
  }, [rawItem, user]);

  const isForbidden403 =
    (error as { response?: { status?: number } })?.response?.status === 403;

  useEffect(() => {
    if (isForbidden403) {
      toast.error('You are not authorized to access this StudentQuery.');
    }
  }, [isForbidden403]);

  const finalError = isForbidden403
    ? new Error('Access denied: 403 Forbidden')
    : accessDeniedError || error;

  return useMemo(
    () => ({
      query: authorizedQuery,
      studentQuery: authorizedQuery,
      isLoading: isLoading && !authorizedQuery && !finalError,
      queryError: finalError,
      queryValidating: isValidating,
      queryEmpty: !isLoading && !finalError && !authorizedQuery,
      refetchQuery: mutate,
      isAccessDenied: Boolean(accessDeniedError || isForbidden403),
    }),
    [authorizedQuery, isLoading, finalError, isValidating, mutate, accessDeniedError, isForbidden403]
  );
}

// ============================================================================
// StudentQuery Mutation Actions (Online + Offline Creation & Sync)
// ============================================================================

export async function createStudentQuery(
  payload: CreateStudentQueryPayload,
  userOverride?: User | null
): Promise<StudentQueryItem | null> {
  const user = getActiveUser(userOverride);
  if (!user) {
    toast.error('Unauthorized: Please log in to submit a query.');
    return null;
  }

  const rawUser = user as Record<string, unknown>;
  const userInstituteId =
    user.instituteId ??
    rawUser.institute_id ??
    user.data?.instituteId;
  const userDeptId =
    user.departmentId ??
    rawUser.department_id ??
    user.data?.departmentId;
  const userId = user.id ?? user.data?.id;
  const studentId =
    (user as { studentId?: unknown })?.studentId ??
    rawUser.student_id ??
    (rawUser as { studentId?: unknown })?.studentId ??
    user.data?.studentId ??
    userId;

  const uuid = generateUUID();

  const localPayload: StudentQueryItem = {
    ...payload,
    uuid,
    title: payload.title,
    description: payload.description,
    subject: payload.subject || null,
    category: payload.category || null,
    priority: payload.priority || 'medium',
    status: 'open',
    instituteId: userInstituteId ? Number(userInstituteId) : 0,
    departmentId: userDeptId ? Number(userDeptId) : null,
    createdBy: userId ? Number(userId) : 0,
    studentId: studentId ? Number(studentId) : Number(userId),
    assignedFacultyId: payload.assignedFacultyId ?? null,
    syncStatus: 'synced',
    isActive: true,
    createdAt: new Date().toISOString(),
    student: {
      studentName: user.fullName || 'You',
      studentId: String(studentId),
    },
  };

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // OFFLINE CREATION FLOW
  if (!isOnline) {
    localPayload.syncStatus = 'pending';

    // 1. Save into IndexedDB studentQuery table
    await setStudentQueryDB(localPayload);

    // 2. Add to studentQuery_sync_queue
    const queueItem: Omit<StudentQuerySyncQueueItem, 'id' | 'createdAt'> = {
      uuid,
      action: 'CREATE',
      status: 'pending',
      instituteId: Number(userInstituteId),
      departmentId: localPayload.departmentId,
      createdBy: Number(userId),
      payload: {
        ...payload,
        uuid,
        instituteId: userInstituteId,
        departmentId: userDeptId,
        createdBy: userId,
        studentId,
      },
      retryCount: 0,
    };
    await addToStudentQuerySyncQueue(queueItem);

    // 3. Immediately update UI state & notify user
    toast.info('Offline mode: Query saved locally and will sync when online.');
    await globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith('/student-queries') || key.startsWith('/api/studentQuery'))
    );
    return localPayload;
  }

  // ONLINE CREATION FLOW
  try {
    const backendPayload = {
      ...payload,
      uuid,
      instituteId: userInstituteId,
      departmentId: userDeptId,
      createdBy: userId,
    };

    // Try /api/studentQuery first, then fallback to endpoints.studentQuery.create
    let response: { data?: ApiResponse<RawStudentQueryItem>; status: number };
    try {
      response = await axiosInstance.post<ApiResponse<RawStudentQueryItem>>(
        '/api/studentQuery',
        backendPayload
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        response = await axiosInstance.post<ApiResponse<RawStudentQueryItem>>(
          endpoints.studentQuery.create,
          backendPayload
        );
      } else {
        throw err;
      }
    }

    const ok = response ? isRequestSuccess(response.data, response.status) : false;
    if (!ok) {
      toast.error(response?.data?.message || 'Failed to create query');
      return null;
    }

    const createdRecord = response.data?.data
      ? normalizeStudentQueryItem(response.data.data)
      : localPayload;

    // Cache in IndexedDB
    await setStudentQueryDB(createdRecord);
    await globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith('/student-queries') || key.startsWith('/api/studentQuery'))
    );

    toast.success(response.data?.message || 'Query created successfully');
    return createdRecord;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      toast.error('You are not authorized to create a student query.');
      return null;
    }
    toast.error(getErrorMessage(error, 'Failed to create query'));
    return null;
  }
}

export async function updateStudentQuery(
  queryId: number | string,
  payload: UpdateStudentQueryPayload,
  userOverride?: User | null
): Promise<StudentQueryItem | null> {
  const user = getActiveUser(userOverride);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // OFFLINE UPDATE FLOW
  if (!isOnline) {
    const local = await getStudentQueryByIdDB(queryId, user);
    if (!local) {
      toast.error('Query not found in offline cache.');
      return null;
    }

    if (user && !canEditStudentQuery(local, user)) {
      toast.error('Access denied: You cannot edit this query.');
      return null;
    }

    const updatedLocal: StudentQueryItem = {
      ...local,
      ...payload,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };

    await setStudentQueryDB(updatedLocal);

    const rawUser = user as Record<string, unknown> | null;
    await addToStudentQuerySyncQueue({
      uuid: updatedLocal.uuid || String(queryId),
      action: 'UPDATE',
      status: 'pending',
      instituteId: Number(updatedLocal.instituteId),
      departmentId: updatedLocal.departmentId,
      createdBy: Number(user?.id ?? rawUser?.id ?? updatedLocal.createdBy),
      payload: { ...payload, id: queryId },
      retryCount: 0,
    });

    toast.info('Offline mode: Query updated locally and will sync when online.');
    await globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith('/student-queries') || key.startsWith('/api/studentQuery'))
    );
    return updatedLocal;
  }

  // ONLINE UPDATE FLOW
  try {
    let response: { data?: ApiResponse<RawStudentQueryItem>; status: number };
    try {
      response = await axiosInstance.put<ApiResponse<RawStudentQueryItem>>(
        `/api/studentQuery/${queryId}`,
        payload
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        response = await axiosInstance.put<ApiResponse<RawStudentQueryItem>>(
          endpoints.studentQuery.update(queryId),
          payload
        );
      } else {
        throw err;
      }
    }

    const ok = response ? isRequestSuccess(response.data, response.status) : false;
    if (!ok) {
      toast.error(response?.data?.message || 'Failed to update query');
      return null;
    }

    const updatedItem = response.data?.data
      ? normalizeStudentQueryItem(response.data.data)
      : null;

    if (updatedItem) {
      await setStudentQueryDB(updatedItem);
    }

    await globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith('/student-queries') || key.startsWith('/api/studentQuery'))
    );
    toast.success(response.data?.message || 'Query updated successfully');
    return updatedItem;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      toast.error('You are not authorized to update this query.');
      return null;
    }
    toast.error(getErrorMessage(error, 'Failed to update query'));
    return null;
  }
}

export async function resolveStudentQuery(
  queryId: number | string,
  responseText: string,
  userOverride?: User | null
): Promise<StudentQueryItem | null> {
  return updateStudentQuery(
    queryId,
    {
      response: responseText,
      status: 'resolved',
    },
    userOverride
  );
}

export async function deleteStudentQuery(
  queryId: number | string,
  userOverride?: User | null
): Promise<boolean> {
  const user = getActiveUser(userOverride);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // OFFLINE DELETE FLOW
  if (!isOnline) {
    const local = await getStudentQueryByIdDB(queryId, user);
    if (!local) {
      toast.error('Query not found in offline cache.');
      return false;
    }

    if (user && !canDeleteStudentQuery(local, user)) {
      toast.error('Access denied: You cannot delete this query.');
      return false;
    }

    // Add to sync queue
    const rawUser = user as Record<string, unknown> | null;
    await addToStudentQuerySyncQueue({
      uuid: local.uuid || String(queryId),
      action: 'DELETE',
      status: 'pending',
      instituteId: Number(local.instituteId),
      departmentId: local.departmentId,
      createdBy: Number(user?.id ?? rawUser?.id ?? local.createdBy),
      payload: { id: queryId, uuid: local.uuid },
      retryCount: 0,
    });

    toast.info('Offline mode: Query marked for deletion and will sync when online.');
    await globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith('/student-queries') || key.startsWith('/api/studentQuery'))
    );
    return true;
  }

  // ONLINE DELETE FLOW
  try {
    let response: { data?: ApiResponse<null>; status: number };
    try {
      response = await axiosInstance.delete<ApiResponse<null>>(`/api/studentQuery/${queryId}`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        response = await axiosInstance.delete<ApiResponse<null>>(endpoints.studentQuery.delete(queryId));
      } else {
        throw err;
      }
    }

    const ok = response ? isRequestSuccess(response.data, response.status) : false;
    if (!ok) {
      toast.error(response?.data?.message || 'Failed to delete query');
      return false;
    }

    await globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith('/student-queries') || key.startsWith('/api/studentQuery'))
    );
    toast.success(response.data?.message || 'Query deleted successfully');
    return true;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      toast.error('You are not authorized to delete this query.');
      return false;
    }
    toast.error(getErrorMessage(error, 'Failed to delete query'));
    return false;
  }
}
