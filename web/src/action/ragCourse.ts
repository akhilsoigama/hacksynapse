import { useMemo } from 'react';
import axios from 'axios';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import axiosInstance, { endpoints, fetcher } from '../utils/axios';
import { IRagCourse, ICreateRagCourse, IUpdateRagCourse } from '../types/ragCourse';

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5000,
};

export function useCourses(searchQuery?: string, category?: string) {
  const queryParams = new URLSearchParams();
  if (searchQuery && searchQuery.trim()) {
    queryParams.append('query', searchQuery.trim());
  }
  if (category && category !== 'all' && category.trim()) {
    queryParams.append('category', category.trim());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${endpoints.rag.listCourses}?${queryString}`
    : endpoints.rag.listCourses;

  const { data, isLoading, error, isValidating, mutate: coursesMutate } = useSWR<
    IRagCourse[] | { data: IRagCourse[] }
  >(url, fetcher, swrOptions);

  const courses = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as { data: IRagCourse[] }).data)) {
      return (data as { data: IRagCourse[] }).data;
    }
    return [];
  }, [data]);

  return useMemo(
    () => ({
      courses,
      coursesLoading: isLoading,
      coursesError: error,
      coursesValidating: isValidating,
      coursesEmpty: !isLoading && courses.length === 0,
      coursesMutate,
    }),
    [courses, isLoading, error, isValidating, coursesMutate]
  );
}

export function useCourse(courseId: number | string | undefined | null) {
  const url = courseId ? endpoints.rag.getCourse(courseId) : null;

  const { data, isLoading, error, isValidating, mutate: courseMutate } = useSWR<
    IRagCourse | { data: IRagCourse }
  >(url, fetcher, {
    ...swrOptions,
    onError: (err) => {
      console.error('🔴 useCourse Error:', err);
      toast.error('Failed to fetch course details');
    },
  });

  const course = useMemo(() => {
    if (!data) return null;
    if ('data' in data && data.data) return data.data;
    return data as IRagCourse;
  }, [data]);

  return useMemo(
    () => ({
      course,
      isLoading,
      courseError: error,
      courseValidating: isValidating,
      courseMutate,
    }),
    [course, isLoading, error, isValidating, courseMutate]
  );
}

export const createCourseService = async (courseData: ICreateRagCourse): Promise<IRagCourse | null> => {
  try {
    const res = await axiosInstance.post(endpoints.rag.createCourse, courseData);
    if (res.status === 201 || res.status === 200) {
      toast.success('Course created successfully');
      mutate(endpoints.rag.listCourses);
      return res.data.data || res.data;
    } else {
      toast.error('Failed to create course');
      return null;
    }
  } catch (error: unknown) {
    const errorMessage = axios.isAxiosError(error)
      ? typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : error.message
      : error instanceof Error
        ? error.message
        : 'Failed to create course';
    toast.error(errorMessage);
    return null;
  }
};

export const updateCourseService = async (
  courseId: number | string,
  courseData: IUpdateRagCourse
): Promise<IRagCourse | null> => {
  try {
    const res = await axiosInstance.put(endpoints.rag.updateCourse(courseId), courseData);
    if (res.status === 200 || res.status === 201) {
      toast.success('Course updated successfully');
      mutate(endpoints.rag.listCourses);
      mutate(endpoints.rag.getCourse(courseId));
      return res.data.data || res.data;
    } else {
      toast.error('Failed to update course');
      return null;
    }
  } catch (error: unknown) {
    const errorMessage = axios.isAxiosError(error)
      ? typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : error.message
      : error instanceof Error
        ? error.message
        : 'Failed to update course';
    toast.error(errorMessage);
    return null;
  }
};

export const deleteCourseService = async (courseId: number | string): Promise<boolean> => {
  try {
    const res = await axiosInstance.delete(endpoints.rag.deleteCourse(courseId));
    if (res.status === 200 || res.status === 204) {
      toast.success('Course deleted successfully');
      mutate(endpoints.rag.listCourses);
      return true;
    } else {
      toast.error('Failed to delete course');
      return false;
    }
  } catch (error: unknown) {
    const errorMessage = axios.isAxiosError(error)
      ? typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : error.message
      : error instanceof Error
        ? error.message
        : 'Failed to delete course';
    toast.error(errorMessage);
    return false;
  }
};
