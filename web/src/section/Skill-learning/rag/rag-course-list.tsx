import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaGraduationCap,
  FaYoutube,
  FaVideo,
} from 'react-icons/fa';
import {
  Check,
  Copy,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '@/theme/AppThemeProvider';
import CommonDataList, {
  ModalField,
} from '@/components/common/commanDataList';
import { IRagCourse } from '@/types/ragCourse';
import { useCourses } from '@/action/ragCourse';
import CourseQuizModal from './CourseQuizModal';

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

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  if (id) {
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  }
  const playlistId = extractYoutubePlaylistId(url);
  if (playlistId) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0`;
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
  title: string;
}

export function VideoPlayer({
  videoType,
  videoUrl,
  title,
}: VideoPlayerProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const [copied, setCopied] = useState(false);

  if (!videoUrl || !videoUrl.trim()) return null;

  const url = videoUrl.trim();
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

  const embedUrl = isYoutube ? getYoutubeEmbedUrl(url) : null;
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
          className="w-full max-h-[420px] rounded-xl"
          src={directVideoUrl}
          controls
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
  const navigate = useNavigate();
  const fetched = useCourses();

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [selectedQuizCourse, setSelectedQuizCourse] = useState<IRagCourse | null>(null);

  const courses = passedCourses ?? fetched.courses;
  const isLoading = passedIsLoading ?? fetched.coursesLoading;

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
        width: '24%',
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
        width: '16%',
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
        header: 'AI Quiz',
        accessor: 'id' as keyof TransformedCourse,
        width: '14%',
        render: (item: TransformedCourse) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedQuizCourse(item.raw);
              setQuizModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Quiz
          </button>
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
        label: 'Interactive AI Quiz (YouTube & RAG)',
        type: 'custom' as const,
        disabled: true,
        render: (_val: unknown, item: TransformedCourse) => (
          <div className="mt-2 p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> Dynamic AI Quiz Generator
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generate dynamic interactive quiz questions based on YouTube metadata and RAG vector store chunks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedQuizCourse(item.raw);
                setQuizModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md shrink-0 flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5" /> Start Quiz
            </button>
          </div>
        ),
      },
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

  return (
    <div className="w-full" style={{ boxSizing: 'border-box' }}>
      <CommonDataList<TransformedCourse>
        data={transformedCourses}
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
        emptyMessage="No courses found"
        emptyDescription="Get started by creating your first course with video lectures"
        enableSearch={true}
        isLoading={isLoading}
      />

      <CourseQuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        course={selectedQuizCourse}
      />
    </div>
  );
}

