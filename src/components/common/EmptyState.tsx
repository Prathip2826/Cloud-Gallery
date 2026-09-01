import React from 'react';
import { ImagePlus, Sparkles, Cloud, ArrowUpRight } from 'lucide-react';

interface EmptyStateProps {
  onUpload: () => void;
  onSeedDemo: () => void;
  filterType?: string;
  isSearch?: boolean;
  onClearFilter?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onUpload,
  onSeedDemo,
  filterType,
  isSearch,
  onClearFilter,
}) => {
  return (
    <div className="py-16 px-6 text-center max-w-lg mx-auto flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-6 shadow-sm">
        <ImagePlus className="w-8 h-8 text-blue-600" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 tracking-tight">
        {isSearch
          ? 'No photos matched your search'
          : filterType === 'favorites'
          ? 'No favorite photos yet'
          : 'Your cloud gallery is empty'}
      </h3>

      <p className="text-sm text-slate-500 mt-2 mb-8 leading-relaxed">
        {isSearch
          ? 'Try adjusting your search keywords or clearing active filters.'
          : filterType === 'favorites'
          ? 'Mark photos with the heart icon to access them quickly here.'
          : 'Upload your high-resolution photos to store them in AWS S3 and generate optimized thumbnails with Lambda & Sharp.'}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
        {isSearch || filterType ? (
          <button
            onClick={onClearFilter}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all cursor-pointer shadow-sm"
          >
            Clear Filters
          </button>
        ) : (
          <>
            <button
              onClick={onUpload}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Upload Your First Photo</span>
            </button>

            <button
              onClick={onSeedDemo}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Load Demo Photos</span>
            </button>
          </>
        )}
      </div>

      <div className="mt-12 p-4 rounded-xl bg-white border border-slate-200 w-full text-left shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 mb-1">
          <Cloud className="w-3.5 h-3.5 text-blue-600" />
          <span>Real AWS Cloud Pipeline Active</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Uploads execute directly to S3 with SigV4 pre-signed PUT URLs. S3 triggers Lambda to generate Sharp thumbnails served via CloudFront CDN.
        </p>
      </div>
    </div>
  );
};
