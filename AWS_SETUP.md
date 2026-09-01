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
- **Parameter FirebaseProjectId**: `cloudgallery-hybrid-auth` (or your Firebase Project ID)
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`

SAM will provision:
- Amazon S3 Originals Bucket (Private)
- Amazon S3 Thumbnails Bucket (Private)
- Amazon DynamoDB `photos` Table
- 6 AWS Lambda Functions (with Node.js 20 & Sharp)
- Amazon API Gateway HTTP API v2 with Firebase JWT Authorizer
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

### Step 3: Configure Firebase Authentication
1. Open the **Firebase Console** (`https://console.firebase.google.com`).
2. Select your project and navigate to **Build > Authentication**.
3. Enable **Email/Password** sign-in method under the Sign-in method tab.
4. Copy your Web App configuration keys to your frontend `.env` (`VITE_FIREBASE_*`).

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
   - Name: `FirebaseAuthAuthorizer`
   - Issuer: `https://securetoken.google.com/<YOUR_FIREBASE_PROJECT_ID>`
   - Audience: `<YOUR_FIREBASE_PROJECT_ID>`
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

- [ ] Users can sign up and receive Firebase ID tokens
- [ ] Pre-signed S3 PUT URL uploads directly from browser to S3
- [ ] S3 event triggers Lambda and Sharp generates 800px WebP thumbnail
- [ ] Metadata is queryable in DynamoDB under `userId`
- [ ] Gallery loads thumbnails from CloudFront CDN
- [ ] Pre-signed GET URL allows direct high-res download
- [ ] Delete action cascades across S3 original, S3 thumbnail, and DynamoDB
