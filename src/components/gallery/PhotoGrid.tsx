import React from 'react';
import { Photo, ViewMode } from '../../types';
import { PhotoCard } from './PhotoCard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';

interface PhotoGridProps {
  photos: Photo[];
  isLoading: boolean;
  viewMode?: ViewMode;
  onViewPhoto: (photo: Photo) => void;
  onDownloadPhoto: (photo: Photo) => void;
  onDeletePhoto: (photoId: string) => void;
  onToggleFavorite: (photoId: string) => void;
  onUpload: () => void;
  onSeedDemo: () => void;
  filterType?: string;
  isSearch?: boolean;
  onClearFilter?: () => void;
  selectedPhotoIds: string[];
  onToggleSelectPhoto: (photoId: string) => void;
  onEditCaption?: (photo: Photo) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  isLoading,
  viewMode = 'grid',
  onViewPhoto,
  onDownloadPhoto,
  onDeletePhoto,
  onToggleFavorite,
  onUpload,
  onSeedDemo,
  filterType,
  isSearch,
  onClearFilter,
  selectedPhotoIds,
  onToggleSelectPhoto,
  onEditCaption,
}) => {
  if (isLoading && photos.length === 0) {
    return <LoadingSkeleton count={10} />;
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        onUpload={onUpload}
        onSeedDemo={onSeedDemo}
        filterType={filterType}
        isSearch={isSearch}
        onClearFilter={onClearFilter}
      />
    );
  }

  // 1. Standard Responsive Multi-Column Grid (Desktop: 4/5 cols, Tablet: 3 cols, Mobile: 2 cols)
  if (viewMode === 'grid') {
    return (
      <div
        id="photo-grid-container"
        className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5"
      >
        {photos.map((photo) => (
          <PhotoCard
            key={photo.photoId}
            photo={photo}
            onView={onViewPhoto}
            onDownload={onDownloadPhoto}
            onDelete={onDeletePhoto}
            onToggleFavorite={onToggleFavorite}
            isSelected={selectedPhotoIds.includes(photo.photoId)}
            onToggleSelect={onToggleSelectPhoto}
            onEditCaption={onEditCaption}
          />
        ))}
      </div>
    );
  }

  // 2. List View layout
  return (
    <div id="photo-list-container" className="space-y-2.5">
      {photos.map((photo) => (
        <div
          key={photo.photoId}
          onClick={() => onViewPhoto(photo)}
          className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
              <img
                src={photo.thumbnailUrl}
                alt={photo.caption || photo.fileName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 truncate">
                {photo.caption || photo.fileName}
              </h4>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <span>{photo.fileName}</span>
                <span>•</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">{(photo.size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onDownloadPhoto(photo)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
              title="Download original from S3"
            >
              Download
            </button>
            <button
              onClick={() => onToggleFavorite(photo.photoId)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                photo.isFavorite ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100'
              }`}
            >
              Fav
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
