import React from 'react';
import {
  Cloud,
  Image as ImageIcon,
  Upload,
  Heart,
  Clock,
  Cpu,
  Settings,
  LogOut,
  ShieldCheck,
  Server,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { User, CloudStats } from '../../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenUpload: () => void;
  user: User | null;
  onLogout: () => void;
  cloudStats: CloudStats | null;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenUpload,
  user,
  onLogout,
  cloudStats,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const navItems = [
    { id: 'gallery', label: 'Gallery', icon: ImageIcon, badge: cloudStats?.totalPhotos },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'architecture', label: 'AWS Architecture', icon: Cpu, highlight: true },
    { id: 'console', label: 'Cloud Live Stream', icon: Server },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        id="cloudgallery-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 text-white flex-shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-xl tracking-tight">CloudGallery</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight">AWS S3 • DynamoDB</p>
            </div>
          </div>
        </div>

        {/* Quick Upload Action */}
        <div className="p-4 pb-2">
          <button
            id="sidebar-upload-button"
            onClick={() => {
              onOpenUpload();
              setIsOpenMobile(false);
            }}
            className="w-full group relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            <span>Upload Photos</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsOpenMobile(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Cloud Storage Resource Monitor */}
        <div className="p-3.5 mx-4 my-2 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              S3 Storage
            </span>
            <span className="font-mono text-slate-300 text-[11px]">
              {cloudStats ? formatBytes(cloudStats.totalStorageBytes) : '0 B'}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    6,
                    ((cloudStats?.totalStorageBytes || 0) / (100 * 1024 * 1024)) * 100
                  )
                )}%`,
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>CDN Hit: {cloudStats?.cloudFrontCacheHitRatio || 95}%</span>
            <span className="text-emerald-400">DynamoDB OK</span>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-900/50 flex items-center gap-3">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.name || 'User'}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-slate-700 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0 shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Cloud User'}</p>
            <p className="text-xs text-slate-400 truncate font-mono">{user?.email || 'user@example.com'}</p>
          </div>
          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            title="Sign out"
            className="text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors p-2 rounded-lg cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
