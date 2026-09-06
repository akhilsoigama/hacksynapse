// src/section/Skill-learning/rag/ragApi.ts

import axiosInstance, { endpoints } from '@/utils/axios';

/**
 * RAG backend endpoints.
 *   POST /api/rag/course       – create / index a course
 *   POST /api/rag/query        – semantic search
 *   GET  /api/rag/courses      – list courses
 *   GET  /api/rag/courses/:id  – course details
 *   DELETE /api/rag/courses/:id– remove course
 *   POST /api/rag/sync         – sync LMS resources
 *   GET  /api/rag/stats        – index metrics
 */

export interface VideoItem {
  title: string;
  videoType: 'youtube' | 'uploaded';
  videoUrl: string;
  duration?: string;
}

export interface SubModule {
  title: string;
  description?: string;
  videos?: VideoItem[];
  videoType?: 'youtube' | 'uploaded';
  videoUrl?: string;
  duration?: string;
}

export interface CreateCoursePayload {
  title: string;
  category: string;
  subCategory: string;
  description: string;
  tags?: string[];
  videoType: 'youtube' | 'uploaded';
  videoUrl: string;
  subModules?: SubModule[];
}

export interface SearchCoursePayload {
  query: string;
  category?: string;
  top_k?: number;
  page?: number;
}

export interface CourseResult {
  id: string;
  title: string;
  category: string;
  subCategory?: string;
  description: string;
  tags: string[];
  videoType?: 'youtube' | 'uploaded';
  videoUrl?: string;
  subModules?: SubModule[];
  relevanceScore?: number;
}

export interface RagStats {
  totalCourses: number;
  totalDocuments: number;
  documentsByType: Record<string, number>;
  embeddingDimensions: number;
  hasExternalApiKey: boolean;
}

export async function createCourse(payload: CreateCoursePayload): Promise<CourseResult> {
  const response = await axiosInstance.post<CourseResult>(endpoints.rag.createCourse, payload);
  return response.data;
}

export async function searchCourses(payload: SearchCoursePayload): Promise<CourseResult[]> {
  const response = await axiosInstance.post<CourseResult[]>(endpoints.rag.searchCourses, payload);
  return response.data;
}

export async function listCourses(params?: {
  category?: string;
  limit?: number;
  page?: number;
}): Promise<CourseResult[]> {
  const response = await axiosInstance.get<CourseResult[]>(endpoints.rag.listCourses, { params });
  return response.data;
}

export async function getCourse(id: string | number): Promise<CourseResult> {
  const response = await axiosInstance.get<CourseResult>(endpoints.rag.getCourse(id));
  return response.data;
}

export async function deleteCourse(id: string | number): Promise<{ success: boolean; id: number }> {
  const response = await axiosInstance.delete<{ success: boolean; id: number }>(
    endpoints.rag.deleteCourse(id)
  );
  return response.data;
}

export async function syncRag(target?: 'materials' | 'lectures' | 'all'): Promise<{
  success: boolean;
  indexedMaterials: number;
  indexedLectures: number;
}> {
  const response = await axiosInstance.post(endpoints.rag.sync, { target });
  return response.data;
}

export async function getRagStats(): Promise<RagStats> {
  const response = await axiosInstance.get<{ success: boolean } & RagStats>(endpoints.rag.stats);
  return response.data;
}
