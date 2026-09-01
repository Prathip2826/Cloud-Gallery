import React, { useState } from 'react';
import {
  Eye,
  Download,
  Trash2,
  Heart,
  MoreVertical,
  Calendar,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Tag,
} from 'lucide-react';
import { Photo } from '../../types';

interface PhotoCardProps {
  photo: Photo;
  onView: (photo: Photo) => void;
  onDownload: (photo: Photo) => void;
  onDelete: (photoId: string) => void;
  onToggleFavorite: (photoId: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (photoId: string) => void;
  onEditCaption?: (photo: Photo) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  onView,
  onDownload,
  onDelete,
  onToggleFavorite,
  isSelected = false,
  onToggleSelect,
  onEditCaption,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${photo.fileName}"?\nThis will permanently delete the original from S3 and its metadata from DynamoDB.`)) {
      setIsDeleting(true);
      onDelete(photo.photoId);
    }
  };

  return (
    <div
      id={`photo-card-${photo.photoId}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
      className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col p-2 shadow-sm ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-xl hover:-translate-y-0.5'
      } ${isDeleting ? 'opacity-40 pointer-events-none scale-95' : ''}`}
    >
      {/* Image Thumbnail Container */}
      <div
        onClick={() => onView(photo)}
        className="relative aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {/* Loading skeleton placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-mono text-slate-400">Loading CloudFront CDN...</span>
          </div>
        )}

        <img
          src={photo.thumbnailUrl}
          alt={photo.caption || photo.fileName}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Selection Checkbox */}
        {onToggleSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(photo.photoId);
            }}
            className={`absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isSelected
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-black/50 backdrop-blur-md text-white/80 hover:text-white border border-white/20 opacity-0 group-hover:opacity-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(photo.photoId);
          }}
          title={photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer backdrop-blur-md ${
            photo.isFavorite
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 opacity-100'
              : 'bg-black/40 hover:bg-black/70 text-white/80 hover:text-rose-400 border border-white/10 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${photo.isFavorite ? 'fill-white' : ''}`} />
        </button>

        {/* Floating Quick Action Overlay on Hover */}
        <div
          className={`absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-center justify-between transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(photo);
              }}
              title="View full preview"
              className="w-8 h-8 rounded-full bg-white text-slate-800 flex items-center justify-center hover:scale-110 transition-transform shadow-md cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(photo);
              }}
              title="Download original (via secure S3 pre-signed GET URL)"
              className="w-8 h-8 rounded-full bg-white text-slate-800 flex items-center justify-center hover:scale-110 transition-transform shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleDeleteClick}
            title="Delete photo"
            className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Details & Metadata */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h4
              onClick={() => onView(photo)}
              title={photo.caption || photo.fileName}
              className="font-bold text-xs sm:text-sm text-slate-800 hover:text-blue-600 line-clamp-1 cursor-pointer transition-colors"
            >
              {photo.caption || photo.fileName}
            </h4>

            {/* Menu Trigger */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Context Dropdown */}
              {showMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onView(photo);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-left cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Details</span>
                  </button>
                  {onEditCaption && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEditCaption(photo);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-left cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Edit Caption</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDownload(photo);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-left cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download (S3)</span>
                  </button>
                  <div className="h-px bg-slate-200 my-1" />
                  <button
                    onClick={handleDeleteClick}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Photo</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tags if any */}
          {photo.tags && photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {photo.tags.slice(0, 2).map((t, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                >
                  #{t}
                </span>
              ))}
              {photo.tags.length > 2 && (
                <span className="text-[10px] text-slate-500 self-center">
                  +{photo.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer info: Upload Date & File Size */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1 font-medium">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatDate(photo.uploadedAt)}
          </span>
          <span className="flex items-center gap-1 font-mono font-medium bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600">
            {formatFileSize(photo.size)}
          </span>
        </div>
      </div>
    </div>
  );
};
