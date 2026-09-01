import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { Photo } from '../src/types/index.js';
import {
  readDynamoDb,
  writeDynamoDb,
  getS3OriginalPath,
  getS3ThumbnailPath,
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  logCloudEvent,
} from './cloud-state.js';

const S3_ORIGINALS_BUCKET = process.env.AWS_S3_ORIGINALS_BUCKET || 'cloudgallery-originals-bucket';
const S3_THUMBNAILS_BUCKET = process.env.AWS_S3_THUMBNAILS_BUCKET || 'cloudgallery-thumbnails-bucket';
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_URL || 'https://d123456abcdef8.cloudfront.net';

// Helper to sanitize filenames
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
}

/**
 * 1. Lambda: getUploadUrl
 * Generates secure pre-signed S3 PUT URL
 */
export async function lambdaGetUploadUrl(userId: string, fileName: string, contentType: string) {
  const start = Date.now();
  const safeName = sanitizeFileName(fileName || 'photo.jpg');
  const timestamp = Date.now();
  const photoId = 'ph_' + crypto.randomUUID().slice(0, 12);
  const s3Key = `${userId}/${timestamp}-${safeName}`;

  logCloudEvent(
    'APIGateway',
    'POST /api/photos/upload-url',
    `Incoming request from authenticated user: ${userId}`,
    'info',
    undefined,
    userId
  );

  // Generate secure S3 pre-signed PUT URL with 15 minutes expiration
  const expiresInSec = 900;
  const presignedUrl = createPresignedUploadUrl(S3_ORIGINALS_BUCKET, s3Key, expiresInSec);

  const duration = Date.now() - start;
  logCloudEvent(
    'Lambda',
    'getUploadUrl:Execution',
    `Generated SigV4 pre-signed PUT URL for S3 key "${s3Key}". Expires in 900s.`,
    'success',
    duration,
    userId
  );

  return {
    uploadUrl: presignedUrl,
    key: s3Key,
    photoId,
    bucket: S3_ORIGINALS_BUCKET,
    expiresIn: expiresInSec,
    region: process.env.AWS_REGION || 'us-east-1',
  };
}

/**
 * 2. Lambda: thumbnailGenerator
 * S3 ObjectCreated event-driven thumbnail generation with Sharp
 */
export async function lambdaThumbnailGenerator(userId: string, photoId: string, s3Key: string, originalPath: string) {
  const start = Date.now();
  const thumbnailKey = `${userId}/${photoId}-thumb.webp`;
  const thumbnailPath = getS3ThumbnailPath(thumbnailKey);

  // Ensure user directory in thumbnail bucket exists
  const thumbnailDir = path.dirname(thumbnailPath);
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  logCloudEvent(
    'S3',
    's3:ObjectCreated:Put',
    `S3 event notification fired for bucket "${S3_ORIGINALS_BUCKET}" key "${s3Key}"`,
    'info',
    12,
    userId
  );

  // Process image using Sharp
  let imageMeta = { width: 1200, height: 800 };
  try {
    const sharpInstance = sharp(originalPath);
    const metadata = await sharpInstance.metadata();
    imageMeta.width = metadata.width || 1200;
    imageMeta.height = metadata.height || 800;

    // Resize image: max width 800px, without enlarging smaller images
    await sharpInstance
      .resize({
        width: 800,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: 82, effort: 4 })
      .toFile(thumbnailPath);

    const duration = Date.now() - start;
    logCloudEvent(
      'Sharp',
      'thumbnailGenerator:Completed',
      `Sharp processed ${imageMeta.width}x${imageMeta.height} image -> optimized 800px WebP thumbnail stored in "${S3_THUMBNAILS_BUCKET}/${thumbnailKey}"`,
      'success',
      duration,
      userId
    );
  } catch (err: any) {
    console.error('Sharp thumbnail generation error:', err);
    // Fallback copy if sharp encounters unexpected format
    if (fs.existsSync(originalPath)) {
      fs.copyFileSync(originalPath, thumbnailPath);
    }
    logCloudEvent(
      'Sharp',
      'thumbnailGenerator:Warning',
      `Fallback thumbnail created for "${thumbnailKey}": ${err?.message || 'unknown error'}`,
      'warning',
      Date.now() - start,
      userId
    );
  }

  // CloudFront Edge distribution URL
  const cloudFrontUrl = `/api/cdn/thumbnails/${encodeURIComponent(thumbnailKey)}`;

  logCloudEvent(
    'CloudFront',
    'OriginResponse',
    `Edge cache primed for CloudFront distribution ${CLOUDFRONT_DOMAIN}/${thumbnailKey} (Cache-Control: max-age=31536000)`,
    'success',
    15,
    userId
  );

  return {
    thumbnailKey,
    thumbnailUrl: cloudFrontUrl,
    width: imageMeta.width,
    height: imageMeta.height,
  };
}

/**
 * 3. Lambda: confirmUpload
 * Verifies S3 upload, triggers thumbnail Lambda, stores metadata in DynamoDB
 */
export async function lambdaConfirmUpload(
  userId: string,
  data: {
    photoId: string;
    key: string;
    fileName: string;
    caption?: string;
    size?: number;
    contentType?: string;
  }
) {
  const start = Date.now();
  const originalPath = getS3OriginalPath(data.key);

  if (!fs.existsSync(originalPath)) {
    logCloudEvent(
      'Lambda',
      'confirmUpload:Error',
      `Target S3 object key "${data.key}" not found in bucket "${S3_ORIGINALS_BUCKET}".`,
      'error',
      Date.now() - start,
      userId
    );
    throw new Error('S3 object not found. Upload may have failed or timed out.');
  }

  const stat = fs.statSync(originalPath);
  const actualSize = data.size || stat.size;

  // Trigger thumbnail generator Lambda
  const thumbResult = await lambdaThumbnailGenerator(userId, data.photoId, data.key, originalPath);

  // DynamoDB PutItem
  const photoRecord: Photo = {
    userId,
    photoId: data.photoId,
    key: data.key,
    fileName: data.fileName || path.basename(data.key),
    caption: data.caption || '',
    size: actualSize,
    contentType: data.contentType || 'image/jpeg',
    uploadedAt: new Date().toISOString(),
    width: thumbResult.width,
    height: thumbResult.height,
    thumbnailKey: thumbResult.thumbnailKey,
    thumbnailUrl: thumbResult.thumbnailUrl,
    isFavorite: false,
    tags: [],
    etag: crypto.createHash('md5').update(data.key + stat.mtimeMs).digest('hex'),
    s3BucketOriginal: S3_ORIGINALS_BUCKET,
    s3BucketThumbnail: S3_THUMBNAILS_BUCKET,
    cloudFrontUrl: thumbResult.thumbnailUrl,
  };

  const db = readDynamoDb();
  const dynamoKey = `${userId}#${data.photoId}`;
  db[dynamoKey] = photoRecord;
  writeDynamoDb(db);

  const duration = Date.now() - start;
  logCloudEvent(
    'DynamoDB',
    'PutItem:photos',
    `Stored photo record PK="${userId}" SK="${data.photoId}" (Size: ${(actualSize / 1024).toFixed(1)} KB, WCU: 1.0)`,
    'success',
    duration,
    userId
  );

  return photoRecord;
}

/**
 * 4. Lambda: listPhotos
 * Queries DynamoDB for authenticated user's photos with sorting/filtering
 */
export async function lambdaListPhotos(
  userId: string,
  options: {
    sort?: string;
    search?: string;
    filter?: string;
    limit?: number;
  } = {}
) {
  const start = Date.now();
  const db = readDynamoDb();

  // Strict tenant isolation: user can ONLY query records where PK = userId
  let userPhotos = Object.values(db).filter((p) => p.userId === userId);

  // Apply search query
  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    userPhotos = userPhotos.filter(
      (p) =>
        p.fileName.toLowerCase().includes(q) ||
        (p.caption && p.caption.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  // Apply filters
  if (options.filter) {
    if (options.filter === 'favorites') {
      userPhotos = userPhotos.filter((p) => p.isFavorite);
    } else if (options.filter === 'recent') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      userPhotos = userPhotos.filter((p) => new Date(p.uploadedAt).getTime() > sevenDaysAgo);
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(options.filter)) {
      userPhotos = userPhotos.filter((p) =>
        p.contentType.toLowerCase().includes(options.filter!) ||
        p.fileName.toLowerCase().endsWith(`.${options.filter}`)
      );
    }
  }

  // Apply sorting
  const sort = options.sort || 'newest';
  userPhotos.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      case 'largest':
        return (b.size || 0) - (a.size || 0);
      case 'smallest':
        return (a.size || 0) - (b.size || 0);
      case 'caption_asc':
        return (a.caption || a.fileName).localeCompare(b.caption || b.fileName);
      case 'caption_desc':
        return (b.caption || b.fileName).localeCompare(a.caption || a.fileName);
      case 'newest':
      default:
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    }
  });

  const duration = Date.now() - start;
  logCloudEvent(
    'DynamoDB',
    'Query:photos',
    `Query PK="${userId}" -> Returned ${userPhotos.length} items (RCU: 1.0, Filter: ${options.filter || 'all'}, Sort: ${sort})`,
    'success',
    duration,
    userId
  );

  return {
    items: userPhotos,
    count: userPhotos.length,
    scannedCount: userPhotos.length,
  };
}

/**
 * 5. Lambda: deletePhoto
 * Deletes original from S3, thumbnail from Thumbnail Bucket, and metadata from DynamoDB
 */
export async function lambdaDeletePhoto(userId: string, photoId: string) {
  const start = Date.now();
  const db = readDynamoDb();
  const dynamoKey = `${userId}#${photoId}`;
  const record = db[dynamoKey];

  if (!record) {
    throw new Error('Photo not found or you do not have permission to delete it.');
  }

  // Double-check user isolation
  if (record.userId !== userId) {
    logCloudEvent(
      'DynamoDB',
      'DeleteItem:Forbidden',
      `Unauthorized delete attempt! User ${userId} tried to delete photo owned by ${record.userId}`,
      'error',
      Date.now() - start,
      userId
    );
    throw new Error('Unauthorized deletion attempt. User identity mismatch.');
  }

  // Delete from S3 Original Bucket
  const origPath = getS3OriginalPath(record.key);
  if (fs.existsSync(origPath)) {
    try {
      fs.unlinkSync(origPath);
    } catch (err) {
      console.warn('Error deleting original S3 file:', err);
    }
  }

  // Delete from S3 Thumbnail Bucket
  if (record.thumbnailKey) {
    const thumbPath = getS3ThumbnailPath(record.thumbnailKey);
    if (fs.existsSync(thumbPath)) {
      try {
        fs.unlinkSync(thumbPath);
      } catch (err) {
        console.warn('Error deleting thumbnail S3 file:', err);
      }
    }
  }

  // Delete from DynamoDB
  delete db[dynamoKey];
  writeDynamoDb(db);

  const duration = Date.now() - start;
  logCloudEvent(
    'Lambda',
    'deletePhoto:Completed',
    `Deleted S3 original "${record.key}", S3 thumbnail "${record.thumbnailKey}", and DynamoDB PK="${userId}" SK="${photoId}"`,
    'success',
    duration,
    userId
  );

  return { success: true, photoId };
}

/**
 * 6. Lambda: getDownloadUrl
 * Generates temporary pre-signed GET URL for original private photo
 */
export async function lambdaGetDownloadUrl(userId: string, photoId: string) {
  const start = Date.now();
  const db = readDynamoDb();
  const dynamoKey = `${userId}#${photoId}`;
  const record = db[dynamoKey];

  if (!record || record.userId !== userId) {
    throw new Error('Photo not found or access denied.');
  }

  // Expiration in 15 minutes (900 seconds)
  const expiresInSec = 900;
  const presignedDownloadUrl = createPresignedDownloadUrl(S3_ORIGINALS_BUCKET, record.key, expiresInSec);

  const duration = Date.now() - start;
  logCloudEvent(
    'Lambda',
    'getDownloadUrl:Execution',
    `Generated SigV4 pre-signed GET URL for private original S3 object "${record.key}". Expires in 900s.`,
    'success',
    duration,
    userId
  );

  return {
    downloadUrl: presignedDownloadUrl,
    key: record.key,
    fileName: record.fileName,
    expiresIn: expiresInSec,
    contentType: record.contentType,
    size: record.size,
  };
}

/**
 * 7. Lambda: updatePhotoMetadata
 * Updates caption, tags, or favorite status
 */
export async function lambdaUpdatePhotoMetadata(
  userId: string,
  photoId: string,
  updates: { caption?: string; tags?: string[]; isFavorite?: boolean }
) {
  const start = Date.now();
  const db = readDynamoDb();
  const dynamoKey = `${userId}#${photoId}`;
  const record = db[dynamoKey];

  if (!record || record.userId !== userId) {
    throw new Error('Photo not found or access denied.');
  }

  if (updates.caption !== undefined) record.caption = updates.caption;
  if (updates.tags !== undefined) record.tags = updates.tags;
  if (updates.isFavorite !== undefined) record.isFavorite = updates.isFavorite;

  db[dynamoKey] = record;
  writeDynamoDb(db);

  const duration = Date.now() - start;
  logCloudEvent(
    'DynamoDB',
    'UpdateItem:photos',
    `Updated metadata for PK="${userId}" SK="${photoId}" (Favorite=${record.isFavorite}, Caption="${record.caption.slice(0, 20)}...")`,
    'success',
    duration,
    userId
  );

  return record;
}
