export type StudentQueryPriority = 'low' | 'medium' | 'high';
export type StudentQueryStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface StudentQueryItem {
  id?: number;
  uuid?: string;
  studentId?: number;
  instituteId?: number | string;
  departmentId?: number | string | null;
  createdBy?: number | string;
  assignedFacultyId?: number | null;
  resolvedByUserId?: number | null;
  title: string;
  description: string;
  subject?: string | null;
  category?: string | null;
  priority: StudentQueryPriority;
  status: StudentQueryStatus;
  response?: string | null;
  resolvedAt?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  student?: {
    id?: number;
    studentName?: string;
    studentId?: string;
  };
  assignedFaculty?: {
    id?: number;
    facultyName?: string;
    facultyId?: string;
  };
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface StudentQuerySyncQueueItem {
  id?: number;
  uuid: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  instituteId: string | number;
  departmentId?: string | number | null;
  createdBy: string | number;
  payload: unknown;
  retryCount?: number;
  lastAttemptAt?: string;
  error?: string;
  createdAt?: number;
}

export interface StudentQueryListFilters {
  page?: number;
  limit?: number;
  status?: StudentQueryStatus;
  priority?: StudentQueryPriority;
}

export interface CreateStudentQueryPayload {
  title: string;
  description: string;
  subject?: string;
  category?: string;
  priority?: StudentQueryPriority;
  assignedFacultyId?: number;
}

export interface UpdateStudentQueryPayload {
  title?: string;
  description?: string;
  subject?: string;
  category?: string;
  priority?: StudentQueryPriority;
  status?: StudentQueryStatus;
  response?: string;
  assignedFacultyId?: number;
  isActive?: boolean;
}
