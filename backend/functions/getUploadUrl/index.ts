import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.ORIGINALS_BUCKET_NAME || 'cloudgallery-originals-bucket';

interface APIGatewayEvent {
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
          user_id?: string;
          email?: string;
        };
      };
    };
  };
  body?: string;
}

export const handler = async (event: APIGatewayEvent) => {
  try {
    // Extract authenticated user ID from Firebase JWT Authorizer claims (never trust frontend input)
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || event.requestContext?.authorizer?.jwt?.claims?.user_id;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Unauthorized: Missing Firebase Auth claims' }),
      };
    }

    const { fileName, contentType } = JSON.parse(event.body || '{}');
    if (!fileName) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'fileName is required' }),
      };
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const key = `${userId}/${timestamp}-${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType || 'image/jpeg',
      ServerSideEncryption: 'AES256',
    });

    // 15-minute temporary secure pre-signed PUT URL
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify({
        uploadUrl,
        key,
        bucket: BUCKET_NAME,
        expiresIn: 900,
      }),
    };
  } catch (error: any) {
    console.error('Error generating pre-signed upload URL:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};
