import { useState, useMemo, useEffect } from 'react'
import { useTheme } from '@/theme/AppThemeProvider'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import {
    AccessTime,
    MenuBook,
    PlayArrow,
    RecordVoiceOver,
    Groups,
    Psychology,
    Schedule,
    Stars,
    Handshake,
} from '@mui/icons-material'
import { Search, RotateCcw, Plus } from 'lucide-react'
import { ParticleButton } from "../../../components/ui/particle-button"
import { cn } from '@/utils/utils'
import { useCourses } from '@/action/ragCourse'
import {
    CATEGORY_MAP,
    isCategoryMatch,
    isSubCategoryMatch,
    getCanonicalSubCategory,
} from '@/constants/categoryData'
import { IRagCourse } from '@/types/ragCourse'

const SOFT_SKILLS_SUB_CATEGORIES = CATEGORY_MAP['Soft Skills'] || [
    'Communication',
    'Leadership',
    'Teamwork',
    'Time Management',
    'Problem Solving',
]

const getSubCategoryIcon = (subCat?: string) => {
    switch (subCat) {
        case 'Communication':
            return <RecordVoiceOver fontSize="small" className="text-pink-500" />
        case 'Leadership':
            return <Stars fontSize="small" className="text-amber-500" />
        case 'Teamwork':
            return <Groups fontSize="small" className="text-blue-500" />
        case 'Time Management':
            return <Schedule fontSize="small" className="text-teal-500" />
        case 'Problem Solving':
            return <Psychology fontSize="small" className="text-purple-500" />
        default:
            return <Handshake fontSize="small" className="text-pink-500" />
    }
}

const getSubCategoryBadgeStyle = (subCat?: string, isDark?: boolean) => {
    if (isDark) {
        switch (subCat) {
            case 'Communication': return 'bg-pink-950/40 text-pink-300 border-pink-800/40'
            case 'Leadership': return 'bg-amber-950/40 text-amber-300 border-amber-800/40'
            case 'Teamwork': return 'bg-blue-950/40 text-blue-300 border-blue-800/40'
            case 'Time Management': return 'bg-teal-950/40 text-teal-300 border-teal-800/40'
            case 'Problem Solving': return 'bg-purple-950/40 text-purple-300 border-purple-800/40'
            default: return 'bg-slate-800 text-slate-300 border-slate-700'
        }
    } else {
        switch (subCat) {
            case 'Communication': return 'bg-pink-50 text-pink-700 border-pink-200'
            case 'Leadership': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'Teamwork': return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'Time Management': return 'bg-teal-50 text-teal-700 border-teal-200'
            case 'Problem Solving': return 'bg-purple-50 text-purple-700 border-purple-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }
}

import { CourseDetailModal } from '../common/CourseDetailModal'


const SoftSkillList = () => {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const navigate = useNavigate()

    const [selectedCourse, setSelectedCourse] = useState<IRagCourse | null>(null)

    const [searchParams, setSearchParams] = useSearchParams()
    const { subCategory: routeSubParam } = useParams()
    const rawSubParam = routeSubParam || searchParams.get('subCategory')
    const canonicalSub = rawSubParam ? (getCanonicalSubCategory('Soft Skills', rawSubParam) || rawSubParam) : 'All'

    const [selectedSubCategory, setSelectedSubCategory] = useState<string>(canonicalSub)
    const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '')

    useEffect(() => {
        const currentRaw = routeSubParam || searchParams.get('subCategory')
        const resolved = currentRaw ? (getCanonicalSubCategory('Soft Skills', currentRaw) || currentRaw) : 'All'
        setSelectedSubCategory(resolved)
        if (searchParams.get('search') !== null) {
            setSearchQuery(searchParams.get('search') || '')
        }
    }, [routeSubParam, searchParams])

    const { courses: apiCourses, coursesLoading } = useCourses(
        searchQuery,
        'Soft Skills',
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

    const filteredCourses = useMemo(() => {
        if (!apiCourses || !Array.isArray(apiCourses)) return []

        return apiCourses.filter((course) => {
            if (!isCategoryMatch(course.category, 'Soft Skills')) {
                return false
            }

            if (selectedSubCategory !== 'All') {
                if (!isSubCategoryMatch(course.subCategory, selectedSubCategory)) {
                    return false
                }
            }

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

    const totalLessons = useMemo(() => {
        return filteredCourses.reduce((sum, c) => sum + (c.subModules?.length || 1), 0)
    }, [filteredCourses])

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
                            Soft Skills
                        </h1>
                        <p className={cn(
                            "text-sm mt-1",
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        )}>
                            Master communication, leadership, teamwork, time management, and problem solving
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <ParticleButton
                            type="button"
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                "bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-500/25"
                            )}
                            successDuration={600}
                            onClick={() => {
                                const subParam = selectedSubCategory !== 'All' ? `&subCategory=${encodeURIComponent(selectedSubCategory)}` : ''
                                navigate(`/dashboard/skills/rag/new?category=Soft+Skills${subParam}`)
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
                        <p className={cn("text-2xl font-bold", isDark ? 'text-white' : 'text-gray-900')}>
                            {coursesLoading ? '...' : filteredCourses.length}
                        </p>
                        <p className={cn("text-xs font-medium uppercase tracking-wider mt-0.5", isDark ? 'text-gray-400' : 'text-gray-500')}>
                            Active Courses
                        </p>
                    </div>

                    <div className={cn(
                        "p-4 rounded-xl border transition-colors",
                        isDark ? 'border-gray-700/60 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                    )}>
                        <p className={cn("text-2xl font-bold", isDark ? 'text-white' : 'text-gray-900')}>
                            {coursesLoading ? '...' : totalLessons}
                        </p>
                        <p className={cn("text-xs font-medium uppercase tracking-wider mt-0.5", isDark ? 'text-gray-400' : 'text-gray-500')}>
                            Lessons & Modules
                        </p>
                    </div>

                    <div className={cn(
                        "p-4 rounded-xl border transition-colors",
                        isDark ? 'border-gray-700/60 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                    )}>
                        <p className={cn("text-xl font-bold truncate", isDark ? 'text-pink-400' : 'text-pink-600')}>
                            {selectedSubCategory === 'All' ? '5 Tracks' : selectedSubCategory}
                        </p>
                        <p className={cn("text-xs font-medium uppercase tracking-wider mt-0.5", isDark ? 'text-gray-400' : 'text-gray-500')}>
                            Sub-Category
                        </p>
                    </div>

                    <div className={cn(
                        "p-4 rounded-xl border transition-colors",
                        isDark ? 'border-gray-700/60 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                    )}>
                        <p className={cn("text-2xl font-bold text-pink-500", isDark ? 'text-pink-400' : 'text-pink-600')}>
                            Video & Interactive
                        </p>
                        <p className={cn("text-xs font-medium uppercase tracking-wider mt-0.5", isDark ? 'text-gray-400' : 'text-gray-500')}>
                            Format
                        </p>
                    </div>
                </div>

                {/* Sub-Category Filter Tabs & Search */}
                <div className="space-y-4 mb-8">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-slate-400" : "text-slate-500")} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search inside Soft Skills..."
                                className={cn(
                                    "w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-all",
                                    isDark
                                        ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-pink-500"
                                        : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-pink-500 shadow-sm"
                                )}
                            />
                        </div>

                        {(selectedSubCategory !== 'All' || searchQuery) && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                                    isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset Filter
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-xs font-semibold uppercase tracking-wider mr-1", isDark ? "text-slate-400" : "text-slate-500")}>
                            Sub-Categories:
                        </span>
                        {['All', ...SOFT_SKILLS_SUB_CATEGORIES].map((subCat) => {
                            const isActive = selectedSubCategory === subCat
                            return (
                                <button
                                    key={subCat}
                                    type="button"
                                    onClick={() => handleSubCategorySelect(subCat)}
                                    className={cn(
                                        "flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                                        isActive
                                            ? "bg-pink-500 text-white shadow-sm shadow-pink-500/25"
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
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!coursesLoading && filteredCourses.length === 0 && (
                    <div className={cn(
                        "text-center py-16 px-4 rounded-2xl border my-6 transition-colors",
                        isDark ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    )}>
                        <div className="w-12 h-12 mx-auto rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center mb-3">
                            <Handshake fontSize="medium" />
                        </div>
                        <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
                            {selectedSubCategory !== 'All'
                                ? `No courses available for "${selectedSubCategory}".`
                                : searchQuery
                                    ? `No courses match "${searchQuery}".`
                                    : "No Soft Skills courses created yet."}
                        </h3>
                        <p className="text-sm max-w-md mx-auto mb-6">
                            {selectedSubCategory !== 'All'
                                ? `No courses have been created under Soft Skills → "${selectedSubCategory}". Click below to create one.`
                                : searchQuery
                                    ? "Try searching for a different keyword or reset your filter."
                                    : "Courses created in Course Creation under Soft Skills will appear here automatically."}
                        </p>

                        <div className="flex items-center justify-center gap-3">
                            <ParticleButton
                                type="button"
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all",
                                    "bg-pink-500 hover:bg-pink-600 shadow-md shadow-pink-500/20"
                                )}
                                successDuration={600}
                                onClick={() => {
                                    const subParam = selectedSubCategory !== 'All' ? `&subCategory=${encodeURIComponent(selectedSubCategory)}` : ''
                                    navigate(`/dashboard/skills/rag/new?category=Soft+Skills${subParam}`)
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                {selectedSubCategory !== 'All'
                                    ? `Create ${selectedSubCategory} Course`
                                    : "Create Soft Skills Course"}
                            </ParticleButton>

                            {(selectedSubCategory !== 'All' || searchQuery) && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors",
                                        isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"
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
                    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredCourses.map((course, index) => (
                            <div
                                key={`${course.id}-${index}`}
                                className={cn(
                                    "group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300",
                                    "border will-change-transform",
                                    isDark
                                        ? "border-slate-800 bg-slate-900/50 hover:border-pink-500/30 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-pink-500/5"
                                        : "border-slate-200 bg-white hover:shadow-lg hover:shadow-pink-100/20",
                                    "hover:-translate-y-0.5 cursor-pointer"
                                )}
                                onClick={() => setSelectedCourse(course)}
                            >
                                <div className="relative flex flex-col space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300",
                                            isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600 group-hover:bg-pink-50"
                                        )}>
                                            {getSubCategoryIcon(course.subCategory)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors duration-300",
                                                getSubCategoryBadgeStyle(course.subCategory, isDark)
                                            )}>
                                                {course.subCategory || 'Soft Skills'}
                                            </span>
                                            <span className={cn(
                                                "flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                                                course.videoType === 'youtube'
                                                    ? isDark ? "bg-red-950/30 text-red-400 border-red-800/40" : "bg-red-50 text-red-600 border-red-200"
                                                    : isDark ? "bg-pink-950/30 text-pink-400 border-pink-800/40" : "bg-pink-50 text-pink-600 border-pink-200"
                                            )}>
                                                <PlayArrow sx={{ fontSize: 13 }} />
                                                {course.videoType === 'youtube' ? 'YouTube' : 'Video'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <h3 className={cn("text-[15px] font-semibold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                                            {course.title}
                                            <span className={cn("ml-2 text-xs font-normal", isDark ? "text-slate-400" : "text-slate-500")}>
                                                {course.subModules?.length || 0} {(course.subModules?.length || 0) === 1 ? 'module' : 'modules'}
                                            </span>
                                        </h3>
                                        <p className={cn("text-xs leading-snug line-clamp-2", isDark ? "text-slate-400" : "text-slate-600")}>
                                            {course.description || 'Comprehensive Soft Skills course module.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1 text-pink-500 font-semibold">
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

                                    {Array.isArray(course.tags) && course.tags.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs mt-1">
                                            {course.tags.slice(0, 3).map((tag, i) => (
                                                <span
                                                    key={`${tag}-${i}`}
                                                    className={cn(
                                                        "rounded-md px-2 py-0.5 text-[11px] border transition-all duration-200",
                                                        isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-pink-50"
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

                                    <div className="mt-1 text-xs flex items-center gap-1 text-pink-500 font-medium">
                                        <span>Click to watch & view modules</span>
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedCourse && (
                <CourseDetailModal 
                    course={selectedCourse} 
                    onClose={() => setSelectedCourse(null)} 
                />
            )}
        </div>
    )
}

export { SoftSkillList as softSkill }
export default SoftSkillList