import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  FileImage,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Cloud,
} from 'lucide-react';
import { UploadQueueItem } from '../../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: UploadQueueItem[];
  isUploading: boolean;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveItem: (id: string) => void;
  onRetryItem?: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onProcessQueue: () => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  queue,
  isUploading,
  onAddFiles,
  onRemoveItem,
  onRetryItem,
  onUpdateCaption,
  onProcessQueue,
  onClearCompleted,
  onClearAll,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
    // reset input so same file can be re-added if desired
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const successCount = queue.filter((i) => i.status === 'success').length;
  const errorCount = queue.filter((i) => i.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="upload-modal-panel"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Upload Photos to AWS S3</h3>
              <p className="text-xs text-slate-500">
                Direct pre-signed binary S3 upload • Lambda Sharp thumbnail trigger
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 bg-slate-50/50">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 scale-[0.99]'
                : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6 animate-bounce" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Drag & drop your photos here, or <span className="text-blue-600 underline">browse files</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Supports JPG, JPEG, PNG, WEBP (Max 10 MB per file)
            </p>
          </div>

          {/* Upload Queue List */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                <span>Upload Queue ({queue.length})</span>
                <div className="flex items-center space-x-3">
                  {successCount > 0 && (
                    <button
                      onClick={onClearCompleted}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Clear Completed
                    </button>
                  )}
                  {!isUploading && (
                    <button
                      onClick={onClearAll}
                      className="text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col gap-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <FileImage className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{formatSize(item.size)}</p>
                        </div>
                      </div>

                      {/* Status Icon & Step */}
                      <div className="flex items-center space-x-2">
                        {item.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Ready
                          </span>
                        )}

                        {(item.status === 'presigning' ||
                          item.status === 'uploading' ||
                          item.status === 'confirming' ||
                          item.status === 'processing') && (
                          <div className="flex items-center space-x-1.5 text-blue-600 text-xs font-semibold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                            <span className="text-[11px]">
                              Uploading... {item.progress > 0 ? `${item.progress}%` : ''}
                            </span>
                          </div>
                        )}

                        {item.status === 'success' && (
                          <div className="flex items-center space-x-1 text-emerald-600 text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[11px]">Upload successful</span>
                          </div>
                        )}

                        {item.status === 'error' && (
                          <div className="flex items-center space-x-1.5">
                            <div className="flex items-center space-x-1 text-rose-600 text-xs font-semibold">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="text-[11px]">Upload failed</span>
                            </div>
                            {onRetryItem && (
                              <button
                                type="button"
                                onClick={() => onRetryItem(item.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                              >
                                Try again
                              </button>
                            )}
                          </div>
                        )}

                        {!isUploading && item.status !== 'success' && (
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optional Caption Input for Pending Items */}
                    {item.status === 'pending' && (
                      <input
                        type="text"
                        value={item.caption}
                        onChange={(e) => onUpdateCaption(item.id, e.target.value)}
                        placeholder="Add a caption (optional)..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    )}

                    {/* Error message */}
                    {item.errorMessage && (
                      <p className="text-[11px] text-rose-600 font-medium">{item.errorMessage}</p>
                    )}

                    {/* Progress bar */}
                    {item.status !== 'pending' && item.status !== 'error' && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.status === 'success' ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AWS Cloud Architecture Processing Trace Indicator */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-slate-800 font-semibold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>AWS Cloud Execution Pipeline</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 font-mono">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-blue-600 font-bold block">1. Lambda</span>
                SigV4 Pre-signed S3 URL
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-indigo-600 font-bold block">2. Amazon S3</span>
                Direct Binary PUT
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-emerald-600 font-bold block">3. DynamoDB</span>
                User Metadata Row
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-amber-600 font-bold block">4. Sharp + CDN</span>
                Thumbnail & CloudFront
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {pendingCount > 0 ? (
              <span>
                {pendingCount} {pendingCount === 1 ? 'file' : 'files'} ready to upload
              </span>
            ) : (
              <span>Ready</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              id="start-upload-btn"
              onClick={onProcessQueue}
              disabled={isUploading || pendingCount === 0}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to S3...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Start Upload ({pendingCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
