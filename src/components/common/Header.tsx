import React from 'react';
import {
  Menu,
  Upload,
  Sparkles,
  Search,
  Activity,
  Layers,
  Grid3X3,
  List,
  Shield,
} from 'lucide-react';
import { User, ViewMode } from '../../types';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenUpload: () => void;
  onOpenMobileSidebar: () => void;
  search: string;
  setSearch: (val: string) => void;
  user: User | null;
  onSeedDemo: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenArchitecture: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'My Photo Gallery',
  subtitle = 'Store, organize and access your memories securely in the cloud.',
  onOpenUpload,
  onOpenMobileSidebar,
  search,
  setSearch,
  onSeedDemo,
  viewMode,
  setViewMode,
  onOpenArchitecture,
}) => {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm sticky top-0 z-30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
        {/* Left Section: Mobile toggle, Title & Subtitle */}
        <div className="flex items-center space-x-3">
          <button
            id="mobile-sidebar-toggle"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                AWS S3 & DynamoDB
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        {/* Right Section: Search & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="header-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search photos..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View (Responsive)"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sample Seeder Button */}
          <button
            id="seed-demo-photos-btn"
            onClick={onSeedDemo}
            title="Load demo AWS images for instant evaluation"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Sample Photos</span>
          </button>

          {/* Cloud Architecture Quick Viewer */}
          <button
            onClick={onOpenArchitecture}
            title="Inspect AWS Cloud Architecture"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-600 transition-all cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Architecture</span>
          </button>

          {/* + Upload Photos Main Action */}
          <button
            id="header-upload-btn"
            onClick={onOpenUpload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photos</span>
          </button>
        </div>
      </div>
    </header>
  );
};
