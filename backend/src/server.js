import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import {
  cleanFileName,
  buildAttachmentContentDisposition,
  buildInlineContentDisposition,
  isBrowserViewableContentType,
  fileNameFromObjectKey,
  encodeCopySource,
  isUserScopedKey,
  makeObjectKey,
  normalizePrefix,
  parseAllowedOrigins,
  parsePositiveInteger,
  userStoragePrefix
} from "./security.js";

dotenv.config();

const app = express();
const PORT = parsePositiveInteger(process.env.PORT, 3001);
const BUCKET = (process.env.S3_BUCKET || "").trim();
const REGION = (process.env.AWS_REGION || "ap-south-1").trim();
const PREFIX = normalizePrefix(process.env.S3_PREFIX || "cloud-drive");
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.ALLOWED_ORIGIN);
const MAX_FILE_BYTES = parsePositiveInteger(process.env.MAX_FILE_BYTES, 100 * 1024 * 1024);
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
  : null;
const s3 = new S3Client({ region: REGION });

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(cors({
  origin(origin, callback) {
    // Non-browser clients and same-origin health checks do not send an Origin header.
    if (!origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "1mb", strict: true }));

function requireBucket(res) {
  if (!BUCKET) {
    res.status(503).json({ message: "S3 bucket is not configured on the backend." });
    return false;
  }
  return true;
}

async function requireUser(req, res) {
  if (!supabaseAdmin) {
    res.status(503).json({ message: "Supabase authentication is not configured on the backend." });
    return null;
  }
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ message: "Authentication required." });
    return null;
  }
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ message: "Invalid or expired authentication session." });
      return null;
    }
    return data.user;
  } catch {
    res.status(503).json({ message: "Could not verify the Supabase session. Try again shortly." });
    return null;
  }
}

// Render health checks must not require an end-user login or AWS credentials.
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "cloud-drive-api" });
});

// Authenticated storage health: green in the UI only when the private bucket is reachable.
app.get("/api/storage/status", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!BUCKET) return res.status(200).json({ connected: false, message: "S3 bucket is not configured on the backend." });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return res.json({ connected: true });
  } catch {
    return res.status(503).json({ connected: false, message: "The backend cannot access the configured S3 bucket. Check the bucket name, region and IAM permissions." });
  }
});

app.get("/api/files", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user || !requireBucket(res)) return;
  const scopePrefix = userStoragePrefix(PREFIX, user.id);
  try {
    const files = [];
    let continuationToken;
    let truncated = false;
    const maxReturned = 10000;
    do {
      const result = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${scopePrefix}/`,
        MaxKeys: Math.min(1000, maxReturned - files.length),
        ...(continuationToken ? { ContinuationToken: continuationToken } : {})
      }));
      for (const item of result.Contents || []) {
        if (!item.Key || item.Key === `${scopePrefix}/`) continue;
        // Ignore objects outside the strict app key format even if an IAM policy is too broad.
        if (!isUserScopedKey(item.Key, PREFIX, user.id)) continue;
        const relative = item.Key.slice(scopePrefix.length + 1);
        const archived = relative.startsWith("archived/");
        const nameWithId = archived ? relative.slice("archived/".length) : relative;
        const displayName = nameWithId.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
        files.push({
          id: item.Key,
          key: item.Key,
          name: displayName,
          size: item.Size || 0,
          archived,
          created: item.LastModified ? new Date(item.LastModified).getTime() : Date.now(),
          createdLabel: item.LastModified ? new Date(item.LastModified).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—"
        });
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
      truncated = Boolean(continuationToken) && files.length >= maxReturned;
    } while (continuationToken && files.length < maxReturned);
    return res.json({ files, truncated });
  } catch {
    return res.status(502).json({ message: "Unable to list files from S3. Check the bucket region and IAM ListBucket permission." });
  }
});

app.post("/api/uploads/presign", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user || !requireBucket(res)) return;
  const name = req.body?.name;
  const type = req.body?.type;
  const size = req.body?.size;
  if (typeof name !== "string" || !name.trim() || !Number.isSafeInteger(size) || size < 0) {
    return res.status(400).json({ message: "A valid file name and file size are required." });
  }
  if (size > MAX_FILE_BYTES) {
    return res.status(413).json({ message: `File is larger than the ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB upload limit.` });
  }
  const contentType = typeof type === "string" && type.length <= 200 && !/[\r\n]/.test(type)
    ? (type || "application/octet-stream")
    : "application/octet-stream";
  const key = makeObjectKey(PREFIX, user.id, name);
  try {
    const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    return res.json({ key, uploadUrl, expiresIn: 900, contentType });
  } catch {
    return res.status(502).json({ message: "Could not create an upload link. Check the backend AWS credentials and S3 permissions." });
  }
});

app.post("/api/files/rename", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user || !requireBucket(res)) return;
  const key = String(req.body?.key || "");
  const name = typeof req.body?.name === "string" ? cleanFileName(req.body.name) : "";
  if (!isUserScopedKey(key, PREFIX, user.id) || !name || name === "file" && !String(req.body?.name || "").trim()) {
    return res.status(400).json({ message: "A valid file key and name are required." });
  }
  try {
    const scopePrefix = userStoragePrefix(PREFIX, user.id);
    const archived = key.startsWith(`${scopePrefix}/archived/`);
    const newKey = `${scopePrefix}/${archived ? "archived/" : ""}${randomUUID()}-${name}`;
    await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: encodeCopySource(BUCKET, key), Key: newKey }));
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return res.json({ renamed: true, key: newKey });
  } catch {
    return res.status(502).json({ message: "Unable to rename the S3 object. The original file has not necessarily been removed; refresh the file list." });
  }
});

app.post("/api/files/archive", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user || !requireBucket(res)) return;
  const key = String(req.body?.key || "");
  const archived = req.body?.archived;
  if (!isUserScopedKey(key, PREFIX, user.id) || typeof archived !== "boolean") {
    return res.status(400).json({ message: "A valid file key and archived boolean are required." });
  }
  const scopePrefix = userStoragePrefix(PREFIX, user.id);
  const relative = key.slice(scopePrefix.length + 1);
  const currentlyArchived = relative.startsWith("archived/");
  if (archived === currentlyArchived) return res.json({ archived: currentlyArchived, key });
  try {
    const bareName = currentlyArchived ? relative.slice("archived/".length) : relative;
    const newKey = `${scopePrefix}/${archived ? "archived/" : ""}${bareName}`;
    await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: encodeCopySource(BUCKET, key), Key: newKey }));
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return res.json({ archived, key: newKey });
  } catch {
    return res.status(502).json({ message: "Unable to update the S3 archive state. Refresh the file list and check bucket permissions." });
  }
});

app.get("/api/files/view", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user || !requireBucket(res)) return;
  const key = String(req.query.key || "");
  if (!isUserScopedKey(key, PREFIX, user.id)) return res.status(400).json({ message: "Invalid file key." });
  try {
    const metadata = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    const contentType = String(metadata.ContentType || "application/octet-stream").split(";")[0].trim().toLowerCase();
    if (!isBrowserViewableContentType(contentType)) {
      return res.status(415).json({ message: "This file type cannot be previewed safely in the browser. Use Download instead." });
    }
    const viewName = fileNameFromObjectKey(key, PREFIX, user.id);
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentType: contentType,
      ResponseContentDisposition: buildInlineContentDisposition(viewName),
      ResponseCacheControl: "no-store"
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 900 });
    return res.json({ url, expiresIn: 900, fileName: viewName, contentType });
  } catch {
    return res.status(502).json({ message: "Unable to create a preview link. Check that the file exists and the backend has S3 read permission." });
  }
});

app.get("/api/files/download", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user || !requireBucket(res)) return;
  const key = String(req.query.key || "");
  if (!isUserScopedKey(key, PREFIX, user.id)) return res.status(400).json({ message: "Invalid file key." });
  try {
    const downloadName = fileNameFromObjectKey(key, PREFIX, user.id);
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: buildAttachmentContentDisposition(downloadName)
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 900 });
    return res.json({ url, expiresIn: 900, fileName: downloadName });
  } catch {
    return res.status(502).json({ message: "Unable to create a download link. Check S3 permissions and confirm that the file exists." });
  }
});

app.delete("/api/files", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user || !requireBucket(res)) return;
  const key = String(req.body?.key || "");
  if (!isUserScopedKey(key, PREFIX, user.id)) return res.status(400).json({ message: "Invalid file key." });
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return res.json({ deleted: true });
  } catch {
    return res.status(502).json({ message: "Unable to delete the S3 object. Check bucket permissions." });
  }
});

// Keep parser/CORS/runtime failures structured and avoid leaking stack traces to browser clients.
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ message: "Request body is too large." });
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ message: "Invalid JSON request body." });
  if (error?.message === "CORS origin not allowed") return res.status(403).json({ message: "This website origin is not allowed to call the Cloud Drive API." });
  console.error("Cloud Drive API error:", error?.message || error);
  return res.status(500).json({ message: "Unexpected server error. Check the backend logs for details." });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Cloud Drive API listening on port ${PORT}`));
}

export { app };
