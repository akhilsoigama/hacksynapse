import { useEffect, useState } from "react";
import { useAssignment, canEditAssignment } from "../../../action/assignment";
import { useParams } from "../../../hooks/useParams";
import { IAssignmentItem } from "../../../types/assignment";
import { AssignmentEditView } from "../../../section/Student-management/Assignment-master/view";
import { Translated } from "../../../components/common/translator/translator";
import { useUser } from "../../../atoms/userAtom";
import { useNavigate } from "react-router-dom";

export default function AssignmentEditPage(){
    const { id } = useParams();
    const assignmentId = Number(id);
    const { user } = useUser();
    const navigate = useNavigate();

    const { assignment, isLoading, assignmentError, isAccessDenied } = useAssignment(assignmentId);
    const [data, setData] = useState<IAssignmentItem | null>(null);

    const hasEditPermission = Boolean(assignment && user && canEditAssignment(assignment, user));

    useEffect(() => {
        if (hasEditPermission && assignment) {
            setData(assignment);
        } else {
            setData(null);
        }
    }, [assignment, hasEditPermission]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="ml-2"><Translated text="Loading assignment data..."/></span>
            </div>
        );
    }

    if (isAccessDenied || (assignment && !hasEditPermission)) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <div className="text-red-500 font-medium text-lg">
                    <Translated text="Access Denied: You do not have permission to view or edit this assignment."/>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/dashboard/faculty-management/assignment/list")}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium transition"
                >
                    <Translated text="Back to Assignments"/>
                </button>
            </div>
        );
    }

    if (assignmentError) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <div className="text-red-500">
                    <Translated text={`Error loading assignment: ${assignmentError.message}`}/>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/dashboard/faculty-management/assignment/list")}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium transition"
                >
                    <Translated text="Back to Assignments"/>
                </button>
            </div>
        );
    }

    if (!isLoading && !assignment) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <div className="text-gray-500">
                    <Translated text="Assignment not found"/>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/dashboard/faculty-management/assignment/list")}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium transition"
                >
                    <Translated text="Back to Assignments"/>
                </button>
            </div>
        );
    }

    return <AssignmentEditView currentData={data} />;
}