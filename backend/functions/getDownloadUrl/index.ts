import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'photos';
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET_NAME || 'cloudgallery-originals-bucket';

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

    // Generate temporary pre-signed GET URL for private original
    const command = new GetObjectCommand({
      Bucket: ORIGINALS_BUCKET,
      Key: photo.key,
      ResponseContentDisposition: `attachment; filename="${photo.fileName}"`,
    });

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        downloadUrl,
        fileName: photo.fileName,
        key: photo.key,
        expiresIn: 900,
      }),
    };
  } catch (error: any) {
    console.error('Error generating download URL:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
