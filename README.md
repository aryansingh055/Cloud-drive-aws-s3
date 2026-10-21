# ☁️ Cloud Drive — Powered by Amazon S3

### Your Personal Cloud Storage, Built on AWS 🚀

A lightweight cloud file management application that lets you securely upload, download, organize, search, and manage files using your own Amazon S3 bucket.

**Built with:** HTML • CSS • JavaScript • Node.js • Express • Amazon S3 • Supabase

<!-- Replace the placeholders below with your actual links before publishing. -->

[Live Demo](YOUR_LIVE_DEMO_URL) · [Report a Bug](YOUR_GITHUB_REPO_URL/issues) · [Request a Feature](YOUR_GITHUB_REPO_URL/issues)

---

## 📌 Overview

Cloud Drive is a web-based file management application built using **Amazon S3 as the storage layer**.

Instead of storing files directly on your application server, Cloud Drive uses Amazon S3 to store and manage files in your own AWS account.

You can clone this project, configure your own AWS and Supabase credentials, and run your own instance.

### ✨ Key Features

- 📤 **File Upload** — Upload files using drag-and-drop or the file picker.
- 📥 **File Download** — Download files securely using presigned URLs.
- 📂 **File Management** — View and manage files stored in your S3 bucket.
- 🔍 **Search & Sort** — Find files and organize them easily.
- 🗂️ **File Categories** — Browse files by category.
- ✏️ **Rename Files** — Rename files stored in Amazon S3.
- 🗑️ **Delete Files** — Remove files you no longer need.
- 📦 **Archive & Unarchive** — Organize files using archive functionality.
- 🔐 **Authentication** — Sign in using Supabase Auth.
- 🌗 **Dark & Light Mode** — Switch between themes.
- ☁️ **Your Own Storage** — Connect the application to your own S3 bucket.

## 🖼️ How It Works

```text
             👤 User
                |
                v
       🌐 Cloud Drive Frontend
                |
                v
        🔧 Node.js + Express API
                |
          +-----+------+
          |            |
          v            v
    🔐 Supabase     ☁️ Amazon S3
    Authentication   File Storage
```

**Important:** The frontend communicates with the backend API. AWS credentials stay on the backend and should never be exposed in frontend JavaScript.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML, CSS, JavaScript | Frontend and user interface |
| Node.js | Backend runtime |
| Express.js | REST API |
| Amazon S3 | Cloud file storage |
| AWS IAM | Secure AWS permissions |
| AWS SDK for JavaScript v3 | Communication with S3 |
| Supabase Auth | User authentication |
| Vercel | Frontend deployment |
| Render | Backend deployment |

## 🚀 Run Locally

Follow these steps to run your own copy of Cloud Drive.


### Step 1 — Clone the Repository

Open your terminal and run:

```bash
git clone YOUR_GITHUB_REPO_URL
cd YOUR_REPOSITORY_NAME
```

Replace the repository URL with the actual GitHub URL.

### Step 2 — Set Up Your Amazon S3 Bucket

1. Sign in to the [AWS Console](https://console.aws.amazon.com/).
2. Open **Amazon S3**.
3. Create a bucket with a globally unique name.
4. Select your preferred AWS Region.
5. Keep **Block Public Access** enabled.
6. Create an IAM identity with only the permissions required by the application.

Do not make your bucket public just to make uploads or downloads work.

**Important:** Your bucket name and AWS Region must match the values in your backend configuration.

### Step 3 — Configure AWS Credentials

Create an IAM access key for an appropriately restricted IAM user, or use another supported AWS credential provider.

Copy the backend environment template:

```bash
cd backend
```

Open the `.env` file and configure your own values:

```env
PORT=5000

AWS_REGION=your-aws-region
AWS_BUCKET_NAME=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

Use the Supabase key format expected by your application. If your project uses a legacy anon key, use that value instead.

**Never commit your `.env` file or share your AWS secret access key.** Use a server-side IAM role or another secure credential provider when available.

### Step 4 — Configure Supabase Authentication

1. Open your project in Supabase.
2. Navigate to the project's API settings.
3. Copy your project URL and the appropriate public/publishable or legacy anon key.
4. Add these values to your backend `.env` file.
5. Enable the authentication methods supported by your application, such as email/password and Google sign-in.
6. Configure the appropriate site URL and redirect URLs for local development.

Follow the application's existing authentication flow and environment variable names if they differ from the template above.

### Step 5 — Install Backend Dependencies

From the `backend` directory, run:

```bash
npm install
```

### Step 6 — Start the Backend Server

Check the `scripts` section of `backend/package.json` for the available start command. If a `dev` script exists, run:

```bash
npm run dev
```

Otherwise, use the start command defined by the project, for example:

```bash
npm start
```

Keep the terminal running while you use the application.

### Step 7 — Run the Frontend

Open the frontend directory in your editor and follow its existing development setup.

- If the frontend is a static HTML/CSS/JavaScript application, serve its HTML files using a local development server.
- If the frontend uses a build tool, install its dependencies and run the development script defined in its `package.json`.
- Configure the frontend's API base URL to point to your local Express server.

For a local backend using the default port, the API base URL may be:

```text
http://localhost:5000
```

Use the actual API URL and port configured by your project.

**You're ready!** Open the local frontend URL, sign in, and test file operations using your own S3 bucket.

## 🔑 AWS Permissions

Cloud Drive requires permissions for the S3 operations implemented by the application.

Depending on the enabled features, the backend may need permissions such as:

- `s3:ListBucket` — List objects in the bucket.
- `s3:GetObject` — Read or download objects.
- `s3:PutObject` — Upload or copy objects.
- `s3:DeleteObject` — Delete objects.
- `s3:GetBucketLocation` — Check the bucket's Region, if required.

Scope bucket-level permissions to your specific bucket and object-level permissions to its objects. Add only the additional permissions actually required by your implementation.

Do not use AWS root account credentials or grant unrestricted administrator access to the application.


The frontend filenames and folders above are illustrative. Keep the actual frontend structure from your repository rather than renaming existing files to match this example.


## 🧪 Troubleshooting

| Problem | What to check |
|---|---|
| `AccessDenied` | IAM permissions, bucket policy, and object permissions |
| Bucket not found | Bucket name and AWS Region |
| Backend fails to start | Node.js version, installed dependencies, `.env` values |
| Frontend cannot reach API | Backend URL, server status, and CORS |
| Login or redirect fails | Supabase settings and allowed redirect URLs |
| Upload or download fails | Backend logs, IAM permissions, and presigned URL configuration |

Never share secret keys, access tokens, or sensitive environment values when reporting an issue.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome!

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your changes with your own AWS and Supabase configuration.
5. Open a pull request describing what you changed.


## 👨‍💻 Author

**Your Name**

- GitHub: [Aryan Singh](https://github.com/aryansingh055)
- LinkedIn: [Aryan Singh]()

---

⭐ If you find this project useful, consider giving the repository a star!

**Built to explore cloud storage, AWS S3 integration, backend APIs, authentication, and secure file management.**
