import { atom } from "jotai";
import { IAssignmentItem } from "../types/assignment";

export const assignmentListAtom = atom<IAssignmentItem[]>([]);
export const selectedAssignmentAtom = atom<IAssignmentItem | null>(null);
export const assignmentLoadingAtom = atom<boolean>(false);
