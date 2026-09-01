import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col animate-pulse shadow-sm p-2"
        >
          {/* Thumbnail Skeleton */}
          <div className="aspect-[4/3] bg-slate-100 rounded-xl w-full" />
          
          {/* Metadata Skeleton */}
          <div className="p-2 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
