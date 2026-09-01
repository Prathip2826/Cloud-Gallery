import { useState, useCallback } from 'react';
import { UploadQueueItem } from '../types';
import { photosService } from '../services/photos';
import confetti from 'canvas-confetti';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function useUpload(onUploadSuccess?: () => void) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!file || file.size === 0) {
      return 'Selected file is empty or corrupt.';
    }

    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    const isAllowedExt = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');

    if (!ALLOWED_TYPES.includes(type) && !isAllowedExt) {
      return 'Only JPG, PNG and WEBP images are supported.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'Maximum file size is 10 MB.';
    }

    return null;
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadQueueItem[] = [];

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      newItems.push({
        id: 'upload-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now(),
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        progress: 0,
        status: error ? 'error' : 'pending',
        errorMessage: error || undefined,
        caption: '',
      });
    });

    setQueue((prev) => [...prev, ...newItems]);
    setIsModalOpen(true);
  }, []);

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemCaption = (id: string, caption: string) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, caption } : item)));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'success'));
  };

  const clearAll = () => {
    if (isUploading) return;
    setQueue([]);
  };

  const processQueue = async () => {
    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) return;

    setIsUploading(true);

    let successCount = 0;

    for (const item of pendingItems) {
      try {
        // Step 1: Pre-signing URL
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'presigning', pipelineStep: 'presign', progress: 10 } : i
          )
        );

        const presigned = await photosService.getUploadUrl(item.file.name, item.file.type);

        // Step 2: Direct S3 Binary PUT Upload with progress tracking
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'uploading', pipelineStep: 's3_put', progress: 30 } : i
          )
        );

        await photosService.uploadDirectToS3(presigned.uploadUrl, item.file, (percent) => {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, progress: 30 + Math.round(percent * 0.4) } // 30% -> 70%
                : i
            )
          );
        });

        // Step 3: DynamoDB write & Lambda Sharp processing
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'confirming', pipelineStep: 'dynamodb_write', progress: 80 }
              : i
          )
        );

        const photo = await photosService.confirmUpload({
          photoId: presigned.photoId,
          key: presigned.key,
          fileName: item.name,
          caption: item.caption,
          size: item.size,
          contentType: item.type,
        });

        // Step 4: CloudFront edge warmup & Success
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'success',
                  pipelineStep: 'cloudfront_ready',
                  progress: 100,
                  photoId: photo.photoId,
                  thumbnailUrl: photo.thumbnailUrl,
                }
              : i
          )
        );

        successCount++;
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  errorMessage: err.message || 'Upload to S3 failed',
                }
              : i
          )
        );
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      // Trigger festive completion confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#818cf8', '#34d399', '#f43f5e', '#fbbf24'],
        });
      } catch {
        // ignore
      }
      onUploadSuccess?.();
    }
  };

  return {
    queue,
    isUploading,
    isModalOpen,
    setIsModalOpen,
    addFiles,
    removeQueueItem,
    updateItemCaption,
    clearCompleted,
    clearAll,
    processQueue,
  };
}
