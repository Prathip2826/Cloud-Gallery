# CLOUDGALLERY - Cloud-Based Photo Gallery & Management Platform

[![AWS Serverless](https://img.shields.io/badge/AWS-Serverless-orange.svg)](https://aws.amazon.com)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-blue.svg)](https://react.dev)
[![Amazon S3](https://img.shields.io/badge/Storage-Amazon%20S3-569A31.svg)](https://aws.amazon.com/s3)
[![Amazon DynamoDB](https://img.shields.io/badge/Database-Amazon%20DynamoDB-4053D6.svg)](https://aws.amazon.com/dynamodb)
[![AWS Lambda](https://img.shields.io/badge/Compute-AWS%20Lambda%20%2B%20Sharp-FF9900.svg)](https://aws.amazon.com/lambda)
[![Amazon CloudFront](https://img.shields.io/badge/CDN-Amazon%20CloudFront-purple.svg)](https://aws.amazon.com/cloudfront)

CLOUDGALLERY is an internship-grade, full-stack, enterprise-ready cloud photo gallery and digital asset management platform built on real AWS cloud computing principles and serverless architecture.

---

## 🌟 Architecture & Data Flow

```
                      CLOUDGALLERY
                           │
                      React Frontend
                           │
                    Amazon Cognito
                      Authentication
                           │
                           ▼
                     API Gateway
                           │
                           ▼
                        Lambda
                    Backend APIs
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
            Amazon S3            DynamoDB
        Original Photos         Photo Metadata
                │
                │ S3 Event Trigger
                ▼
          Thumbnail Lambda
              + Sharp
                │
                ▼
          Thumbnail Bucket
                │
                ▼
           CloudFront CDN
                │
                ▼
          Gallery Thumbnails
```

---

## 🚀 Key Features

1. **Enterprise Multi-Tenant Authentication**:
   - Integrated with **Amazon Cognito User Pools**
   - JWT validation at API Gateway authorizer level
   - Partition Key (`userId`) data isolation in DynamoDB

2. **Direct-to-S3 Upload Pipeline**:
   - Zero binary payload bottleneck on Lambda
   - SigV4 pre-signed PUT URLs with 15-minute expiration
   - Real-time client-side progress tracking

3. **Event-Driven Image Optimization**:
   - Asynchronous `s3:ObjectCreated` trigger invoking AWS Lambda with **Sharp (libvips)**
   - Automatically resizes originals to 800px WebP thumbnails
   - Stores optimized assets in a dedicated S3 thumbnail bucket

4. **Global Edge Delivery via CloudFront**:
   - Origin Access Control (OAC) securing S3 buckets
   - Edge caching with 1-year immutable cache headers
   - Near-instant thumbnail retrieval (< 20ms)

5. **Rich Photo Management**:
   - Responsive multi-column grid (4-5 cols desktop, 3 cols tablet, 2 cols mobile)
   - Real-time search by filename, caption, or tags
   - Multi-criteria sorting (Newest, Oldest, Largest, Smallest, Caption A-Z)
   - Inline caption editing with optimistic UI
   - Secure original download via SigV4 GET pre-signed URLs
   - Hard deletion across S3 original, S3 thumbnail, and DynamoDB

6. **AWS Cloud Architecture Visualizer & Live Stream**:
   - Interactive SVG architecture map detailing every AWS node
   - Live telemetry console showing Cognito, API Gateway, Lambda, S3, DynamoDB, and CloudFront event traces

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Authentication** | Amazon Cognito User Pools (JWT Authorizer) |
| **API Layer** | Amazon API Gateway HTTP API v2 |
| **Compute** | AWS Lambda (Node.js 20.x, ARM64 Graviton3) |
| **Image Processing** | Sharp (libvips C++ engine) |
| **Object Storage** | Amazon S3 (Originals & Thumbnails Buckets) |
| **Database** | Amazon DynamoDB (Single-table design: `photos`) |
| **CDN & Edge** | Amazon CloudFront (OAC Integration) |
| **IaC** | AWS Serverless Application Model (SAM / CloudFormation) |

---

## 📦 API Endpoints Specification

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register new user in Cognito | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | No |
| `GET` | `/api/auth/me` | Retrieve current authenticated user profile | Yes |
| `POST` | `/api/photos/upload-url` | Generate SigV4 Pre-signed S3 PUT URL | Yes |
| `POST` | `/api/photos/confirm` | Record photo in DynamoDB and trigger thumbnail | Yes |
| `GET` | `/api/photos` | List user's photos with search, sort & filters | Yes |
| `GET` | `/api/photos/:photoId` | Get single photo details | Yes |
| `PATCH` | `/api/photos/:photoId` | Update caption or favorite status | Yes |
| `GET` | `/api/photos/:photoId/download` | Generate SigV4 Pre-signed S3 GET URL | Yes |
| `DELETE` | `/api/photos/:photoId` | Delete photo from S3 and DynamoDB | Yes |
| `GET` | `/api/cloud/stats` | Telemetry metrics for S3, DynamoDB, CDN | No |
| `GET` | `/api/cloud/events` | Live AWS cloud execution stream | No |

---

## 🔒 Security Highlights

- **No Public S3 Buckets**: `BlockPublicAccess=true` is strictly enabled.
- **Temporary Credentials**: Pre-signed URLs expire after 15 minutes.
- **Multi-Tenant Isolation**: DynamoDB queries are scoped strictly by `userId` partition key.
- **Server-Side Encryption**: `SSE-S3 (AES-256)` on all S3 buckets.
- **Least-Privilege IAM**: IAM roles grant only essential CRUD actions on designated ARN resources.

---

## 📄 License

MIT License © 2026 CLOUDGALLERY Team.
