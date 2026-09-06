import  { useState, useEffect } from 'react';
import {
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Loader2,
  X,
  Youtube,
  RefreshCw,
} from 'lucide-react';
import { generateCourseQuizService, IQuizResult, IQuizQuestion } from '@/action/ragCourse';
import { IRagCourse } from '@/types/ragCourse';
import { useTheme } from '@/theme/AppThemeProvider';

interface CourseQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: IRagCourse | null;
}

export default function CourseQuizModal({ isOpen, onClose, course }: CourseQuizModalProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<IQuizResult | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);

  useEffect(() => {
    if (isOpen && course) {
      handleGenerate(numQuestions);
    } else {
      setQuizData(null);
    }
  }, [isOpen, course?.id]);

  const handleGenerate = async (targetNum: number) => {
    if (!course) return;
    setLoading(true);
    setQuizData(null);

    const result = await generateCourseQuizService({
      courseId: course.id,
      videoUrl: course.videoUrl,
      title: course.title,
      description: course.description,
      category: course.category,
      subModules: course.subModules,
      numQuestions: targetNum,
    });

    setQuizData(result);
    setLoading(false);
  };

  if (!isOpen || !course) return null;

  const questions: IQuizQuestion[] = quizData?.quiz?.questions || [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>AI Generated Quizzes (Preview)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  YouTube Metadata + RAG
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">Admin preview of generated quizzes (Not for filling)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="text-center py-16 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">Automatically Generating {numQuestions} Quizzes...</p>
                <p className="text-xs text-slate-400">Fetching YouTube metadata, channel info & RAG vector context</p>
              </div>
            </div>
          )}

          {/* Quiz Preview List */}
          {!loading && quizData && (
            <div className="space-y-6">
              {/* YouTube Video Header Banner */}
              {quizData.videoMetadata && (
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  {quizData.videoMetadata.thumbnailUrl ? (
                    <img
                      src={quizData.videoMetadata.thumbnailUrl}
                      alt={quizData.videoMetadata.title}
                      className="w-20 h-12 object-cover rounded-lg shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-red-600/15 text-red-500 flex items-center justify-center shrink-0">
                      <Youtube className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                      YouTube Video Context
                    </span>
                    <p className="text-xs font-semibold truncate text-slate-200">
                      {quizData.videoMetadata.title || course.title}
                    </p>
                    {quizData.videoMetadata.author && (
                      <p className="text-[11px] text-slate-400">Channel: {quizData.videoMetadata.author}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                     <select
                        value={numQuestions}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNumQuestions(val);
                          handleGenerate(val);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold outline-none transition-all ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value={3}>3 Questions</option>
                        <option value={5}>5 Questions</option>
                        <option value={8}>8 Questions</option>
                        <option value={10}>10 Questions</option>
                      </select>
                      <button 
                        onClick={() => handleGenerate(numQuestions)} 
                        className={`p-2 rounded-lg border flex items-center justify-center transition-all ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                        title="Regenerate"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className={`p-5 rounded-xl border flex flex-col space-y-4 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <h4 className="text-sm font-semibold leading-snug flex gap-2">
                       <span className="text-indigo-400 font-bold">{qIdx + 1}.</span> 
                       <span>{q.question}</span>
                    </h4>

                    {/* Options List */}
                    <div className="space-y-2 flex-1">
                      {q.options.map((optionStr, optIdx) => {
                        const optionLetter = optionStr.trim().charAt(0).toUpperCase();
                        const correctLetter = q.correctAnswer.trim().charAt(0).toUpperCase();
                        const isCorrect = optionLetter === correctLetter;

                        return (
                          <div
                            key={optIdx}
                            className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-start justify-between gap-3 ${
                              isCorrect
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                                : isDark
                                  ? 'border-slate-800 bg-slate-950/40 text-slate-500/80'
                                  : 'border-slate-100 bg-slate-50 text-slate-400'
                            }`}
                          >
                            <span className="flex-1">{optionStr}</span>
                            {isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className={`mt-auto p-3 rounded-lg border space-y-1.5 ${
                      isDark ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" /> Explanation
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
