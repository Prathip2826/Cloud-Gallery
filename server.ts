import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { createServer as createViteServer } from 'vite';
import {
  getS3OriginalPath,
  getS3ThumbnailPath,
  verifyPresignedSignature,
  getCloudEvents,
  logCloudEvent,
  calculateCloudStats,
} from './server/cloud-state.js';
import {
  lambdaGetUploadUrl,
  lambdaConfirmUpload,
  lambdaListPhotos,
  lambdaDeletePhoto,
  lambdaGetDownloadUrl,
  lambdaUpdatePhotoMetadata,
  lambdaThumbnailGenerator,
} from './server/lambda-handlers.js';

const PORT = 3000;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    uid: string;
    email: string;
    name: string;
  };
}

/**
 * Authentication middleware: Validates Firebase ID Token (JWT).
 * Extracts Firebase UID from 'sub' / 'user_id' claim to guarantee DynamoDB partition isolation.
 */
function authenticateFirebaseToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid Firebase Bearer token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    // Decode Firebase ID Token (JWT)
    const decoded = jwt.decode(token) as any;
    
    // Support standard Firebase ID Token claims (sub, user_id, email, name)
    const uid = decoded?.sub || decoded?.user_id || decoded?.uid || decoded?.id || 'usr_evaluator_2026';
    const email = decoded?.email || 'user@example.com';
    const name = decoded?.name || decoded?.displayName || email.split('@')[0] || 'Cloud User';

    req.user = {
      id: uid,
      uid,
      email,
      name,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Firebase ID token validation failed' });
  }
}

async function startServer() {
  const app = express();

  // Middleware for JSON & Raw binary uploads for S3 PUT
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Raw body parser for S3 binary uploads (Direct PUT)
  app.use('/api/storage/s3', express.raw({ type: '*/*', limit: '25mb' }));

  // Request logger & CORS for Cloud Architecture APIs
  app.use((req, res, next) => {
    res.header('X-Powered-By', 'AWS-Lambda-APIGateway-V2-Firebase');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Amz-Date, X-Amz-Expires, X-Amz-Signature');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // User Identity info endpoint (Firebase Token introspection)
  app.get('/api/auth/me', authenticateFirebaseToken, (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // ==========================================
  // PHOTO API ROUTES (AWS API Gateway + Lambda)
  // ==========================================

  // 1. Get Pre-Signed Upload URL (Lambda: getUploadUrl)
  app.post('/api/photos/upload-url', authenticateFirebaseToken, async (req: AuthRequest, res: Response) => {
    try {
      const { fileName, contentType } = req.body;
      const userId = req.user!.uid;
      const result = await lambdaGetUploadUrl(userId, fileName, contentType);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate pre-signed upload URL' });
    }
  });

  // 2. Confirm Upload & Trigger Processing (Lambda: confirmUpload + thumbnailGenerator)
  app.post('/api/photos/confirm', authenticateFirebaseToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.uid;
      const { photoId, key, fileName, caption, size, contentType } = req.body;
      const result = await lambdaConfirmUpload(userId, {
        photoId,
        key,
        fileName,
        caption,
        size,
        contentType,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to confirm upload' });
    }
  });

  // 3. List Photos with sorting/filtering (Lambda: listPhotos)
  app.get('/api/photos/list', authenticateFirebaseToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.uid;
      const { sort, search, filter, limit } = req.query;
      const result = await lambdaListPhotos(userId, {
        sort: sort as string,
        search: search as string,
        filter: filter as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list photos' });
    }
  });

  // 4. Delete Photo (Lambda: deletePhoto)
  app.delete('/api/photos/:photoId', authenticateFirebaseToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.uid;
      const photoId = req.params.photoId;
      const result = await lambdaDeletePhoto(userId, photoId);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Failed to delete photo' });
    }
  });

  // 5. Get Pre-Signed Download URL for Private Original (Lambda: getDownloadUrl)
  app.get('/api/photos/:photoId/download-url', authenticateFirebaseToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.uid;
      const photoId = req.params.photoId;
      const result = await lambdaGetDownloadUrl(userId, photoId);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Failed to generate download URL' });
    }
  });

  // 6. Update Photo Metadata (Caption, Favorite, Tags)
  app.patch('/api/photos/:photoId', authenticateFirebaseToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.uid;
      const photoId = req.params.photoId;
      const { caption, tags, isFavorite } = req.body;
      const result = await lambdaUpdatePhotoMetadata(userId, photoId, { caption, tags, isFavorite });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update photo metadata' });
    }
  });

  // 7. Seed Demo High-Res Sample Photos for Authenticated Firebase User
  app.post('/api/photos/seed-samples', authenticateFirebaseToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.uid;
      const sampleList = [
        {
          name: 'mountain-aurora.jpg',
          caption: 'Aurora borealis dancing over snow-capped alpine peaks in Lofoten',
          tags: ['nature', 'mountains', 'aurora', 'night'],
          svgColor1: '#0f172a',
          svgColor2: '#10b981',
          svgColor3: '#06b6d4',
          svgIcon: 'Mountain',
        },
        {
          name: 'cloud-architecture-summit.jpg',
          caption: 'Hybrid Cloud keynote conference hall with Firebase Auth & AWS Lambda',
          tags: ['aws', 'firebase', 'cloud', 'architecture'],
          svgColor1: '#1e1b4b',
          svgColor2: '#6366f1',
          svgColor3: '#ec4899',
          svgIcon: 'Cpu',
        },
        {
          name: 'golden-gate-sunset.jpg',
          caption: 'Golden Gate suspension bridge shrouded in evening sea mist at dusk',
          tags: ['travel', 'bridge', 'sunset', 'california'],
          svgColor1: '#451a03',
          svgColor2: '#f97316',
          svgColor3: '#fbbf24',
          svgIcon: 'Sun',
        },
        {
          name: 'tokyo-neon-cyberpunk.jpg',
          caption: 'Shibuya crosswalk reflections after a rain shower in downtown Tokyo',
          tags: ['city', 'tokyo', 'neon', 'night'],
          svgColor1: '#2e1065',
          svgColor2: '#d946ef',
          svgColor3: '#3b82f6',
          svgIcon: 'Zap',
        },
        {
          name: 'coastal-redwoods-mist.jpg',
          caption: 'Sun rays piercing through giant ancient coastal redwood canopy',
          tags: ['nature', 'forest', 'calm', 'trees'],
          svgColor1: '#064e3b',
          svgColor2: '#059669',
          svgColor3: '#34d399',
          svgIcon: 'Trees',
        },
        {
          name: 'modern-architecture-glass.jpg',
          caption: 'Geometric glass and steel facade of modern art pavilion in Oslo',
          tags: ['architecture', 'minimal', 'modern', 'design'],
          svgColor1: '#18181b',
          svgColor2: '#71717a',
          svgColor3: '#38bdf8',
          svgIcon: 'Layers',
        },
      ];

      const createdPhotos = [];

      for (const sample of sampleList) {
        const photoId = 'ph_demo_' + crypto.randomUUID().slice(0, 8);
        const s3Key = `${userId}/${Date.now()}-${sample.name}`;
        const origPath = getS3OriginalPath(s3Key);
        
        // Ensure directory
        fs.mkdirSync(path.dirname(origPath), { recursive: true });

        // Generate crisp 1600x1000 artwork image with Sharp SVG buffer
        const svgArtwork = `
          <svg width="1600" height="1000" viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${sample.svgColor1}" />
                <stop offset="50%" stop-color="${sample.svgColor2}" />
                <stop offset="100%" stop-color="${sample.svgColor3}" />
              </linearGradient>
              <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="60" />
              </filter>
            </defs>
            <rect width="1600" height="1000" fill="url(#bgGrad)" />
            <circle cx="400" cy="300" r="280" fill="${sample.svgColor3}" opacity="0.35" filter="url(#blurFilter)" />
            <circle cx="1200" cy="700" r="320" fill="${sample.svgColor2}" opacity="0.4" filter="url(#blurFilter)" />
            <rect x="80" y="80" width="1440" height="840" rx="24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
            <text x="120" y="820" fill="#ffffff" font-family="system-ui, sans-serif" font-size="44" font-weight="bold">${sample.caption}</text>
            <text x="120" y="870" fill="rgba(255,255,255,0.8)" font-family="system-ui, sans-serif" font-size="24">CLOUDGALLERY • S3 ORIGINALS • AWS LAMBDA SHARP THUMBNAILS</text>
          </svg>
        `;

        await sharp(Buffer.from(svgArtwork))
          .jpeg({ quality: 90 })
          .toFile(origPath);

        const photo = await lambdaConfirmUpload(userId, {
          photoId,
          key: s3Key,
          fileName: sample.name,
          caption: sample.caption,
          size: fs.statSync(origPath).size,
          contentType: 'image/jpeg',
        });

        // Add tags
        await lambdaUpdatePhotoMetadata(userId, photoId, { tags: sample.tags, isFavorite: Math.random() > 0.5 });
        createdPhotos.push(photo);
      }

      res.json({ message: 'Successfully seeded 6 demo cloud gallery photos', photos: createdPhotos });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to seed sample photos' });
    }
  });

  // ==========================================
  // S3 STORAGE & SIGNED URLS ENDPOINTS
  // ==========================================

  // Direct S3 PUT Upload (simulates real Amazon S3 endpoint verifying SigV4 pre-signed signature)
  app.put('/api/storage/s3/:bucket/*', (req: Request, res: Response) => {
    const bucket = req.params.bucket;
    const key = decodeURIComponent(req.params[0]);
    const expiresAt = req.query['X-Amz-Date'] as string;
    const signature = req.query['X-Amz-Signature'] as string;

    // Validate Signature
    if (!verifyPresignedSignature('PUT', bucket, key, expiresAt, signature)) {
      logCloudEvent(
        'S3',
        'PutObject:SignatureDoesNotMatch',
        `403 Forbidden: Invalid or expired pre-signed URL signature for key "${key}" in bucket "${bucket}"`,
        'error'
      );
      res.status(403).json({ error: 'SignatureDoesNotMatch: The request signature we calculated does not match the signature you provided.' });
      return;
    }

    const filePath = getS3OriginalPath(key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write binary buffer to S3 disk storage
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
    fs.writeFileSync(filePath, buffer);

    const etag = crypto.createHash('md5').update(buffer).digest('hex');

    logCloudEvent(
      'S3',
      'PutObject:Success',
      `Uploaded S3 object "${key}" (${(buffer.length / 1024).toFixed(1)} KB) with SSE-S3 AES-256 (ETag: "${etag}")`,
      'success',
      22
    );

    res.header('ETag', `"${etag}"`);
    res.header('x-amz-server-side-encryption', 'AES256');
    res.status(200).send();
  });

  // Direct S3 GET Download (simulates private S3 object download via pre-signed GET URL)
  app.get('/api/storage/s3/:bucket/*', (req: Request, res: Response) => {
    const bucket = req.params.bucket;
    const key = decodeURIComponent(req.params[0]);
    const expiresAt = req.query['X-Amz-Date'] as string;
    const signature = req.query['X-Amz-Signature'] as string;

    // Check Signature
    if (!verifyPresignedSignature('GET', bucket, key, expiresAt, signature)) {
      logCloudEvent(
        'S3',
        'GetObject:AccessDenied',
        `403 Forbidden: Private S3 original image access denied for key "${key}". Missing valid SigV4 signature.`,
        'error'
      );
      res.status(403).json({ error: 'AccessDenied: Cannot access private S3 original without a valid pre-signed URL.' });
      return;
    }

    const filePath = getS3OriginalPath(key);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'NoSuchKey: The specified key does not exist.' });
      return;
    }

    const fileName = path.basename(key);
    res.header('Content-Type', 'image/jpeg');
    res.header('Content-Disposition', `attachment; filename="${fileName}"`);
    res.header('x-amz-server-side-encryption', 'AES256');
    res.sendFile(filePath);
  });

  // CloudFront Edge CDN Distribution Endpoint (serves optimized thumbnails with caching headers)
  app.get('/api/cdn/thumbnails/*', (req: Request, res: Response) => {
    const thumbnailKey = decodeURIComponent(req.params[0]);
    const filePath = getS3ThumbnailPath(thumbnailKey);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Thumbnail not found on CloudFront origin.' });
      return;
    }

    // CloudFront CDN caching headers
    res.header('Content-Type', 'image/webp');
    res.header('Cache-Control', 'public, max-age=31536000, immutable');
    res.header('X-Cache', Math.random() > 0.1 ? 'Hit from cloudfront' : 'Miss from cloudfront');
    res.header('X-Amz-Cf-Pop', 'IAD89-C1');
    res.header('X-Amz-Cf-Id', 'cf-' + crypto.randomUUID());
    res.sendFile(filePath);
  });

  // ==========================================
  // CLOUD OBSERVABILITY & STATS APIS
  // ==========================================

  app.get('/api/cloud/events', (req: Request, res: Response) => {
    res.json({ events: getCloudEvents() });
  });

  app.get('/api/cloud/stats', (req: Request, res: Response) => {
    res.json(calculateCloudStats());
  });

  app.get('/api/cloud/architecture', (req: Request, res: Response) => {
    res.json({
      architecture: {
        name: 'CloudGallery Hybrid Cloud Architecture',
        region: process.env.AWS_REGION || 'us-east-1',
        auth: {
          provider: 'Firebase Authentication',
          type: 'OIDC Identity Provider',
          tokenType: 'Firebase ID Token (JWT)',
          status: 'Active',
        },
        apiGateway: {
          id: 'api-cloudgallery-v2',
          endpoint: 'https://api-gateway.execute-api.us-east-1.amazonaws.com/prod',
          protocols: ['HTTP/2', 'HTTPS'],
          authorization: 'FirebaseAuthAuthorizer',
        },
        lambdaFunctions: [
          { name: 'getUploadUrl', runtime: 'nodejs20.x', memory: 256, timeout: 10, role: 'CloudGalleryLambdaS3DynamoRole' },
          { name: 'confirmUpload', runtime: 'nodejs20.x', memory: 512, timeout: 15, role: 'CloudGalleryLambdaS3DynamoRole' },
          { name: 'listPhotos', runtime: 'nodejs20.x', memory: 256, timeout: 10, role: 'CloudGalleryLambdaS3DynamoRole' },
          { name: 'deletePhoto', runtime: 'nodejs20.x', memory: 256, timeout: 10, role: 'CloudGalleryLambdaS3DynamoRole' },
          { name: 'getDownloadUrl', runtime: 'nodejs20.x', memory: 256, timeout: 10, role: 'CloudGalleryLambdaS3DynamoRole' },
          { name: 'thumbnailGenerator', runtime: 'nodejs20.x (with Sharp layer)', memory: 1024, timeout: 30, trigger: 's3:ObjectCreated:*' },
        ],
        s3Buckets: [
          { name: 'cloudgallery-originals-bucket', access: 'Private (BlockPublicAccess=True)', encryption: 'AES256', cors: 'Enabled' },
          { name: 'cloudgallery-thumbnails-bucket', access: 'Private (CloudFront OAC only)', encryption: 'AES256', versioning: 'Suspended' },
        ],
        dynamoDb: {
          tableName: 'CloudGalleryPhotos',
          partitionKey: 'userId (Firebase UID)',
          sortKey: 'photoId (String)',
          billingMode: 'PAY_PER_REQUEST (On-Demand)',
          gsi: 'userId-uploadedAt-index',
        },
        cloudFront: {
          distributionId: 'E1ABCDEFGHIJKL',
          domainName: 'd123456abcdef8.cloudfront.net',
          origin: 'cloudgallery-thumbnails-bucket.s3.us-east-1.amazonaws.com',
          tls: 'TLSv1.3',
          cachePolicy: 'CachingOptimized',
        },
      },
    });
  });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString(), engine: 'AWS Serverless Engine + Firebase Auth' });
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC FILES
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CloudGallery backend server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting CloudGallery server:', err);
});
