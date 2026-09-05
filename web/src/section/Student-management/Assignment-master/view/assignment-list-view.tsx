import { useEffect, useRef, useState } from "react";
import {
    deleteAssignment,
    useAssignments,
    canEditAssignment,
    canDeleteAssignment,
    canViewAssignment,
} from "../../../../action/assignment";
import { useAssignmentUploads } from "../../../../action/assignmentUpload";
import { useUser } from "../../../../atoms/userAtom";
import { useRouter } from "../../../../hooks/useRouter";
import AssignmentList from "../assignment-list";
import { IAssignmentItem } from "../../../../types/assignment";
import DeleteModal from "../../../../components/common/deleteModel";
import AssignmentDetailsModal from "./AssignmentDetailsModal";
import { toast } from "sonner";

const AssignmentListView = () => {
    const router = useRouter();
    const { user, isLoading: userLoading } = useUser();

    const { assignments, assignmentLoadind, assignmentMutate } = useAssignments()
    const { submissions } = useAssignmentUploads();

    const prevAssignmentRef = useRef<IAssignmentItem[]>([])

    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        assignment: IAssignmentItem | null;
        isLoading: boolean;
    }>({
        isOpen: false,
        assignment: null,
        isLoading: false,
    });

    const [viewModal, setViewModal] = useState<{
        isOpen: boolean;
        assignment: IAssignmentItem | null;
    }>({
        isOpen: false,
        assignment: null,
    });

    useEffect(() => {
        if (assignments.length > 0) {
            prevAssignmentRef.current = assignments;
        }
    }, [assignments]);

    const stableAssignment = assignments.length > 0 ? assignments : prevAssignmentRef.current;
    const shouldShowLoading = assignmentLoadind || (userLoading && stableAssignment.length === 0);

    const handleEditAssignment = (assignment: IAssignmentItem) => {
        if (!canEditAssignment(assignment, user)) {
            toast.error("Access denied: You do not have permission to edit this assignment.");
            return;
        }
        router.push(`/dashboard/faculty-management/assignment/${assignment.id}/edit`);
    };

    const handleViewAssignment = (assignment: IAssignmentItem) => {
        if (!canViewAssignment(assignment, user)) {
            toast.error("Access denied: You do not have permission to view this assignment.");
            return;
        }
        setViewModal({
            isOpen: true,
            assignment,
        });
    };

    const handleDeleteAssignment = (id: number) => {
        const assignmentDelete = stableAssignment.find((a: IAssignmentItem) => a.id === id);
        if (!assignmentDelete) return;

        if (!canDeleteAssignment(assignmentDelete, user)) {
            toast.error("Access denied: You do not have permission to delete this assignment.");
            return;
        }

        setDeleteModal({
            isOpen: true,
            assignment: assignmentDelete,
            isLoading: false,
        });
    };

    const handleConfirmDelete = async () => {
        if (!deleteModal.assignment) return;

        if (!canDeleteAssignment(deleteModal.assignment, user)) {
            toast.error("Access denied: You do not have permission to delete this assignment.");
            setDeleteModal({
                isOpen: false,
                assignment: null,
                isLoading: false,
            });
            return;
        }

        setDeleteModal(prev => ({ ...prev, isLoading: true }));

        try {
            const deleted = await deleteAssignment(deleteModal.assignment.id, deleteModal.assignment, user);
            if (deleted) {
                await assignmentMutate();
                setDeleteModal({
                    isOpen: false,
                    assignment: null,
                    isLoading: false,
                });
            } else {
                setDeleteModal(prev => ({ ...prev, isLoading: false }));
            }
        } catch {
            setDeleteModal(prev => ({ ...prev, isLoading: false }));
        }
    };


    const handleCloseModal = () => {
        if (!deleteModal.isLoading) {
            setDeleteModal({
                isOpen: false,
                assignment: null,
                isLoading: false,
            });
        }
    };

    const handleCloseViewModal = () => {
        setViewModal({
            isOpen: false,
            assignment: null,
        });
    };

    const handleCreateAssignment = () => {
        router.push('/dashboard/faculty-management/assignment/new');
    };

    const submissionCounts = (submissions || []).reduce<Record<string, number>>((acc, submission) => {
        const key = String(submission.assignmentId || '');
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    return (
        <>
            <AssignmentList
                assignmentses={stableAssignment}
                submissionCounts={submissionCounts}
                onEdit={handleEditAssignment}
                onView={handleViewAssignment}
                onShowSubmissions={(assignment) =>
                    router.push(
                        `/dashboard/faculty-management/assignment/submissions?assignmentId=${assignment.id}`
                    )
                }
                onDelete={handleDeleteAssignment}
                onCreate={handleCreateAssignment}
                isLoading={shouldShowLoading}
            />

            <DeleteModal
                isOpen={deleteModal.isOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmDelete}
                title="Delete Assignment"
                description="This will permanently delete the Assignment and remove all associated data. Are you sure you want to continue?"
                itemName={deleteModal.assignment?.assignmentTitle}
                isLoading={deleteModal.isLoading}
                confirmText="Delete Assignment"
                cancelText="Cancel"
            />

            <AssignmentDetailsModal
                isOpen={viewModal.isOpen}
                assignment={viewModal.assignment}
                onClose={handleCloseViewModal}
                onEdit={(id) => router.push(`/dashboard/faculty-management/assignment/${id}/edit`)}
            />
        </>
    )
}

export default AssignmentListView