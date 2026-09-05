import { toast } from "sonner";
import { IAssignmentItem, IcreateAssignment } from "../types/assignment";
import axiosInstance, { endpoints, fetcher } from "../utils/axios";
import { userAtom, useUser } from "../atoms/userAtom";
import { useMemo, useEffect, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useFaculties } from "./faculty";
import { getAssignmentByIdDB, getAssignmentDB, setAssignmentDB } from "../indexDB/assignment";
import { User } from "@/types/user";
import { getDefaultStore } from "jotai";

const swrOptions = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 8000,
    keepPreviousData: true,
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string; messages?: string } } }).response;
        return response?.data?.message || response?.data?.messages || fallback;
    }
    return fallback;
};

const store = getDefaultStore();

// ==========================================
// Authorization Helpers (Tenant, Role & Ownership)
// ==========================================

export const getActiveUser = (userOverride?: User | null): User | null => {
    if (userOverride) return userOverride;
    try {
        const storeUser = store.get(userAtom);
        if (storeUser) return storeUser;
    } catch {
        // Ignore store retrieval error
    }
    if (typeof window !== "undefined") {
        try {
            const raw = localStorage.getItem("lms:user") || localStorage.getItem("cachedUserData");
            if (raw) return JSON.parse(raw);
        } catch {
            // Ignore parse error
        }
    }
    return null;
};

export const canAccessAssignment = (
    assignment: IAssignmentItem | null | undefined,
    user: User | null | undefined,
    action: 'view' | 'update' | 'delete' = 'view'
): boolean => {
    if (!assignment || !user) {
        return false;
    }

    const role = String(user.userType ?? user.authType ?? user.roleName ?? '').toLowerCase();

    // 1. Super Admin: full access
    if (role === 'super_admin' || user.userType === 'super_admin' || user.authType === 'super_admin') {
        return true;
    }

    const rawUser = user as Record<string, unknown>;
    const userInstituteId =
        user.instituteId ??
        rawUser.institute_id ??
        user.data?.instituteId ??
        (user.data as Record<string, unknown> | undefined)?.institute_id;
    const assignmentInstituteId = assignment.instituteId ?? assignment.institute_id;

    // 2. Institute Boundary Check
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

    // 3. Student Scope
    if (role === 'student' || user.userType === 'student') {
        // Students are NEVER allowed to update or delete assignments
        if (action === 'update' || action === 'delete') {
            return false;
        }

        const userDepartmentId =
            user.departmentId ??
            rawUser.department_id ??
            user.data?.departmentId ??
            (user.data as Record<string, unknown> | undefined)?.department_id;
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

    // 4. Institute Admin Scope: can view, update, and delete in their institute
    if (role === 'institute' || user.userType === 'institute') {
        return true;
    }

    // 5. Faculty Scope & Ownership
    const currentUserId = user.id ?? user.data?.id;
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
    } else if (role === 'faculty' || user.userType === 'faculty') {
        const userFacultyId =
            user.facultyId ??
            rawUser.faculty_id ??
            user.data?.facultyId ??
            (user.data as Record<string, unknown> | undefined)?.faculty_id;
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

export const canViewAssignment = (
    assignment: IAssignmentItem | null | undefined,
    user: User | null | undefined
): boolean => {
    return canAccessAssignment(assignment, user, 'view');
};

export const canEditAssignment = (
    assignment: IAssignmentItem | null | undefined,
    user: User | null | undefined
): boolean => {
    return canAccessAssignment(assignment, user, 'update');
};

export const canDeleteAssignment = (
    assignment: IAssignmentItem | null | undefined,
    user: User | null | undefined
): boolean => {
    return canAccessAssignment(assignment, user, 'delete');
};

// ==========================================
// Assignment API Actions
// ==========================================

export async function createAssignment(formData: IcreateAssignment) {
    const url = endpoints.assignment.create;
    try {
        const res = await axiosInstance.post(url, formData);
        if (res?.status === 200 || res?.status === 201) {
            await globalMutate((key) => typeof key === 'string' && key.startsWith(endpoints.assignment.getAll));
            return res.data?.data?.id ?? res.data?.id ?? null;
        }
        return null;
    } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Failed to create Assignment'));
        return null;
    }
}

export function useAssignments(searchFor?: string, facultyId?: number, page = 1, limit = 20, search?: string) {
    const { user } = useUser();

    const getEndpoint = () => {
        if (user?.isInstitute) {
            return endpoints.assignment.getAll;
        } else if (user?.isSuperAdmin) {
            return endpoints.assignment.getAll;
        } else {
            return endpoints.assignment.getAll;
        }
    };

    const BaseUrl = getEndpoint();

    const params = useMemo(() => {
        const queryParams = new URLSearchParams();
        if (searchFor) {
            queryParams.append('searchFor', searchFor);
        }
        if (facultyId && user?.isSuperAdmin) {
            queryParams.append('facultyId', facultyId.toString());
        }
        if (search) {
            queryParams.append('search', search);
        }
        queryParams.append('page', String(page));
        queryParams.append('limit', String(limit));
        return queryParams.toString();
    }, [search, searchFor, facultyId, limit, page, user?.isSuperAdmin]);

    const urlWithParams = params ? `${BaseUrl}?${params}` : BaseUrl;

    const { data, isLoading, error, isValidating, mutate } = useSWR<{
        data: IAssignmentItem[];
        meta?: {
            total: number;
            perPage: number;
            currentPage: number;
            lastPage: number;
        };
    }>(urlWithParams, fetcher, swrOptions);

    const [offlineAssignments, setOfflineAssignments] = useState<IAssignmentItem[]>([]);

    useEffect(() => {
        let isMounted = true;
        if (error || (!navigator.onLine && (!data?.data || data.data.length === 0))) {
            getAssignmentDB().then((cached) => {
                if (isMounted) {
                    setOfflineAssignments(cached);
                }
            });
        }
        return () => {
            isMounted = false;
        };
    }, [data?.data, error, user]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !navigator.onLine) {
            getAssignmentDB().then(localData => {
                let filtered = localData;
                if (user?.userType === 'student') {
                    filtered = localData.filter(item => item.instituteId === user.data?.instituteId && item.departmentId === user.data?.departmentId);
                } else if (user?.isInstitute) {
                    filtered = localData.filter(item => item.instituteId === user.data?.instituteId);
                }
                setOfflineAssignments(filtered);
            });
        } else if (data?.data) {
            setAssignmentDB(data.data);
        }
    }, [data, user, error]);

    const finalData = (typeof window !== 'undefined' && !navigator.onLine ? offlineAssignments : data?.data) || [];

    const memoizedValue = useMemo(
        () => ({
            assignments: finalData,
            assignmentLoadind: isLoading,
            assignmentError: error,
            assessmentValidating: isValidating,
            assessmentEmpty: !isLoading && !error && finalData.length === 0,
            assignmentMutate: mutate,
            assignmentMeta: data?.meta,
        }),
        [finalData, data?.meta, error, isLoading, isValidating, mutate]
    );

    return memoizedValue;
}

export function useInstituteAssignments(searchFor?: string, page = 1, limit = 20, search?: string) {
    const { user } = useUser();

    const params = useMemo(() => {
        const queryParams = new URLSearchParams();
        if (searchFor) {
            queryParams.append('searchFor', searchFor);
        }
        if (search) {
            queryParams.append('search', search);
        }
        queryParams.append('page', String(page));
        queryParams.append('limit', String(limit));
        return queryParams.toString();
    }, [limit, page, search, searchFor]);

    const urlWithParams = params ? `${endpoints.assignment.getAll}?${params}` : endpoints.assignment.getAll;

    const { data, isLoading, error, isValidating, mutate } = useSWR<{
        data: IAssignmentItem[];
    }>(
        user?.userType === 'institute' ? urlWithParams : null,
        fetcher,
        swrOptions
    );

    const filteredAssignments = useMemo(() => {
        const raw = data?.data || [];
        if (!user) return raw;
        return raw.filter((item) => canViewAssignment(item, user));
    }, [data?.data, user]);

    const memoizedValue = useMemo(
        () => ({
            assignments: filteredAssignments,
            assignmentsLoading: isLoading,
            assignmentsError: error,
            assignmentsValidating: isValidating,
            assignmentsEmpty: !isLoading && !error && filteredAssignments.length === 0,
            assignmentMutate: mutate,
        }),
        [filteredAssignments, error, isLoading, isValidating, mutate]
    );

    return memoizedValue;
}

export function useAssignment(assignmentId: number) {
    const { user } = useUser();
    const url = assignmentId ? endpoints.assignment.details(assignmentId) : null;
    const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: IAssignmentItem }>(
        url,
        fetcher,
        swrOptions
    );

    const [offlineAssignment, setOfflineAssignment] = useState<IAssignmentItem | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!assignmentId) return;

        // Offline fallback: verified by tenant scope in IndexedDB
        if (error || (!navigator.onLine && !data?.data)) {
            getAssignmentByIdDB(assignmentId).then((cached) => {
                if (isMounted) {
                    setOfflineAssignment(cached);
                }
            });
        }

        return () => {
            isMounted = false;
        };
    }, [assignmentId, data?.data, error, user]);

    const activeRawAssignment = data?.data || offlineAssignment;

    const { authorizedAssignment, accessDeniedError } = useMemo(() => {
        if (!activeRawAssignment) {
            return { authorizedAssignment: null, accessDeniedError: null };
        }

        if (!user) {
            return { authorizedAssignment: null, accessDeniedError: null };
        }

        const isAllowed = canViewAssignment(activeRawAssignment, user);
        if (!isAllowed) {
            return {
                authorizedAssignment: null,
                accessDeniedError: new Error("Access denied: You do not have permission to view this assignment."),
            };
        }

        return { authorizedAssignment: activeRawAssignment, accessDeniedError: null };
    }, [activeRawAssignment, user]);

    const isForbidden403 = (error as { response?: { status?: number } })?.response?.status === 403;
    const finalError = isForbidden403
        ? new Error("Access denied: 403 Forbidden")
        : accessDeniedError || error;

    const memoizedValue = useMemo(
        () => ({
            assignment: authorizedAssignment,
            isLoading: isLoading && !authorizedAssignment && !finalError,
            assignmentError: finalError,
            assignmentValidating: isValidating,
            assignmentEmpty: !isLoading && !finalError && !authorizedAssignment,
            assignmentMutate: mutate,
            isAccessDenied: Boolean(accessDeniedError || isForbidden403),
        }),
        [authorizedAssignment, isLoading, finalError, isValidating, mutate, accessDeniedError, isForbidden403]
    );

    return memoizedValue;
}

export async function updateAssignment(
    id: number,
    formData: IcreateAssignment,
    userOverride?: User | null
) {
    const user = getActiveUser(userOverride);

    // 1. Verify user authentication
    if (!user) {
        toast.error("Unauthorized: Please log in to update assignment.");
        return null;
    }

    // 2. Role restriction: Students cannot update assignments
    const role = String(user.userType ?? user.authType ?? user.roleName ?? '').toLowerCase();
    if (role === 'student' || user.userType === 'student') {
        toast.error("Access denied: Students are not permitted to update assignments.");
        return null;
    }

    // 3. Institute check on payload
    const rawUser = user as Record<string, unknown>;
    const userInstituteId =
        user.instituteId ??
        rawUser.institute_id ??
        user.data?.instituteId ??
        (user.data as Record<string, unknown> | undefined)?.institute_id;
    const formInstituteId = formData.instituteId ?? formData.institute_id;

    if (
        userInstituteId !== undefined &&
        userInstituteId !== null &&
        formInstituteId !== undefined &&
        formInstituteId !== null &&
        Number(userInstituteId) !== Number(formInstituteId) &&
        role !== 'super_admin'
    ) {
        toast.error("Access denied: Cannot update an assignment for another institute.");
        return null;
    }

    // 4. Verify existing record authorization if cached or available
    try {
        const cached = await getAssignmentByIdDB(id);
        if (cached && !canEditAssignment(cached, user)) {
            toast.error("Access denied: You do not have permission to update this assignment.");
            return null;
        }
    } catch {
        // Ignore cache verification error
    }

    const url = endpoints.assignment.update(id);
    try {
        const res = await axiosInstance.put(url, formData);
        await globalMutate((key) => typeof key === 'string' && key.startsWith(endpoints.assignment.getAll));
        await globalMutate(endpoints.assignment.details(id));
        return res;
    } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
            toast.error("Access denied: 403 Forbidden - You cannot modify this assignment.");
        } else {
            toast.error(getApiErrorMessage(err, 'Failed to update Assignment'));
        }
        return null;
    }
}

export async function deleteAssignment(
    id: number,
    assignmentRecord?: IAssignmentItem | null,
    userOverride?: User | null
) {
    const user = getActiveUser(userOverride);

    // 1. Verify user authentication
    if (!user) {
        toast.error("Unauthorized: Please log in to delete assignment.");
        return false;
    }

    // 2. Role restriction: Students cannot delete assignments
    const role = String(user.userType ?? user.authType ?? user.roleName ?? '').toLowerCase();
    if (role === 'student' || user.userType === 'student') {
        toast.error("Access denied: Students are not permitted to delete assignments.");
        return false;
    }

    // 3. Verify record authorization
    let target = assignmentRecord;
    if (!target) {
        try {
            target = await getAssignmentByIdDB(id);
        } catch {
            // Ignore cache read error
        }
    }

    if (target && !canDeleteAssignment(target, user)) {
        toast.error("Access denied: You do not have permission to delete this assignment.");
        return false;
    }

    const url = endpoints.assignment.delete(id);
    try {
        const res = await axiosInstance.delete(url);
        if (res.status === 200) {
            await globalMutate((key) => typeof key === 'string' && key.startsWith(endpoints.assignment.getAll));
            await globalMutate(endpoints.assignment.details(id));
            return true;
        }
        return false;
    } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
            toast.error("Access denied: 403 Forbidden - You cannot delete this assignment.");
        } else {
            toast.error(getApiErrorMessage(err, 'Failed to delete assignment'));
        }
        return false;
    }
}

export function useSearchAssignments(searchFor: string) {
    return useFaculties(searchFor);
}