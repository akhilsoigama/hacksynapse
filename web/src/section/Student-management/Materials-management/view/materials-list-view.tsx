import { useState } from "react";
import { useRouter } from "../../../../hooks/useRouter";
import DeleteModal from "../../../../components/common/deleteModel";
import MaterialList from "../materials-list";
import { deleteLecture, useGetLectures } from "../../../../action/material";
import { ILecture } from "../../../../types/material";
import { useMaterialOfflineSync } from "../../../../hooks/useMaterialOfflineSync";
import { FaCloudUploadAlt, FaWifi } from "react-icons/fa";
import { Translated } from "../../../../components/common/translator/translator";

const MaterialsListView = () => {
    const router = useRouter();
    const { lectures, isLoading } = useGetLectures();
    const { isSyncing, syncCount, triggerSync } = useMaterialOfflineSync();
    const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        lectureId: null as number | null,
        isLoading: false,
    });

    const handleEditLecture = (lecture: ILecture) => {
        if (!lecture.id) return;
        router.push(`/dashboard/faculty-management/material/${lecture.id}/edit`);
    };

    const handleDeleteLecture = (id: number) => {
        setDeleteModal({
            isOpen: true,
            lectureId: id,
            isLoading: false,
        });
    };

    const handleViewLecture = (lecture: ILecture) => {
        const targetId = lecture.id || lecture.uuid;
        if (!targetId) return;
        router.push(`/dashboard/faculty-management/material/${targetId}/details`);
    };

    const handleConfirmDelete = async () => {
        if (!deleteModal.lectureId) return;

        setDeleteModal(prev => ({ ...prev, isLoading: true }));

        try {
            await deleteLecture(deleteModal.lectureId);
            setDeleteModal({
                isOpen: false,
                lectureId: null,
                isLoading: false,
            });
        } catch {
            setDeleteModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleCloseModal = () => {
        setDeleteModal({
            isOpen: false,
            lectureId: null,
            isLoading: false,
        });
    };

    const handleCreateLecture = () => {
        router.push('/dashboard/faculty-management/material/new');
    };

    return (
        <>
            {isOffline && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-4 py-2.5 rounded-xl mx-6 mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <FaWifi className="opacity-70" />
                        <span>
                            <Translated text="Offline Mode: Displaying cached study materials. New creations will sync once reconnected." />
                        </span>
                    </div>
                    {syncCount > 0 && (
                        <span className="bg-amber-500/20 px-2.5 py-0.5 rounded-full font-medium text-xs">
                            {syncCount} <Translated text="pending sync" />
                        </span>
                    )}
                </div>
            )}

            {!isOffline && syncCount > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-xl mx-6 mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <FaCloudUploadAlt className={isSyncing ? "animate-bounce" : ""} />
                        <span>
                            {isSyncing
                                ? <Translated text="Syncing offline study materials to server..." />
                                : <Translated text="Pending study materials waiting for synchronization." />}
                        </span>
                    </div>
                    <button
                        onClick={() => triggerSync()}
                        disabled={isSyncing}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                        {isSyncing ? <Translated text="Syncing..." /> : <Translated text="Sync Now" />}
                    </button>
                </div>
            )}

            <MaterialList
                lectures={lectures}
                onEdit={handleEditLecture}
                onDelete={handleDeleteLecture}
                onCreate={handleCreateLecture}
                onView={handleViewLecture}
                isLoading={isLoading}
            />

            {/* Delete Modal */}
            <DeleteModal
                isOpen={deleteModal.isOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmDelete}
                title="Delete Material"
                description="This will permanently delete the study material. Are you sure you want to continue?"
                isLoading={deleteModal.isLoading}
                confirmText="Delete Material"
                cancelText="Cancel"
            />
        </>
    );
};

export default MaterialsListView;