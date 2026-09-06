import useSWR from "swr";
import { ICreateGovtEvent, IGovtEvent, IUpdateGovtEvent } from "../types/govtEvent";
import axiosInstance, { endpoints, fetcher } from "../utils/axios";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { mutate as globalMutate } from "swr";
import { useUser } from "../atoms/userAtom";
import { getGovtEventDB, setGovtEventDB, addToGovtEventSyncQueue, mutateGovtEventCache, getGovtEventSyncQueue } from "../indexDB/govtEvent";

const swrOptions = {
    revalidateIfStale: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
};

export function useGetAllGovtEvents(searchFor?: string) {
    const { user } = useUser();
    const url = searchFor === 'create'
        ? `${endpoints.govtEvent.getAll}?searchFor=${searchFor}`
        : endpoints.govtEvent.getAll;

    const { data, isLoading, error, isValidating, mutate } = useSWR<{
        data: IGovtEvent[];
    }>(url, fetcher, swrOptions);

    const [offlineEvents, setOfflineEvents] = useState<IGovtEvent[]>([]);

    useEffect(() => {
        const fetchOfflineData = async () => {
            try {
                const localData = await getGovtEventDB();
                const syncQueueData = await getGovtEventSyncQueue();
                
                // Merge SWR cache (if any) with manual IndexedDB cache and Sync Queue
                const swrData = data?.data || [];
                const allData = [...syncQueueData, ...swrData, ...localData];
                
                // Deduplicate by ID / UUID
                const uniqueData = Array.from(new Map(allData.map((item: any) => [item.id || item.uuid, item])).values());
                
                let filtered = uniqueData;
                
                if (user?.isInstitute && user?.data?.instituteId) {
                    filtered = filtered.filter((item: any) => item.instituteId === user.data?.instituteId || !item.instituteId);
                }
                
                console.log("[GOVT EVENT OFFLINE] IndexedDB / Cache merged events:", filtered);
                setOfflineEvents(filtered);
            } catch (err) {
                console.error("[GOVT EVENT OFFLINE] Error reading local data:", err);
            }
        };

        if (typeof window !== 'undefined' && !navigator.onLine) {
            fetchOfflineData();
        } else if (data?.data && data.data.length > 0) {
            setGovtEventDB(data.data);
        }
    }, [data, user, error]);

    // Use offlineEvents if offline, otherwise default to SWR data (which also has cache if fetcher intercepted error)
    const finalData = (typeof window !== 'undefined' && !navigator.onLine ? offlineEvents : data?.data) || [];

    const memoizedValue = useMemo(
        () => ({
            govtEvents: finalData,
            govtEventsLoading: isLoading && typeof window !== 'undefined' && navigator.onLine,
            govtEventsError: typeof window !== 'undefined' && !navigator.onLine ? undefined : error,
            govtEventsValidating: isValidating,
            govtEventsEmpty: (!isLoading && finalData.length === 0),
            govtEventsMutate: mutate,
        }),
        [finalData, error, isLoading, isValidating, mutate]
    );

    return memoizedValue;
}

export function useGetGovtEvent(govtEventId: number) {
    const url = govtEventId ? endpoints.govtEvent.details(govtEventId) : null;

    const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: IGovtEvent }>(
        url,
        fetcher,
        {
            ...swrOptions,
            onError: (err) => {
                console.error("🔴 usegovtEvent Error:", err);
                toast.error("Failed to fetch govtEvent data");
            },
        }
    );
    const memoizedValue = useMemo(
        () => ({
            govtEvent: data?.data || null,
            govtEventLoading: isLoading,
            govtEventError: error,
            govtEventValidating: isValidating,
            govtEventEmpty: !isLoading && !error && !data?.data,
            govtEventMutate: mutate,
        }),
        [data, error, isLoading, isValidating, mutate]
    );

    return memoizedValue;
}

export function useGovtEventMutations() {
    const { mutate: mutateAll } = useSWR(endpoints.govtEvent.getAll);
    const { mutate: mutateCreate } = useSWR(`${endpoints.govtEvent.getAll}?searchFor=create`);

    const refreshgovtEvents = async () => {
        try {
            await Promise.all([
                mutateAll(),
                mutateCreate()
            ]);
        } catch (error) {
            console.error('🔴 Failed to refresh govtEvent cache:', error);
        }
    };

    return { refreshgovtEvents };
}


const updateSWRCache = async (action: 'CREATE' | 'UPDATE' | 'DELETE', eventData: any) => {
    const keys = [
        endpoints.govtEvent.getAll,
        `${endpoints.govtEvent.getAll}?searchFor=create`,
        eventData?.id ? endpoints.govtEvent.details(eventData.id) : null
    ].filter(Boolean) as string[];

    const updater = (current: any) => {
        if (!current) return current;
        
        if (current.data && !Array.isArray(current.data)) {
             if (action === 'UPDATE' && current.data.id === eventData.id) {
                 return { ...current, data: { ...current.data, ...eventData } };
             }
             if (action === 'DELETE' && current.data.id === eventData.id) {
                 return null;
             }
             return current;
        }
        
        const arr = Array.isArray(current.data) ? current.data : (Array.isArray(current) ? current : null);
        if (!arr) return current;

        let newArr = [...arr];
        if (action === 'CREATE') {
            if (!newArr.some((e: any) => e.id === eventData.id)) {
                newArr.unshift(eventData);
            }
        } else if (action === 'UPDATE') {
            newArr = newArr.map((e: any) => e.id === eventData.id ? { ...e, ...eventData } : e);
        } else if (action === 'DELETE') {
            newArr = newArr.filter((e: any) => e.id !== eventData.id);
        }

        if (Array.isArray(current.data)) {
            return { ...current, data: newArr };
        }
        return newArr;
    };

    for (const key of keys) {
        await globalMutate(key, updater, { revalidate: false });
    }
};

export async function createGovtEvent(govtEventData: ICreateGovtEvent, userId: number = 0, instituteId: number = 0, departmentId: number = 0) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
        const uuid = crypto.randomUUID();
        const payload = {
            ...govtEventData,
            id: Date.now(), // Fake ID to satisfy UI list keys while offline
            uuid,
            action: 'CREATE',
            status: 'pending',
            instituteId,
            departmentId,
            createdBy: userId,
        };
        await addToGovtEventSyncQueue(payload);
        
        // Trigger SWR mutate to update the UI list with the new offline event
        await globalMutate(endpoints.govtEvent.getAll);
        await globalMutate(`${endpoints.govtEvent.getAll}?searchFor=create`);
        
        toast.success("Offline: Government Event saved locally and will sync when online.");
        return { offline: true, uuid };
    }

    try {
        const res = await axiosInstance.post(endpoints.govtEvent.create, govtEventData)
        if (res.status == 201 || res.status == 200) {
            toast.success("Government Event created successfully");

            const newEvent = res.data.data || res.data;
            await mutateGovtEventCache('CREATE', newEvent);
            await updateSWRCache('CREATE', newEvent);

            return newEvent;
        }
        else {
            toast.error("Failed to create Government Event");
            return null;
        }
    } catch (error: unknown) {
        const errorMessage = axios.isAxiosError(error)
            ? (typeof error.response?.data?.message === "string" ? error.response.data.message : error.message)
            : error instanceof Error
                ? error.message
                : "Something went wrong";
        toast.error(errorMessage);
        return null;
    }
}

export async function updateGovtEvent(govtEventId: number, formData: IUpdateGovtEvent) {
    try {
        const res = await axiosInstance.put(endpoints.govtEvent.update(govtEventId), formData);
        if (res.status == 200 || res.status == 201) {
            const updatedEvent = res.data.data || res.data;
            toast.success("Update Government Event successfully");
            
            await mutateGovtEventCache('UPDATE', updatedEvent);
            await updateSWRCache('UPDATE', updatedEvent);
            
            return updatedEvent
        } else {
            toast.error("failed to Update Government Event");
        }
    } catch (err: unknown) {
        const errorMessage = axios.isAxiosError(err)
            ? (typeof err.response?.data?.message === "string" ? err.response.data.message : 'Failed to update Government Event')
            : 'Failed to update Government Event';
        toast.error(errorMessage);
        return null;
    }
}

export async function deleteGovtEvent(id: number) {
    const url = endpoints.govtEvent.delete(id);
    try {
        const res = await axiosInstance.delete(url);

        if (res.status == 200 || res.status == 204) {
            toast.success("Government Event Delete successfully");
            
            await mutateGovtEventCache('DELETE', { id });
            await updateSWRCache('DELETE', { id });
            
            return res.data;
        } else {
            toast.error(" failed to delete Government Event ");
        }
    } catch (err: unknown) {
        const errorMessage = axios.isAxiosError(err)
            ? (typeof err.response?.data?.message === "string" ? err.response.data.message : 'Failed to delete Government Event')
            : 'Failed to delete Government Event';
        toast.error(errorMessage);
        return null;
    }
}