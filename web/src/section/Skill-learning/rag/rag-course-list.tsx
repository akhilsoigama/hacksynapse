import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaGraduationCap,
  FaYoutube,
  FaVideo,
} from 'react-icons/fa';
import {
  Check,
  Copy,
  PlayCircle,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '@/theme/AppThemeProvider';
import CommonDataList, {
  ModalField,
} from '@/components/common/commanDataList';
import { IRagCourse } from '@/types/ragCourse';
import { useCourses } from '@/action/ragCourse';
import {
  ALL_CATEGORIES,
  isCategoryMatch,
  isSubCategoryMatch,
  getCanonicalCategory,
  getCanonicalSubCategory,
  getSubCategoriesForCategory,
} from '@/constants/categoryData';

/* -------------------------------------------------------------------------- */
/*  YouTube URL helpers                                                       */
/* -------------------------------------------------------------------------- */

export function extractYoutubePlaylistId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  return listMatch ? listMatch[1] : null;
}

export function extractYoutubeId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let trimmed = url.trim();

  const iframeMatch = trimmed.match(/<iframe\b[^>]*\bsrc=["']([^"']+)["']/i);
  if (iframeMatch) {
    trimmed = iframeMatch[1].trim();
  }

  trimmed = trimmed.replace(/^[<"']+|[>"']+$/g, '');

  // If it's a bare 11-char ID without any URL structure
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed) && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }

  // MUST be a YouTube domain to extract an ID from a URL
  const isYoutubeDomain =
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be') ||
    trimmed.includes('youtube-nocookie.com');

  if (!isYoutubeDomain) {
    return null;
  }

  const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch) return youtuBeMatch[1];

  const embedMatch = trimmed.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed|v)\/)([a-zA-Z0-9_-]{11})/i);
  if (embedMatch) return embedMatch[1];

  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch) return shortsMatch[1];

  const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch) return liveMatch[1];

  const vParamMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (vParamMatch) return vParamMatch[1];

  return null;
}

export function getYoutubeEmbedUrl(url: string, autoPlay = false): string | null {
  const id = extractYoutubeId(url);
  const autoParam = autoPlay ? '&autoplay=1' : '';
  if (id) {
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0${autoParam}`;
  }
  const playlistId = extractYoutubePlaylistId(url);
  if (playlistId) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0${autoParam}`;
  }
  return null;
}

export function getCleanYoutubeWatchUrl(url?: string): string | null {
  if (!url) return null;
  const id = extractYoutubeId(url);
  if (id) return `https://www.youtube.com/watch?v=${id}`;
  const playlistId = extractYoutubePlaylistId(url);
  if (playlistId) return `https://www.youtube.com/playlist?list=${playlistId}`;
  return url.startsWith('http') ? url : `https://${url}`;
}

/* -------------------------------------------------------------------------- */
/*  VideoPlayer — YouTube embed or HTML5 Uploaded Video                      */
/* -------------------------------------------------------------------------- */

export interface VideoPlayerProps {
  videoType?: 'youtube' | 'uploaded';
  videoUrl?: string;
  url?: string;
  title: string;
  autoPlay?: boolean;
}

export function VideoPlayer({
  videoType,
  videoUrl,
  url: propUrl,
  title,
  autoPlay = false,
}: VideoPlayerProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const [copied, setCopied] = useState(false);

  const rawUrl = videoUrl || propUrl || '';
  if (!rawUrl || !rawUrl.trim()) return null;

  const url = rawUrl.trim();
  const youtubeId = extractYoutubeId(url);
  const playlistId = extractYoutubePlaylistId(url);

  // If explicitly 'uploaded', it is NEVER treated as YouTube
  const isYoutube =
    videoType === 'uploaded'
      ? false
      : videoType === 'youtube' ||
        Boolean(youtubeId) ||
        Boolean(playlistId) ||
        url.toLowerCase().includes('youtube.com') ||
        url.toLowerCase().includes('youtu.be');

  const embedUrl = isYoutube ? getYoutubeEmbedUrl(url, autoPlay) : null;
  const canonicalUrl = getCleanYoutubeWatchUrl(url) || url;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isYoutube && embedUrl) {
    return (
      <div className="space-y-2">
        <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-black shadow-md border border-slate-700/40">
          <iframe
            key={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            src={embedUrl}
            title={title || 'Course Video Player'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-600/20 text-red-400 flex items-center gap-1 shrink-0">
              <FaYoutube className="w-3.5 h-3.5 text-red-500" /> YouTube
            </span>
            <span className={`truncate font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {title}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400'
                : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Copy video link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Uploaded Video:
  let directVideoUrl = url;
  if (!url.startsWith('http') && !url.startsWith('blob:') && !url.startsWith('data:')) {
    directVideoUrl = `http://localhost:3333${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden bg-black shadow-md border border-slate-700/40">
        <video
          key={directVideoUrl}
          className="w-full max-h-[420px] rounded-xl"
          src={directVideoUrl}
          controls
          autoPlay={autoPlay}
          preload="metadata"
        />
      </div>

      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600/20 text-blue-400 flex items-center gap-1 shrink-0">
            <FaVideo className="w-3.5 h-3.5 text-blue-500" /> Uploaded Video
          </span>
          <span className={`truncate font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400'
              : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TransformedCourse & RagCourseList Props                                    */
/* -------------------------------------------------------------------------- */

export interface TransformedCourse {
  id: string;
  title: string;
  category: string;
  subCategory: string;
  description: string;
  tags: string;
  videoType: string;
  videoUrl: string;
  modulesCount: number;
  lessonsCount: number;
  createdAt: string;
  raw: IRagCourse;
}

interface RagCourseListProps {
  courses?: IRagCourse[];
  onEdit?: (course: IRagCourse) => void;
  onDelete?: (id: number | string) => void;
  onCreate?: () => void;
  isLoading?: boolean;
}

export default function RagCourseList({
  courses: passedCourses,
  onEdit,
  onDelete,
  onCreate,
  isLoading: passedIsLoading,
}: RagCourseListProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const rawUrlCategory = searchParams.get('category');
  const rawUrlSubCategory = searchParams.get('subCategory');

  const canonicalCategory = rawUrlCategory
    ? getCanonicalCategory(rawUrlCategory) || rawUrlCategory
    : 'all';
  const canonicalSubCategory =
    canonicalCategory !== 'all' && rawUrlSubCategory
      ? getCanonicalSubCategory(canonicalCategory, rawUrlSubCategory) || rawUrlSubCategory
      : 'all';

  const [selectedCategory, setSelectedCategory] = useState<string>(canonicalCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(canonicalSubCategory);

  // Synchronize state when URL query params change (e.g. Back/Forward button, direct link)
  useEffect(() => {
    const nextCat = rawUrlCategory
      ? getCanonicalCategory(rawUrlCategory) || rawUrlCategory
      : 'all';
    const nextSub =
      nextCat !== 'all' && rawUrlSubCategory
        ? getCanonicalSubCategory(nextCat, rawUrlSubCategory) || rawUrlSubCategory
        : 'all';
    setSelectedCategory(nextCat);
    setSelectedSubCategory(nextSub);
  }, [rawUrlCategory, rawUrlSubCategory]);

  const fetched = useCourses(
    undefined,
    selectedCategory !== 'all' ? selectedCategory : undefined,
    selectedSubCategory !== 'all' ? selectedSubCategory : undefined
  );

  const courses = passedCourses ?? fetched.courses;
  const isLoading = passedIsLoading ?? fetched.coursesLoading;

  const handleCategoryChange = (newCategory: string) => {
    setSelectedCategory(newCategory);
    setSelectedSubCategory('all');

    const nextParams = new URLSearchParams(searchParams);
    if (newCategory && newCategory !== 'all') {
      nextParams.set('category', newCategory);
    } else {
      nextParams.delete('category');
    }
    nextParams.delete('subCategory');
    setSearchParams(nextParams, { replace: true });
  };

  const handleSubCategoryChange = (newSubCategory: string) => {
    setSelectedSubCategory(newSubCategory);

    const nextParams = new URLSearchParams(searchParams);
    if (newSubCategory && newSubCategory !== 'all') {
      nextParams.set('subCategory', newSubCategory);
    } else {
      nextParams.delete('subCategory');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('category');
    nextParams.delete('subCategory');
    setSearchParams(nextParams, { replace: true });
  };

  const availableSubCategories = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return [];
    return getSubCategoriesForCategory(selectedCategory);
  }, [selectedCategory]);

  const transformedCourses: TransformedCourse[] = useMemo(() => {
    return (courses || []).map((c) => {
      const subModules = c.subModules || [];
      const totalLessons = subModules.reduce((acc, sm) => acc + (sm.videos?.length || (sm.videoUrl ? 1 : 0)), 0);
      const tagsStr = Array.isArray(c.tags) ? c.tags.join(', ') : '';
      const dateStr = c.createdAt
        ? new Date(c.createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const isUploaded = c.videoType === 'uploaded';
      const isYt = !isUploaded && (c.videoType === 'youtube' || Boolean(extractYoutubeId(c.videoUrl)));
      const resolvedVideoType = isUploaded ? 'uploaded' : isYt ? 'youtube' : 'uploaded';

      return {
        id: String(c.id),
        title: c.title || 'Untitled Course',
        category: c.category || 'General',
        subCategory: c.subCategory || 'N/A',
        description: c.description || '',
        tags: tagsStr,
        videoType: resolvedVideoType,
        videoUrl: c.videoUrl || '',
        modulesCount: subModules.length,
        lessonsCount: totalLessons,
        createdAt: dateStr,
        raw: c,
      };
    });
  }, [courses]);

  const handleCreate = () => {
    if (onCreate) onCreate();
    else navigate('/dashboard/skills/rag/new');
  };

  const handleEdit = (item: TransformedCourse) => {
    if (onEdit) onEdit(item.raw);
    else navigate(`/dashboard/skills/rag/${item.id}/edit`);
  };

  const handleDelete = (id: string | number) => {
    onDelete?.(id);
  };

  const columns = useMemo(
    () => [
      {
        header: 'Course Title',
        accessor: 'title' as keyof TransformedCourse,
        width: '26%',
        render: (item: TransformedCourse) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <FaGraduationCap className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="font-semibold block truncate text-sm" title={item.title}>
                {item.title}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {item.subCategory !== 'N/A' ? item.subCategory : item.category}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: 'Category',
        accessor: 'category' as keyof TransformedCourse,
        width: '18%',
        render: (item: TransformedCourse) => (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {item.category}
          </span>
        ),
      },
      {
        header: 'Video Source',
        accessor: 'videoType' as keyof TransformedCourse,
        width: '14%',
        render: (item: TransformedCourse) => {
          const isUploaded = item.videoType === 'uploaded';
          const isYt = !isUploaded && (item.videoType === 'youtube' || Boolean(extractYoutubeId(item.videoUrl)));
          return (
            <div className="flex items-center gap-1.5">
              {isYt ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600/15 text-red-400 border border-red-500/20">
                  <FaYoutube className="w-3.5 h-3.5 text-red-500" /> YouTube
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600/15 text-blue-400 border border-blue-500/20">
                  <FaVideo className="w-3.5 h-3.5 text-blue-400" /> Uploaded
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: 'Modules & Lessons',
        accessor: 'modulesCount' as keyof TransformedCourse,
        width: '16%',
        render: (item: TransformedCourse) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium">
              {item.modulesCount} {item.modulesCount === 1 ? 'Module' : 'Modules'}
            </span>
            {item.lessonsCount > 0 && (
              <span className="text-[11px] text-slate-400">
                ({item.lessonsCount} {item.lessonsCount === 1 ? 'lesson' : 'lessons'})
              </span>
            )}
          </div>
        ),
      },
      {
        header: 'Created Date',
        accessor: 'createdAt' as keyof TransformedCourse,
        width: '12%',
      },
    ],
    []
  );

  /* Single Unified View Modal definition */
  const viewModalFields: ModalField<TransformedCourse>[] = useMemo(
    () => [
      {
        label: 'Course Title',
        key: 'title',
        type: 'text' as const,
        disabled: true,
      },
      {
        label: 'Category',
        key: 'category',
        type: 'text' as const,
        disabled: true,
      },
      {
        label: 'Sub-Category',
        key: 'subCategory',
        type: 'text' as const,
        disabled: true,
      },
      {
        label: 'Description',
        key: 'description',
        type: 'textarea' as const,
        disabled: true,
      },
      {
        label: 'Tags',
        key: 'tags',
        type: 'text' as const,
        disabled: true,
      },
      {
        label: 'Course Video',
        key: 'videoUrl',
        type: 'custom' as const,
        disabled: true,
        render: (_val: unknown, item: TransformedCourse) => (
          <div className="mt-2 space-y-2">
            <VideoPlayer
              videoType={item.raw.videoType}
              videoUrl={item.raw.videoUrl}
              title={item.raw.title}
            />
          </div>
        ),
      },
      {
        label: 'Course Modules & Lessons',
        type: 'custom' as const,
        disabled: true,
        render: (_val: unknown, item: TransformedCourse) => {
          const subModules = item.raw.subModules || [];
          if (subModules.length === 0) {
            return (
              <p className="text-xs text-slate-400 italic mt-1">No sub-modules in this course.</p>
            );
          }

          return (
            <div className="space-y-4 mt-2">
              {subModules.map((sm, smIdx) => (
                <div
                  key={smIdx}
                  className="p-3 rounded-lg border border-slate-700/60 bg-slate-950/40 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">
                        {smIdx + 1}
                      </span>
                      <span className="text-white text-sm">{sm.title}</span>
                    </span>
                    {sm.videos && sm.videos.length > 0 && (
                      <span className="text-slate-400 text-[11px]">
                        {sm.videos.length} {sm.videos.length === 1 ? 'lesson' : 'lessons'}
                      </span>
                    )}
                  </div>

                  {sm.description && (
                    <p className="text-xs text-slate-400">{sm.description}</p>
                  )}

                  {sm.videos && sm.videos.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      {sm.videos.map((vid, vIdx) => (
                        <div key={vIdx} className="space-y-1.5">
                          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                            {vid.title || `Lesson ${vIdx + 1}`}
                            {vid.duration && (
                              <span className="text-[11px] text-slate-500 font-normal">
                                · {vid.duration}
                              </span>
                            )}
                          </span>
                          <VideoPlayer
                            videoType={vid.videoType}
                            videoUrl={vid.videoUrl}
                            title={vid.title || `${sm.title} - Lesson ${vIdx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  const filteredCourses: TransformedCourse[] = useMemo(() => {
    return transformedCourses.filter((course) => {
      // 1. Strict Category filter
      if (selectedCategory && selectedCategory !== 'all') {
        if (!isCategoryMatch(course.category, selectedCategory)) {
          return false;
        }
      }

      // 2. Strict Sub-Category filter
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        if (!isSubCategoryMatch(course.subCategory, selectedSubCategory)) {
          return false;
        }
      }

      return true;
    });
  }, [transformedCourses, selectedCategory, selectedSubCategory]);

  const emptyMessage = useMemo(() => {
    if (selectedCategory === 'Computer Basics') {
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        return 'No courses available for this sub-category.';
      }
      return 'No Computer Basics courses available.';
    }
    if (selectedCategory !== 'all') {
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        return 'No courses available for this sub-category.';
      }
      return `No ${selectedCategory} courses available.`;
    }
    return 'No courses found';
  }, [selectedCategory, selectedSubCategory]);

  const emptyDescription = useMemo(() => {
    if (selectedCategory === 'Computer Basics') {
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        return `No courses currently match sub-category "${selectedSubCategory}".`;
      }
      return 'Get started by creating your first Computer Basics course.';
    }
    if (selectedCategory !== 'all') {
      return `Get started by creating your first course in ${selectedCategory}.`;
    }
    return 'Get started by creating your first course with video lectures';
  }, [selectedCategory, selectedSubCategory]);

  return (
    <div className="w-full space-y-4" style={{ boxSizing: 'border-box' }}>
      {/* Category & Sub-Category Filter Controls */}
      <div
        className={`p-4 rounded-xl border transition-all duration-200 ${
          isDark
            ? 'bg-slate-900/70 border-slate-800 shadow-sm'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Filter Courses
            </span>
            {(selectedCategory !== 'all' || selectedSubCategory !== 'all') && (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                Active Filter
              </span>
            )}
          </div>

          {(selectedCategory !== 'all' || selectedSubCategory !== 'all') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="filter-category"
              className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              Category
            </label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium border transition-colors outline-none cursor-pointer ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100 hover:border-slate-600 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-slate-400 focus:border-indigo-500'
              }`}
            >
              <option value="all">All Categories</option>
              <option value="Computer Basics">Computer Basics</option>
              {ALL_CATEGORIES.filter((c) => c !== 'Computer Basics').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Category Dropdown */}
          <div>
            <label
              htmlFor="filter-sub-category"
              className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              Sub-Category
            </label>
            <select
              id="filter-sub-category"
              value={selectedSubCategory}
              onChange={(e) => handleSubCategoryChange(e.target.value)}
              disabled={selectedCategory === 'all' || availableSubCategories.length === 0}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium border transition-colors outline-none ${
                selectedCategory === 'all' || availableSubCategories.length === 0
                  ? isDark
                    ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : isDark
                    ? 'bg-slate-950 border-slate-700 text-slate-100 hover:border-slate-600 focus:border-indigo-500 cursor-pointer'
                    : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-slate-400 focus:border-indigo-500 cursor-pointer'
              }`}
            >
              <option value="all">
                {selectedCategory === 'all' ? 'Select a Category First' : 'All Sub-Categories'}
              </option>
              {availableSubCategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <CommonDataList<TransformedCourse>
        data={filteredCourses}
        title="Course Management"
        subtitle="Manage courses, video lectures, and AI vector embeddings"
        columns={columns}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
        viewModalFields={viewModalFields}
        icon={<FaGraduationCap />}
        createButtonText="Add Course"
        searchPlaceholder="Search courses by title, category, or tags..."
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        enableSearch={true}
        isLoading={isLoading}
      />
    </div>
  );
}
