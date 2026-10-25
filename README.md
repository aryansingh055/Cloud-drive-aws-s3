
# ☁️ Cloud Drive — Powered by Amazon S3

A personal cloud storage web application built with **HTML, CSS, JavaScript, Node.js, Express.js, Amazon S3, and Supabase Authentication**.

Manage your files through a modern dashboard while learning how authentication, backend APIs, and cloud object storage work together.

<p align="center">
  <a href="https://cloud-drive-s3.vercel.app">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-Open_Dashboard-635BFF?style=for-the-badge" alt="Live Demo"/>
  </a>
  <a href="https://github.com/aryansingh055/cloud-drive-aws-s3">
    <img src="https://img.shields.io/badge/GitHub-Source_Code-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Source Code"/>
  </a>
</p>

---

## 📌 About the Project

Cloud Drive is a web-based file management application designed to provide a personal workspace for managing files stored in Amazon S3.

The application combines a frontend dashboard, a Node.js and Express backend, Supabase authentication, and Amazon S3 object storage.

Users can sign in and manage their files through the dashboard. The backend validates authentication and performs authorized file operations against the configured S3 bucket.

### 🎯 Project Objectives

- Build a practical cloud storage application.
- Integrate Amazon S3 for private file storage.
- Implement authentication using Supabase.
- Develop REST APIs using Node.js and Express.js.
- Learn secure credential management and AWS permissions.
- Practice local development, deployment, and GitHub documentation.

## 🚀 Live Demo

**[Open Cloud Drive Dashboard →](https://cloud-drive-s3.vercel.app)**

The live demo is provided to showcase the dashboard's appearance and user interface.

It is separate from the complete source-code setup described in this README. The demo should not be assumed to have working authentication, a connected backend, or persistent S3 storage.

To run the complete application with your own account and bucket, follow the setup instructions below.

---

## ✨ Features

- 🔐 **Authentication** — Email and password authentication through Supabase.
- ☁️ **Cloud Storage** — Amazon S3 integration for file storage.
- 📤 **File Upload** — Upload files using the file picker or drag-and-drop interface.
- 📥 **File Download** — Download files using backend-generated presigned URLs.
- 👁️ **File Preview** — Preview supported file types, including images, PDFs, text, CSV/JSON, audio, and video.
- 🔎 **Search and Sorting** — Find and organize files.
- 📁 **File Categories** — Browse images, documents, media, and other files.
- ✏️ **Rename Files** — Rename stored files.
- 🗑️ **File Deletion** — Delete individual files or select multiple files for bulk deletion.
- 🌗 **Theme Options** — Switch between dark and light themes.
- 📊 **Storage Status** — Check the configured S3 bucket connection.
- 🛡️ **User-Scoped Storage** — Organize files using a user-specific S3 prefix.

Feature availability depends on the correct configuration of the frontend, backend, authentication, and AWS permissions.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Frontend structure |
| CSS3 | Dashboard styling |
| JavaScript | Frontend functionality and API requests |
| Node.js | Backend runtime |
| Express.js | REST API |
| Amazon S3 | Cloud object storage |
| AWS SDK for JavaScript v3 | Communication with Amazon S3 |
| AWS IAM | Permissions and access control |
| Supabase Auth | User authentication |
| Git and GitHub | Version control and source code |

---

## 🏗️ System Architecture

```text
                   User
                    |
                    v
            Frontend Dashboard
            HTML, CSS, JavaScript
                    |
                    | Authentication token
                    v
             Node.js / Express
                Backend API
                /          \
               v            v
        Supabase Auth     Amazon S3
        Token Validation  File Storage
```

### How the Application Works

1. The user registers or signs in through Supabase Auth.
2. The frontend obtains the user's authentication session.
3. The frontend sends the session token with protected API requests.
4. The backend verifies the authenticated user before allowing file operations.
5. The backend accesses the configured S3 bucket using server-side AWS credentials.
6. Files are organized under a prefix associated with the authenticated user's ID.
7. The backend returns file information or temporary download links when required.

**Important:** Supabase handles authentication. Amazon S3 stores the actual files.

---

## 📂 Project Structure

```text
cloud-drive-aws-s3/
│
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   └── security.js
│   │
│   ├── test/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── styles.css
│   ├── app.js
│   ├── auth.js
│   ├── app-config.js
│   ├── supabase-client.js
│   ├── supabase-config.js
│   └── README.md
│
├── .gitignore
├── render.yaml
└── README.md
```

---

# ⚙️ Run the Project Locally

Follow these steps to set up your own instance of Cloud Drive.

## 1. Clone the GitHub Repository

Open a terminal and run:

```bash
git clone https://github.com/aryansingh055/cloud-drive-aws-s3.git

cd cloud-drive-aws-s3
```

## 2. Configure Supabase Authentication

Open:

`frontend/supabase-config.js`

Enter your own Supabase configuration using the structure expected by the application:

```javascript
window.CLOUD_DRIVE_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_PUBLISHABLE_KEY"
};
```

Replace the example values with your own Project URL and public publishable/anon key.


---

## 3. Create an AWS S3 Bucket

You will need:

- AWS Region
- S3 bucket name
- AWS access key ID
- AWS secret access key

For example:

```dotenv
AWS_REGION=ap-south-1
S3_BUCKET=your-private-bucket-name
```

Use the Region where your bucket was created.

---

## 4. Configure the Backend

Open a terminal in the repository root and enter the backend directory:

```bash
cd backend
```

Open `backend/.env` and enter values for your own AWS and Supabase projects.

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
SUPABASE_SERVICE_ROLE_KEY=your-server-side-supabase-key
```



## 5. Install and Start the Backend

Make sure your terminal is inside `backend/`.

Install the required dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Keep this terminal open while using the application.

The default backend URL is:

```text
http://localhost:3001
```

### Check Backend Health

Open the following URL in your browser:

[http://localhost:3001/api/health](http://localhost:3001/api/health)

A successful health response indicates that the API is responding. It does not by itself confirm that Supabase authentication or S3 access is working.

---

## 6. Start the Frontend

1. Open a second terminal or use the Live Server extension in VS Code.
2. Open the `frontend/` folder.
3. Start Live Server from `frontend/index.html`.
4. Use a local port allowed by your backend's `ALLOWED_ORIGIN` configuration.
5. Open the frontend in your browser and sign in.

Open the login page first. The dashboard depends on the authenticated session.

### Configure the Backend API URL

Open:

`frontend/app-config.js`

For local development, the API base URL should point to your local Express server:

```javascript
window.CLOUD_DRIVE_APP_CONFIG = Object.freeze({
  apiBaseUrl: "http://localhost:3001",
  readmeUrl: "./README.md"
});
```

Keep the existing configuration structure expected by your application and replace the API URL only when needed.

If you choose a different frontend port, update `ALLOWED_ORIGIN` in `backend/.env` to match it.



## ☁️ AWS Permissions

The backend requires permissions for the S3 operations it performs.


| Permission | Purpose |
|---|---|
| `s3:ListBucket` | List objects in the bucket or permitted prefix |
| `s3:GetObject` | Read or download objects |
| `s3:PutObject` | Upload or write objects |
| `s3:DeleteObject` | Delete objects |

Grant only the permissions the application needs, scoped to your bucket and relevant object prefixes wherever possible.

Files may be organized under a user-specific prefix similar to:

```text
cloud-drive/
└── users/
    └── <SUPABASE_USER_ID>/
        └── <UUID>-<filename>
```

The backend should derive the authenticated user's identity from the verified session, rather than trusting an arbitrary user ID supplied by the browser.

---

## 👨‍💻 Developer

**Aryan Singh**

- 📧 Email: [aryansinghas7703@gmail.com](mailto:aryansinghas7703@gmail.com)
- 🐙 GitHub: [aryansingh055](https://github.com/aryansingh055)
- 💼 LinkedIn: [Aryan Singh](https://www.linkedin.com/in/aryan-singh-615a44369)

---
