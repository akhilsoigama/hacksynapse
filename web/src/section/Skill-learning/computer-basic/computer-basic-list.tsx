import { useState, useMemo, useEffect } from 'react'
import { useTheme } from '@/theme/AppThemeProvider'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import {
    AccessTime,
    MenuBook,
    Computer,
    Storage,
    Settings,
    Devices,
    PlayArrow,
} from '@mui/icons-material'
import { Search, RotateCcw, Plus } from 'lucide-react'
import { ParticleButton } from "../../../components/ui/particle-button"
import { cn } from '@/utils/utils'
import { useCourses } from '@/action/ragCourse'
import {
    COMPUTER_BASICS_SUB_CATEGORIES,
    isCategoryMatch,
    isSubCategoryMatch,
    getCanonicalSubCategory,
} from '@/constants/categoryData'
import { IRagCourse } from '@/types/ragCourse'

/**
 * Helper to get icon corresponding to Computer Basics sub-categories
 */
const getSubCategoryIcon = (subCat?: string) => {
    switch (subCat) {
        case 'MS Office':
            return <MenuBook fontSize="small" className="text-blue-500" />
        case 'Internet & Email':
            return <Devices fontSize="small" className="text-teal-500" />
        case 'Typing Skills':
            return <Computer fontSize="small" className="text-amber-500" />
        case 'Windows OS':
            return <Storage fontSize="small" className="text-indigo-500" />
        case 'Troubleshooting':
            return <Settings fontSize="small" className="text-rose-500" />
        default:
            return <Computer fontSize="small" className="text-teal-500" />
    }
}

/**
 * Helper to get badge style for sub-categories
 */
const getSubCategoryBadgeStyle = (subCat?: string, isDark?: boolean) => {
    if (isDark) {
        switch (subCat) {
            case 'MS Office': return 'bg-blue-950/40 text-blue-300 border-blue-800/40'
            case 'Internet & Email': return 'bg-teal-950/40 text-teal-300 border-teal-800/40'
            case 'Typing Skills': return 'bg-amber-950/40 text-amber-300 border-amber-800/40'
            case 'Windows OS': return 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40'
            case 'Troubleshooting': return 'bg-rose-950/40 text-rose-300 border-rose-800/40'
            default: return 'bg-slate-800 text-slate-300 border-slate-700'
        }
    } else {
        switch (subCat) {
            case 'MS Office': return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'Internet & Email': return 'bg-teal-50 text-teal-700 border-teal-200'
            case 'Typing Skills': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'Windows OS': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
            case 'Troubleshooting': return 'bg-rose-50 text-rose-700 border-rose-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }
}

import { CourseDetailModal } from '../common/CourseDetailModal'

/**
 * Main Computer Basics List Component (100% Dynamic - No Static Data)
 */
const ComputerBasicList = () => {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const navigate = useNavigate()

    const [selectedCourse, setSelectedCourse] = useState<IRagCourse | null>(null)

    const [searchParams, setSearchParams] = useSearchParams()
    const { subCategory: routeSubParam } = useParams()
    const rawSubParam = routeSubParam || searchParams.get('subCategory')
    const canonicalSub = rawSubParam ? (getCanonicalSubCategory('Computer Basics', rawSubParam) || rawSubParam) : 'All'

    const [selectedSubCategory, setSelectedSubCategory] = useState<string>(canonicalSub)
    const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '')

    useEffect(() => {
        const currentRaw = routeSubParam || searchParams.get('subCategory')
        const resolved = currentRaw ? (getCanonicalSubCategory('Computer Basics', currentRaw) || currentRaw) : 'All'
        setSelectedSubCategory(resolved)
        if (searchParams.get('search') !== null) {
            setSearchQuery(searchParams.get('search') || '')
        }
    }, [routeSubParam, searchParams])

    // Strictly fetch Computer Basics courses dynamically from API / DB
    const { courses: apiCourses, coursesLoading } = useCourses(
        searchQuery,
        'Computer Basics',
        selectedSubCategory !== 'All' ? selectedSubCategory : undefined
    )

    const handleSubCategorySelect = (sub: string) => {
        setSelectedSubCategory(sub)
        const next = new URLSearchParams(searchParams)
        if (sub && sub !== 'All') {
            next.set('subCategory', sub)
        } else {
            next.delete('subCategory')
        }
        setSearchParams(next, { replace: true })
    }

    const handleSearchChange = (val: string) => {
        setSearchQuery(val)
        const next = new URLSearchParams(searchParams)
        if (val.trim()) {
            next.set('search', val.trim())
        } else {
            next.delete('search')
        }
        setSearchParams(next, { replace: true })
    }

    const handleReset = () => {
        setSelectedSubCategory('All')
        setSearchQuery('')
        const next = new URLSearchParams(searchParams)
        next.delete('subCategory')
        next.delete('search')
        setSearchParams(next, { replace: true })
    }

    // Filter dynamic courses strictly matching Computer Basics and selected sub-category
    const filteredCourses = useMemo(() => {
        if (!apiCourses || !Array.isArray(apiCourses)) return []

        return apiCourses.filter((course) => {
            // 1. Strict Category filter (Computer Basics only)
            if (!isCategoryMatch(course.category, 'Computer Basics')) {
                return false
            }

            // 2. Strict Sub-Category filter
            if (selectedSubCategory !== 'All') {
                if (!isSubCategoryMatch(course.subCategory, selectedSubCategory)) {
                    return false
                }
            }

            // 3. Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim()
                const matchTitle = (course.title || '').toLowerCase().includes(q)
                const matchDesc = (course.description || '').toLowerCase().includes(q)
                const matchSub = (course.subCategory || '').toLowerCase().includes(q)
                const matchTags = Array.isArray(course.tags) && course.tags.some((t: string) => t.toLowerCase().includes(q))
                if (!matchTitle && !matchDesc && !matchTags && !matchSub) {
                    return false
                }
            }

            return true
        })
    }, [apiCourses, selectedSubCategory, searchQuery])

    // Dynamic stats computed exclusively from real courses
    const totalLessons = useMemo(() => {
        return filteredCourses.reduce((sum, c) => sum + (c.subModules?.length || 1), 0)
    }, [filteredCourses])

    const handleCardClick = (course: IRagCourse) => {
        setSelectedCourse(course)
    }

    const handleCloseDetail = () => {
        setSelectedCourse(null)
    }

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-300",
            isDark ? 'bg-gray-900' : 'bg-white'
        )}>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className={cn(
                            "text-3xl font-bold",
                            isDark ? "text-slate-100" : "text-slate-950/70"
                        )}>
                            Computer Basics
                        </h1>
                        <p className={cn(
                            "text-sm mt-1",
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        )}>
                            Learn essential computer skills for beginners and intermediate users
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <ParticleButton
                            type="button"
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                "bg-teal-500 hover:bg-teal-600 text-white shadow-sm shadow-teal-500/25"
                            )}
                            successDuration={600}
                            onClick={() => {
                                const subParam = selectedSubCategory !== 'All' ? `&subCategory=${encodeURIComponent(selectedSubCategory)}` : ''
                                navigate(`/dashboard/skills/rag/new?category=Computer+Basics${subParam}`)
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Create Course
                        </ParticleButton>
                    </div>
                </div>

                {/* Dynamic Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className={cn(
                        "p-4 rounded-xl border transition-colors",
                        isDark ? 'border-gray-700/60 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                    )}>
                        <p className={cn(
                            "text-2xl font-bold",
                            isDark ? 'text-white' : 'text-gray-900'
                        )}>
                            {coursesLoading ? '...' : filteredCourses.length}
                        </p>
                        <p className={cn(
                            "text-xs font-medium uppercase tracking-wider mt-0.5",
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        )}>Active Courses</p>
                    </div>

                    <div className={cn(
                        "p-4 rounded-xl border transition-colors",
                        isDark ? 'border-gray-700/60 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                    )}>
                        <p className={cn(
                            "text-2xl font-bold",
                            isDark ? 'text-white' : 'text-gray-900'
                        )}>
                            {coursesLoading ? '...' : totalLessons}
                        </p>
                        <p className={cn(
                            "text-xs font-medium uppercase tracking-wider mt-0.5",
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        )}>Lessons & Modules</p>
                    </div>

                    <div className={cn(
                        "p-4 rounded-xl border transition-colors",
                        isDark ? 'border-gray-700/60 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                    )}>
                        <p className={cn(
                            "text-xl font-bold truncate",
                            isDark ? 'text-teal-400' : 'text-teal-600'
                        )}>
                            {selectedSubCategory === 'All' ? '5 Tracks' : selectedSubCategory}
                        </p>
                        <p className={cn(
                            "text-xs font-medium uppercase tracking-wider mt-0.5",
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        )}>Sub-Category</p>
                    </div>

                    <div className={cn(
                        "p-4 rounded-xl border transition-colors",
                        isDark ? 'border-gray-700/60 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                    )}>
                        <p className={cn(
                            "text-2xl font-bold text-emerald-500",
                            isDark ? 'text-emerald-400' : 'text-emerald-600'
                        )}>
                            Video & Interactive
                        </p>
                        <p className={cn(
                            "text-xs font-medium uppercase tracking-wider mt-0.5",
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        )}>Format</p>
                    </div>
                </div>

                {/* Sub-Category Filter Tabs & Search */}
                <div className="space-y-4 mb-8">
                    {/* Search Bar & Reset */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className={cn(
                                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                                isDark ? "text-slate-400" : "text-slate-500"
                            )} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search inside Computer Basics..."
                                className={cn(
                                    "w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all",
                                    isDark
                                        ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-teal-500"
                                        : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-teal-500 shadow-sm"
                                )}
                            />
                        </div>

                        {(selectedSubCategory !== 'All' || searchQuery) && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                                    isDark
                                        ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset Filter
                            </button>
                        )}
                    </div>

                    {/* Sub-Category Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                            "text-xs font-semibold uppercase tracking-wider mr-1",
                            isDark ? "text-slate-400" : "text-slate-500"
                        )}>
                            Sub-Categories:
                        </span>
                        {['All', ...COMPUTER_BASICS_SUB_CATEGORIES].map((subCat) => {
                            const isActive = selectedSubCategory === subCat
                            return (
                                <button
                                    key={subCat}
                                    type="button"
                                    onClick={() => handleSubCategorySelect(subCat)}
                                    className={cn(
                                        "flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                                        isActive
                                            ? "bg-teal-500 text-white shadow-sm shadow-teal-500/25"
                                            : isDark
                                                ? "text-slate-300 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white"
                                                : "text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200"
                                    )}
                                >
                                    {subCat}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Loading Skeletons */}
                {coursesLoading && (
                    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div
                                key={n}
                                className={cn(
                                    "rounded-xl p-6 border animate-pulse space-y-4",
                                    isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className={cn("w-10 h-10 rounded-lg", isDark ? "bg-slate-800" : "bg-slate-200")} />
                                    <div className={cn("w-20 h-5 rounded-full", isDark ? "bg-slate-800" : "bg-slate-200")} />
                                </div>
                                <div className="space-y-2">
                                    <div className={cn("w-3/4 h-5 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                                    <div className={cn("w-full h-4 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                                    <div className={cn("w-2/3 h-4 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                                </div>
                                <div className="flex gap-2">
                                    <div className={cn("w-16 h-4 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                                    <div className={cn("w-16 h-4 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State when no courses created or match filters */}
                {!coursesLoading && filteredCourses.length === 0 && (
                    <div className={cn(
                        "text-center py-16 px-4 rounded-2xl border my-6 transition-colors",
                        isDark ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    )}>
                        <div className="w-12 h-12 mx-auto rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
                            <Computer fontSize="medium" />
                        </div>
                        <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
                            {selectedSubCategory !== 'All'
                                ? `No courses available for "${selectedSubCategory}".`
                                : searchQuery
                                    ? `No courses match "${searchQuery}".`
                                    : "No Computer Basics courses created yet."}
                        </h3>
                        <p className="text-sm max-w-md mx-auto mb-6">
                            {selectedSubCategory !== 'All'
                                ? `No courses have been created under Computer Basics → "${selectedSubCategory}". Click below to create one.`
                                : searchQuery
                                    ? "Try searching for a different keyword or reset your filter."
                                    : "Courses created in Course Creation under Computer Basics will appear here automatically."}
                        </p>

                        <div className="flex items-center justify-center gap-3">
                            <ParticleButton
                                type="button"
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all",
                                    "bg-teal-500 hover:bg-teal-600 shadow-md shadow-teal-500/20"
                                )}
                                successDuration={600}
                                onClick={() => {
                                    const subParam = selectedSubCategory !== 'All' ? `&subCategory=${encodeURIComponent(selectedSubCategory)}` : ''
                                    navigate(`/dashboard/skills/rag/new?category=Computer+Basics${subParam}`)
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                {selectedSubCategory !== 'All'
                                    ? `Create ${selectedSubCategory} Course`
                                    : "Create Computer Basics Course"}
                            </ParticleButton>

                            {(selectedSubCategory !== 'All' || searchQuery) && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors",
                                        isDark
                                            ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                                            : "border-slate-300 text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Dynamic Courses Grid */}
                {!coursesLoading && filteredCourses.length > 0 && (
                    <div className={cn(
                        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                    )}>
                        {filteredCourses.map((course, index) => (
                            <div
                                key={`${course.id}-${index}`}
                                className={cn(
                                    "group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300",
                                    "border will-change-transform",
                                    isDark
                                        ? "border-slate-800 bg-slate-900/50 hover:border-teal-500/30 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-teal-500/5"
                                        : "border-slate-200 bg-white hover:shadow-lg hover:shadow-teal-100/20",
                                    "hover:-translate-y-0.5 cursor-pointer"
                                )}
                                onClick={() => handleCardClick(course)}
                            >
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className={cn(
                                        "absolute inset-0 bg-size[4px_4px]",
                                        isDark
                                            ? "bg-[radial-linear(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)]"
                                            : "bg-[radial-linear(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)]"
                                    )} />
                                </div>

                                {/* Content */}
                                <div className="relative flex flex-col space-y-3">
                                    {/* Header: Icon + SubCategory Badge + Video Badge */}
                                    <div className="flex items-center justify-between">
                                        <div className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300",
                                            isDark
                                                ? "bg-slate-800 text-slate-300"
                                                : "bg-slate-100 text-slate-600 group-hover:bg-teal-50"
                                        )}>
                                            {getSubCategoryIcon(course.subCategory)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors duration-300",
                                                getSubCategoryBadgeStyle(course.subCategory, isDark)
                                            )}>
                                                {course.subCategory || 'Computer Basics'}
                                            </span>
                                            <span className={cn(
                                                "flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                                                course.videoType === 'youtube'
                                                    ? isDark ? "bg-red-950/30 text-red-400 border-red-800/40" : "bg-red-50 text-red-600 border-red-200"
                                                    : isDark ? "bg-teal-950/30 text-teal-400 border-teal-800/40" : "bg-teal-50 text-teal-600 border-teal-200"
                                            )}>
                                                <PlayArrow sx={{ fontSize: 13 }} />
                                                {course.videoType === 'youtube' ? 'YouTube' : 'Video'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title & Description */}
                                    <div className="space-y-1.5">
                                        <h3 className={cn(
                                            "text-[15px] font-semibold tracking-tight",
                                            isDark ? "text-white" : "text-slate-900"
                                        )}>
                                            {course.title}
                                            <span className={cn(
                                                "ml-2 text-xs font-normal",
                                                isDark ? "text-slate-400" : "text-slate-500"
                                            )}>
                                                {course.subModules?.length || 0} {(course.subModules?.length || 0) === 1 ? 'module' : 'modules'}
                                            </span>
                                        </h3>
                                        <p className={cn(
                                            "text-xs leading-snug line-clamp-2",
                                            isDark ? "text-slate-400" : "text-slate-600"
                                        )}>
                                            {course.description || 'Comprehensive Computer Basics course module.'}
                                        </p>
                                    </div>

                                    {/* Modules and Lessons Count */}
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1 text-teal-500 font-semibold">
                                            <MenuBook fontSize="small" className="h-3.5 w-3.5" />
                                            <span>{course.subModules?.length || 0} {(course.subModules?.length || 0) === 1 ? 'module' : 'modules'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <AccessTime fontSize="small" className="h-3 w-3" />
                                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                                                {(course.subModules || []).reduce((acc, sm) => acc + (sm.videos?.length || (sm.videoUrl ? 1 : 0)), 0) || 1} lessons
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {Array.isArray(course.tags) && course.tags.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs mt-1">
                                            {course.tags.slice(0, 3).map((tag, i) => (
                                                <span
                                                    key={`${tag}-${i}`}
                                                    className={cn(
                                                        "rounded-md px-2 py-0.5 text-[11px] border transition-all duration-200",
                                                        isDark
                                                            ? "bg-slate-800 text-slate-300 border-slate-700"
                                                            : "bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-teal-50"
                                                    )}
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                            {course.tags.length > 3 && (
                                                <span className={cn("text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>
                                                    +{course.tags.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Click to view detail prompt */}
                                    <div className="mt-1 text-xs flex items-center gap-1 text-teal-500 font-medium">
                                        <span>Click to watch & view modules</span>
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Border linear glow */}
                                <div
                                    className={cn(
                                        "absolute inset-0 -z-10 rounded-xl p-px transition-opacity duration-300",
                                        isDark
                                            ? "bg-linear-to-br from-transparent via-teal-500/20 to-transparent"
                                            : "bg-linear-to-br from-transparent via-teal-300/30 to-transparent",
                                        "opacity-0 group-hover:opacity-100"
                                    )}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Course Detail Modal - Shows all inserted modules and lessons */}
            {selectedCourse && (
                <CourseDetailModal 
                    course={selectedCourse} 
                    onClose={handleCloseDetail} 
                />
            )}
        </div>
    )
}

export default ComputerBasicList