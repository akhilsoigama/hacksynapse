// src/action/material.ts
import useSWR, { mutate as globalMutate } from 'swr';
import { useMemo, useState, useEffect } from 'react';
import axiosInstance, { fetcher } from '../utils/axios';
import {
  ICreateLecture,
  IMaterial,
  IUpdateLecture,
  IMaterialSyncQueueItem,
} from '../types/material';
import { toast } from 'sonner';
import { useUser } from '../atoms/userAtom';
import { userAtom } from '../store/atoms/user.atoms';
import { getDefaultStore } from 'jotai';
import type { User } from '../types/user';
import { 
  addToMaterialSyncQueue,
  getMaterialByIdDB,
  getMaterialDB,
  getPendingMaterialSyncQueue,
  setMaterialDB,
  verifyMaterialTenantAndScope } from '@/indexDB/material';


// ----------------------------------------------------------------------
// SWR Options
const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  keepPreviousData: true,
};

// UUID Generator
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

const getApiErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (
      err as { response?: { data?: { message?: string; messages?: string } } }
    ).response;
    return response?.data?.message || response?.data?.messages || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
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
// Authorization Helpers
// ============================================================================

export const canViewMaterial = (
  material: IMaterial | null | undefined,
  user: User | null | undefined
): boolean => {
  return verifyMaterialTenantAndScope(material, user, 'view');
};

export const canEditMaterial = (
  material: IMaterial | null | undefined,
  user: User | null | undefined
): boolean => {
  return verifyMaterialTenantAndScope(material, user, 'update');
};

export const canDeleteMaterial = (
  material: IMaterial | null | undefined,
  user: User | null | undefined
): boolean => {
  return verifyMaterialTenantAndScope(material, user, 'delete');
};

// Map frontend keys to backend payload
function mapMaterialPayload(
  data: Partial<ICreateLecture & IUpdateLecture>,
  user: User | null,
  isUpdate = false
) {
  const rawUser = user as Record<string, unknown> | null;
  const userInstituteId =
    user?.instituteId ??
    rawUser?.institute_id ??
    user?.data?.instituteId;
  const userDepartmentId =
    user?.departmentId ??
    rawUser?.department_id ??
    user?.data?.departmentId;
  const userId = user?.id ?? user?.data?.id;

  const baseFields = {
    title: data.title,
    description: data.description,
    subject: data.subject,
    std: data.std,
    department_id: data.departmentId ?? (userDepartmentId ? Number(userDepartmentId) : undefined),
    chapter_topic: data.chapterTopic ?? undefined,
    learning_objectives: data.learningObjectives ?? undefined,
    difficulty_level: data.difficultyLevel ?? undefined,
  };

  const payload: Record<string, unknown> = {
    ...baseFields,
    content_type: data.contentType || 'pdf',
    content_url: data.contentUrl || undefined,
    thumbnail_url: data.thumbnailUrl || undefined,
    duration_in_seconds: data.durationInSeconds || undefined,
    text_content: data.textContent,
    faculty_id: data.facultyId,
    institute_id: userInstituteId ? Number(userInstituteId) : undefined,
    created_by: userId ? Number(userId) : undefined,
  };

  if (isUpdate) {
    delete payload.created_by;
  }

  return payload;
}

// ============================================================================
// Material Fetch Hooks (Online + Offline Reading)
// ============================================================================

export function useGetLectures(searchFor?: string, contentTypeFilter?: string) {
  const { user } = useUser();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const queryParams = new URLSearchParams();
  if (searchFor) queryParams.append('searchFor', searchFor);
  if (contentTypeFilter && contentTypeFilter !== 'all') {
    queryParams.append('contentType', contentTypeFilter);
  }
  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/material?${queryString}`
    : '/api/material';

  // SWR for online data
  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    data: IMaterial[];
  }>(isOnline ? url : null, fetcher, swrOptions);

  const [cachedMaterials, setCachedMaterials] = useState<IMaterial[]>([]);

  // Keep IndexedDB cache updated when online response arrives
  useEffect(() => {
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      setMaterialDB(data.data).catch(() => {});
    }
  }, [data?.data]);

  // Fallback to IndexedDB when offline or on error
  useEffect(() => {
    let isMounted = true;
    const fetchOffline = async () => {
      const offlineCached = await getMaterialDB(user);
      const pendingQueue = await getPendingMaterialSyncQueue(user);

      // Convert pending offline create items to temporary display materials
      const pendingMaterials: IMaterial[] = pendingQueue
        .filter((q) => q.action === 'CREATE')
        .map((q) => ({
          uuid: q.uuid,
          title: (q.payload?.title as string) || 'Offline Material',
          contentType: (q.payload?.contentType as any) || (q.payload?.content_type as any) || 'pdf',
          subject: (q.payload?.subject as string) || null,
          std: (q.payload?.std as string) || null,
          departmentId: q.departmentId ? Number(q.departmentId) : null,
          instituteId: q.instituteId,
          createdBy: q.createdBy,
          syncStatus: 'pending',
          ...(q.payload as any),
        }));

      // Merge cached materials and pending materials (avoiding duplicate UUIDs)
      const mergedMap = new Map<string | number, IMaterial>();
      for (const m of offlineCached) {
        mergedMap.set(m.uuid || m.id!, m);
      }
      for (const p of pendingMaterials) {
        if (!mergedMap.has(p.uuid!)) {
          mergedMap.set(p.uuid!, p);
        }
      }

      if (isMounted) {
        setCachedMaterials(Array.from(mergedMap.values()));
      }
    };

    if (!isOnline || error || (!data?.data && !isLoading)) {
      fetchOffline();
    }

    return () => {
      isMounted = false;
    };
  }, [data?.data, error, isLoading, isOnline, user]);

  const activeMaterials =
    isOnline && data?.data && data.data.length > 0
      ? data.data
      : cachedMaterials;

  // Secondary protection: frontend scope filtering
  const filteredMaterials = useMemo(() => {
    if (!user) return activeMaterials;
    return activeMaterials.filter((item) => canViewMaterial(item, user));
  }, [activeMaterials, user]);

  return useMemo(
    () => ({
      lectures: filteredMaterials,
      materials: filteredMaterials,
      isLoading: isOnline ? isLoading && filteredMaterials.length === 0 : false,
      lecturesError: error,
      lecturesValidating: isValidating,
      lecturesEmpty: !isLoading && !error && filteredMaterials.length === 0,
      mutateLectures: mutate,
    }),
    [filteredMaterials, isLoading, isOnline, error, isValidating, mutate]
  );
}

export function useGetLecture(lectureId: number | string | null) {
  const { user } = useUser();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const url = lectureId ? `/api/material/${lectureId}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    data: IMaterial;
    material?: IMaterial;
  }>(isOnline && lectureId ? url : null, fetcher, swrOptions);

  const [offlineMaterial, setOfflineMaterial] = useState<IMaterial | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!lectureId) return;

    if (!isOnline || error || !data?.data) {
      getMaterialByIdDB(lectureId, user).then((cached) => {
        if (isMounted && cached) {
          setOfflineMaterial(cached);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [lectureId, data?.data, error, isOnline, user]);

  const rawItem = data?.data || data?.material || offlineMaterial;

  const { authorizedMaterial, accessDeniedError } = useMemo(() => {
    if (!rawItem) return { authorizedMaterial: null, accessDeniedError: null };
    if (!user) return { authorizedMaterial: null, accessDeniedError: null };

    const isAllowed = canViewMaterial(rawItem, user);
    if (!isAllowed) {
      return {
        authorizedMaterial: null,
        accessDeniedError: new Error(
          'Access denied: You do not have permission to view this study material.'
        ),
      };
    }
    return { authorizedMaterial: rawItem, accessDeniedError: null };
  }, [rawItem, user]);

  const isForbidden403 =
    (error as { response?: { status?: number } })?.response?.status === 403;
  const finalError = isForbidden403
    ? new Error('Access denied: 403 Forbidden')
    : accessDeniedError || error;

  return useMemo(
    () => ({
      lecture: authorizedMaterial,
      material: authorizedMaterial,
      isLoading: isLoading && !authorizedMaterial && !finalError,
      lectureError: finalError,
      lectureValidating: isValidating,
      lectureEmpty: !isLoading && !finalError && !authorizedMaterial,
      refetchLecture: mutate,
      isAccessDenied: Boolean(accessDeniedError || isForbidden403),
    }),
    [authorizedMaterial, isLoading, finalError, isValidating, mutate, accessDeniedError, isForbidden403]
  );
}

// ============================================================================
// Material Mutation Actions (Online + Offline Creation & Sync)
// ============================================================================

export async function createLecture(
  lectureData: ICreateLecture,
  userOverride?: User | null
): Promise<IMaterial | null> {
  const user = getActiveUser(userOverride);
  if (!user) {
    toast.error('Unauthorized: Please log in to create study material.');
    throw new Error('User not authenticated');
  }

  const role = String(
    user.userType ?? user.authType ?? user.roleName ?? ''
  ).toLowerCase();

  // Rule 3: Students cannot create study materials
  if (role === 'student' || user.userType === 'student') {
    toast.error('Access denied: Students cannot create study materials.');
    throw new Error('Students cannot create study materials');
  }

  const uuid = generateUUID();
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

  const payloadData: IMaterial = {
    ...lectureData,
    title: lectureData.title,
    contentType: lectureData.contentType,
    subject: lectureData.subject ?? null,
    std: lectureData.std ?? null,
    uuid,
    instituteId: userInstituteId ? Number(userInstituteId) : null,
    departmentId:
      lectureData.departmentId !== undefined && lectureData.departmentId !== null
        ? Number(lectureData.departmentId)
        : userDeptId
          ? Number(userDeptId)
          : null,
    createdBy: userId ? Number(userId) : null,
    facultyId: user.facultyId
      ? Number(user.facultyId)
      : lectureData.facultyId !== undefined && lectureData.facultyId !== null
        ? Number(lectureData.facultyId)
        : null,
    syncStatus: 'synced',
  };

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // OFFLINE CREATION FLOW
  if (!isOnline) {
    payloadData.syncStatus = 'pending';
    // 1. Save locally in IndexedDB
    await setMaterialDB(payloadData);

    // 2. Add to sync queue
    const queueItem: Omit<IMaterialSyncQueueItem, 'id' | 'createdAt'> = {
      uuid,
      action: 'CREATE',
      status: 'pending',
      instituteId: Number(userInstituteId),
      departmentId: payloadData.departmentId,
      createdBy: Number(userId),
      payload: mapMaterialPayload(lectureData, user),
      retryCount: 0,
    };
    await addToMaterialSyncQueue(queueItem);

    // 3. Immediately update UI state & notify user
    toast.info('Offline mode: Material saved locally and will sync when online.');
    await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/material'));
    return payloadData;
  }

  // ONLINE CREATION FLOW
  try {
    const backendPayload = {
      ...mapMaterialPayload(lectureData, user),
      uuid,
    };

    const res = await axiosInstance.post('/api/material', backendPayload);
    const created = res.data?.data || res.data?.material || payloadData;

    // Cache locally
    await setMaterialDB(created);
    await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/material'));
    toast.success('Study material created successfully!');
    return created;
  } catch (error: unknown) {
    const errorMsg = getApiErrorMessage(error, 'Failed to create material');
    toast.error(errorMsg);
    throw error;
  }
}

export async function updateLecture(
  lectureId: number | string,
  lectureData: IUpdateLecture,
  userOverride?: User | null
): Promise<IMaterial | null> {
  const user = getActiveUser(userOverride);
  if (!user) {
    toast.error('Unauthorized: Please log in to update study material.');
    throw new Error('User not authenticated');
  }

  const role = String(
    user.userType ?? user.authType ?? user.roleName ?? ''
  ).toLowerCase();

  // Rule 3: Students cannot update materials
  if (role === 'student' || user.userType === 'student') {
    toast.error('Access denied: Students cannot update study materials.');
    throw new Error('Students cannot update study materials');
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    toast.warning('Offline mode: Cannot modify material while offline.');
    return null;
  }

  try {
    const backendPayload = mapMaterialPayload(lectureData, user, true);
    const res = await axiosInstance.put(`/api/material/${lectureId}`, backendPayload);
    const updated = res.data?.data || res.data?.material || null;

    if (updated) {
      await setMaterialDB(updated);
    }
    await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/material'));
    await globalMutate(`/api/material/${lectureId}`);
    return updated;
  } catch (error: unknown) {
    const errorMsg = getApiErrorMessage(error, 'Failed to update material');
    toast.error(errorMsg);
    throw error;
  }
}

export async function deleteLecture(
  lectureId: number | string,
  userOverride?: User | null
): Promise<boolean> {
  const user = getActiveUser(userOverride);
  if (!user) {
    toast.error('Unauthorized: Please log in to delete study material.');
    return false;
  }

  const role = String(
    user.userType ?? user.authType ?? user.roleName ?? ''
  ).toLowerCase();

  if (role === 'student' || user.userType === 'student') {
    toast.error('Access denied: Students cannot delete study materials.');
    return false;
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    toast.warning('Offline mode: Cannot delete material while offline.');
    return false;
  }

  try {
    const res = await axiosInstance.delete(`/api/material/${lectureId}`);
    if (res.status === 200 || res.status === 204) {
      await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/material'));
      await globalMutate(`/api/material/${lectureId}`);
      toast.success('Study material deleted successfully.');
      return true;
    }
    return false;
  } catch (error: unknown) {
    const errorMsg = getApiErrorMessage(error, 'Failed to delete material');
    toast.error(errorMsg);
    return false;
  }
}

// Aliases for Material nomenclature
export const useMaterials = useGetLectures;
export const useMaterial = useGetLecture;
export const createMaterial = createLecture;
export const updateMaterial = updateLecture;
export const deleteMaterial = deleteLecture;

export function useLectureManagement() {
  const { lectures, isLoading, lecturesError } = useGetLectures();

  return {
    lectures,
    isLoading,
    lecturesError,
    createNewLecture: createLecture,
    updateExistingLecture: updateLecture,
    deleteExistingLecture: deleteLecture,
  };
}
