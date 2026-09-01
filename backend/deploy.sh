#!/usr/bin/env bash
# ==============================================================================
# CloudGallery - AWS SAM Automated Serverless Deployment Script
# ==============================================================================

set -e

echo "=========================================================="
echo " CloudGallery AWS Serverless Deployment Tool"
echo "=========================================================="

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed or not in PATH."
    echo "   Please install it: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Check AWS SAM CLI
if ! command -v sam &> /dev/null; then
    echo "❌ Error: AWS SAM CLI is not installed or not in PATH."
    echo "   Please install it: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html"
    exit 1
fi

# Check AWS credentials
echo "🔍 Checking AWS caller identity..."
CALLER_IDENTITY=$(aws sts get-caller-identity 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ AWS Authentication Error: Please run 'aws configure' to set up your credentials."
    exit 1
fi

ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
echo "✅ Authenticated to AWS Account: $ACCOUNT_ID"

# Change directory to backend
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

STACK_NAME="${1:-cloudgallery-prod}"
REGION="${AWS_REGION:-us-east-1}"

echo ""
echo "🚀 Step 1: Building Serverless Application with AWS SAM..."
sam build

echo ""
echo "🚀 Step 2: Deploying CloudFormation Stack: $STACK_NAME ($REGION)..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo ""
echo "🔍 Step 3: Fetching Deployed CloudFormation Outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs" \
  --output json)

API_URL=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "ApiUrl"' | grep -o '"OutputValue": "[^"]*' | cut -d'"' -f4)
USER_POOL_ID=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "UserPoolId"' | grep -o '"OutputValue": "[^"]*' | cut -d'"' -f4)
CLIENT_ID=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "UserPoolClientId"' | grep -o '"OutputValue": "[^"]*' | cut -d'"' -f4)
ORIGINAL_BUCKET=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "OriginalBucketName"' | grep -o '"OutputValue": "[^"]*' | cut -d'"' -f4)
THUMBNAIL_BUCKET=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "ThumbnailBucketName"' | grep -o '"OutputValue": "[^"]*' | cut -d'"' -f4)
DYNAMODB_TABLE=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "DynamoDBTableName"' | grep -o '"OutputValue": "[^"]*' | cut -d'"' -f4)
CLOUDFRONT_URL=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "CloudFrontUrl"' | grep -o '"OutputValue": "[^"]*' | cut -d'"' -f4)
CLOUDFRONT_DOMAIN=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "CloudFrontDomain"' | grep -o '"OutputValue": "[^"]*' | cut -d'"' -f4)

echo ""
echo "=========================================================="
echo "🎉 AWS INFRASTRUCTURE DEPLOYED SUCCESSFULLY!"
echo "=========================================================="
echo "📍 UserPoolId          : $USER_POOL_ID"
echo "📍 UserPoolClientId    : $CLIENT_ID"
echo "📍 ApiUrl              : $API_URL"
echo "📍 OriginalBucketName  : $ORIGINAL_BUCKET"
echo "📍 ThumbnailBucketName : $THUMBNAIL_BUCKET"
echo "📍 DynamoDBTableName   : $DYNAMODB_TABLE"
echo "📍 CloudFrontUrl       : $CLOUDFRONT_URL"
echo "=========================================================="

# Write outputs to .env file in parent directory
ENV_FILE="$SCRIPT_DIR/../.env"
echo "Writing frontend environment variables to $ENV_FILE..."
cat <<EOF > "$ENV_FILE"
# Generated automatically by CloudGallery AWS SAM Deployment Tool
VITE_AWS_REGION="$REGION"
VITE_COGNITO_USER_POOL_ID="$USER_POOL_ID"
VITE_COGNITO_CLIENT_ID="$CLIENT_ID"
VITE_API_BASE_URL="$API_URL"
VITE_CLOUDFRONT_URL="$CLOUDFRONT_URL"

# Server-side & Lambda Configuration
AWS_REGION="$REGION"
AWS_COGNITO_USER_POOL_ID="$USER_POOL_ID"
AWS_COGNITO_CLIENT_ID="$CLIENT_ID"
AWS_S3_ORIGINALS_BUCKET="$ORIGINAL_BUCKET"
AWS_S3_THUMBNAILS_BUCKET="$THUMBNAIL_BUCKET"
AWS_DYNAMODB_TABLE="$DYNAMODB_TABLE"
AWS_CLOUDFRONT_URL="$CLOUDFRONT_URL"
EOF

echo "✅ Updated $ENV_FILE with live AWS endpoints."
echo "💡 You can now run 'npm run build' to produce a production build connected to your AWS stack."
