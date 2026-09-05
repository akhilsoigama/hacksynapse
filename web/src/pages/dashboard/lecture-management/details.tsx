

// ----------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useParams } from "../../../hooks/useParams";
import { ILecture } from "../../../types/material";
import { useGetLecture } from "../../../action/material";
import { MaterialDetailsView } from "../../../section/Student-management/Materials-management/view";

export default function Page() {
  const { id } = useParams();

  const [data, setData] = useState<ILecture | undefined>(undefined);

  const lectureId = id ? (!isNaN(Number(id)) ? Number(id) : id) : null;
  const { lecture } = useGetLecture(lectureId);

  useEffect(() => {
    if (lecture) {
      setData(lecture);
    }
  }, [lecture]);
   useEffect(() => {
    document.title = "RuralSpark: Materials details ";
  }, []);
  return (
    <>
      <MaterialDetailsView currentData={data} />
    </>
  );
}
