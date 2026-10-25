import { randomUUID } from "node:crypto";

export function normalizePrefix(prefix = "cloud-drive") {
  return String(prefix).replace(/^\/+|\/+$/g, "") || "cloud-drive";
}

export function cleanFileName(name = "file") {
  const safe = String(name)
    .replace(/[\\/]/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return safe || "file";
}

export function makeObjectKey(prefix, userId, name) {
  return `${normalizePrefix(prefix)}/users/${userId}/${randomUUID()}-${cleanFileName(name)}`;
}

export function userStoragePrefix(prefix, userId) {
  return `${normalizePrefix(prefix)}/users/${userId}`;
}

// Only keys created by this app are accepted. The optional `archived/` folder is allowed.
export function isUserScopedKey(key, prefix, userId) {
  if (typeof key !== "string" || !key) return false;
  const base = userStoragePrefix(prefix, userId);
  if (!key.startsWith(`${base}/`)) return false;
  let relative = key.slice(base.length + 1);
  if (relative.startsWith("archived/")) relative = relative.slice("archived/".length);
  if (!relative || relative.includes("/")) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.+$/i.test(relative);
}

// S3's CopySource is URL-encoded segment by segment, preserving key path separators.
export function encodeCopySource(bucket, key) {
  const safeBucket = String(bucket || "").trim();
  if (!safeBucket || typeof key !== "string" || !key) throw new Error("Bucket and key are required.");
  return `${safeBucket}/${key.split("/").map(segment => encodeURIComponent(segment)).join("/")}`;
}

export function parseAllowedOrigins(value) {
  const defaults = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3002",
    "http://localhost:3002"
  ];
  const parsed = String(value || "").split(",").map(item => item.trim()).filter(Boolean);
  return parsed.length ? parsed : defaults;
}

export function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}


// Derive the user-facing filename from an app-generated S3 key for download headers.
export function fileNameFromObjectKey(key, prefix, userId) {
  if (!isUserScopedKey(key, prefix, userId)) throw new Error("Invalid user-scoped object key.");
  const scope = userStoragePrefix(prefix, userId);
  let relative = key.slice(scope.length + 1);
  if (relative.startsWith("archived/")) relative = relative.slice("archived/".length);
  const match = relative.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i);
  return cleanFileName(match ? match[1] : relative);
}

// Set both an ASCII fallback and RFC 5987 filename so browsers download Unicode filenames too.
export function buildAttachmentContentDisposition(filename) {
  const safeName = cleanFileName(filename);
  const asciiFallback = safeName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(safeName).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}


// Return true only for common passive file types that browsers can safely preview inline.
// Active content (HTML, SVG, JavaScript, XML and unknown binary types) must use Download instead.
export function isBrowserViewableContentType(contentType) {
  const mime = String(contentType || "application/octet-stream")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if ([
    "application/pdf",
    "application/json",
    "text/plain",
    "text/csv",
    "text/markdown"
  ].includes(mime)) return true;
  if (/^image\/(?:jpeg|png|gif|webp|avif|bmp|tiff|heic|heif)$/.test(mime)) return true;
  if (/^(?:audio|video)\/[a-z0-9.+-]+$/.test(mime)) return true;
  return false;
}

// Inline counterpart to the attachment header used for downloads. The filename is sanitized
// and encoded for Unicode, but only safe MIME types are allowed to use this header.
export function buildInlineContentDisposition(filename) {
  const safeName = cleanFileName(filename);
  const asciiFallback = safeName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(safeName).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
