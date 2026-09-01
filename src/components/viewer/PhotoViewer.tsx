import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Trash2,
  Heart,
  Calendar,
  HardDrive,
  FileType,
  Cloud,
  Database,
  Shield,
  Layers,
  Edit2,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Photo } from '../../types';

interface PhotoViewerProps {
  photo: Photo | null;
  onClose: () => void;
  onDownload: (photo: Photo) => void;
  onDelete: (photoId: string) => void;
  onToggleFavorite: (photoId: string) => void;
  onUpdateCaption?: (photoId: string, caption: string) => Promise<any>;
  allPhotos?: Photo[];
  onSelectPhoto?: (photo: Photo) => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  onClose,
  onDownload,
  onDelete,
  onToggleFavorite,
  onUpdateCaption,
  allPhotos = [],
  onSelectPhoto,
}) => {
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'aws'>('info');

  useEffect(() => {
    if (photo) {
      setCaptionText(photo.caption || '');
      setIsEditingCaption(false);
    }
  }, [photo]);

  // Keyboard navigation (Esc to close, Left/Right arrow to cycle photos)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photo) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && allPhotos.length > 1 && onSelectPhoto) {
        const currentIndex = allPhotos.findIndex((p) => p.photoId === photo.photoId);
        if (currentIndex > 0) {
          onSelectPhoto(allPhotos[currentIndex - 1]);
        }
      } else if (e.key === 'ArrowRight' && allPhotos.length > 1 && onSelectPhoto) {
        const currentIndex = allPhotos.findIndex((p) => p.photoId === photo.photoId);
        if (currentIndex < allPhotos.length - 1) {
          onSelectPhoto(allPhotos[currentIndex + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, allPhotos, onSelectPhoto, onClose]);

  if (!photo) return null;

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  const handleSaveCaption = async () => {
    if (!onUpdateCaption) return;
    setIsSavingCaption(true);
    try {
      await onUpdateCaption(photo.photoId, captionText);
      setIsEditingCaption(false);
    } catch (err) {
      console.error('Failed to update caption:', err);
    } finally {
      setIsSavingCaption(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${photo.fileName}"?\nThis will remove the original from S3 and metadata from DynamoDB.`)) {
      onDelete(photo.photoId);
      onClose();
    }
  };

  const currentIndex = allPhotos.findIndex((p) => p.photoId === photo.photoId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1 && currentIndex >= 0;

  return (
    <div
      id="photo-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Navigation Arrow Left */}
      {hasPrev && onSelectPhoto && (
        <button
          onClick={() => onSelectPhoto(allPhotos[currentIndex - 1])}
          className="hidden md:flex absolute left-4 z-50 p-3 rounded-full bg-white/90 shadow-lg border border-slate-200 text-slate-800 hover:bg-white transition-all cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Navigation Arrow Right */}
      {hasNext && onSelectPhoto && (
        <button
          onClick={() => onSelectPhoto(allPhotos[currentIndex + 1])}
          className="hidden md:flex absolute right-4 z-50 p-3 rounded-full bg-white/90 shadow-lg border border-slate-200 text-slate-800 hover:bg-white transition-all cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Modal Container */}
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col md:flex-row overflow-hidden shadow-2xl">
        {/* Left Side: Photo Canvas */}
        <div className="relative flex-1 bg-slate-900 flex items-center justify-center p-4 sm:p-8 overflow-hidden min-h-[300px]">
          {/* Main Photo Image */}
          <img
            src={photo.thumbnailUrl}
            alt={photo.caption || photo.fileName}
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all"
          />

          {/* Quick Floating Overlays */}
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-md text-white border border-white/10">
              {currentIndex >= 0 ? `${currentIndex + 1} of ${allPhotos.length}` : '1 of 1'}
            </span>
          </div>

          <button
            onClick={() => onToggleFavorite(photo.photoId)}
            className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
              photo.isFavorite
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-black/60 text-white/80 hover:text-rose-400 border border-white/10'
            }`}
          >
            <Heart className={`w-5 h-5 ${photo.isFavorite ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Right Side: Metadata & AWS Cloud Inspector Panel */}
        <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col justify-between">
          {/* Panel Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'info'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Photo Details
              </button>
              <button
                onClick={() => setActiveTab('aws')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'aws'
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>AWS Inspector</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
            {activeTab === 'info' ? (
              <>
                {/* Caption / Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Caption
                    </label>
                    {!isEditingCaption && (
                      <button
                        onClick={() => setIsEditingCaption(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditingCaption ? (
                    <div className="space-y-2">
                      <textarea
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                        placeholder="Write a caption for this photo..."
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setIsEditingCaption(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCaption}
                          disabled={isSavingCaption}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {photo.caption || <span className="text-slate-400 italic">No caption provided.</span>}
                    </p>
                  )}
                </div>

                {/* Metadata List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      Filename
                    </span>
                    <span className="font-mono text-slate-800 font-medium truncate max-w-[180px]">
                      {photo.fileName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Upload Date
                    </span>
                    <span className="font-mono text-slate-800 font-medium">
                      {formatDate(photo.uploadedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      Original File Size
                    </span>
                    <span className="font-mono text-slate-800 font-medium">
                      {formatFileSize(photo.size)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <FileType className="w-3.5 h-3.5 text-slate-400" />
                      Content-Type
                    </span>
                    <span className="font-mono text-slate-800 font-medium">
                      {photo.contentType}
                    </span>
                  </div>

                  {photo.width && photo.height && (
                    <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        Dimensions
                      </span>
                      <span className="font-mono text-slate-800 font-medium">
                        {photo.width} × {photo.height} px
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* AWS Cloud Architecture Details */
              <div className="space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center text-blue-600 font-semibold gap-1.5">
                    <Cloud className="w-4 h-4" />
                    <span>Amazon S3 Original (Private)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono break-all">
                    s3://{photo.s3BucketOriginal || 'cloudgallery-originals-bucket'}/{photo.key}
                  </p>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">
                    SSE-S3 AES-256 Encrypted
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center text-indigo-600 font-semibold gap-1.5">
                    <Database className="w-4 h-4" />
                    <span>Amazon DynamoDB Item</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-700 space-y-1">
                    <div>PK (userId): <span className="text-blue-600 font-semibold">{photo.userId}</span></div>
                    <div>SK (photoId): <span className="text-indigo-600 font-semibold">{photo.photoId}</span></div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center text-amber-600 font-semibold gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Amazon CloudFront CDN</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono break-all">
                    Origin: S3 Thumbnail Bucket (800px Sharp WebP)
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Cache-Control: public, max-age=31536000 (Edge Caching)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Panel Footer Actions */}
          <div className="p-5 border-t border-slate-200 bg-white space-y-2.5">
            <button
              onClick={() => onDownload(photo)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Original Photo (S3 SigV4)</span>
            </button>

            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Photo from Cloud</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
