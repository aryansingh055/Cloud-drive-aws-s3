# Cloud Drive — Powered by AWS S3 (V12)

A personal cloud-file workspace. The intended login flow is a separate public login/register page followed by a protected dashboard.

## V12 changes and scope

- Removed the Archive sidebar navigation, Archived tab, and archive/unarchive row action. Older objects in the legacy `archived/` S3 prefix remain available in All Files; no S3 objects are migrated or deleted by this UI change.
- Removed the sidebar account card and developer contact card. Their area is intentionally left blank; the storage card and Settings remain. Sign-out is still available in Settings.
- Added accessible per-row checkboxes, select-all-visible, confirmation-protected bulk delete, and partial-failure reporting.
- Updated sidebar and file-type icons to simple inline SVGs, keeping the existing theme and layout intact.


## Architecture

```text
Vercel static frontend (frontend/)
  ├── index.html + auth.js (login/register)
  ├── dashboard.html + app.js (protected workspace)
  └── Supabase Auth browser client
           │ Bearer access token
           ▼
Render Node.js / Express API (backend/)
  ├── verifies the Supabase user on protected endpoints
  └── generates short-lived signed URLs / lists user-scoped objects
           │
           ▼
Private Amazon S3 bucket
  cloud-drive/users/<SUPABASE_USER_ID>/...
```

Supabase is used for authentication only. It is not the file store. AWS credentials and the Supabase service-role key must be kept on the backend and must never be committed to GitHub or placed in browser files / public Vercel variables.

## Project layout

```text
frontend/
  index.html            # public login/register page (Vercel entry)
  dashboard.html        # authenticated dashboard
  auth.js               # login/register/Google OAuth button
  app.js                # dashboard UI and API client
  supabase-config.js    # browser-safe URL + publishable key only
  supabase-client.js    # shared singleton client / config diagnostics
  app-config.js         # public backend base URL + README URL
  styles.css
backend/
  src/server.js         # API
  src/security.js       # S3 key/name helpers
  test/security.test.js # dependency-free security helper tests
  .env.example
render.yaml
```

## 1. Configure the frontend Supabase client

Edit `frontend/supabase-config.js`:

```js
window.CLOUD_DRIVE_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_PUBLISHABLE_KEY"
};
```

Use your actual Project URL and `sb_publishable_...` key (or a legacy anon key from your Supabase project). The publishable key is designed for browser use. **Never** use the Supabase `service_role`/secret key here.

In Supabase Authentication → Sign In / Providers, keep Email enabled. Email confirmation may remain enabled; the user must verify the email before their first login. The Google button requires enabling Google OAuth and configuring its Google Cloud OAuth client before it will work.

### Redirect URLs

In Supabase Authentication → URL Configuration, add your exact local frontend origins/paths. VS Code Live Server may use port 3000, 3002 or another port if 3000 is busy. For the current local setup, allow URLs such as:

```text
http://127.0.0.1:3000/**
http://localhost:3000/**
http://127.0.0.1:3002/**
http://localhost:3002/**
```

Site URL is a single fallback URL, for example `http://127.0.0.1:3000` while developing. After Vercel deployment, update Site URL to the deployed domain and add that domain to the Redirect URLs allow-list.

## 2. Run frontend locally

Open the project folder in VS Code, run Live Server on `frontend/index.html`, and register/sign in there. Do not directly open `dashboard.html` to sign in: the dashboard deliberately checks for an authenticated Supabase session.

If the only goal is to inspect the dashboard design before configuring Supabase, open `frontend/dashboard.html?preview=1` on `localhost` or `127.0.0.1`. This is UI-only mock data; mutations and real S3 calls are disabled in preview mode.

## 3. Run the backend locally

Install Node.js (current LTS recommended), then:

```bash
cd backend
npm install
cp .env.example .env
```

On Windows PowerShell, copy the example with:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and enter your own private bucket, region, AWS IAM credentials, Supabase Project URL and Supabase service-role key. Do not paste any real secrets into chat or commit `.env`.

Start the API:

```bash
npm run dev
```

The API listens on port `3001` by default. The public process check is `http://localhost:3001/api/health`; real S3 connection status is `GET /api/storage/status` and requires a valid Supabase bearer token.

### IAM / S3 requirements

Use a dedicated IAM identity with least-privilege access scoped to this project's bucket/prefix. The API uses `HeadBucket`, `ListObjectsV2`, `PutObject` (presigned upload), `GetObject` (presigned download), `CopyObject` (rename and legacy archive support), and `DeleteObject` (delete/rename/legacy archive support). Keep the S3 bucket private and do not add public bucket policies. AWS account root keys are not appropriate for application use.

Files are stored under a per-user key prefix:

```text
cloud-drive/users/<SUPABASE_USER_ID>/<UUID>-<filename>
cloud-drive/users/<SUPABASE_USER_ID>/archived/<UUID>-<filename>
```

The backend derives the user ID from the verified access token; the browser cannot choose another user's prefix.

## 4. Frontend API URL

Edit `frontend/app-config.js` before publishing the frontend:

```js
window.CLOUD_DRIVE_APP_CONFIG = Object.freeze({
  apiBaseUrl: "https://YOUR-RENDER-SERVICE.onrender.com",
  readmeUrl: "./README.md"
});
```

For local testing, `http://localhost:3001` is correct. The dashboard also accepts a browser `localStorage` override named `cloudDriveApiBase`, but editing `app-config.js` is the repeatable deployment approach. `apiBaseUrl` is public configuration, not a credential.

## 5. Deploy

### Vercel frontend

Import the GitHub repository into Vercel and set the project Root Directory to `frontend`. The frontend is static and does not need a build command. Update `frontend/app-config.js` to the public Render API URL and `frontend/supabase-config.js` to the Supabase Project URL/publishable key before deploying.

### Render backend

Create a Node Web Service from the repository using the supplied `render.yaml`, or set Root Directory `backend`, Build Command `npm install`, Start Command `npm start`. Set these environment variables in Render's dashboard:

- `AWS_REGION`
- `S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_PREFIX` (usually `cloud-drive`)
- `ALLOWED_ORIGIN` (your exact Vercel origin, e.g. `https://your-project.vercel.app`; add local origins only for development)
- `MAX_FILE_BYTES` (default `104857600` / 100 MiB)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never use `ALLOWED_ORIGIN=*` in a production deployment. The public health endpoint allows Render's health check to succeed without a user token; all storage endpoints still require Supabase authentication.

Hosting free tiers, sleep behavior, and usage limits may change; check current provider pricing. Free use is not guaranteed.

## 6. Checks

From the `backend/` directory:

```bash
npm test
npm run check
```

These run helper unit tests and JavaScript syntax checks without needing AWS/Supabase credentials. They do not prove that live Supabase email delivery, Google OAuth, Render networking, IAM policies, or S3 operations are configured correctly. Those require real end-to-end testing after credentials are added.

## Your project URLs

Fill these in after creating the repository/deployments:

- Live website (Vercel): `ADD_YOUR_VERCEL_URL_HERE`
- Source repository (GitHub): `ADD_YOUR_GITHUB_REPOSITORY_URL_HERE`
- Backend API (Render): `ADD_YOUR_RENDER_API_URL_HERE`

## Cost and multi-user model

The app itself is intended to be cloned and configured by another developer with their own backend environment and their own S3 bucket credentials. It currently uses one server-configured private bucket per deployment, with per-user prefixes inside that bucket. It does **not** let each public visitor submit arbitrary AWS secrets through the browser. To remove your AWS keys from a live deployment, remove them from the backend host environment; the S3 status will then turn disconnected and uploads will stop working. Rotating/deleting keys should be done in IAM after updating the service to ensure no old credential remains active.


## View files

The file menu has a View action for safe, browser-previewable types (common images, PDF, text, CSV/JSON and audio/video) through a short-lived signed S3 URL. Unsupported formats and active content should be downloaded rather than rendered inline.
