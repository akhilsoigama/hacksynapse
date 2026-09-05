import { lazy, Suspense, useMemo, useState } from 'react';
import { IAssignmentItem } from '../../../types/assignment';
import { useNavigate } from 'react-router-dom';
import type { Assignment } from '../../../components/assignments/AssignmentsLayout';
import SearchAndFilter from '../../../components/common/SearchAndFilter';
import { useUser } from '../../../atoms/userAtom';
import { canViewAssignment, canEditAssignment, canDeleteAssignment } from '../../../action/assignment';
import { toast } from 'sonner';
const AssignmentsLayout = lazy(() => import('../../../components/assignments/AssignmentsLayout'));

const AssignmentList = ({
  assignmentses,
  submissionCounts,
  onEdit,
  onView,
  onShowSubmissions,
  onDelete,
  onCreate,
  isLoading = false
}: {
  assignmentses: IAssignmentItem[];
  submissionCounts?: Record<string, number>;
  onEdit?: (assignment: IAssignmentItem) => void;
  onView?: (assignment: IAssignmentItem) => void;
  onShowSubmissions?: (assignment: IAssignmentItem) => void;
  onDelete?: (id: number) => void;
  onCreate?: () => void;
  isLoading?: boolean;
}) => {
  const navigate = useNavigate();
  const { user } = useUser();

  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all-statuses');

  const role = String(user?.userType ?? user?.authType ?? user?.roleName ?? '').toLowerCase();
  const isStudent = role === 'student' || user?.userType === 'student';

  const visibleAssignments = useMemo(() => {
    if (!assignmentses) return [];
    if (!user) return assignmentses;
    return assignmentses.filter((item) => canViewAssignment(item, user));
  }, [assignmentses, user]);

  const handleCreate = () => {
    if (onCreate) onCreate();
    else navigate('faculty-management/assignment/new');
  };

  const mappedAssignments = useMemo<Assignment[]>(() => {
    return (visibleAssignments ?? []).map((item) => ({
      id: String(item.id),
      title: item.assignmentTitle,
      subject: item.subject,
      department: {
        id: String(item.departmentId),
        departmentName: item.department?.departmentName ?? String(item.departmentId),
      },
      faculty: {
        id: String(item.facultyId),
        name: item.faculty?.facultyName ?? String(item.facultyId),
      },
      assignedTo: item.std,
      type: item.assignmentFile ? 'File' : 'General',
      description: item.assignmentDescription,
      dueDate: new Date(item.dueDate).toISOString(),
      marks: item.marks,
      points: item.marks,
      submissions: submissionCounts?.[String(item.id)] || 0,
      totalStudents: Math.max(submissionCounts?.[String(item.id)] || 0, 1),
      status: item.isActive ? 'Active' : 'Inactive',
    }));
  }, [visibleAssignments, submissionCounts]);

  const filteredAssignments = useMemo(() => {
    return mappedAssignments.filter((assignment) => {
      const matchSearch =
        !searchValue ||
        assignment.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        assignment.description.toLowerCase().includes(searchValue.toLowerCase());

      const matchStatus =
        statusFilter === 'all-statuses' ||
        (statusFilter === 'active' ? assignment.status === 'Active' : assignment.status === 'Inactive');

      return matchSearch && matchStatus;
    });
  }, [mappedAssignments, searchValue, statusFilter]);


  if (isLoading) return null;

  return (
    <Suspense fallback={null}>
      <AssignmentsLayout
        role="faculty"
        onCreate={isStudent ? undefined : handleCreate}
        filters={{
          searchInput: (
            <SearchAndFilter
              searchTerm={searchValue}
              onSearchChange={setSearchValue}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onReset={() => {
                setSearchValue('');
                setStatusFilter('all-statuses');
              }}
              filterOptions={{
                status: [
                  { value: 'all-statuses', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
              }}
              placeholder="Search assignments"
            />
          ),
        }}
        assignments={filteredAssignments}
        onEdit={
          isStudent
            ? undefined
            : (id) => {
                if (!onEdit) {
                  return;
                }

                const selectedAssignment = (visibleAssignments ?? []).find((item) => String(item.id) === id);
                if (selectedAssignment) {
                  if (!canEditAssignment(selectedAssignment, user)) {
                    toast.error("Access denied: You do not have permission to edit this assignment.");
                    return;
                  }
                  onEdit(selectedAssignment);
                }
              }
        }
        onDelete={
          isStudent
            ? undefined
            : (id) => {
                if (!onDelete) {
                  return;
                }

                const selectedAssignment = (visibleAssignments ?? []).find((item) => String(item.id) === id);
                if (selectedAssignment) {
                  if (!canDeleteAssignment(selectedAssignment, user)) {
                    toast.error("Access denied: You do not have permission to delete this assignment.");
                    return;
                  }
                  onDelete(selectedAssignment.id);
                }
              }
        }
        onView={(id) => {
          const selectedAssignment = (visibleAssignments ?? []).find((item) => String(item.id) === id);

          if (selectedAssignment) {
            if (!canViewAssignment(selectedAssignment, user)) {
              toast.error("Access denied: You do not have permission to view this assignment.");
              return;
            }

            if (onView) {
              onView(selectedAssignment);
              return;
            }

            navigate(`/dashboard/faculty-management/assignment/${id}/edit`);
          }
        }}
        onShowSubmissions={(id) => {
          const selectedAssignment = (visibleAssignments ?? []).find((item) => String(item.id) === id);
          if (selectedAssignment && onShowSubmissions) {
            if (!canViewAssignment(selectedAssignment, user)) {
              toast.error("Access denied: You do not have permission to view submissions for this assignment.");
              return;
            }
            onShowSubmissions(selectedAssignment);
          }
        }}
      />
    </Suspense>
  );
};

export default AssignmentList;