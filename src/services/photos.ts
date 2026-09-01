import { apiRequest } from './api';
import { Photo, PresignedUploadResponse, PresignedDownloadResponse } from '../types';

export const photosService = {
  // 1. Step 1: Request S3 Pre-Signed PUT Upload URL from Lambda
  async getUploadUrl(fileName: string, contentType: string): Promise<PresignedUploadResponse> {
    return apiRequest<PresignedUploadResponse>('/api/photos/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    });
  },

  // 2. Step 2: Upload file DIRECTLY to S3 using Pre-Signed PUT URL (with XMLHttpRequest for progress)
  async uploadDirectToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (percentage: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`S3 Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during direct S3 upload.'));
      };

      xhr.send(file);
    });
  },

  // 3. Step 3: Confirm Upload with Lambda & DynamoDB
  async confirmUpload(data: {
    photoId: string;
    key: string;
    fileName: string;
    caption?: string;
    size?: number;
    contentType?: string;
  }): Promise<Photo> {
    return apiRequest<Photo>('/api/photos/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Complete End-to-End Orchestrated Upload Pipeline
  async executeFullUploadPipeline(
    file: File,
    caption: string = '',
    onStepChange?: (step: 'presign' | 's3_put' | 'dynamodb_write' | 'lambda_sharp' | 'cloudfront_ready') => void,
    onProgress?: (progress: number) => void
  ): Promise<Photo> {
    // Phase 1: Request SigV4 Pre-signed S3 PUT URL
    onStepChange?.('presign');
    const presigned = await this.getUploadUrl(file.name, file.type);

    // Phase 2: Direct Binary S3 PUT to private bucket
    onStepChange?.('s3_put');
    await this.uploadDirectToS3(presigned.uploadUrl, file, onProgress);

    // Phase 3: Metadata Commit & Event-Driven Sharp Thumbnail Processing
    onStepChange?.('dynamodb_write');
    const photo = await this.confirmUpload({
      photoId: presigned.photoId,
      key: presigned.key,
      fileName: file.name,
      caption,
      size: file.size,
      contentType: file.type,
    });

    onStepChange?.('cloudfront_ready');
    return photo;
  },

  // List authenticated user's photos from DynamoDB
  async listPhotos(params?: {
    sort?: string;
    search?: string;
    filter?: string;
  }): Promise<{ items: Photo[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.sort) query.append('sort', params.sort);
    if (params?.search) query.append('search', params.search);
    if (params?.filter) query.append('filter', params.filter);

    return apiRequest<{ items: Photo[]; count: number }>(`/api/photos/list?${query.toString()}`);
  },

  // Get Pre-Signed GET URL for downloading private original
  async getDownloadUrl(photoId: string): Promise<PresignedDownloadResponse> {
    return apiRequest<PresignedDownloadResponse>(`/api/photos/${photoId}/download-url`);
  },

  // Delete photo from S3 and DynamoDB
  async deletePhoto(photoId: string): Promise<{ success: boolean; photoId: string }> {
    return apiRequest<{ success: boolean; photoId: string }>(`/api/photos/${photoId}`, {
      method: 'DELETE',
    });
  },

  // Update caption or favorite state
  async updatePhoto(
    photoId: string,
    updates: { caption?: string; tags?: string[]; isFavorite?: boolean }
  ): Promise<Photo> {
    return apiRequest<Photo>(`/api/photos/${photoId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Seed sample demonstration photos
  async seedDemoPhotos(): Promise<{ message: string; photos: Photo[] }> {
    return apiRequest<{ message: string; photos: Photo[] }>('/api/photos/seed-samples', {
      method: 'POST',
    });
  },
};
