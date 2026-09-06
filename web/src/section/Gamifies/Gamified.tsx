import { useState, useEffect } from 'react';
import { useTheme } from '@/theme/AppThemeProvider';
import { useNavigate } from 'react-router-dom';
import {
  WorkspacePremium,
  MilitaryTech,
  Visibility,
  Print,
  CheckCircle,
  AutoAwesome,
  TrendingUp,
  ArrowForward,
  CalendarMonth,
  Lock,
} from '@mui/icons-material';
import { useUser } from '@/atoms/userAtom';
import { certificateService, ICertificate } from '@/services/certificateService';
import CertificateModal from '@/components/certificate/CertificateModal';
import { RuralSparkCertificate } from '@/components/certificate/RuralSparkCertificate';

export default function GamifiedSection() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { user } = useUser();
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState<ICertificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<ICertificate | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  useEffect(() => {
    const studentId = user?.id || user?.studentId || '1';
    const list = certificateService.getStudentCertificates(studentId);
    setCertificates(list);
  }, [user]);

  const handleOpenCertificate = (cert: ICertificate) => {
    setSelectedCertificate(cert);
    setIsCertModalOpen(true);
  };

  const handlePrintCertificate = (cert: ICertificate) => {
    setSelectedCertificate(cert);
    setIsCertModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Badges Definitions
  const totalCertificates = certificates.length;
  const bestScore = certificates.reduce((acc, c) => Math.max(acc, c.score), 0);

  const badges = [
    {
      id: 'cert-starter',
      title: 'First Milestone',
      category: 'Course Achievement',
      desc: 'Earn your first Certificate of Completion with ≥80% score',
      icon: '🎓',
      unlocked: totalCertificates >= 1,
      progress: totalCertificates >= 1 ? '100%' : '0%',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'quiz-ace',
      title: 'High Achiever',
      category: 'Excellence',
      desc: 'Achieve a score of 90% or higher in any course quiz',
      icon: '🏆',
      unlocked: bestScore >= 90,
      progress: bestScore >= 90 ? '100%' : `${Math.min(100, Math.round((bestScore / 90) * 100))}%`,
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      id: 'perfectionist',
      title: 'Centurion (100%)',
      category: 'Mastery',
      desc: 'Score a perfect 100% on any AI module quiz',
      icon: '⭐',
      unlocked: bestScore === 100,
      progress: bestScore === 100 ? '100%' : `${bestScore}%`,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'skill-pioneer',
      title: 'Multi-Skilled',
      category: 'Exploration',
      desc: 'Earn certificates across 2 or more distinct skill modules',
      icon: '🚀',
      unlocked: totalCertificates >= 2,
      progress: `${Math.min(100, Math.round((totalCertificates / 2) * 100))}%`,
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      id: 'scholar',
      title: 'RuralSpark Scholar',
      category: 'Honor Badge',
      desc: 'Earn 3 or more official RuralSpark course certificates',
      icon: '👑',
      unlocked: totalCertificates >= 3,
      progress: `${Math.min(100, Math.round((totalCertificates / 3) * 100))}%`,
      gradient: 'from-yellow-400 to-amber-600',
    },
    {
      id: 'ai-learner',
      title: 'AI Power User',
      category: 'Innovation',
      desc: 'Complete an AI + RAG semantic skill module',
      icon: '💡',
      unlocked: totalCertificates >= 1,
      progress: totalCertificates >= 1 ? '100%' : '0%',
      gradient: 'from-cyan-500 to-blue-600',
    },
  ];

  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 pb-16`}>
      {/* Background Accent Gradients */}
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(249,115,22,0.08),transparent_40%)]'
            : 'bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.07),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(249,115,22,0.06),transparent_40%)]'
        }`}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* ── Header Area ───────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-md">
                <WorkspacePremium fontSize="medium" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Achievements & Badges
              </h1>
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              View, print, and share your earned RuralSpark Course Certificates & skill milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/skills/coding')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Explore Courses</span>
              <ArrowForward fontSize="small" />
            </button>
          </div>
        </div>

        {/* ── Summary Stats Overview ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          
          <div
            className={`p-5 rounded-2xl border backdrop-blur-xs transition-all ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
                : 'bg-white/90 border-slate-200 shadow-slate-200/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Certificates
              </span>
              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
                <WorkspacePremium fontSize="small" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-500">{totalCertificates}</span>
              <span className="text-xs text-slate-400">Earned</span>
            </div>
          </div>

          <div
            className={`p-5 rounded-2xl border backdrop-blur-xs transition-all ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
                : 'bg-white/90 border-slate-200 shadow-slate-200/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Badges Unlocked
              </span>
              <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
                <MilitaryTech fontSize="small" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-500">
                {unlockedBadgesCount} / {badges.length}
              </span>
            </div>
          </div>

          <div
            className={`p-5 rounded-2xl border backdrop-blur-xs transition-all ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
                : 'bg-white/90 border-slate-200 shadow-slate-200/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Best Score
              </span>
              <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <TrendingUp fontSize="small" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-500">
                {bestScore > 0 ? `${bestScore}%` : '—'}
              </span>
              <span className="text-xs text-slate-400">High Mark</span>
            </div>
          </div>

          <div
            className={`p-5 rounded-2xl border backdrop-blur-xs transition-all ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
                : 'bg-white/90 border-slate-200 shadow-slate-200/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Status
              </span>
              <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <AutoAwesome fontSize="small" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-indigo-400">
                {totalCertificates > 0 ? 'Active Scholar' : 'Enrolled'}
              </span>
            </div>
          </div>

        </div>

        {/* ── Section 1: Official Certificates ──────────────────────────────── */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <WorkspacePremium className="text-amber-500" />
                <span>Earned Certificates of Completion</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  isDark ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  Progress ≥ 80%
                </span>
              </h2>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Official certificates issued upon completing course modules with 80% or higher score.
              </p>
            </div>
          </div>

          {certificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-amber-500/40 hover:shadow-amber-500/10'
                      : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-amber-200/40'
                  }`}
                >
                  {/* Certificate Thumbnail Mini-Preview Header */}
                  <div
                    onClick={() => handleOpenCertificate(cert)}
                    className="relative w-full aspect-[1.8/1] bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center p-3 border-b border-slate-700/50"
                  >
                    {/* Scale-down preview */}
                    <div className="transform scale-[0.45] origin-center pointer-events-none transition-transform group-hover:scale-[0.48]">
                      <RuralSparkCertificate certificate={cert} />
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs">
                      <Visibility fontSize="small" />
                      <span>Click to View Certificate</span>
                    </div>

                    {/* Ribbon Tag */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 shadow-sm">
                      {cert.score}% Score
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-mono text-[11px] font-semibold text-amber-500">
                        {cert.id}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarMonth sx={{ fontSize: 13 }} />
                        {cert.issueDate}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 dark:text-white group-hover:text-amber-400 transition-colors truncate">
                      {cert.courseTitle}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4 truncate">
                      Category: <span className="text-slate-300 font-medium">{cert.category || 'Skill Learning'}</span>
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleOpenCertificate(cert)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Visibility fontSize="small" className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => handlePrintCertificate(cert)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                        title="Print / Save as PDF"
                      >
                        <Print fontSize="small" className="w-3.5 h-3.5" />
                        <span>Print / PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State: Prompting how to earn certificate */
            <div
              className={`p-8 sm:p-12 rounded-3xl border text-center transition-all ${
                isDark
                  ? 'bg-slate-900/50 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <WorkspacePremium sx={{ fontSize: 36 }} />
              </div>
              <h3 className="text-lg font-bold mb-2">No Certificates Earned Yet</h3>
              <p className={`text-sm max-w-md mx-auto mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Complete any course module and achieve <strong className="text-amber-500">80% or higher score</strong> on the quiz to unlock your official RuralSpark Certificate of Completion.
              </p>
              <button
                onClick={() => navigate('/dashboard/skills/coding')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Start Learning to Earn Certificate</span>
                <ArrowForward fontSize="small" />
              </button>
            </div>
          )}
        </section>

        {/* ── Section 2: Milestones & Badges ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MilitaryTech className="text-blue-500" />
                <span>Skill Badges & Milestones</span>
              </h2>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Unlock badges by watching course videos, testing knowledge, and excelling in quizzes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                  b.unlocked
                    ? isDark
                      ? 'bg-slate-900/90 border-blue-500/30 shadow-md shadow-blue-500/5'
                      : 'bg-white border-blue-200 shadow-sm'
                    : isDark
                      ? 'bg-slate-900/40 border-slate-800 opacity-60'
                      : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-md ${
                    b.unlocked
                      ? `bg-gradient-to-tr ${b.gradient} text-white`
                      : isDark
                        ? 'bg-slate-800 text-slate-500'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {b.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {b.category}
                    </span>
                    {b.unlocked ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                        <CheckCircle sx={{ fontSize: 13 }} />
                        Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Lock sx={{ fontSize: 13 }} />
                        Locked
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 dark:text-white truncate">
                    {b.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {b.desc}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${b.gradient}`}
                        style={{ width: b.progress }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Full-Screen High-Fidelity Certificate Modal */}
      <CertificateModal
        certificate={selectedCertificate}
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
      />
    </div>
  );
}