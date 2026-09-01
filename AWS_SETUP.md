# AWS Cloud Deployment & Infrastructure Setup Guide

This guide provides step-by-step instructions to deploy CLOUDGALLERY to a real AWS account using either **AWS SAM (Infrastructure as Code)** or the **AWS Management Console / AWS CLI**.

---

## Method 1: Automated Deployment with AWS SAM (Recommended)

All resources are pre-configured in `backend/template.yaml`.

### Prerequisites
1. [AWS CLI v2 installed & configured](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) (`aws configure`)
2. [AWS SAM CLI installed](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
3. Node.js 20.x + npm

### Deployment Steps
```bash
# 1. Navigate to backend directory
cd backend

# 2. Build SAM application (bundles Lambda functions with Sharp)
sam build

# 3. Deploy interactively to AWS
sam deploy --guided
```

Follow the prompts:
- **Stack Name**: `cloudgallery-prod`
- **AWS Region**: `us-east-1`
- **Parameter CognitoDomainPrefix**: `cloudgallery-app`
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`

SAM will provision:
- Amazon Cognito User Pool & App Client
- Amazon S3 Originals Bucket (Private)
- Amazon S3 Thumbnails Bucket (Private)
- Amazon DynamoDB `photos` Table
- 6 AWS Lambda Functions (with Node.js 20 & Sharp)
- Amazon API Gateway HTTP API v2 with Cognito Authorizer
- Amazon CloudFront Distribution with Origin Access Control (OAC)

---

## Method 2: Manual AWS Console Setup

### Step 1: Create Amazon S3 Buckets
1. Open the **Amazon S3 Console** (`https://console.aws.amazon.com/s3`).
2. Create **Originals Bucket**:
   - Bucket name: `cloudgallery-originals-<your-unique-id>`
   - Region: `us-east-1`
   - **Block all public access**: Check **Enabled** (Must be strictly private).
   - **Default encryption**: SSE-S3 (AES-256).
   - **CORS Configuration**:
     ```json
     [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "HEAD"],
         "AllowedOrigins": ["*"],
         "ExposeHeaders": ["ETag"]
       }
     ]
     ```
3. Create **Thumbnails Bucket**:
   - Bucket name: `cloudgallery-thumbnails-<your-unique-id>`
   - Region: `us-east-1`
   - **Block all public access**: Check **Enabled**.
   - Enable CloudFront Origin Access Control (OAC).

---

### Step 2: Create Amazon DynamoDB Table
1. Open the **DynamoDB Console** (`https://console.aws.amazon.com/dynamodb`).
2. Click **Create Table**:
   - Table name: `photos`
   - Partition key (PK): `userId` (Type: `String`)
   - Sort key (SK): `photoId` (Type: `String`)
   - Table class: **Standard**
   - Capacity mode: **On-Demand (Pay per request)**
3. Create Global Secondary Index (GSI):
   - Index name: `userId-uploadedAt-index`
   - Partition key: `userId` (String)
   - Sort key: `uploadedAt` (String)

---

### Step 3: Create Amazon Cognito User Pool
1. Open the **Cognito Console** (`https://console.aws.amazon.com/cognito`).
2. Create User Pool:
   - Sign-in options: **Email**
   - Password policy: Minimum 8 characters, numbers, symbols
   - Multi-factor authentication: Optional
   - User pool name: `cloudgallery-user-pool`
3. Create App Client:
   - App client name: `cloudgallery-web-client`
   - Client secret: **Don't generate a client secret** (for Single-Page Apps)
   - Allowed OAuth flows: `Authorization code grant`, `Implicit grant`
   - Scopes: `email`, `openid`, `profile`

---

### Step 4: Create AWS Lambda Functions
1. Create IAM Role `CloudGalleryLambdaExecutionRole` with:
   - `AWSLambdaBasicExecutionRole`
   - Policy allowing `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on both buckets
   - Policy allowing `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem` on `photos` table
2. Deploy Lambda functions from `backend/functions/`:
   - `getUploadUrl`: Generates S3 pre-signed PUT URLs.
   - `confirmUpload`: Commits photo metadata to DynamoDB.
   - `listPhotos`: Queries DynamoDB by `userId`.
   - `getDownloadUrl`: Generates S3 pre-signed GET URLs.
   - `deletePhoto`: Deletes from S3 and DynamoDB.
   - `thumbnailGenerator`: Attached to `s3:ObjectCreated` event on Originals bucket to run Sharp WebP transformation.

---

### Step 5: Configure Amazon API Gateway (HTTP API v2)
1. Create HTTP API `cloudgallery-api`.
2. Add JWT Authorizer:
   - Name: `CognitoAuthorizer`
   - Issuer: `https://cognito-idp.us-east-1.amazonaws.com/<YOUR_USER_POOL_ID>`
   - Audience: `<YOUR_APP_CLIENT_ID>`
3. Add Routes with Authorizer:
   - `POST /api/photos/upload-url` -> `getUploadUrl`
   - `POST /api/photos/confirm` -> `confirmUpload`
   - `GET /api/photos` -> `listPhotos`
   - `GET /api/photos/{photoId}/download` -> `getDownloadUrl`
   - `DELETE /api/photos/{photoId}` -> `deletePhoto`

---

### Step 6: Configure CloudFront CDN
1. Create CloudFront Distribution pointing to `cloudgallery-thumbnails` bucket.
2. Use **Origin Access Control (OAC)** to sign requests to S3.
3. Configure Default Cache Behavior:
   - Cache Policy: `Managed-CachingOptimized` (Cache-Control max-age: 31536000)
   - Viewer Protocol Policy: `Redirect HTTP to HTTPS`

---

## Verification Checklist

- [ ] Users can sign up and receive Cognito tokens
- [ ] Pre-signed S3 PUT URL uploads directly from browser to S3
- [ ] S3 event triggers Lambda and Sharp generates 800px WebP thumbnail
- [ ] Metadata is queryable in DynamoDB under `userId`
- [ ] Gallery loads thumbnails from CloudFront CDN
- [ ] Pre-signed GET URL allows direct high-res download
- [ ] Delete action cascades across S3 original, S3 thumbnail, and DynamoDB
