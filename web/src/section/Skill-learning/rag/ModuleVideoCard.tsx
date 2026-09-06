// src/section/Skill-learning/rag/ModuleVideoCard.tsx
// Module card with nested video list.
// Colours match quiz QuestionCard: border-slate-700 / bg-white + slate-950/70.

import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Trash2, Youtube, Upload, Video, GripVertical, Check } from 'lucide-react';
import { FaTimes } from 'react-icons/fa';
import RHFFormField from '@/components/hook-form/RHFFormFiled';
import VideoUpload from '@/components/video-upload/video-upload';
import { ParticleButton } from '@/components/ui/particle-button';
import { useTheme } from '@/theme/AppThemeProvider';
import type { RagFormValues } from './RagCreateForm';
import { getYoutubeEmbedUrl } from './RagCourseList';

/* -------------------------------------------------------------------------- */
/*  Video type toggle (ParticleButton)                                        */
/* -------------------------------------------------------------------------- */
function VideoTypeToggle({
  value,
  onChange,
}: {
  value: 'youtube' | 'uploaded';
  onChange: (v: 'youtube' | 'uploaded') => void;
}) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const activeCls = isDark
    ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-sm'
    : 'bg-slate-800/80 text-white hover:bg-slate-800 shadow-sm';
  const inactiveCls = isDark
    ? 'text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800'
    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50';

  return (
    <div className="flex gap-3">
      <ParticleButton
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${value === 'youtube' ? activeCls : inactiveCls}`}
        onClick={() => onChange('youtube')}
        successDuration={0}
      >
        <Youtube className="w-3.5 h-3.5" /> YouTube
      </ParticleButton>
      <ParticleButton
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${value === 'uploaded' ? activeCls : inactiveCls}`}
        onClick={() => onChange('uploaded')}
        successDuration={0}
      >
        <Upload className="w-3.5 h-3.5" /> Upload
      </ParticleButton>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Single Video Row                                                           */
/* -------------------------------------------------------------------------- */
function VideoRow({
  moduleIndex,
  videoIndex,
  onRemove,
}: {
  moduleIndex: number;
  videoIndex: number;
  onRemove: () => void;
}) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { control, watch, setValue } = useFormContext<RagFormValues>();

  const videoType = watch(`subModules.${moduleIndex}.videos.${videoIndex}.videoType`);
  const currentVideoUrl = watch(`subModules.${moduleIndex}.videos.${videoIndex}.videoUrl`);
  const currentEmbedUrl = currentVideoUrl ? getYoutubeEmbedUrl(currentVideoUrl) : null;

  /* Matches QuestionCard optionBaseClass style */
  const rowCls = isDark
    ? 'border border-slate-700 text-slate-100 shadow-black/30'
    : 'border border-slate-200 bg-white text-slate-900 shadow-slate-200/80';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className={`rounded-lg p-4 space-y-3 ${rowCls}`}
    >
      {/* Row header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 opacity-30" />
          <Video className="w-4 h-4 opacity-50" />
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Video {videoIndex + 1}
          </span>
        </div>
        <ParticleButton
          type="button"
          onClick={onRemove}
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 border rounded ${
            isDark
              ? 'text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
              : 'text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
          }`}
          successDuration={200}
        >
          <FaTimes className="w-3 h-3" /> Remove
        </ParticleButton>
      </div>

      {/* Title + Duration */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RHFFormField
          name={`subModules.${moduleIndex}.videos.${videoIndex}.title`}
          label="Video Title"
          required
          placeholder="e.g. Introduction to UPI"
          validation={{ required: 'Title required' }}
        />
        <RHFFormField
          name={`subModules.${moduleIndex}.videos.${videoIndex}.duration`}
          label="Duration (optional)"
          placeholder="e.g. 5 min"
        />
      </div>

      {/* Source toggle */}
      <div>
        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Video Source
        </p>
        <Controller
          name={`subModules.${moduleIndex}.videos.${videoIndex}.videoType`}
          control={control}
          render={({ field }) => (
            <VideoTypeToggle
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                setValue(`subModules.${moduleIndex}.videos.${videoIndex}.videoUrl`, '');
              }}
            />
          )}
        />
      </div>

      {videoType === 'youtube' ? (
        <div className="space-y-2">
          <RHFFormField
            name={`subModules.${moduleIndex}.videos.${videoIndex}.videoUrl`}
            label="YouTube URL"
            required
            placeholder="https://www.youtube.com/watch?v=..."
            validation={{ required: 'URL required' }}
          />

          {currentEmbedUrl && (
            <div className="rounded-lg border border-indigo-500/30 bg-slate-900/60 p-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <Check className="w-3 h-3" />
                <span>Lesson Video Preview (Plays directly in this platform)</span>
              </div>
              <div className="relative w-full pt-[56.25%] rounded overflow-hidden bg-black border border-slate-700/40">
                <iframe
                  className="absolute inset-0 w-full h-full border-0"
                  src={currentEmbedUrl}
                  title="Lesson Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Upload Video
          </p>
          <VideoUpload name={`subModules.${moduleIndex}.videos.${videoIndex}.videoUrl`} />
        </div>
      )}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Module Card                                                               */
/* -------------------------------------------------------------------------- */
interface ModuleVideoCardProps {
  moduleIndex: number;
  onRemoveModule: () => void;
}

export default function ModuleVideoCard({ moduleIndex, onRemoveModule }: ModuleVideoCardProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { control } = useFormContext<RagFormValues>();

  const { fields: videoFields, append: appendVideo, remove: removeVideo } = useFieldArray({
    control,
    name: `subModules.${moduleIndex}.videos`,
  });

  const addVideo = () =>
    appendVideo({ title: '', videoType: 'youtube', videoUrl: '', duration: '' });

  /* Matches QuestionCard surfaceBaseClass */
  const surfaceCls = isDark
    ? 'border border-slate-700 text-slate-100 shadow-black/30'
    : 'border border-slate-200 bg-white text-slate-900 shadow-slate-200/80';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl ${surfaceCls}`}
    >
      {/* Module header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b ${
          isDark ? 'border-slate-700' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {moduleIndex + 1}
          </span>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Module {moduleIndex + 1}
          </h3>
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            · {videoFields.length} video{videoFields.length !== 1 ? 's' : ''}
          </span>
        </div>

        <ParticleButton
          type="button"
          onClick={onRemoveModule}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium ${
            isDark
              ? 'text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
              : 'text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
          }`}
          successDuration={300}
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove Module
        </ParticleButton>
      </div>

      {/* Module body */}
      <div className="p-5 space-y-4">
        {/* Module meta */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RHFFormField
            name={`subModules.${moduleIndex}.title`}
            label="Module Title"
            required
            placeholder={`e.g. Module ${moduleIndex + 1} – Getting Started`}
            validation={{ required: 'Module title required' }}
          />
          <RHFFormField
            name={`subModules.${moduleIndex}.description`}
            label="Module Description (optional)"
            placeholder="Brief overview of this module"
          />
        </div>

        {/* Videos sub-section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Videos ({videoFields.length})
            </h4>
            <ParticleButton
              type="button"
              onClick={addVideo}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium ${
                isDark
                  ? 'text-slate-200 bg-slate-900 border-slate-800 hover:bg-slate-800'
                  : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
              }`}
              successDuration={200}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Video
            </ParticleButton>
          </div>

          {/* Empty state */}
          {videoFields.length === 0 && (
            <div
              className={[
                'rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-8 cursor-pointer transition-colors',
                isDark
                  ? 'border-slate-800 hover:border-slate-600 text-slate-600'
                  : 'border-slate-200 hover:border-slate-300 text-slate-400',
              ].join(' ')}
              onClick={addVideo}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && addVideo()}
            >
              <PlusCircle className="w-5 h-5 mb-2 opacity-40" />
              <p className="text-xs font-medium">Click to add first video</p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {videoFields.map((vf, vi) => (
                <VideoRow
                  key={vf.id}
                  moduleIndex={moduleIndex}
                  videoIndex={vi}
                  onRemove={() => removeVideo(vi)}
                />
              ))}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
