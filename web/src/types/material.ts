export type ILecture = {
  id?: number;
  uuid?: string;
  title: string;
  description?: string | null;
  contentType: 'video' | 'pdf' | 'audio' | 'text' | 'image';
  facultyId?: number | null;
  faculty_id?: number | null;
  subject: string | null;
  std: string | null;
  departmentId?: number | null;
  department_id?: number | null;
  instituteId?: number | string | null;
  institute_id?: number | string | null;
  createdBy?: number | string | null;
  created_by?: number | string | null;
  updatedBy?: number | string | null;
  updated_by?: number | string | null;
  chapterTopic?: string | null;
  chapter_topic?: string | null;
  learningObjectives?: string | null;
  learning_objectives?: string | null;
  difficultyLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  difficulty_level?: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  contentUrl?: string | null;
  content_url?: string | null;
  durationInSeconds?: number | null;
  duration_in_seconds?: number | null;
  textContent?: string | null;
  text_content?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  syncStatus?: 'synced' | 'pending' | 'failed';
  createdAt?: string | number;
  updatedAt?: string | number;
};

export type IMaterial = ILecture;
export type ICreateLecture = Omit<ILecture, 'id'>;
export type IUpdateLecture = Partial<Omit<ILecture, 'id'>>;
export type ICreateMaterial = ICreateLecture;
export type IUpdateMaterial = IUpdateLecture;

export interface IMaterialSyncQueueItem {
  id?: number;
  uuid: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  instituteId: string | number;
  departmentId?: string | number | null;
  createdBy: string | number;
  payload: Record<string, unknown>;
  createdAt?: number;
  retryCount?: number;
  lastAttemptAt?: string | null;
  error?: string | null;
}
