import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRouter } from '@/hooks/useRouter';
import DeleteModal from '@/components/common/deleteModel';
import RagCourseList from '../rag-course-list';
import { useCourses, deleteCourseService } from '@/action/ragCourse';
import { IRagCourse } from '@/types/ragCourse';

export default function RagCourseListView() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get('category') || undefined;
  const urlSubCategory = searchParams.get('subCategory') || undefined;
  const { courses, coursesLoading, coursesMutate } = useCourses(undefined, urlCategory, urlSubCategory);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    course: IRagCourse | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    course: null,
    isLoading: false,
  });

  const handleEditCourse = useCallback(
    (course: IRagCourse) => {
      router.push(`/dashboard/skills/rag/${course.id}/edit`);
    },
    [router]
  );

  const handleDeleteCourse = useCallback(
    (id: string | number) => {
      const courseToDelete = courses.find((c) => String(c.id) === String(id));
      if (!courseToDelete) return;

      setDeleteModal({
        isOpen: true,
        course: courseToDelete,
        isLoading: false,
      });
    },
    [courses]
  );

  const handleConfirmDelete = async () => {
    if (!deleteModal.course) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const deleted = await deleteCourseService(deleteModal.course.id);
      if (deleted) {
        await coursesMutate();
        setDeleteModal({
          isOpen: false,
          course: null,
          isLoading: false,
        });
      } else {
        setDeleteModal((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleCloseModal = () => {
    if (!deleteModal.isLoading) {
      setDeleteModal({
        isOpen: false,
        course: null,
        isLoading: false,
      });
    }
  };

  const handleCreateCourse = () => {
    router.push('/dashboard/skills/rag/new');
  };

  return (
    <div>
      <RagCourseList
        courses={courses}
        onEdit={handleEditCourse}
        onDelete={handleDeleteCourse}
        onCreate={handleCreateCourse}
        isLoading={coursesLoading}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Delete Course"
        description="This will permanently delete the course, its video modules, and remove all associated AI vector embeddings. Are you sure you want to continue?"
        itemName={deleteModal.course?.title}
        isLoading={deleteModal.isLoading}
        confirmText="Delete Course"
        cancelText="Cancel"
      />
    </div>
  );
}
