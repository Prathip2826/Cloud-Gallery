import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import sharp from 'sharp';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const THUMBNAILS_BUCKET = process.env.THUMBNAILS_BUCKET_NAME || 'cloudgallery-thumbnails-bucket';

// Helper to convert ReadableStream to Buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export const handler = async (event: any) => {
  try {
    console.log('S3 Event Triggered:', JSON.stringify(event));

    // Handle S3 ObjectCreated records
    for (const record of event.Records || []) {
      const srcBucket = record.s3.bucket.name;
      const srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      // Key format: userId/timestamp-filename
      const parts = srcKey.split('/');
      if (parts.length < 2) continue;
      const userId = parts[0];
      const fileName = parts.slice(1).join('/');

      // 1. Fetch original from S3
      const getResponse = await s3.send(
        new GetObjectCommand({
          Bucket: srcBucket,
          Key: srcKey,
        })
      );

      if (!getResponse.Body) {
        console.warn(`Empty body for object: ${srcKey}`);
        continue;
      }

      const inputBuffer = await streamToBuffer(getResponse.Body as Readable);

      // 2. Resize and optimize using Sharp
      // Requirement: Max width 800px, do not enlarge smaller images, convert to WebP/JPEG
      const outputBuffer = await sharp(inputBuffer)
        .resize({
          width: 800,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();

      // Destination Key in thumbnail bucket
      const destKey = `${userId}/${fileName.replace(/\.[^/.]+$/, '')}-thumb.webp`;

      // 3. Put thumbnail into Thumbnail Bucket
      await s3.send(
        new PutObjectCommand({
          Bucket: THUMBNAILS_BUCKET,
          Key: destKey,
          Body: outputBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
          ServerSideEncryption: 'AES256',
        })
      );

      console.log(`Successfully generated thumbnail for ${srcKey} -> ${THUMBNAILS_BUCKET}/${destKey}`);
    }

    return { statusCode: 200, body: 'Thumbnails processed successfully' };
  } catch (error: any) {
    console.error('Error generating thumbnail with Sharp:', error);
    throw error;
  }
};
