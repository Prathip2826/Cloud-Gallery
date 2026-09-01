import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'photos';

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

    const { sort, search, filter } = event.queryStringParameters || {};

    // DynamoDB Query on Partition Key (userId) ensuring absolute tenant isolation
    const response = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    let items = response.Items || [];

    // Search filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (p: any) =>
          (p.fileName && p.fileName.toLowerCase().includes(q)) ||
          (p.caption && p.caption.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(q)))
      );
    }

    // Category filter
    if (filter === 'favorites') {
      items = items.filter((p: any) => p.isFavorite);
    } else if (filter === 'recent') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      items = items.filter((p: any) => new Date(p.uploadedAt).getTime() > weekAgo);
    }

    // Sort order
    items.sort((a: any, b: any) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'largest':
          return (b.size || 0) - (a.size || 0);
        case 'smallest':
          return (a.size || 0) - (b.size || 0);
        case 'newest':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ items, count: items.length }),
    };
  } catch (error: any) {
    console.error('Error listing user photos from DynamoDB:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
