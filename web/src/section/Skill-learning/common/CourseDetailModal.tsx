import { useState, useCallback, useRef } from 'react';
import { useTheme } from '@/theme/AppThemeProvider';
import { useNavigate } from 'react-router-dom';
import {
  Close,
  PlayArrow,
  PlayCircle,
  Folder,
  Edit,
  Help,
  VideoLibrary,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Quiz,
  CheckCircle,
  Cancel,
  EmojiEvents,
} from '@mui/icons-material';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/utils/utils';
import { VideoPlayer } from '../rag/rag-course-list';
import { IRagCourse } from '@/types/ragCourse';
import CourseQuizModal from '@/section/Skill-learning/rag/CourseQuizModal';
import { useUser } from '@/atoms/userAtom';
import { generateCourseQuizService, IQuizQuestion, IQuizResult } from '@/action/ragCourse';
import { certificateService, ICertificate } from '@/services/certificateService';
import CertificateModal from '@/components/certificate/CertificateModal';

interface CourseDetailModalProps {
  course: IRagCourse;
  onClose: () => void;
}

export function CourseDetailModal({ course, onClose }: CourseDetailModalProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { isSuperAdmin, isStudent, user } = useUser();
  const isAdmin = isSuperAdmin || user?.authType === 'admin' || user?.authType === 'super_admin';
  const navigate = useNavigate();

  const subModules = course.subModules || [];

  // Helper to find initial video: main video or first module/lesson video
  const getInitialVideo = () => {
    if (course.videoUrl && course.videoUrl.trim()) {
      return {
        url: course.videoUrl.trim(),
        videoType: course.videoType || 'youtube',
        title: course.title,
        subtitle: 'Main Course Video',
        autoPlay: false,
      };
    }
    for (let i = 0; i < subModules.length; i++) {
      const mod = subModules[i];
      if (mod.videos && mod.videos.length > 0 && mod.videos[0].videoUrl) {
        return {
          url: mod.videos[0].videoUrl.trim(),
          videoType: mod.videos[0].videoType || 'youtube',
          title: mod.videos[0].title || mod.title || `Module ${i + 1}`,
          subtitle: `Module ${i + 1}: ${mod.title || 'Lesson 1'}`,
          autoPlay: false,
        };
      }
      if (mod.videoUrl && mod.videoUrl.trim()) {
        return {
          url: mod.videoUrl.trim(),
          videoType: 'uploaded' as const,
          title: mod.title || `Module ${i + 1}`,
          subtitle: `Module ${i + 1}`,
          autoPlay: false,
        };
      }
    }
    return {
      url: '',
      videoType: course.videoType || 'youtube',
      title: course.title,
      subtitle: 'Course Video',
      autoPlay: false,
    };
  };

  // Active playing video state
  const [activeVideo, setActiveVideo] = useState<{
    url: string;
    videoType?: 'youtube' | 'uploaded';
    title: string;
    subtitle?: string;
    autoPlay?: boolean;
  }>(getInitialVideo);

  // Track expanded modules (all expanded by default so user immediately sees all inserted modules)
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    subModules.forEach((_, idx) => {
      initial[idx] = true;
    });
    return initial;
  });
const [showQuizModal, setShowQuizModal] = useState(false);

  // Student quiz state
  const [videoEnded, setVideoEnded] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizData, setQuizData] = useState<IQuizResult | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const quizSectionRef = useRef<HTMLDivElement>(null);

  // Certificate state
  const [earnedCertificate, setEarnedCertificate] = useState<ICertificate | null>(() => {
    return certificateService.getCertificateByCourse(user?.id || user?.studentId || '1', course.id);
  });
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Use ref to avoid stale closure inside callbacks
  const videoEndedRef = useRef(false);

  const triggerQuizFlow = useCallback(async () => {
    if (!isStudent) return;
    if (videoEndedRef.current) return; // already triggered
    videoEndedRef.current = true;
    setVideoEnded(true);

    // Auto-load quiz
    setQuizLoading(true);
    const result = await generateCourseQuizService({
      courseId: course.id,
      videoUrl: course.videoUrl,
      title: course.title,
      description: course.description,
      category: course.category,
      subModules: course.subModules,
      numQuestions: 5,
    });
    setQuizData(result);
    setQuizLoading(false);
    setStudentAnswers({});
    setQuizSubmitted(false);

    // Scroll to quiz section
    setTimeout(() => {
      quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  }, [isStudent, course]);

  // Alias for VideoPlayer onEnded prop (uploaded videos)
  const handleVideoEnded = triggerQuizFlow;

  const handleSelectAnswer = (qIdx: number, option: string) => {
    if (quizSubmitted) return;
    setStudentAnswers((prev) => ({ ...prev, [qIdx]: option }));
  };

  const questions: IQuizQuestion[] = quizData?.quiz?.questions || [];

  const calcScore = () => {
    if (!questions.length) return { correct: 0, total: 0, pct: 0 };
    let correct = 0;
    questions.forEach((q, idx) => {
      const ans = studentAnswers[idx];
      if (ans && ans.trim().charAt(0).toUpperCase() === q.correctAnswer.trim().charAt(0).toUpperCase()) {
        correct++;
      }
    });
    return { correct, total: questions.length, pct: Math.round((correct / questions.length) * 100) };
  };

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
    const { pct } = calcScore();
    if (pct >= 80) {
      const cert = certificateService.issueCertificate({
        studentId: user?.id || user?.studentId || '1',
        studentName: user?.fullName || 'Testing Student',
        courseId: course.id,
        courseTitle: course.title,
        category: course.category,
        score: pct,
      });
      setEarnedCertificate(cert);
    }
  };

  const handleRetakeQuiz = () => {
    setStudentAnswers({});
    setQuizSubmitted(false);
  };


  const toggleModule = (idx: number) => {
    setExpandedModules((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handlePlayVideo = (
    url: string,
    videoType?: 'youtube' | 'uploaded',
    title?: string,
    subtitle?: string
  ) => {
    if (!url || !url.trim()) return;
    setActiveVideo({
      url: url.trim(),
      videoType: videoType || 'youtube',
      title: title || course.title,
      subtitle: subtitle || 'Playing Video',
      autoPlay: true, // Automatically start video when user clicks Play on any module or lesson!
    });

    // Smooth scroll modal top to focus on player
    const modalContent = document.getElementById('course-modal-scrollable');
    if (modalContent) {
      modalContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalLessonsCount = subModules.reduce((acc, sm) => {
    if (sm.videos && sm.videos.length > 0) {
      return acc + sm.videos.length;
    }
    return acc + (sm.videoUrl ? 1 : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div
        id="course-modal-scrollable"
        className={cn(
          'relative max-w-4xl w-full rounded-2xl p-5 sm:p-7 shadow-2xl my-6 max-h-[92vh] overflow-y-auto transition-colors',
          isDark
            ? 'bg-slate-900 border border-slate-700/80 text-slate-100'
            : 'bg-white border border-slate-200 text-slate-900'
        )}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 z-20 p-2 rounded-xl transition-colors',
            isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          )}
          title="Close dialog"
        >
          <Close fontSize="medium" />
        </button>

        {/* Modal Header: Category & Sub-Category Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3 pr-12">
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border',
              isDark
                ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            )}
          >
            {course.category || 'Skill Learning'}
          </span>

          {course.subCategory && (
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border',
                isDark
                  ? 'bg-teal-950/40 text-teal-300 border-teal-800/40'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
              )}
            >
              {course.subCategory}
            </span>
          )}

          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border',
              isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            {subModules.length} {subModules.length === 1 ? 'Module' : 'Modules'}
          </span>
        </div>

        {/* Certificate Earned Banner if already unlocked */}
        {isStudent && earnedCertificate && (
          <div
            className={cn(
              'flex items-center justify-between px-4 py-3 rounded-2xl border mb-4 shadow-sm transition-all',
              isDark
                ? 'bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-300 text-amber-900'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <EmojiEvents sx={{ fontSize: 24 }} />
              </span>
              <div>
                <p className="text-xs font-bold flex items-center gap-2">
                  <span>🏆 Official Certificate of Completion Earned!</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                    {earnedCertificate.id}
                  </span>
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Issued on {earnedCertificate.issueDate} with {earnedCertificate.score}% score.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCertModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md transition-all cursor-pointer shrink-0"
            >
              View Certificate
            </button>
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          {course.title}
        </h2>

        {/* Description */}
        {course.description && (
          <p
            className={cn(
              'text-sm leading-relaxed mb-6',
              isDark ? 'text-slate-400' : 'text-slate-600'
            )}
          >
            {course.description}
          </p>
        )}

        {/* ── Active Video Player ─────────────────────────────────────── */}
        {activeVideo.url ? (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span
                  className={cn(
                    'text-xs font-semibold truncate',
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  )}
                >
                  <span className="text-teal-500 font-bold uppercase tracking-wider text-[11px] mr-1.5">
                    Now Playing:
                  </span>
                  {activeVideo.subtitle ? `${activeVideo.subtitle} — ` : ''}{activeVideo.title}
                </span>
              </div>

              {/* Reset to main video if currently playing a submodule video */}
              {course.videoUrl && activeVideo.url !== course.videoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    handlePlayVideo(
                      course.videoUrl,
                      course.videoType,
                      course.title,
                      'Main Course Video'
                    )
                  }
                  className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors shrink-0 flex items-center gap-1',
                    isDark
                      ? 'border-indigo-700 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  )}
                >
                  <PlayArrow sx={{ fontSize: 13 }} />
                  Play Main Video
                </button>
              )}
            </div>

            <div className="rounded-xl overflow-hidden shadow-lg border border-slate-700/50">
              <VideoPlayer
                videoUrl={activeVideo.url}
                url={activeVideo.url}
                videoType={activeVideo.videoType}
                title={activeVideo.title}
                autoPlay={activeVideo.autoPlay}
                onEnded={handleVideoEnded}
              />
            </div>

            {/* Mark as Complete button — shown to students who haven't triggered quiz yet */}
            {isStudent && !videoEnded && (
              <div className="flex justify-end mt-2 px-1">
                <button
                  type="button"
                  onClick={triggerQuizFlow}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all shadow-sm',
                    isDark
                      ? 'bg-emerald-900/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/70 hover:text-emerald-200'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  )}
                >
                  <CheckCircle sx={{ fontSize: 15 }} />
                  Mark as Complete & Take Quiz
                </button>
              </div>
            )}

            {/* Quiz loading indicator inline */}
            {isStudent && videoEnded && quizLoading && (
              <div className={cn(
                'flex items-center gap-2 mt-2 px-3 py-2 rounded-xl border text-xs font-medium',
                isDark ? 'border-indigo-800/60 bg-indigo-950/30 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-600'
              )}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating your quiz... scroll down when ready!
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'mb-6 p-6 rounded-xl border border-dashed text-center transition-colors',
              isDark
                ? 'border-slate-800 bg-slate-900/40 text-slate-400'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            )}
          >
            <VideoLibrary className="w-10 h-10 mx-auto mb-2 opacity-50 text-teal-500" />
            <p className="text-sm font-semibold">Select a Module or Lesson to start video playback</p>
            <p className="text-xs mt-1 max-w-sm mx-auto opacity-70">
              Click &quot;Play Module&quot; or click any lesson below to begin watching.
            </p>
          </div>
        )}

        {/* ── Course Summary Cards ────────────────────────────────────── */}
        <div
          className={cn(
            'grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl mb-6',
            isDark
              ? 'bg-slate-800/40 border border-slate-700/50'
              : 'bg-slate-50 border border-slate-200/70'
          )}
        >
          <div>
            <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Inserted Modules
            </p>
            <p className="text-lg font-bold mt-0.5 text-teal-500">
              {subModules.length}
            </p>
          </div>

          <div>
            <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Total Lessons
            </p>
            <p className="text-lg font-bold mt-0.5">
              {totalLessonsCount || 1}
            </p>
          </div>

          <div>
            <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Main Video Type
            </p>
            <p className="text-sm font-semibold capitalize mt-1">
              {course.videoType === 'youtube' ? 'YouTube' : 'Direct Upload'}
            </p>
          </div>

          <div>
            <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Sub-Category
            </p>
            <p className="text-sm font-semibold truncate mt-1">
              {course.subCategory || 'General'}
            </p>
          </div>
        </div>

        {/* ── Inserted Modules Section ─────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between border-b pb-2 border-slate-700/40">
            <div className="flex items-center gap-2">
              <Folder className="text-teal-500" fontSize="small" />
              <h3 className="text-base font-bold tracking-tight">
                Inserted Modules & Lessons ({subModules.length})
              </h3>
            </div>
            {subModules.length > 0 && (
              <span
                className={cn(
                  'text-xs font-medium',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}
              >
                Click any lesson to play video
              </span>
            )}
          </div>

          {subModules.length === 0 ? (
            <div
              className={cn(
                'text-center py-8 px-4 rounded-xl border border-dashed transition-colors',
                isDark
                  ? 'border-slate-800 bg-slate-900/30 text-slate-400'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              )}
            >
              <VideoLibrary className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
              <p className="text-sm font-medium">No sub-modules inserted yet.</p>
              <p className="text-xs mt-1 max-w-sm mx-auto opacity-80">
                This course only has the main video. You can insert modules, chapters, and lesson
                videos by editing this course.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {subModules.map((mod, modIdx) => {
                const isExpanded = Boolean(expandedModules[modIdx]);
                const modVideos = mod.videos || [];
                const hasDirectVideo = !modVideos.length && Boolean(mod.videoUrl);

                const firstModVideo = modVideos[0]?.videoUrl || mod.videoUrl || '';
                const firstModVideoType = modVideos[0]?.videoType || 'youtube';
                const firstModVideoTitle = modVideos[0]?.title || mod.title || `Module ${modIdx + 1}`;

                const isModuleActive = Boolean(
                  firstModVideo &&
                    (activeVideo.url === firstModVideo ||
                      modVideos.some((v) => v.videoUrl && v.videoUrl === activeVideo.url))
                );

                return (
                  <div
                    key={modIdx}
                    className={cn(
                      'rounded-xl border transition-all overflow-hidden',
                      isModuleActive
                        ? isDark
                          ? 'border-teal-500/70 bg-teal-950/20 shadow-md ring-1 ring-teal-500/30'
                          : 'border-teal-400 bg-teal-50/50 shadow-md ring-1 ring-teal-400/30'
                        : isDark
                          ? 'border-slate-800 bg-slate-800/30'
                          : 'border-slate-200 bg-slate-50/70'
                    )}
                  >
                    {/* Module Header Bar */}
                    <div
                      onClick={() => toggleModule(modIdx)}
                      className={cn(
                        'flex items-center justify-between p-3.5 cursor-pointer select-none transition-colors',
                        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100/80'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span
                          className={cn(
                            'w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors',
                            isModuleActive
                              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                              : 'bg-teal-500/20 text-teal-400'
                          )}
                        >
                          {modIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold truncate">
                              {mod.title || `Module ${modIdx + 1}`}
                            </h4>
                            {isModuleActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                                PLAYING
                              </span>
                            )}
                          </div>
                          {mod.description && (
                            <p
                              className={cn(
                                'text-xs truncate max-w-md mt-0.5',
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              )}
                            >
                              {mod.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Direct Play Module Button */}
                        {firstModVideo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isExpanded) {
                                setExpandedModules((prev) => ({ ...prev, [modIdx]: true }));
                              }
                              handlePlayVideo(
                                firstModVideo,
                                firstModVideoType,
                                firstModVideoTitle,
                                `Module ${modIdx + 1}: ${mod.title || 'Lesson 1'}`
                              );
                            }}
                            className={cn(
                              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all',
                              isModuleActive
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25'
                                : 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20'
                            )}
                            title={`Play ${mod.title || `Module ${modIdx + 1}`}`}
                          >
                            <PlayArrow sx={{ fontSize: 16 }} />
                            <span>{isModuleActive ? 'Playing Now' : 'Play Module'}</span>
                          </button>
                        )}

                        <span
                          className={cn(
                            'text-xs px-2 py-1 rounded-md font-medium border hidden sm:inline-block',
                            isDark
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-white text-slate-600 border-slate-200'
                          )}
                        >
                          {modVideos.length > 0
                            ? `${modVideos.length} ${modVideos.length === 1 ? 'lesson' : 'lessons'}`
                            : hasDirectVideo
                              ? '1 video'
                              : 'Module'}
                        </span>
                        {isExpanded ? (
                          <KeyboardArrowUp fontSize="small" className="text-slate-400" />
                        ) : (
                          <KeyboardArrowDown fontSize="small" className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Module Lessons Content */}
                    {isExpanded && (
                      <div
                        className={cn(
                          'p-3 pt-1 border-t space-y-2',
                          isDark ? 'border-slate-800/80' : 'border-slate-200/80'
                        )}
                      >
                        {/* If module has videos array */}
                        {modVideos.length > 0 &&
                          modVideos.map((vid, vIdx) => {
                            const isCurrentlyPlaying =
                              Boolean(vid.videoUrl) && activeVideo.url === vid.videoUrl;

                            return (
                              <div
                                key={vIdx}
                                onClick={() =>
                                  handlePlayVideo(
                                    vid.videoUrl,
                                    vid.videoType,
                                    vid.title || `Lesson ${vIdx + 1}`,
                                    `Module ${modIdx + 1}: ${mod.title || ''}`
                                  )
                                }
                                className={cn(
                                  'flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
                                  isCurrentlyPlaying
                                    ? isDark
                                      ? 'bg-teal-950/50 border-teal-500 text-teal-200 shadow-md ring-1 ring-teal-500/40'
                                      : 'bg-teal-50 border-teal-400 text-teal-950 shadow-md ring-1 ring-teal-400/40'
                                    : isDark
                                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <PlayCircle
                                    fontSize="small"
                                    className={cn(
                                      'shrink-0 transition-colors',
                                      isCurrentlyPlaying
                                        ? 'text-emerald-400 animate-pulse'
                                        : 'text-slate-400'
                                    )}
                                  />
                                  <div className="truncate">
                                    <span className="font-semibold truncate">
                                      {vid.title || `Lesson ${vIdx + 1}`}
                                    </span>
                                    {vid.duration && (
                                      <span
                                        className={cn(
                                          'ml-2 text-[11px]',
                                          isDark ? 'text-slate-400' : 'text-slate-500'
                                        )}
                                      >
                                        · {vid.duration}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded text-[10px] font-semibold border uppercase',
                                      vid.videoType === 'uploaded'
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    )}
                                  >
                                    {vid.videoType === 'uploaded' ? 'Video' : 'YouTube'}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlayVideo(
                                        vid.videoUrl,
                                        vid.videoType,
                                        vid.title || `Lesson ${vIdx + 1}`,
                                        `Module ${modIdx + 1}: ${mod.title || ''}`
                                      );
                                    }}
                                    className={cn(
                                      'flex items-center gap-0.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm transition-all',
                                      isCurrentlyPlaying
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                        : 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20'
                                    )}
                                  >
                                    <PlayArrow sx={{ fontSize: 14 }} />
                                    <span>{isCurrentlyPlaying ? 'Playing' : 'Play'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                        {/* If module has single direct videoUrl */}
                        {hasDirectVideo && (
                          <div
                            onClick={() =>
                              handlePlayVideo(
                                mod.videoUrl!,
                                mod.videoType || 'uploaded',
                                mod.title || `Module ${modIdx + 1}`,
                                `Module ${modIdx + 1}`
                              )
                            }
                            className={cn(
                              'flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
                              activeVideo.url === mod.videoUrl
                                ? isDark
                                  ? 'bg-teal-950/50 border-teal-500 text-teal-200 shadow-md ring-1 ring-teal-500/40'
                                  : 'bg-teal-50 border-teal-400 text-teal-950 shadow-md ring-1 ring-teal-400/40'
                                : isDark
                                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <PlayCircle
                                fontSize="small"
                                className={cn(
                                  'shrink-0',
                                  activeVideo.url === mod.videoUrl
                                    ? 'text-emerald-400 animate-pulse'
                                    : 'text-teal-400'
                                )}
                              />
                              <span className="font-semibold truncate">
                                {mod.title || 'Play Chapter Video'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayVideo(
                                  mod.videoUrl!,
                                  mod.videoType || 'uploaded',
                                  mod.title || `Module ${modIdx + 1}`,
                                  `Module ${modIdx + 1}`
                                );
                              }}
                              className={cn(
                                'flex items-center gap-0.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm transition-all',
                                activeVideo.url === mod.videoUrl
                                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                  : 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20'
                              )}
                            >
                              <PlayArrow sx={{ fontSize: 14 }} />
                              <span>{activeVideo.url === mod.videoUrl ? 'Playing' : 'Play'}</span>
                            </button>
                          </div>
                        )}

                        {/* If no videos in this module */}
                        {!modVideos.length && !hasDirectVideo && (
                          <p
                            className={cn(
                              'text-xs italic p-2',
                              isDark ? 'text-slate-500' : 'text-slate-400'
                            )}
                          >
                            No lesson video added to this module yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Student Quiz Section (appears after video ends) ─────────────── */}
        {isStudent && videoEnded && (
          <div
            ref={quizSectionRef}
            className={cn(
              'rounded-2xl border overflow-hidden mb-6 transition-all',
              isDark ? 'border-indigo-800/60 bg-indigo-950/30' : 'border-indigo-200 bg-indigo-50/60'
            )}
          >
            {/* Quiz Header */}
            <div
              className={cn(
                'flex items-center gap-3 px-5 py-4 border-b',
                isDark ? 'border-indigo-800/50 bg-indigo-950/60' : 'border-indigo-200 bg-indigo-100/60'
              )}
            >
              <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md">
                <Quiz sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span>Course Quiz</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                      isDark
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : 'bg-indigo-100 text-indigo-600 border-indigo-200'
                    )}
                  >
                    AI Generated
                  </span>
                </h3>
                <p className={cn('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  Great job finishing the video! Test your knowledge below.
                </p>
              </div>
              {quizSubmitted && (() => {
                const { pct } = calcScore();
                return (
                  <div className="ml-auto flex items-center gap-2">
                    <EmojiEvents
                      className={pct >= 70 ? 'text-yellow-400' : 'text-slate-400'}
                      fontSize="medium"
                    />
                    <span
                      className={cn(
                        'text-lg font-bold',
                        pct >= 70 ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Loading */}
            {quizLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="p-3 rounded-full bg-indigo-500/10">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
                <p className={cn('text-sm font-medium', isDark ? 'text-slate-300' : 'text-slate-600')}>
                  Generating quiz from course content...
                </p>
                <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  Powered by AI + RAG
                </p>
              </div>
            )}

            {/* Score Card after submission */}
            {!quizLoading && quizSubmitted && (() => {
              const { correct, total, pct } = calcScore();
              const isPassed = pct >= 80;
              return (
                <div
                  className={cn(
                    'mx-5 mt-5 p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all',
                    isPassed
                      ? isDark
                        ? 'bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border-emerald-500/50 text-emerald-200'
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-800'
                      : isDark
                        ? 'bg-rose-950/40 border-rose-700/50 text-rose-300'
                        : 'bg-rose-50 border-rose-300 text-rose-700'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold">
                        {isPassed ? '🎉 Outstanding Achievement! Certificate Unlocked!' : '📚 Keep practicing!'}
                      </p>
                      {isPassed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950">
                          ≥80% Passed
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 opacity-90">
                      You scored {correct} out of {total} ({pct}%).
                      {isPassed
                        ? ' You have earned the official RuralSpark Certificate of Completion!'
                        : ' You need 80% or more to unlock your official Certificate.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {isPassed && (
                      <button
                        type="button"
                        onClick={() => setIsCertModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <EmojiEvents sx={{ fontSize: 18 }} />
                        <span>View & Download Certificate</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRetakeQuiz}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0',
                        isDark
                          ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      Retake Quiz
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Questions */}
            {!quizLoading && questions.length > 0 && (
              <div className="p-5 space-y-5">
                {questions.map((q, qIdx) => {
                  const selected = studentAnswers[qIdx];
                  const isCorrect =
                    quizSubmitted &&
                    selected?.trim().charAt(0).toUpperCase() ===
                      q.correctAnswer.trim().charAt(0).toUpperCase();
                  const isWrong = quizSubmitted && selected && !isCorrect;

                  return (
                    <div
                      key={qIdx}
                      className={cn(
                        'rounded-xl border p-4 transition-all',
                        quizSubmitted && isCorrect
                          ? isDark
                            ? 'border-emerald-600/50 bg-emerald-950/30'
                            : 'border-emerald-300 bg-emerald-50'
                          : quizSubmitted && isWrong
                            ? isDark
                              ? 'border-rose-600/50 bg-rose-950/30'
                              : 'border-rose-300 bg-rose-50'
                            : isDark
                              ? 'border-slate-700/50 bg-slate-800/30'
                              : 'border-slate-200 bg-white'
                      )}
                    >
                      {/* Question text */}
                      <p className="text-sm font-semibold mb-3 flex gap-2">
                        <span
                          className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5',
                            isDark ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                          )}
                        >
                          Q{qIdx + 1}
                        </span>
                        <span>{q.question}</span>
                      </p>

                      {/* Options */}
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const optLetter = opt.trim().charAt(0).toUpperCase();
                          const correctLetter = q.correctAnswer.trim().charAt(0).toUpperCase();
                          const isThisCorrect = optLetter === correctLetter;
                          const isSelected = selected === opt;

                          let optStyle = '';
                          if (quizSubmitted) {
                            if (isThisCorrect) {
                              optStyle = isDark
                                ? 'border-emerald-500/70 bg-emerald-950/50 text-emerald-300'
                                : 'border-emerald-400 bg-emerald-50 text-emerald-800';
                            } else if (isSelected && !isThisCorrect) {
                              optStyle = isDark
                                ? 'border-rose-500/70 bg-rose-950/50 text-rose-300'
                                : 'border-rose-400 bg-rose-50 text-rose-700';
                            } else {
                              optStyle = isDark
                                ? 'border-slate-700 bg-slate-900/50 text-slate-500'
                                : 'border-slate-200 bg-slate-50 text-slate-400';
                            }
                          } else {
                            optStyle = isSelected
                              ? isDark
                                ? 'border-indigo-500/70 bg-indigo-950/50 text-indigo-200 ring-1 ring-indigo-500/40'
                                : 'border-indigo-400 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-400/30'
                              : isDark
                                ? 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-indigo-600/60 hover:bg-indigo-950/30'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60';
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={quizSubmitted}
                              onClick={() => handleSelectAnswer(qIdx, opt)}
                              className={cn(
                                'w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all flex items-center justify-between gap-2',
                                optStyle,
                                !quizSubmitted && 'cursor-pointer'
                              )}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isThisCorrect && (
                                <CheckCircle className="text-emerald-500 shrink-0" sx={{ fontSize: 16 }} />
                              )}
                              {quizSubmitted && isSelected && !isThisCorrect && (
                                <Cancel className="text-rose-500 shrink-0" sx={{ fontSize: 16 }} />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation after submit */}
                      {quizSubmitted && q.explanation && (
                        <div
                          className={cn(
                            'mt-3 p-2.5 rounded-lg border text-xs leading-relaxed',
                            isDark
                              ? 'bg-slate-900/60 border-slate-700/50 text-slate-400'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          )}
                        >
                          <span className={cn('font-bold mr-1', isDark ? 'text-indigo-400' : 'text-indigo-600')}>
                            💡 Explanation:
                          </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Submit Button */}
                {!quizSubmitted && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={Object.keys(studentAnswers).length < questions.length}
                      onClick={handleSubmitQuiz}
                      className={cn(
                        'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all',
                        Object.keys(studentAnswers).length < questions.length
                          ? isDark
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-indigo-500/30'
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      Submit Quiz ({Object.keys(studentAnswers).length}/{questions.length} answered)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* No questions */}
            {!quizLoading && !quizData && (
              <div className={cn('text-center py-8 text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>
                <Help sx={{ fontSize: 36 }} className="mx-auto mb-2 opacity-40" />
                <p>Could not generate quiz for this course.</p>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {Array.isArray(course.tags) && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-slate-700/40">
            {course.tags.map((tag: string, i: number) => (
              <span
                key={`${tag}-${i}`}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium border',
                  isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-700/40">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/skills/rag/${course.id}/edit`)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-colors',
              isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            )}
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Course & Insert Modules
          </button>
{ (isSuperAdmin || isAdmin) && (
  <button
    type="button"
    onClick={() => setShowQuizModal(true)}
    className={cn(
      'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-colors',
      isDark
        ? 'bg-indigo-900 text-indigo-200 border-indigo-700 hover:bg-indigo-800 hover:text-white'
        : 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200'
    )}
  >
    <Help className="w-3.5 h-3.5" />
    Show Generated Quiz
  </button>
)}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-medium bg-teal-500 text-white hover:bg-teal-600 shadow-sm shadow-teal-500/25 transition-colors"
          >
            Close
          </button>
        </div>
{showQuizModal && (
  <CourseQuizModal isOpen={showQuizModal} onClose={() => setShowQuizModal(false)} course={course} />
)}
        {/* Certificate Modal */}
        <CertificateModal
          certificate={earnedCertificate}
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
        />
      </div>
    </div>
  );
}
