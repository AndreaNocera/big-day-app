# Big Day App - Gemini Development Guide

This document provides a comprehensive overview of the "Big Day App" for developers, focusing on its architecture, features, and development practices.

> [!IMPORTANT]
> The `frontend` directory contains a legacy Next.js implementation and should be **ignored**. The active frontend is located in `frontend_vite`.

## 1. Technological Stack

The application is a modern full-stack solution leveraging serverless technologies on AWS for the backend and a reactive frontend.

### 1.1. Frontend (`frontend_vite`)

-   **Framework**: React 19 with Vite.
-   **Routing**: `react-router-dom` (v7) for client-side navigation.
-   **State Management**: `zustand` for global state (e.g., `authStore`).
-   **Internationalization**: `i18next` and `react-i18next` for multi-language support.
-   **Styling**: Vanilla CSS with global tokens in `index.css`.
-   **UI Patterns**: Standardized message handling using a central modal/loader system for consistent UX across API calls.
-   **Deployment**: Static site hosted on S3 with public read access.

### 1.2. Backend (AWS Serverless)

The backend is composed of several AWS Lambda functions written in Python 3.12.

-   **API Gateway**: RESTful API exposing Lambda functions.
-   **Lambda Functions**:
    -   `send_invites`: Sends SMS invitations via SNS.
    -   `verify_magic_link`: Handles phone-based auth (Magic Link or Phone + PIN), generating JWTs.
    -   `rsvp_handler`: Manages guest RSVPs and attendance details.
    -   `survey_handler`: Saves guest responses (e.g., song requests).
    -   `get_upload_url`: Generates pre-signed S3 URLs for secure photo uploads.
    -   `get_photos`: Retrieves metadata for photos uploaded by the user.
    -   `process_photo`: S3-triggered function for image processing (e.g., generating thumbnails using Pillow).
    -   `update_profile`: Updates guest profile info (e.g., email) and sends confirmation via SES.
-   **Database (DynamoDB)**:
    -   `WeddingInvites`: Guest details, tokens, and access codes.
    -   `WeddingRSVP`: Attendance and dietary data.
    -   `WeddingPhotos`: Photo metadata. Includes a **Global Secondary Index (GSI)** `S3KeyIndex` for efficient lookups by S3 key.
-   **Storage (S3)**:
    -   `wedding-photos-prod-nocera`: Stores original uploads (`uploads/`) and thumbnails (`thumbnails/`).
-   **Notifications**:
    -   **SNS**: SMS delivery for invites and magic links.
    -   **SES**: Email delivery for profile updates.

### 1.3. Infrastructure as Code (IaC)

-   **AWS CDK**: Infrastructure defined in Python (`infra/wedding_stack.py`). Provisions DynamoDB, S3, Lambda, and API Gateway.

### 1.4. Local Development

-   **Local Server**: A `FastAPI` application (`local_server/main.py`) that wraps Lambda handlers, mirroring API Gateway behavior locally.
-   **Database/Storage**: `dynamodb-local` and `minio` (S3-compatible) via Docker Compose.
-   **Scripts**: `scripts/init-local-db.py` (setup) and `scripts/seed_guests.py` (test data).

## 2. Implemented Features

### 2.1. Phone-First Authentication
-   **Phone + PIN**: The exclusive login method uses the guest's phone number and a unified PIN distributed via SMS or externally.
-   **JWT Sessions**: Authenticated requests use a JWT generated upon verification.

### 2.2. Photo Sharing & Processing
-   **Secure Upload**: Direct-to-S3 uploads via pre-signed URLs.
-   **Auto-Processing**: Automated thumbnail generation triggered by S3 `ObjectCreated` events.
-   **Personal Gallery**: Users can view the photos they personally uploaded.

### 2.3. RSVP & Surveys
-   **Attendance**: Confirm presence, guest count, and children.
-   **Details**: Collect dietary restrictions and song requests via surveys.

### 2.4. Standardized UX
-   **Global Messaging**: A unified system for displaying success/error messages and loading states during asynchronous operations.

## 3. Development Workflow

### 3.1. Local Setup
1. `docker-compose up -d`
2. `python3 scripts/init-local-db.py`
3. `python3 scripts/seed_guests.py`
4. `cd frontend_vite && npm install && npm run dev`
5. Access: Frontend at `http://localhost:5173`, API at `http://localhost:8000`.

### 3.2. Deployment
The application is deployed using the `deploy_aws.sh` script, which orchestrates the following:
1.  **Lambda Layer Preparation**: Uses Docker to build Python dependencies for the Lambda layer (Linux/amd64 compatibility).
2.  **Frontend Build**: Compiles the `frontend_vite` project using `.env.production` variables.
3.  **CDK Deploy**: Deploys the infrastructure stack using the `big-day-app` AWS profile.

To deploy:
```bash
./deploy_aws.sh
```
*Use `--skip-layer` to speed up deployment if dependencies haven't changed.*

## 4. Architectural Notes

-   **Shared Layer**: A Lambda layer (`lambda/layer/python/shared`) provides common utilities for AWS clients, JWT handling, and API responses across all functions.
-   **S3-Triggered Processing**: The `process_photo` Lambda decouples image processing from the upload flow for better performance.
-   **GSI Optimization**: DynamoDB uses GSI to enable queries that aren't possible with just the Partition Key, specifically for correlating S3 events with database records.
