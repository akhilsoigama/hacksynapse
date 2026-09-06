export interface ISubModuleVideo {
  title: string;
  duration?: string;
  videoType?: 'youtube' | 'uploaded';
  videoUrl: string;
}

export interface ISubModule {
  title: string;
  description?: string;
  videoType?: 'youtube' | 'uploaded';
  videoUrl?: string;
  videos?: ISubModuleVideo[];
}

export interface IRagCourse {
  id: string | number;
  title: string;
  category: string;
  subCategory?: string;
  description: string;
  tags?: string[];
  videoType?: 'youtube' | 'uploaded';
  videoUrl: string;
  subModules?: ISubModule[];
  createdAt?: string;
  updatedAt?: string;
  relevanceScore?: number;
}

export interface ICreateRagCourse {
  title: string;
  category: string;
  subCategory?: string;
  description: string;
  tags?: string[];
  videoType?: 'youtube' | 'uploaded';
  videoUrl: string;
  subModules?: ISubModule[];
}

export interface IUpdateRagCourse extends Partial<ICreateRagCourse> {
  id?: string | number;
}
