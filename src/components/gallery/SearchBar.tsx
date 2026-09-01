import React from 'react';
import {
  Search,
  ArrowUpDown,
  Filter,
  Heart,
  Clock,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { SortOption, FilterOption } from '../../types';

interface SearchBarProps {
  search: string;
  setSearch: (val: string) => void;
  sort: SortOption;
  setSort: (val: SortOption) => void;
  filter: FilterOption;
  setFilter: (val: FilterOption) => void;
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchDelete?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  search,
  setSearch,
  sort,
  setSort,
  filter,
  setFilter,
  totalCount,
  selectedCount,
  onSelectAll,
  onClearSelection,
  onBatchDelete,
}) => {
  const filterChips: { id: FilterOption; label: string; icon?: any }[] = [
    { id: 'all', label: 'All Photos' },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'recent', label: 'Recent (7d)', icon: Clock },
    { id: 'jpg', label: 'JPG/JPEG' },
    { id: 'png', label: 'PNG' },
    { id: 'webp', label: 'WEBP' },
  ];

  return (
    <div className="space-y-3.5 mb-6">
      {/* Top Filter Row: Search, Sort & Batch Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {filterChips.map((chip) => {
            const Icon = chip.icon;
            const isActive = filter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />}
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sort & Count Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          {selectedCount > 0 ? (
            <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs text-blue-700 animate-in fade-in duration-200 shadow-sm">
              <span className="font-semibold">{selectedCount} selected</span>
              <button
                onClick={onClearSelection}
                className="text-slate-500 hover:text-slate-800 p-0.5 rounded cursor-pointer"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {onBatchDelete && (
                <button
                  onClick={onBatchDelete}
                  className="flex items-center space-x-1 ml-2 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium hidden md:inline">
              {totalCount} {totalCount === 1 ? 'asset' : 'assets'}
            </span>
          )}

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none shadow-sm"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="largest">Sort: Largest Size</option>
              <option value="smallest">Sort: Smallest Size</option>
              <option value="caption_asc">Sort: Caption (A-Z)</option>
              <option value="caption_desc">Sort: Caption (Z-A)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
