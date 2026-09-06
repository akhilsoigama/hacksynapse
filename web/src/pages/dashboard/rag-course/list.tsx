import { useEffect } from "react";
import { RagCourseListView } from "../../../section/Skill-learning/rag/view";

export default function RagCourseListPage() {
  useEffect(() => {
    document.title = "RuralSpark: Course Management";
  }, []);

  return <RagCourseListView />;
}
