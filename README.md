
# ☁️ Cloud Drive — Powered by AWS S3

A modern personal cloud storage project designed to provide a simple and intuitive workspace for managing files using Amazon S3.

<p align="center">
  <a href="https://cloud-drive-s3.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Demo-Open%20Cloud%20Drive-6366f1?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"/>
  </a>
  <a href="https://github.com/aryansingh055/cloud-drive-aws-s3">
    <img src="https://img.shields.io/badge/GitHub-Source%20Code-181717?style=for-the-badge&logo=github" alt="GitHub Repository"/>
  </a>
</p>

---

## 📌 About the Project

Cloud Drive is a web-based project that explores how modern web technologies can be used to create a personal file management workspace with Amazon S3 as the intended cloud storage service.

The application features a dashboard-style interface for accessing file categories and storage-related information. The project separates the live frontend demonstration from the main source code and configuration documentation.

**Project Highlights**
- Modern cloud storage dashboard
- File management interface
- AWS S3-based storage architecture
- Web-based frontend
- Live demo deployment on Vercel
- Source code and documentation on GitHub

> **Note:** The live demo showcases the website interface. Real authentication and file storage depend on the services configured in the application.

## 🚀 Live Demo

**[Open Cloud Drive →](https://cloud-drive-s3.vercel.app)**

The live demo allows visitors to explore the deployed interface without setting up the project locally.

## ✨ Features

- ☁️ **Cloud Storage Concept** — Designed around Amazon S3 object storage.
- 📊 **Dashboard Interface** — A centralized workspace for file-related information.
- 📁 **File Categories** — Dedicated views for all files, images, documents, and media.
- ⬆️ **Upload Interface** — User interface for selecting and uploading files.
- 🗂️ **File Management** — Interface designed for common file operations.
- 🎨 **Modern UI** — A dashboard-focused layout with a consistent visual theme.
- 🌐 **Live Deployment** — Public frontend demo hosted on Vercel.
- 📖 **Documentation** — Setup and configuration guidance for developers.

*Feature availability depends on the functionality implemented and configured in the current source code.*

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling and layout |
| JavaScript | Client-side interactions |
| Amazon S3 | Cloud object storage |
| Vercel | Frontend demo hosting |
| Git | Version control |
| GitHub | Source code hosting |

Additional backend or authentication technologies should be listed here if they are part of the current implementation.

## 🏗️ Architecture

The intended high-level architecture is:

```text
                 User
                   |
                   v
          Cloud Drive Frontend
                   |
                   v
              Backend / API
                   |
                   v
              Amazon S3
            Object Storage
```

### Components

- **Frontend:** Provides the dashboard and user interface.
- **Backend / API:** Handles authorized file operations when implemented.
- **Amazon S3:** Stores files as objects in an S3 bucket.
- **Vercel:** Hosts the public frontend demonstration.

The diagram describes the intended storage architecture. Actual request flows should match the backend and frontend implementation in the repository.

## 📂 Project Structure

The demo frontend contains files similar to the following:

```text
Deploy V2/
├── index.html
├── dashboard.html
├── styles.css
├── app.js
├── app-config.js
├── auth.js
├── supabase-client.js
├── supabase-config.js
├── vercel.json
├── DEPLOY.md
└── VERIFICATION-REPORT.md
```

This is the demo folder structure, not necessarily the exact structure of the main repository. Update it to match the files committed to GitHub.

## ⚙️ Getting Started

### Prerequisites

- Git
- A modern web browser
- Node.js and npm if required by the project scripts or backend
- An AWS account and S3 bucket for real cloud storage functionality

### 1. Clone the Repository

```bash
git clone https://github.com/aryansingh055/cloud-drive-aws-s3.git
cd cloud-drive-aws-s3
```

### 2. Review the Project Files

Check the repository structure, package files, environment examples, and any setup documentation to identify the required frontend and backend commands.

### 3. Configure the Application

Configure the environment variables and service settings required by the actual source code.

Keep private credentials in local environment files or secure deployment settings. Never commit secrets to GitHub.

### 4. Run the Application

Follow the setup instructions provided for the current project.

For a static frontend, use a local development server to preview the HTML, CSS, and JavaScript files. If a backend is required, configure and start it separately.

> Exact commands and environment variable names must match the implementation in the repository.

## ☁️ AWS S3 Setup

To enable real file storage using Amazon S3:

1. Sign in to the AWS Management Console.
2. Create an S3 bucket in your preferred AWS Region.
3. Keep the bucket private by default.
4. Configure an IAM role or appropriate credentials with least-privilege permissions.
5. Configure the backend or authorized storage integration to access the bucket.
6. Test the supported file operations using non-sensitive sample files.

### 🔐 Security Best Practices

- Never place AWS secret access keys in frontend JavaScript.
- Never commit `.env` files, passwords, tokens, or private credentials.
- Avoid granting public access to the S3 bucket.
- Use least-privilege IAM permissions.
- Validate upload requests and restrict file sizes where appropriate.
- Use server-side authorization or appropriately scoped presigned URLs.
- Do not assume a file is securely stored until the upload has been verified in S3.

## 🔒 Authentication

Authentication must be configured using the mechanism supported by the current implementation.

A frontend-only login form does not provide secure shared user accounts. A public application needs a trusted authentication provider or a properly implemented backend with secure session handling and password storage.

If authentication is not enabled in the live demo, treat it as a UI preview rather than a secure personal storage service.

## 🧪 Testing Checklist

Before describing the project as fully functional, verify the following:

- [ ] Dashboard opens correctly.
- [ ] Navigation and file categories work.
- [ ] File upload completes successfully.
- [ ] Uploaded files appear in the intended S3 bucket.
- [ ] File download works.
- [ ] File deletion works, if implemented.
- [ ] Credentials are not exposed in frontend code.
- [ ] The application handles errors appropriately.
- [ ] The README setup instructions work on a clean environment.

## 🗺️ Future Improvements

- Secure user authentication
- User-specific file access controls
- File search, filtering, and sorting
- Storage usage based on actual S3 data
- Controlled file-sharing links
- Upload progress and improved error handling
- Additional cloud deployment and security documentation

## 🎯 Learning Objectives

This project provides an opportunity to learn about:

- Frontend web development
- Cloud storage concepts
- Amazon S3 integration
- IAM permissions and secure configuration
- Frontend deployment with Vercel
- Git and GitHub workflows
- Technical documentation

## 👨‍💻 Developer

**Aryan Singh**

- 📧 Email: [aryansinghas7703@gmail.com](mailto:aryansinghas7703@gmail.com)
- 🐙 GitHub: [aryansingh055](https://github.com/aryansingh055)
- 💼 LinkedIn: [Aryan Singh](https://www.linkedin.com/in/aryan-singh-615a44369)

---

## 📄 License

Choose and add an appropriate open-source license before distributing the project. Until a license is added, the repository should not be assumed to grant others permission to reuse the code.

---

<p align="center">
  Built as a learning project exploring web development and AWS cloud storage.
</p>
