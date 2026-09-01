# CloudGallery Automated AWS Deployment Guide

This guide describes how to deploy the entire CloudGallery serverless infrastructure to AWS in a few simple commands using AWS SAM (Serverless Application Model) or the automated deployment script.

---

## 🚀 1-Command Automated Deployment

Run the automated deployment script from the project root:

```bash
chmod +x ./deploy.sh
./deploy.sh
```

Or run via `npm`:
```bash
npm run deploy:aws
```

This script will:
1. Validate your AWS CLI credentials and active profile
2. Verify AWS SAM CLI installation
3. Build the SAM template (`backend/template.yaml`) including TypeScript Lambda handlers and Sharp image processing layers
4. Deploy the CloudFormation stack to AWS (Cognito, S3 Originals, S3 Thumbnails, DynamoDB, Lambda, API Gateway, CloudFront OAC)
5. Automatically extract generated CloudFormation Outputs (API Endpoint, Cognito Pool ID, Cognito App Client ID, CloudFront CDN Domain)
6. Generate or update your frontend `.env` configuration file with the live AWS endpoints

---

## 🛠️ Prerequisites

Before deploying, ensure you have the following installed on your workstation:

1. **AWS CLI v2**
   ```bash
   aws --version
   # Configure your AWS credentials (IAM User with deployment permissions)
   aws configure
   ```
2. **AWS SAM CLI**
   ```bash
   sam --version
   ```
3. **Node.js (>= 20.x)** & **npm**
   ```bash
   node -v
   npm -v
   ```

---

## 📦 Manual SAM Deployment Workflow

If you prefer to run AWS SAM CLI commands manually step-by-step:

### Step 1: Navigate to backend folder
```bash
cd backend
```

### Step 2: Build the Serverless Application
```bash
sam build
```

### Step 3: Deploy Stack Interactively
```bash
sam deploy --guided
```

You will be prompted for:
- **Stack Name**: `cloudgallery-prod`
- **AWS Region**: `us-east-1` (or your preferred region)
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`
- **Disable rollback on error**: `N`
- **Save arguments to samconfig.toml**: `Y`

### Step 4: Capture SAM Outputs
Upon successful deployment, SAM outputs the generated AWS resource identifiers:

```text
CloudFormation outputs from deployed stack
---------------------------------------------------------------------------------------------------------
Outputs
---------------------------------------------------------------------------------------------------------
Key                 ApiUrl
Description         API Gateway endpoint URL
Value               https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com

Key                 UserPoolId
Description         Cognito User Pool ID
Value               us-east-1_AbCdEf123

Key                 UserPoolClientId
Description         Cognito App Client ID
Value               1a2b3c4d5e6f7g8h9i0jklmnop

Key                 CloudFrontDomain
Description         CloudFront CDN Domain
Value               d123456abcdef8.cloudfront.net
---------------------------------------------------------------------------------------------------------
```

### Step 5: Connect Frontend to Deployed AWS Backend
Copy `.env.example` to `.env` in the root directory and populate it with the outputs:

```env
VITE_AWS_REGION="us-east-1"
VITE_COGNITO_USER_POOL_ID="us-east-1_AbCdEf123"
VITE_COGNITO_CLIENT_ID="1a2b3c4d5e6f7g8h9i0jklmnop"
VITE_API_BASE_URL="https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com"
VITE_CLOUDFRONT_URL="https://d123456abcdef8.cloudfront.net"
```

### Step 6: Build & Deploy Frontend
```bash
# Build production bundle
npm run build

# (Optional) Deploy dist/ to S3 static hosting or Amplify
aws s3 sync dist/ s3://your-frontend-hosting-bucket/ --delete
```

---

## 🔒 Security & IAM Least-Privilege Verification

| Resource | Security Configuration | IAM Policy / Access Model |
|---|---|---|
| **Cognito User Pool** | SRP Password Policy, Auto-verified email, no client secret stored in client | Native JWT Claims verified by API Gateway |
| **API Gateway HTTP API** | JWT Authorizer on all `/api/photos/*` routes | Passes `sub` and `email` claims directly to Lambda `requestContext` |
| **S3 Originals Bucket** | `BlockPublicAcls=true`, `BlockPublicPolicy=true`, `SSE-S3 AES256` | Private: Uploads/downloads exclusively via SigV4 Pre-signed URLs |
| **S3 Thumbnails Bucket** | Private bucket, no public access | Read access strictly restricted to CloudFront OAC Service Principal |
| **CloudFront CDN** | Origin Access Control (OAC), HTTPS Redirect, CachingOptimized | Authenticated read from S3 Thumbnails bucket |
| **DynamoDB Table** | Single-table with partition key `userId` | User data isolation enforced by Lambda query scope |
| **Lambda Functions** | Minimal execution policies (`S3CrudPolicy`, `DynamoDBCrudPolicy`) | **Zero AdministratorAccess** |

---

## 🧪 Post-Deployment Verification

1. **Sign Up & Login**: Register a test account in the web app. Verify that the user appears in the Amazon Cognito Console.
2. **Direct S3 Upload**: Upload a high-resolution photo. Verify that a SigV4 pre-signed PUT URL is generated and the browser uploads directly to S3.
3. **S3 Event & Lambda Sharp Processing**: Check CloudWatch Logs for `ThumbnailGeneratorFunction` (`aws logs tail /aws/lambda/cloudgallery-prod-ThumbnailGeneratorFunction --follow`). Ensure an 800px WebP thumbnail is written to the thumbnails bucket.
4. **DynamoDB Metadata**: Verify the new record in the DynamoDB `photos` table under your `userId` partition.
5. **CloudFront CDN Retrieval**: Inspect network traffic in DevTools; verify that thumbnails load with `x-cache: Hit from cloudfront`.
6. **Secure Download**: Click Download on any photo to receive a 15-minute temporary SigV4 GET URL for the original raw image.
7. **Deletion**: Delete a photo and confirm that both S3 objects (original + thumbnail) and the DynamoDB entry are deleted simultaneously.

---

## 🧹 Infrastructure Teardown (Clean-Up)

To delete all AWS resources created by the SAM stack and avoid ongoing charges:

```bash
# 1. Empty S3 Buckets first (CloudFormation requires empty buckets before deletion)
aws s3 rm s3://$(sam list resources --stack-name cloudgallery-prod --output json | jq -r '.[] | select(.LogicalResourceId=="OriginalsBucket") | .PhysicalResourceId') --recursive
aws s3 rm s3://$(sam list resources --stack-name cloudgallery-prod --output json | jq -r '.[] | select(.LogicalResourceId=="ThumbnailsBucket") | .PhysicalResourceId') --recursive

# 2. Delete SAM CloudFormation stack
sam delete --stack-name cloudgallery-prod --no-prompts
```
