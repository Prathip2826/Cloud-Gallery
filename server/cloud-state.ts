import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { Photo, User, CloudEvent, CloudStats } from '../src/types/index.js';

// Local storage directories replicating AWS S3 Buckets
const STORAGE_ROOT = path.join(process.cwd(), 'data');
const S3_ORIGINALS_DIR = path.join(STORAGE_ROOT, 's3-originals-bucket');
const S3_THUMBNAILS_DIR = path.join(STORAGE_ROOT, 's3-thumbnails-bucket');
const DYNAMODB_FILE = path.join(STORAGE_ROOT, 'dynamodb_photos.json');
const USERS_FILE = path.join(STORAGE_ROOT, 'cognito_users.json');

// Ensure directories exist
[STORAGE_ROOT, S3_ORIGINALS_DIR, S3_THUMBNAILS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Real-time Cloud Architecture Event Log
const cloudEvents: CloudEvent[] = [
  {
    id: 'evt-init-1',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    service: 'Cognito',
    action: 'UserPoolInitialized',
    status: 'success',
    details: 'Amazon Cognito User Pool "us-east-1_cloudgallery" ready with email verification & MFA policies.',
    requestId: 'req-' + crypto.randomUUID().slice(0, 8),
    latencyMs: 14,
  },
  {
    id: 'evt-init-2',
    timestamp: new Date(Date.now() - 45000).toISOString(),
    service: 'DynamoDB',
    action: 'TableActive',
    status: 'success',
    details: 'DynamoDB table "photos" (PK: userId, SK: photoId) online with On-Demand Capacity & GSI "userId-uploadedAt-index".',
    requestId: 'req-' + crypto.randomUUID().slice(0, 8),
    latencyMs: 8,
  },
  {
    id: 'evt-init-3',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    service: 'S3',
    action: 'BucketConfigured',
    status: 'success',
    details: 'S3 Original Bucket "cloudgallery-originals-bucket" secured: BlockPublicAccess=TRUE, SSE-S3 AES-256 enabled.',
    requestId: 'req-' + crypto.randomUUID().slice(0, 8),
    latencyMs: 12,
  },
  {
    id: 'evt-init-4',
    timestamp: new Date(Date.now() - 15000).toISOString(),
    service: 'CloudFront',
    action: 'DistributionDeployed',
    status: 'success',
    details: 'CloudFront Distribution "d123456abcdef8.cloudfront.net" active across 450+ edge locations with Origin S3 Thumbnail Bucket.',
    requestId: 'req-' + crypto.randomUUID().slice(0, 8),
    latencyMs: 25,
  }
];

export function logCloudEvent(
  service: CloudEvent['service'],
  action: string,
  details: string,
  status: CloudEvent['status'] = 'success',
  latencyMs?: number,
  userId?: string
) {
  const event: CloudEvent = {
    id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    service,
    action,
    status,
    details,
    requestId: 'aws-req-' + crypto.randomBytes(4).toString('hex'),
    latencyMs: latencyMs ?? Math.floor(Math.random() * 35 + 8),
    userId,
  };
  cloudEvents.unshift(event);
  if (cloudEvents.length > 80) {
    cloudEvents.pop();
  }
  return event;
}

export function getCloudEvents(): CloudEvent[] {
  return cloudEvents;
}

// Database helper for DynamoDB emulation
export function readDynamoDb(): Record<string, Photo> {
  try {
    if (fs.existsSync(DYNAMODB_FILE)) {
      return JSON.parse(fs.readFileSync(DYNAMODB_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading DynamoDB file:', err);
  }
  return {};
}

export function writeDynamoDb(data: Record<string, Photo>) {
  fs.writeFileSync(DYNAMODB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Cognito Users helper
export function readCognitoUsers(): Record<string, any> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading Cognito users:', err);
  }
  return {};
}

export function writeCognitoUsers(data: Record<string, any>) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// S3 Storage Paths
export function getS3OriginalPath(key: string): string {
  return path.join(S3_ORIGINALS_DIR, key.replace(/\//g, path.sep));
}

export function getS3ThumbnailPath(thumbnailKey: string): string {
  return path.join(S3_THUMBNAILS_DIR, thumbnailKey.replace(/\//g, path.sep));
}

// Pre-signed URL generation helper (AWS Signature Version 4 compliant simulation)
const SIGNING_SECRET = process.env.JWT_SECRET || 'aws-cloudgallery-signature-secret-2026';

export function createPresignedUploadUrl(bucket: string, key: string, expiresInSec = 900): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
  const signaturePayload = `PUT\n${bucket}\n${key}\n${expiresAt}`;
  const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(signaturePayload).digest('hex');
  return `/api/storage/s3/${bucket}/${encodeURIComponent(key)}?X-Amz-Expires=${expiresInSec}&X-Amz-Date=${expiresAt}&X-Amz-Signature=${signature}`;
}

export function createPresignedDownloadUrl(bucket: string, key: string, expiresInSec = 900): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
  const signaturePayload = `GET\n${bucket}\n${key}\n${expiresAt}`;
  const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(signaturePayload).digest('hex');
  return `/api/storage/s3/${bucket}/${encodeURIComponent(key)}?X-Amz-Expires=${expiresInSec}&X-Amz-Date=${expiresAt}&X-Amz-Signature=${signature}`;
}

export function verifyPresignedSignature(method: string, bucket: string, key: string, expiresAtStr: string, signature: string): boolean {
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
    return false; // Expired
  }
  const signaturePayload = `${method}\n${bucket}\n${key}\n${expiresAt}`;
  const expectedSignature = crypto.createHmac('sha256', SIGNING_SECRET).update(signaturePayload).digest('hex');
  return signature === expectedSignature;
}

// Cloud Storage Metrics & Stats calculation
export function calculateCloudStats(): CloudStats {
  const db = readDynamoDb();
  const photos = Object.values(db);
  
  let originalBytes = 0;
  let thumbnailBytes = 0;

  photos.forEach((p) => {
    originalBytes += p.size || 0;
    // Estimate thumbnail at ~15% of original
    thumbnailBytes += Math.round((p.size || 0) * 0.15);
  });

  return {
    totalPhotos: photos.length,
    totalStorageBytes: originalBytes + thumbnailBytes,
    originalBucketSize: originalBytes,
    thumbnailBucketSize: thumbnailBytes,
    dynamoDbItemCount: photos.length,
    dynamoDbReadCapacity: 5,
    dynamoDbWriteCapacity: 5,
    lambdaInvocationsToday: photos.length * 3 + 12,
    cloudFrontCacheHitRatio: 94.8,
    bandwidthSavedPercent: 82.5,
  };
}
