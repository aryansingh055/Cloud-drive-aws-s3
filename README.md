
# ☁️ Cloud Drive — Powered by Amazon S3

A personal cloud storage web application built with **HTML, CSS, JavaScript, Node.js, Express, Amazon S3, and Supabase Authentication**.

Cloud Drive provides a modern dashboard for uploading, viewing, searching, downloading, renaming, and deleting files stored in a private Amazon S3 bucket.

<p align="center">
  <a href="https://cloud-drive-s3.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Demo-Open%20Dashboard-6366f1?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"/>
  </a>
  <a href="https://github.com/aryansingh055/cloud-drive-aws-s3">
    <img src="https://img.shields.io/badge/GitHub-Source%20Code-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repository"/>
  </a>
</p>

---

## 📌 Project Overview

Cloud Drive is a web-based file management application that uses Amazon S3 as its cloud storage layer.

Users can create an account, sign in, and access a dashboard to manage their files. Supabase handles authentication, while a Node.js and Express backend verifies user sessions and communicates with Amazon S3.

Each user's files are organized under a user-specific S3 prefix, helping separate file access between authenticated users.

### 🎯 Project Goals

- Build a practical cloud storage application.
- Integrate Amazon S3 for private file storage.
- Implement authentication using Supabase Auth.
- Develop a backend API using Node.js and Express.
- Practice secure credential management and cloud deployment.
- Provide clear setup instructions so other developers can configure their own AWS and Supabase projects.

## 🚀 Live Demo

**[Open the Cloud Drive Dashboard →](https://cloud-drive-s3.vercel.app)**

The public demo showcases the dashboard interface.

**Important:** This is a UI demonstration. Real authentication and S3 file operations in the complete application require a configured Supabase project, backend API, and AWS S3 bucket.

## ✨ Features

- 🔐 **User Authentication** — Email and password sign-up and sign-in through Supabase Auth.
- ☁️ **Amazon S3 Storage** — Uses your own private S3 bucket.
- 📤 **File Upload** — Upload files using a file picker or drag-and-drop.
- 📥 **Secure Downloads** — Generates short-lived presigned URLs.
- 👁️ **File Preview** — Previews supported file types such as images, PDFs, text files, CSV/JSON, audio, and video.
- 🔎 **Search and Sort** — Find and organize files.
- 📁 **File Categories** — Browse files by category.
- ✏️ **Rename Files** — Rename files stored in S3.
- 🗑️ **Delete Files** — Delete individual files or select multiple files for bulk deletion.
- 🌗 **Dark and Light Themes** — Switch between dashboard themes.
- 📊 **Storage Status** — Check whether the configured S3 bucket is reachable.
- 🛡️ **User-Scoped Storage** — Organizes files under the authenticated user's S3 prefix.

Feature availability depends on the correct configuration of the frontend, backend, Supabase, and AWS permissions.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Frontend structure |
| CSS3 | Styling and responsive layout |
| JavaScript | Frontend interactions and API requests |
| Node.js | Backend runtime |
| Express.js | Backend REST API |
| Amazon S3 | Cloud file storage |
| AWS SDK for JavaScript v3 | Communication with S3 |
| AWS IAM | Access control and permissions |
| Supabase Auth | User authentication |
| Git and GitHub | Version control and source code |

## 🏗️ System Architecture

```text
                  User
                   |
                   v
                Frontend
       HTML, CSS and JavaScript
                   |
                   | Supabase session token
                   v
           Backend — Express
          Node.js REST API
             /         \
            v           v
       Supabase       Amazon S3
       Auth           Private Bucket
     Verification     File Storage
```

### How It Works

1. The user registers or signs in through the frontend using Supabase Auth.
2. The frontend obtains the user's authentication session.
3. Protected API requests send the access token to the Express backend.
4. The backend verifies the token with Supabase before allowing file operations.
5. The backend accesses the configured S3 bucket using server-side AWS credentials.
6. Files are stored under a prefix associated with the authenticated user's ID.
7. The backend returns file information or short-lived presigned URLs when required.

Supabase is used for authentication, not as the file storage service. Amazon S3 stores the actual file objects.

---

# ⚙️ Run the Project Locally

Follow these steps to run your own instance.

## Step 1 — Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/aryansingh055/cloud-drive-aws-s3.git

cd Cloud-drive-aws-s3
```

Open the cloned project folder in VS Code.

## Step 2 — Create Your Supabase Project

1. Open [Supabase](https://supabase.com/).
2. Create a new project.
3. Open the project's API settings.
4. Copy the Project URL.
5. Copy the public publishable key, or the legacy anon key if that is what your project provides.

### Configure the Frontend

Open:

`frontend/supabase-config.js`

Replace the placeholder values with your own:

```javascript
window.CLOUD_DRIVE_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_PUBLISHABLE_KEY"
};
```

Use your own Project URL and publishable/anon key.

The frontend key is public configuration. **Never place an AWS secret access key or Supabase service-role/secret key in this file.**

### Configure Supabase Authentication

In the Supabase dashboard:

1. Enable the Email authentication provider.
2. Choose your email confirmation settings.
3. Configure the site's URL and allowed redirect URLs.
4. Enable and configure Google OAuth if you want Google sign-in.

For local development, the frontend may run on port `3000` or `3002`. Add the matching local URLs to Supabase Authentication → URL Configuration.

Examples:

```text
http://localhost:3000/**
http://127.0.0.1:3000/**
http://localhost:3002/**
http://127.0.0.1:3002/**
```

Use the exact origin and redirect URL required by your frontend setup.

## Step 3 — Create Your AWS S3 Bucket

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Open Amazon S3.
3. Create a bucket with a globally unique name.
4. Select the AWS Region you want to use.
5. Keep Block Public Access enabled.
6. Create an IAM identity with only the permissions required by this application.

Do not make your bucket public to get uploads or downloads working.

### Configure AWS Credentials

For local development, use credentials belonging to an appropriately restricted IAM identity. Do not use your AWS root account credentials.

The backend needs to know:

- AWS Region
- S3 bucket name
- AWS access key ID
- AWS secret access key

**Important:** `S3_BUCKET` expects the bucket name, not a full URL. Do not enter an `https://...` or `s3://...` URL in that field.

## Step 4 — Configure Backend Environment Variables

Open the backend folder:

```bash
cd backend
```

Create your local `.env` file from the example.

Open `backend/.env` and replace the placeholder values:

```dotenv
PORT=3001

AWS_REGION=ap-south-1
S3_BUCKET=your-private-bucket-name
AWS_ACCESS_KEY_ID=your-iam-access-key-id
AWS_SECRET_ACCESS_KEY=your-iam-secret-access-key

S3_PREFIX=cloud-drive

ALLOWED_ORIGIN=http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:3002,http://localhost:3002

MAX_FILE_BYTES=104857600

SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-side-supabase-service-role-or-secret-key
```

### Environment Variable Reference

| Variable | Purpose |
|---|---|
| `PORT` | Port on which the backend runs |
| `AWS_REGION` | Region where your S3 bucket exists |
| `S3_BUCKET` | Name of your private S3 bucket |
| `AWS_ACCESS_KEY_ID` | IAM access key ID for backend AWS access |
| `AWS_SECRET_ACCESS_KEY` | Private IAM secret access key |
| `S3_PREFIX` | Root prefix used to organize application files |
| `ALLOWED_ORIGIN` | Frontend origins permitted by backend CORS |
| `MAX_FILE_BYTES` | Maximum accepted file size in bytes |
| `SUPABASE_URL` | Supabase Project URL used by the backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key used to verify user sessions |

The example file uses `104857600` bytes, which is 100 MiB.


## Step 5 — Install and Start the Backend

Make sure your terminal is inside the `backend` folder.

Install dependencies:

```bash
npm install
```

Start the development API:

```bash
npm run dev
```

The backend listens on port `3001` by default.

### Check the Backend

Open this URL in your browser:

[http://localhost:3001/api/health](http://localhost:3001/api/health)

A successful response looks like:

```json
{
  "status": "ok",
  "service": "cloud-drive-api"
}
```

This checks whether the API is responding. It does not confirm that authentication or S3 storage is fully configured.

## Step 7 — Run the Frontend

1. Open the project in VS Code.
2. Open the `frontend` folder.
3. Start the Live Server extension from `frontend/index.html`.
4. Use port `3000` or `3002` so the default local CORS configuration matches.
5. Register or sign in through the login page.

Do not open `dashboard.html` directly to sign in. The dashboard checks for an authenticated Supabase session.

### Configure the Local API URL

Open:

`frontend/app-config.js`

For local development, use:

```javascript
window.CLOUD_DRIVE_APP_CONFIG = Object.freeze({
  apiBaseUrl: "http://localhost:3001",
  readmeUrl: "./README.md"
});
```

The frontend must point to the API that is actually running. If you change the backend port, update the API URL accordingly.

**You should now have the frontend and backend running in separate terminals.**

---

# ☁️ AWS Permissions

The backend requires permissions appropriate to the operations implemented by the application.

The IAM policy should allow the necessary bucket-level and object-level actions, including:

- `s3:ListBucket` — List application objects in the bucket.
- `s3:GetObject` — Read or download objects.
- `s3:PutObject` — Upload new objects and write copied objects.
- `s3:DeleteObject` — Delete objects.

Scope bucket permissions to your own bucket and object permissions to the application's S3 prefix wherever possible.

The application organizes objects under a per-user prefix similar to:

```text
cloud-drive/
└── users/
    └── <SUPABASE_USER_ID>/
        └── <UUID>-<filename>
```

The backend derives the authenticated user's ID from the verified session instead of trusting a user ID supplied by the browser.

---

## 👨‍💻 Developer

**Aryan Singh**

- 📧 Email: [aryansinghas7703@gmail.com](mailto:aryansinghas7703@gmail.com)
- 🐙 GitHub: [aryansingh055](https://github.com/aryansingh055)
- 💼 LinkedIn: [Aryan Singh](https://www.linkedin.com/in/aryan-singh-615a44369)

---

<p align="center">
  Built to explore web development, authentication, and secure cloud file storage with AWS.
</p>
