// src/section/Skill-learning/rag/RagPage.tsx
// Combined page: Create Course form + Course List with tab navigation

import React, { useState } from 'react';
import RagCreateForm from './RagCreateForm';
import RagCourseList from './RagCourseList';
import { useTheme } from '@/theme/AppThemeProvider';
import { PlusCircle, Search } from 'lucide-react';

type Tab = 'create' | 'search';

const RagPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const tabBase =
    'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200';
  const activeStyle = isDark
    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
    : 'bg-indigo-500 text-white shadow-lg shadow-indigo-400/20';
  const inactiveStyle = isDark
    ? 'bg-slate-800 text-slate-400 hover:text-white'
    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700';

  return (
    <div className={`min-h-screen px-4 py-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Page header */}
      <div className="max-w-3xl mx-auto mb-6">
        <h1 className="text-3xl font-bold mb-1">Skill Learning — RAG Module</h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Create and semantically search skill-learning courses powered by RAG.
        </p>

        {/* Tab switcher */}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            id="rag-tab-search"
            className={`${tabBase} ${activeTab === 'search' ? activeStyle : inactiveStyle}`}
            onClick={() => setActiveTab('search')}
          >
            <Search className="w-4 h-4" />
            Browse Courses
          </button>
          <button
            type="button"
            id="rag-tab-create"
            className={`${tabBase} ${activeTab === 'create' ? activeStyle : inactiveStyle}`}
            onClick={() => setActiveTab('create')}
          >
            <PlusCircle className="w-4 h-4" />
            Create Course
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'search' ? <RagCourseList /> : <RagCreateForm />}
    </div>
  );
};

export default RagPage;
