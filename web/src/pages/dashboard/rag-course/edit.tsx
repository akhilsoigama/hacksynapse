import { useEffect } from "react";
import { useParams } from "../../../hooks/useParams";
import { useCourse } from "../../../action/ragCourse";
import { RagCourseEditView } from "../../../section/Skill-learning/rag/view";

export default function RagCourseEditPage() {
  const { id } = useParams();
  const { course, isLoading, courseError } = useCourse(id);

  useEffect(() => {
    document.title = "RuralSpark: Edit Course";
  }, []);

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

  return <RagCourseEditView currentData={course} />;
}
