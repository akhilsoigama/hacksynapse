import { useParams } from '@/hooks/useParams';
import { useCourse } from '@/action/ragCourse';
import RagCourseNewEditForm from '../rag-course-new-edit-form';
import { IRagCourse } from '@/types/ragCourse';

type Props = {
  currentData?: IRagCourse | null;
};

export default function RagCourseEditView({ currentData }: Props) {
  const { id } = useParams();
  const { course, isLoading, courseError } = useCourse(id);

  if (currentData) {
    return <RagCourseNewEditForm currentData={currentData} />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-sm text-slate-400">
        Loading course details...
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="flex justify-center items-center h-64 text-sm text-red-400">
        {courseError ? 'Failed to load course details' : 'Course not found'}
      </div>
    );
  }

  return <RagCourseNewEditForm currentData={course} />;
}
