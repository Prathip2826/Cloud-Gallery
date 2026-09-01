# Firebase Authentication Setup for CloudGallery

This guide walks you through connecting a **NEW Firebase Project** to CloudGallery for Google Sign-In authentication.

---

## 10-Step Setup Guide

### Step 1: Create a New Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Enter a project name (e.g., `cloudgallery-prod` or `cloudgallery-app`).
4. (Optional) Configure Google Analytics and click **Create project**.

---

### Step 2: Enable Firebase Authentication
1. In the left navigation menu, open **Build** > **Authentication**.
2. Click **Get Started** to initialize the authentication service.

---

### Step 3: Enable Google Sign-In Provider
1. Go to the **Sign-in method** tab in Firebase Authentication.
2. Select **Google** from the list of additional providers.
3. Toggle the **Enable** switch to active.
4. Set the **Project public-facing name** and select your **Project support email**.
5. Click **Save**.

---

### Step 4: Register a Web Application
1. In the Firebase Console, navigate to **Project Overview** (gear icon) > **Project settings**.
2. Under the **General** tab, scroll to the **Your apps** section.
3. Click the **Web** icon (`</>`) to add a new web application.
4. Enter an App nickname (e.g., `CloudGallery Web`) and click **Register app**.

---

### Step 5: Copy the Firebase Web App Configuration
Locate your `firebaseConfig` credentials object in the registered app settings:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

---

### Step 6: Add Environment Variables to CloudGallery
Add the following configuration variables to your project's `.env` (or environment variables settings):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

### Step 7: Add Authorized Domains
1. In the Firebase Console, navigate to **Authentication** > **Settings** > **Authorized domains**.
2. Ensure the following domains are added to the list:
   - `localhost`
   - Your CloudGallery preview domain / custom hosting domain (e.g., `*.run.app`, `ai.studio`)

---

### Step 8: Restart / Reload the Application
Once the environment variables are saved, restart the development server or reload the application to apply the new Firebase configuration.

---

### Step 9: Click "Continue with Google"
1. Open the CloudGallery login page.
2. Click the **Continue with Google** button.
3. Select your Google account in the popup window.

---

### Step 10: Confirm Authentication & AWS Backend Integration
1. On successful sign-in, Firebase issues a secure Firebase ID Token (JWT).
2. The frontend automatically includes this token in the `Authorization: Bearer <token>` header for all API requests.
3. The AWS backend authenticates the token, extracts your Firebase UID, and isolates your photos in Amazon S3 and Amazon DynamoDB.
