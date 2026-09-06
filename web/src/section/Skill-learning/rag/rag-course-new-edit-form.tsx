import React, { useCallback, useEffect, useRef } from 'react';
import {
  useForm,
  FormProvider,
  useFieldArray,
  Controller,
} from 'react-hook-form';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Youtube, Upload, FolderPlus, Check, ArrowLeft } from 'lucide-react';
import { FaSave } from 'react-icons/fa';
import { ParticleButton } from '@/components/ui/particle-button';
import RHFFormField from '@/components/hook-form/RHFFormFiled';
import RHFDropDown from '@/components/hook-form/RHFDropDown';
import VideoUpload from '@/components/video-upload/video-upload';
import { throttle } from '@/utils/performance';
import { useTheme } from '@/theme/AppThemeProvider';
import { useRouter } from '@/hooks/useRouter';
import ModuleVideoCard from './ModuleVideoCard';
import { getYoutubeEmbedUrl } from './RagCourseList';
import { createCourseService, updateCourseService } from '@/action/ragCourse';
import { IRagCourse } from '@/types/ragCourse';
import {
  CATEGORY_SELECT_OPTIONS,
  getSubCategoriesForCategory,
} from '@/constants/categoryData';

export interface VideoFormValues {
  title: string;
  videoType: 'youtube' | 'uploaded';
  videoUrl: string;
  duration: string;
}

export interface SubModuleFormValues {
  title: string;
  description: string;
  videos: VideoFormValues[];
}

export interface RagFormValues {
  title: string;
  category: string;
  subCategory: string;
  description: string;
  tags: string;
  videoType: 'youtube' | 'uploaded';
  videoUrl: string;
  subModules: SubModuleFormValues[];
}

function VideoSourceToggle({
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
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${value === 'youtube' ? activeCls : inactiveCls}`}
        onClick={() => onChange('youtube')}
        successDuration={0}
      >
        <Youtube className="w-4 h-4" /> YouTube URL
      </ParticleButton>
      <ParticleButton
        type="button"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${value === 'uploaded' ? activeCls : inactiveCls}`}
        onClick={() => onChange('uploaded')}
        successDuration={0}
      >
        <Upload className="w-4 h-4" /> Upload Video
      </ParticleButton>
    </div>
  );
}

interface Props {
  currentData?: IRagCourse | null;
}

export default function RagCourseNewEditForm({ currentData }: Props) {
  const isEdit = Boolean(currentData);
  const router = useRouter();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const methods = useForm<RagFormValues>({
    defaultValues: {
      title: '',
      category: '',
      subCategory: '',
      description: '',
      tags: '',
      videoType: 'youtube',
      videoUrl: '',
      subModules: [],
    },
  });

  const {
    control,
    watch,
    reset,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentData) {
      reset({
        title: currentData.title || '',
        category: currentData.category || '',
        subCategory: currentData.subCategory || '',
        description: currentData.description || '',
        tags: Array.isArray(currentData.tags) ? currentData.tags.join(', ') : '',
        videoType: currentData.videoType || 'youtube',
        videoUrl: currentData.videoUrl || '',
        subModules: (currentData.subModules || []).map((sm) => ({
          title: sm.title || '',
          description: sm.description || '',
          videos: (sm.videos || []).map((v) => ({
            title: v.title || '',
            duration: v.duration || '',
            videoType: v.videoType || 'youtube',
            videoUrl: v.videoUrl || '',
          })),
        })),
      });
    }
  }, [currentData, reset]);

  const selectedCategory = watch('category');
  const selectedSubCategory = watch('subCategory');
  const mainVideoType = watch('videoType');
  const mainVideoUrl = watch('videoUrl');
  const mainEmbedUrl = mainVideoUrl ? getYoutubeEmbedUrl(mainVideoUrl) : null;

  // Track previous category to reset subCategory only when category actually changes
  const prevCategoryRef = useRef(selectedCategory);
  useEffect(() => {
    if (prevCategoryRef.current && prevCategoryRef.current !== selectedCategory) {
      const validSubs = getSubCategoriesForCategory(selectedCategory);
      if (selectedSubCategory && !validSubs.includes(selectedSubCategory)) {
        setValue('subCategory', '');
      }
    }
    prevCategoryRef.current = selectedCategory;
  }, [selectedCategory, selectedSubCategory, setValue]);

  const validSubCategories = getSubCategoriesForCategory(selectedCategory);
  const subCategoryOptions = validSubCategories.map((s) => ({
    value: s,
    label: s,
  }));

  const { fields: moduleFields, append: appendModule, remove: removeModule } =
    useFieldArray({ control, name: 'subModules' });

  const addModule = () =>
    appendModule({
      title: '',
      description: '',
      videos: [{ title: '', videoType: 'youtube', videoUrl: '', duration: '' }],
    });

  const onSubmit = async (data: RagFormValues) => {
    try {
      const validSubs = getSubCategoriesForCategory(data.category);
      if (data.category === 'Computer Basics' || validSubs.length > 0) {
        if (!data.subCategory || !validSubs.includes(data.subCategory)) {
          toast.error(`Please select a valid sub-category for ${data.category}`);
          return;
        }
      }

      const payload = {
        title: data.title,
        category: data.category,
        subCategory: data.subCategory || undefined,
        description: data.description,
        tags: data.tags
          ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        videoType: data.videoType,
        videoUrl: data.videoUrl,
        subModules: data.subModules.map((sm) => ({
          title: sm.title,
          description: sm.description || undefined,
          videos: sm.videos.map((v) => ({
            title: v.title,
            duration: v.duration || undefined,
            videoType: v.videoType,
            videoUrl: v.videoUrl,
          })),
        })),
      };

      if (isEdit && currentData?.id) {
        const res = await updateCourseService(currentData.id, payload);
        if (res) {
          toast.success('Course updated and re-indexed successfully!');
          setTimeout(() => router.push('/dashboard/skills/rag'), 1200);
        }
      } else {
        const res = await createCourseService(payload);
        if (res) {
          toast.success('Course created and indexed into vector database!');
          setTimeout(() => router.push('/dashboard/skills/rag'), 1200);
        }
      }
    } catch (error) {
      console.error('Course save failed:', error);
    }
  };

  const throttledSubmitRef = useRef(
    throttle((e: React.FormEvent) => {
      handleSubmit(onSubmit)(e);
    }, 1000)
  );

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    throttledSubmitRef.current(e);
  }, []);

  const cardBaseClass = isDark
    ? 'border border-slate-700 bg-slate-900/60 shadow-black/30'
    : 'border border-slate-200 bg-white shadow-slate-200/80';

  const sectionHeading = `text-sm font-semibold tracking-wider uppercase ${
    isDark ? 'text-indigo-400' : 'text-indigo-600'
  }`;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-700/40">
        <div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/skills/rag')}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Courses
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isEdit ? 'Edit Course' : 'Create New Course'}
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isEdit
              ? 'Update course metadata, videos, and refresh semantic RAG embeddings.'
              : 'Add courses with videos and sub-modules for AI semantic search.'}
          </p>
        </div>

        <ParticleButton
          type="button"
          onClick={() => router.push('/dashboard/skills/rag')}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
            isDark
              ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          successDuration={0}
        >
          View All Courses
        </ParticleButton>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`rounded-xl p-6 space-y-6 shadow-sm ${cardBaseClass}`}
          >
            {/* ─── Course Metadata ─────────────────────────────────────── */}
            <div className="space-y-4">
              <h2 className={sectionHeading}>Course Details</h2>

              <RHFFormField
                name="title"
                label="Course Title"
                required
                placeholder="e.g. Complete Guide to UPI & Digital Payments"
                validation={{ required: 'Course title is required' }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RHFDropDown
                  name="category"
                  label="Category"
                  required
                  placeholder="Select category"
                  options={CATEGORY_SELECT_OPTIONS}
                  validation={{ required: 'Category is required' }}
                  onChange={(e) => {
                    const newCat = String(e.target.value);
                    const validSubs = getSubCategoriesForCategory(newCat);
                    const currentSub = watch('subCategory');
                    if (currentSub && !validSubs.includes(currentSub)) {
                      setValue('subCategory', '');
                    }
                  }}
                />

                <RHFDropDown
                  name="subCategory"
                  label="Sub-Category"
                  required
                  placeholder={selectedCategory ? 'Select sub-category' : 'Select category first'}
                  options={subCategoryOptions}
                  disabled={!selectedCategory}
                  validation={{
                    required: 'Sub-category is required',
                    validate: (val: string) => {
                      const valid = getSubCategoriesForCategory(watch('category'));
                      if (valid.length > 0 && (!val || !valid.includes(val))) {
                        return `Sub-category must be one of: ${valid.join(', ')}`;
                      }
                      return true;
                    },
                  }}
                />

                <RHFFormField
                  name="tags"
                  label="Tags (comma separated)"
                  placeholder="e.g. upi, beginner, hindi"
                />
              </div>

              <RHFFormField
                name="description"
                label="Description"
                type="textarea"
                required
                placeholder="What will learners achieve from this course?"
                validation={{ required: 'Description is required' }}
              />
            </div>

            {/* ─── Main Video ──────────────────────────────────────────── */}
            <div className="space-y-4 pt-4 border-t border-slate-700/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={sectionHeading}>Main Course Video</h2>
              </div>

              <Controller
                name="videoType"
                control={control}
                render={({ field }) => (
                  <VideoSourceToggle
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v);
                      setValue('videoUrl', '');
                    }}
                  />
                )}
              />

              {mainVideoType === 'youtube' ? (
                <div className="space-y-2">
                  <RHFFormField
                    name="videoUrl"
                    label="YouTube URL"
                    required
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    validation={{ required: 'Main video URL is required' }}
                  />

                  {mainEmbedUrl && (
                    <div className="rounded-lg border border-indigo-500/30 bg-slate-900/60 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Platform Player Preview (Plays directly in this platform)</span>
                      </div>
                      <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden bg-black shadow-md border border-slate-700/40">
                        <iframe
                          className="absolute inset-0 w-full h-full border-0"
                          src={mainEmbedUrl}
                          title="Main Video Preview"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Upload Video <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <VideoUpload name="videoUrl" />
                </div>
              )}
            </div>

            {/* ─── Sub-modules ─────────────────────────────────────────── */}
            <div className="space-y-4 pt-4 border-t border-slate-700/40">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={sectionHeading}>Course Modules & Lessons</h2>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Add chapters and lessons with in-platform video players.
                  </p>
                </div>
                <ParticleButton
                  type="button"
                  onClick={addModule}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
                  successDuration={200}
                >
                  <FolderPlus className="w-3.5 h-3.5" /> Add Module
                </ParticleButton>
              </div>

              {moduleFields.length === 0 && (
                <div
                  className={`border border-dashed rounded-lg p-6 text-center text-xs ${
                    isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'
                  }`}
                >
                  No sub-modules added yet. Click &ldquo;Add Module&rdquo; to structure this course into chapters.
                </div>
              )}

              <div className="space-y-4">
                {moduleFields.map((modField, mIdx) => (
                  <ModuleVideoCard
                    key={modField.id}
                    moduleIndex={mIdx}
                    onRemoveModule={() => removeModule(mIdx)}
                  />
                ))}
              </div>
            </div>

            {/* ─── Submit Action ───────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-700/40">
              <button
                type="button"
                onClick={() => router.push('/dashboard/skills/rag')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                  isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>

              <ParticleButton
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50"
                successDuration={500}
              >
                <FaSave className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? isEdit
                      ? 'Updating...'
                      : 'Indexing...'
                    : isEdit
                      ? 'Update & Re-Index Course'
                      : 'Create & Index Course'}
                </span>
              </ParticleButton>
            </div>
          </motion.div>
        </form>
      </FormProvider>
    </div>
  );
}
