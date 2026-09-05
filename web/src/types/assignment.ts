export type IAssignmentItem = {
    id: number

    assignmentTitle: string
    assignmentDescription: string
    subject: string

    assignmentFile: string
    std: string
    instituteId: number

    facultyId: number
    faculty?: {
        id: number
        facultyName: string
    }
    dueDate: Date
    marks: number

    departmentId: number
    department?:{
        id: number
        departmentName: string
    }
    isActive: boolean
    createdBy?: number | null
    created_by?: number | null
    institute_id?: number | null
    department_id?: number | null
    faculty_id?: number | null
    updatedBy?: number | null
    updated_by?: number | null
    createdAt?: string | Date
    updatedAt?: string | Date
}

export type IcreateAssignment = {
    id: number

    assignmentTitle: string
    assignmentDescription: string
    subject: string

    assignmentFile: string | null
    std: string
    instituteId: number

    facultyId: number
    dueDate: string
    marks: number

    departmentId: number
    isActive: boolean
    createdBy?: number | null
    created_by?: number | null
    institute_id?: number | null
    department_id?: number | null
    faculty_id?: number | null
}

export type IupdateAssignment = {
    id: number

    assignmentTitle: string
    assignmentDescription: string
    subject: string

    assignmentFile: string | null
    std: string
    instituteId: number

    facultyId: number
    dueDate: string
    marks: number

    departmentId: number
    isActive: boolean
    createdBy?: number | null
    created_by?: number | null
    institute_id?: number | null
    department_id?: number | null
    faculty_id?: number | null
}