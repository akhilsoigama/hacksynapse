import { useEffect } from "react";
import InstituteCreateView from "../../../section/Nabha-management/institute-management/view/institute-create-view";

export default function InstituteCreatePage() {
  useEffect(() => {
    document.title = "RuralSpark: Create New Institute";
  }, []);

  return <InstituteCreateView />;
}