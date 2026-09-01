export interface User {
  id: string;
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Photo {
  userId: string;
  photoId: string;
  key: string;
  fileName: string;
  caption: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  width?: number;
  height?: number;
  thumbnailKey: string;
  thumbnailUrl: string;
  downloadUrl?: string;
  isFavorite?: boolean;
  tags?: string[];
  etag?: string;
  s3BucketOriginal?: string;
  s3BucketThumbnail?: string;
  cloudFrontUrl?: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'presigning' | 'uploading' | 'confirming' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  caption: string;
  photoId?: string;
  thumbnailUrl?: string;
  pipelineStep?: 'presign' | 's3_put' | 'dynamodb_write' | 'lambda_sharp' | 'cloudfront_ready';
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  key: string;
  photoId: string;
  expiresIn: number;
  bucket: string;
  region: string;
}

export interface PresignedDownloadResponse {
  downloadUrl: string;
  key: string;
  expiresIn: number;
  fileName: string;
}

export interface CloudEvent {
  id: string;
  timestamp: string;
  service: 'FirebaseAuth' | 'APIGateway' | 'Lambda' | 'S3' | 'DynamoDB' | 'Sharp' | 'CloudFront';
  action: string;
  status: 'success' | 'info' | 'warning' | 'error';
  details: string;
  requestId?: string;
  latencyMs?: number;
  userId?: string;
}

export interface CloudStats {
  totalPhotos: number;
  totalStorageBytes: number;
  originalBucketSize: number;
  thumbnailBucketSize: number;
  dynamoDbItemCount: number;
  dynamoDbReadCapacity: number;
  dynamoDbWriteCapacity: number;
  lambdaInvocationsToday: number;
  cloudFrontCacheHitRatio: number;
  bandwidthSavedPercent: number;
}

export type SortOption = 'newest' | 'oldest' | 'largest' | 'smallest' | 'caption_asc' | 'caption_desc';
export type FilterOption = 'all' | 'favorites' | 'recent' | 'jpg' | 'png' | 'webp';
export type ViewMode = 'grid' | 'masonry' | 'compact' | 'list';
