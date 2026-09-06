import { useEffect } from 'react';
import axiosInstance from '../utils/axios';
import { getGovtEventSyncQueue, removeFromGovtEventSyncQueue } from '../indexDB/govtEvent';
import { toast } from 'sonner';

export const useGovtEventOfflineSync = () => {
    useEffect(() => {
        const syncOfflineData = async () => {
            if (navigator.onLine) {
                const pendingTasks = await getGovtEventSyncQueue();
                if (pendingTasks.length > 0) {
                    try {
                        const response = await axiosInstance.post('/api/govtEvent/sync', { tasks: pendingTasks });
                        if (response.status === 200 || response.status === 201) {
                            for (const task of pendingTasks) {
                                await removeFromGovtEventSyncQueue(task.uuid);
                            }
                            toast.success('Offline Govt Events synced successfully');
                            // Trigger revalidation here if needed
                        }
                    } catch (error) {
                        console.error('Failed to sync offline Govt Events:', error);
                        toast.error('Failed to sync offline Govt Events');
                    }
                }
            }
        };

        window.addEventListener('online', syncOfflineData);

        return () => {
            window.removeEventListener('online', syncOfflineData);
        };
    }, []);
};
