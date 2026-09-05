import { useEffect } from "react";
import InstituteListView from "../../../section/Nabha-management/institute-management/view/institute-list-view";

export default function Institute() {
  useEffect(() => {
    document.title = "RuralSpark: All Institute List";
  }, []);

  return <InstituteListView />;
}