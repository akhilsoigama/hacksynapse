// src/hooks/useStudentQueryOfflineSync.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import axiosInstance, { endpoints } from '../utils/axios';
import { useUser } from '../atoms/userAtom';
import {
  getStudentQueryByIdDB,
  getPendingStudentQuerySyncQueue,
  removeStudentQuerySyncQueueItem,
  setStudentQueryDB,
  updateStudentQuerySyncQueueItem,
} from '@/indexDB/studentQuery';
import { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';

const MAX_RETRY_COUNT = 3;

export function useStudentQueryOfflineSync() {
  const { user } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isSyncingRef = useRef(false);

  const triggerSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    if (isSyncingRef.current) return;
    if (!user) return;

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      // 1. Read pending tasks and validate tenant/user scope
      const pendingTasks = await getPendingStudentQuerySyncQueue(user);
      if (pendingTasks.length === 0) {
        setSyncCount(0);
        return;
      }

      setSyncCount(pendingTasks.length);

      // 2. Filter out tasks that exceeded max retries or permanent authorization failure
      const eligibleTasks = pendingTasks.filter(
        (task) => (task.retryCount ?? 0) < MAX_RETRY_COUNT && task.status !== 'completed'
      );

      if (eligibleTasks.length === 0) {
        return;
      }

      // Mark tasks as syncing
      for (const task of eligibleTasks) {
        if (task.id) {
          await updateStudentQuerySyncQueueItem(task.id, { status: 'syncing' });
        }
      }

      // 3. Prepare payload for bulk sync
      const payloadItems = eligibleTasks.map((t) => {
        const payloadObj =
          typeof t.payload === 'object' && t.payload !== null
            ? (t.payload as Record<string, unknown>)
            : {};
        return {
          uuid: t.uuid,
          action: t.action,
          instituteId: t.instituteId,
          departmentId: t.departmentId,
          createdBy: t.createdBy,
          payload: t.payload,
          ...payloadObj,
        };
      });

      // 4. Send to sync endpoint (supporting /api/studentQuery/sync and /student-queries/sync)
      let response: { data?: { results?: Array<{ uuid: string; status: 'synced' | 'failed' | 'rejected'; id?: number; error?: string }> } } | null = null;

      try {
        const syncUrl = endpoints.studentQuery?.sync || '/api/studentQuery/sync';
        response = await axiosInstance.post(syncUrl, {
          items: payloadItems,
        });
      } catch (err: unknown) {
        // Fallback to /student-queries/sync if /api/studentQuery/sync returns 404
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          try {
            response = await axiosInstance.post('/student-queries/sync', {
              items: payloadItems,
            });
          } catch {
            throw err;
          }
        } else {
          throw err;
        }
      }

      const results: Array<{
        uuid: string;
        status: 'synced' | 'failed' | 'rejected';
        id?: number;
        error?: string;
      }> = response?.data?.results || [];

      let syncedSuccessCount = 0;

      // 5. Process server response per item
      for (const result of results) {
        const matchingTask = eligibleTasks.find((t) => t.uuid === result.uuid);
        if (!matchingTask || !matchingTask.id) continue;

        if (result.status === 'synced') {
          syncedSuccessCount++;
          // A. Remove completed item from sync queue
          await removeStudentQuerySyncQueueItem(matchingTask.id);

          // B. Update local IndexedDB record with server ID & synced status
          const localRecord = await getStudentQueryByIdDB(result.uuid, user);
          if (localRecord) {
            localRecord.id = result.id || localRecord.id;
            localRecord.syncStatus = 'synced';
            await setStudentQueryDB(localRecord);
          }
        } else {
          // Failure handling: increment retryCount or mark failed
          const isAuthOrValidationError =
            result.error?.includes('Forbidden') ||
            result.error?.includes('Unauthorized') ||
            result.error?.includes('department') ||
            result.error?.includes('validation');

          const newRetryCount = (matchingTask.retryCount ?? 0) + 1;
          const newStatus =
            isAuthOrValidationError || newRetryCount >= MAX_RETRY_COUNT
              ? 'failed'
              : 'pending';

          await updateStudentQuerySyncQueueItem(matchingTask.id, {
            status: newStatus,
            retryCount: newRetryCount,
            lastAttemptAt: new Date().toISOString(),
            error: result.error || 'Sync failed',
          });
        }
      }

      setLastSyncTime(new Date());

      // 6. Refresh UI if any item succeeded
      if (syncedSuccessCount > 0) {
        toast.success(
          `Successfully synchronized ${syncedSuccessCount} student query/queries.`
        );
        await globalMutate(
          (key) =>
            typeof key === 'string' &&
            (key.startsWith('/student-queries') || key.startsWith('/api/studentQuery'))
        );
      }

      // Re-read remaining pending count
      const remaining = await getPendingStudentQuerySyncQueue(user);
      setSyncCount(remaining.length);
    } catch (err: unknown) {
      // Network or general server error: reset syncing status to pending for next retry
      const pendingTasks = await getPendingStudentQuerySyncQueue(user);
      for (const task of pendingTasks) {
        if (task.id && task.status === 'syncing') {
          await updateStudentQuerySyncQueueItem(task.id, {
            status: 'pending',
            retryCount: (task.retryCount ?? 0) + 1,
            lastAttemptAt: new Date().toISOString(),
          });
        }
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user]);

  // Listen to browser online event
  useEffect(() => {
    const handleOnline = () => {
      triggerSync();
    };

    window.addEventListener('online', handleOnline);

    // Initial check on mount if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [triggerSync]);

  return {
    isSyncing,
    syncCount,
    triggerSync,
    lastSyncTime,
  };
}
