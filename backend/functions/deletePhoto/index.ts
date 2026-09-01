import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'photos';
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET_NAME || 'cloudgallery-originals-bucket';
const THUMBNAILS_BUCKET = process.env.THUMBNAILS_BUCKET_NAME || 'cloudgallery-thumbnails-bucket';

export const handler = async (event: any) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    const photoId = event.pathParameters?.photoId;

    if (!userId || !photoId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing userId or photoId' }),
      };
    }

    // Read item from DynamoDB to check ownership
    const getResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId, photoId },
      })
    );

    const photo = getResult.Item;
    if (!photo || photo.userId !== userId) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Photo not found or access denied' }),
      };
    }

    // 1. Delete original from S3
    if (photo.key) {
      await s3.send(new DeleteObjectCommand({ Bucket: ORIGINALS_BUCKET, Key: photo.key }));
    }

    // 2. Delete thumbnail from S3
    if (photo.thumbnailKey) {
      await s3.send(new DeleteObjectCommand({ Bucket: THUMBNAILS_BUCKET, Key: photo.thumbnailKey }));
    }

    // 3. Delete metadata item from DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { userId, photoId },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, photoId }),
    };
  } catch (error: any) {
    console.error('Error deleting photo:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
