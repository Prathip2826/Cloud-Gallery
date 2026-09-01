import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'photos';
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET_NAME || 'cloudgallery-originals-bucket';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'https://d123456abcdef8.cloudfront.net';

export const handler = async (event: any) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const { photoId, key, fileName, caption, size, contentType } = JSON.parse(event.body || '{}');

    if (!key || !key.startsWith(`${userId}/`)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Forbidden: Key does not match authenticated user prefix' }),
      };
    }

    // Verify S3 object exists
    const head = await s3.send(new HeadObjectCommand({ Bucket: ORIGINALS_BUCKET, Key: key }));

    const id = photoId || 'ph_' + Date.now();
    const thumbnailKey = `${userId}/${id}-thumb.webp`;
    const thumbnailUrl = `${CLOUDFRONT_DOMAIN}/${thumbnailKey}`;

    const item = {
      userId, // Partition Key
      photoId: id, // Sort Key
      key,
      fileName: fileName || key.split('/').pop(),
      caption: caption || '',
      size: size || head.ContentLength || 0,
      contentType: contentType || head.ContentType || 'image/jpeg',
      uploadedAt: new Date().toISOString(),
      thumbnailKey,
      thumbnailUrl,
      isFavorite: false,
      tags: [],
    };

    // Store in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(item),
    };
  } catch (error: any) {
    console.error('Error confirming photo upload:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
