import { useEffect } from "react";
import { RagCourseCreateView } from "../../../section/Skill-learning/rag/view";

export default function RagCourseCreatePage() {
  useEffect(() => {
    document.title = "RuralSpark: Create Course";
  }, []);

  return <RagCourseCreateView />;
}
