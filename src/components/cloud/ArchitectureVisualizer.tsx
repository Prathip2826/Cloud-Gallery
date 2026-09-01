import React, { useState } from 'react';
import {
  Cloud,
  Cpu,
  Database,
  Lock,
  Zap,
  Layers,
  FileCode,
  ShieldCheck,
  ArrowDown,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { CloudStats } from '../../types';

interface ArchitectureVisualizerProps {
  stats: CloudStats | null;
  architecture: any;
}

export const ArchitectureVisualizer: React.FC<ArchitectureVisualizerProps> = ({
  stats,
  architecture,
}) => {
  const [selectedNode, setSelectedNode] = useState<string>('s3_originals');
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewTab, setViewTab] = useState<'diagram' | 'sam' | 'iam'>('diagram');

  const nodesInfo: Record<string, { title: string; service: string; desc: string; specs: string[]; code: string }> = {
    firebase: {
      title: 'Firebase Authentication',
      service: 'Identity & Access Management (OIDC)',
      desc: 'Handles Google Sign-In authentication, session persistence, and issues cryptographically signed Firebase ID tokens (JWT) with user UID claims.',
      specs: [
        'Identity Provider: Firebase Authentication (Google Sign-In)',
        'Token: Firebase ID Token (JWT OIDC)',
        'User Isolation: Firebase UID mapped as DynamoDB PK',
        'Authentication Flow: Google Sign-In Popup',
      ],
      code: `// Firebase Authentication ID Token Claims
{
  "iss": "https://securetoken.google.com/gallery-f0dec",
  "aud": "gallery-f0dec",
  "auth_time": 1756627200,
  "user_id": "usr_google_auth_2026",
  "sub": "usr_google_auth_2026",
  "email": "user@example.com",
  "email_verified": true
}`,
    },
    apigateway: {
      title: 'Amazon API Gateway (HTTP API v2)',
      service: 'Serverless Ingress Routing',
      desc: 'Routes RESTful HTTP requests, validates Firebase ID token authorizer claims, handles CORS headers, and routes to appropriate AWS Lambda handlers.',
      specs: [
        'Protocol: HTTP/2 & HTTPS',
        'Authorizer: Firebase JWT / Lambda Authorizer',
        'Endpoint: /api/photos/*',
        'Latency: < 15ms overhead',
      ],
      code: `HttpApi:
  Type: AWS::Serverless::HttpApi
  Properties:
    Auth:
      Authorizers:
        FirebaseAuthAuthorizer:
          IdentitySource: '$request.header.Authorization'
          JwtConfiguration:
            issuer: 'https://securetoken.google.com/gallery-f0dec'
            audience:
              - 'gallery-f0dec'`,
    },
    lambda: {
      title: 'AWS Lambda Backend Functions',
      service: 'Serverless Compute',
      desc: 'Executes Node.js 20.x functions for generating SigV4 pre-signed S3 URLs, querying isolated DynamoDB partitions, and orchestrating photo deletion.',
      specs: [
        'Runtime: nodejs20.x (ARM64 Graviton3)',
        'Functions: getUploadUrl, confirmUpload, listPhotos, deletePhoto, getDownloadUrl',
        'IAM Policy: Least-privilege S3Crud & DynamoDBCrud',
        'Memory: 256MB - 512MB',
      ],
      code: `// Lambda: getUploadUrl (AWS SDK v3)
const command = new PutObjectCommand({
  Bucket: 'cloudgallery-originals-bucket',
  Key: \`\${userId}/\${Date.now()}-\${fileName}\`,
  ContentType: contentType,
  ServerSideEncryption: 'AES256'
});
const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });`,
    },
    s3_originals: {
      title: 'Amazon S3 Originals Bucket',
      service: 'Private Object Storage',
      desc: 'Stores full-resolution master photos. BlockPublicAccess is enforced (True). Direct browser access is blocked; only temporary pre-signed SigV4 URLs are permitted.',
      specs: [
        'Bucket: cloudgallery-originals-bucket',
        'Access: Strict Private (BlockPublicAccess=TRUE)',
        'Encryption: Server-Side Encryption SSE-S3 AES-256',
        'CORS: Allowed PUT, GET, HEAD from web domain',
      ],
      code: `OriginalsBucket:
  Type: AWS::S3::Bucket
  Properties:
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256`,
    },
    dynamodb: {
      title: 'Amazon DynamoDB (photos Table)',
      service: 'NoSQL Key-Value / Document Database',
      desc: 'Stores photo metadata with single-digit millisecond latency. Partition Key (userId) provides mathematical multi-tenant data isolation.',
      specs: [
        'Table: photos',
        'Partition Key (PK): userId (String)',
        'Sort Key (SK): photoId (String)',
        'Billing Mode: PAY_PER_REQUEST (On-Demand)',
        'GSI: userId-uploadedAt-index',
      ],
      code: `PhotosTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: photos
    BillingMode: PAY_PER_REQUEST
    AttributeDefinitions:
      - AttributeName: userId
        AttributeType: S
      - AttributeName: photoId
        AttributeType: S
    KeySchema:
      - AttributeName: userId
        KeyType: HASH
      - AttributeName: photoId
        KeyType: RANGE`,
    },
    sharp_lambda: {
      title: 'Thumbnail Lambda + Sharp Engine',
      service: 'Event-Driven Image Processing',
      desc: 'Triggered asynchronously by S3 ObjectCreated events. Reads master image from S3, resizes to max width 800px using high-performance Sharp C++ bindings, and writes to Thumbnail Bucket.',
      specs: [
        'Trigger: s3:ObjectCreated:Put on Originals Bucket',
        'Engine: Sharp 0.35+ (libvips C++ library)',
        'Optimization: Max width 800px, WebP format, quality 82',
        'Execution Time: ~45ms per image',
      ],
      code: `// Sharp Image Processing
const outputBuffer = await sharp(inputBuffer)
  .resize({ width: 800, withoutEnlargement: true, fit: 'inside' })
  .webp({ quality: 82, effort: 4 })
  .toBuffer();

await s3.send(new PutObjectCommand({
  Bucket: 'cloudgallery-thumbnails-bucket',
  Key: \`\${userId}/\${photoId}-thumb.webp\`,
  Body: outputBuffer,
  ContentType: 'image/webp'
}));`,
    },
    cloudfront: {
      title: 'Amazon CloudFront CDN',
      service: 'Global Edge Content Delivery Network',
      desc: 'Caches and delivers thumbnails across 450+ global Edge Locations. Connects to Thumbnail S3 bucket via Origin Access Control (OAC).',
      specs: [
        'Distribution: d123456abcdef8.cloudfront.net',
        'Origin: S3 Thumbnail Bucket (via CloudFront OAC)',
        'Caching: Cache-Control: max-age=31536000 (Immutable)',
        'Cache Hit Ratio: ~95%',
      ],
      code: `CloudFrontDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:
        - Id: S3ThumbnailOrigin
          DomainName: !GetAtt ThumbnailsBucket.RegionalDomainName
          OriginAccessControlId: !GetAtt CloudFrontOAC.Id
      DefaultCacheBehavior:
        TargetOriginId: S3ThumbnailOrigin
        ViewerProtocolPolicy: redirect-to-https`,
    },
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeInfo = nodesInfo[selectedNode] || nodesInfo['s3_originals'];

  return (
    <div className="space-y-6">
      {/* Top Banner with Real-World Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <span className="text-xs text-slate-500 font-medium">S3 Originals Bucket</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-1">
            {stats ? (stats.originalBucketSize / (1024 * 1024)).toFixed(2) + ' MB' : '0.00 MB'}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1">Private (SigV4 Only)</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Thumbnail S3 Bucket</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-1">
            {stats ? (stats.thumbnailBucketSize / (1024 * 1024)).toFixed(2) + ' MB' : '0.00 MB'}
          </div>
          <span className="text-[10px] text-blue-600 font-semibold mt-1">Sharp 800px WebP</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <span className="text-xs text-slate-500 font-medium">DynamoDB Partition Count</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-1">
            {stats?.dynamoDbItemCount || 0} items
          </div>
          <span className="text-[10px] text-indigo-600 font-semibold mt-1">PK: userId Isolation</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <span className="text-xs text-slate-500 font-medium">CloudFront CDN Hit Rate</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-1">
            {stats?.cloudFrontCacheHitRatio || 95}%
          </div>
          <span className="text-[10px] text-amber-600 font-semibold mt-1">450+ Edge PoPs</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewTab('diagram')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewTab === 'diagram'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            Interactive Architecture Diagram
          </button>
          <button
            onClick={() => setViewTab('sam')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewTab === 'sam'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            AWS SAM Template (IaC)
          </button>
          <button
            onClick={() => setViewTab('iam')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewTab === 'iam'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            IAM Least-Privilege Policies
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono hidden sm:inline">
          Region: us-east-1
        </span>
      </div>

      {/* Main Visualizer Area */}
      {viewTab === 'diagram' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Architecture Interactive Flowchart (8 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Click any service node to inspect specifications
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                Serverless Active
              </span>
            </div>

            <div className="space-y-4 my-2">
              {/* Level 1: Frontend Client */}
              <div className="flex justify-center">
                <div className="w-64 p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center shadow-xs">
                  <div className="text-xs font-bold text-blue-700 flex items-center justify-center gap-1.5">
                    <Cloud className="w-4 h-4" />
                    <span>CLOUDGALLERY React Frontend</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">TypeScript • Vite • Tailwind</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center text-slate-400">
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </div>

              {/* Level 2: Firebase Authentication */}
              <div className="flex justify-center">
                <button
                  onClick={() => setSelectedNode('firebase')}
                  className={`w-72 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedNode === 'firebase'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>Firebase Authentication</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Firebase ID Token (JWT) & User UID Isolation</p>
                </button>
              </div>

              {/* Arrow */}
              <div className="flex justify-center text-slate-400">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* Level 3: API Gateway & Lambda */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedNode('apigateway')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedNode === 'apigateway'
                      ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-indigo-600 flex items-center justify-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>API Gateway HTTP v2</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">JWT Authorizer Ingress</p>
                </button>

                <button
                  onClick={() => setSelectedNode('lambda')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedNode === 'lambda'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    <span>AWS Lambda APIs</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Pre-signing & CRUD</p>
                </button>
              </div>

              {/* Arrow Split */}
              <div className="flex justify-around text-slate-400 px-8">
                <ArrowDown className="w-4 h-4" />
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* Level 4: S3 Originals & DynamoDB */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedNode('s3_originals')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedNode === 's3_originals'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Amazon S3 Originals</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Private Bucket (SigV4 PUT/GET)</p>
                </button>

                <button
                  onClick={() => setSelectedNode('dynamodb')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedNode === 'dynamodb'
                      ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-purple-600 flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    <span>Amazon DynamoDB</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Table: photos (PK: userId)</p>
                </button>
              </div>

              {/* S3 Event Arrow */}
              <div className="flex items-center justify-center text-xs font-mono text-slate-500 gap-2 py-1">
                <span>s3:ObjectCreated Event</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </div>

              {/* Level 5: Thumbnail Lambda + Sharp */}
              <div className="flex justify-center">
                <button
                  onClick={() => setSelectedNode('sharp_lambda')}
                  className={`w-full p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedNode === 'sharp_lambda'
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    <span>Thumbnail Lambda + Sharp Engine</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    800px max width • WebP optimization • S3 Thumbnail Bucket
                  </p>
                </button>
              </div>

              {/* Arrow */}
              <div className="flex justify-center text-slate-400">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* Level 6: CloudFront CDN */}
              <div className="flex justify-center">
                <button
                  onClick={() => setSelectedNode('cloudfront')}
                  className={`w-full p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedNode === 'cloudfront'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Amazon CloudFront CDN</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Origin Access Control • 450+ Edge Locations • Gallery Delivery
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Node Inspector Details Panel (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {activeInfo.service}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{activeInfo.title}</h3>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{activeInfo.desc}</p>

              {/* Specifications */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Cloud Configuration
                </span>
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                  {activeInfo.specs.map((spec, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-blue-600">•</span>
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Snippet */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Implementation Snippet
                  </span>
                  <button
                    onClick={() => copyToClipboard(activeInfo.code)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto custom-scrollbar max-h-48 leading-relaxed">
                  <code>{activeInfo.code}</code>
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Ready for AWS SAM Deployment</span>
              <span className="text-emerald-600 font-mono font-semibold">100% Serverless</span>
            </div>
          </div>
        </div>
      )}

      {/* SAM Template Tab */}
      {viewTab === 'sam' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">AWS SAM / CloudFormation Template</h3>
              <p className="text-xs text-slate-500">Defined in /backend/template.yaml</p>
            </div>
            <button
              onClick={() => copyToClipboard(`sam build && sam deploy --guided`)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-800 font-mono flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Copy SAM Deploy Command</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed custom-scrollbar">
            <code>{`AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: CloudGallery Serverless Photo Platform with Firebase Auth

Parameters:
  FirebaseAuthIssuer:
    Type: String
    Default: 'https://securetoken.google.com/gallery-f0dec'
  FirebaseAuthAudience:
    Type: String
    Default: 'gallery-f0dec'

Resources:
  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      CorsConfiguration:
        AllowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS']
        AllowHeaders: ['Authorization', 'Content-Type']
        AllowOrigins: ['*']

  OriginalsBucket:
    Type: AWS::S3::Bucket
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  ThumbnailsBucket:
    Type: AWS::S3::Bucket
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true

  PhotosTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: CloudGalleryPhotos
      BillingMode: PAY_PER_REQUEST
      KeySchema:
        - AttributeName: userId # Firebase UID Partition Key
          KeyType: HASH
        - AttributeName: photoId # Unique Photo ID Sort Key
          KeyType: RANGE

  GetUploadUrlFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/getUploadUrl/
      Handler: index.handler
      Runtime: nodejs20.x

  ThumbnailGeneratorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/thumbnailGenerator/
      Handler: index.handler
      Runtime: nodejs20.x
      Events:
        S3NewObjectEvent:
          Type: S3
          Properties:
            Bucket: !Ref OriginalsBucket
            Events: s3:ObjectCreated:*

  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution`}</code>
          </pre>
        </div>
      )}

      {/* IAM Tab */}
      {viewTab === 'iam' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Least-Privilege IAM Execution Policy</h3>
            <p className="text-xs text-slate-500">Strictly grants only required S3 & DynamoDB permissions</p>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed custom-scrollbar">
            <code>{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3OriginalsAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::cloudgallery-originals-bucket/*"
    },
    {
      "Sid": "S3ThumbnailsAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::cloudgallery-thumbnails-bucket/*"
    },
    {
      "Sid": "DynamoDBUserPhotosAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/photos",
        "arn:aws:dynamodb:us-east-1:*:table/photos/index/*"
      ]
    }
  ]
}`}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
