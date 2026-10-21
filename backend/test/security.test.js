import test from "node:test";
import assert from "node:assert/strict";
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
} from "../src/security.js";

const userA = "11111111-2222-4333-8444-555555555555";
const userB = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("normalizes storage prefix", () => {
  assert.equal(normalizePrefix("///cloud-drive///"), "cloud-drive");
  assert.equal(normalizePrefix(""), "cloud-drive");
});

test("sanitizes upload names and avoids slash traversal", () => {
  assert.equal(cleanFileName(" folder\\report / test.pdf "), "folder-report - test.pdf");
  assert.equal(cleanFileName("\u0000\n  "), "file");
  assert.ok(cleanFileName("a".repeat(250)).length <= 180);
});

test("generated object keys are unique-looking and stay under user prefix", () => {
  const key = makeObjectKey("cloud-drive", userA, "my report.pdf");
  assert.ok(key.startsWith(`${userStoragePrefix("cloud-drive", userA)}/`));
  assert.ok(isUserScopedKey(key, "cloud-drive", userA));
  assert.ok(!isUserScopedKey(key, "cloud-drive", userB));
});

test("allows generated archived key and blocks malformed or cross-user keys", () => {
  const good = `cloud-drive/users/${userA}/archived/11111111-2222-4333-8444-555555555555-file.zip`;
  assert.equal(isUserScopedKey(good, "cloud-drive", userA), true);
  assert.equal(isUserScopedKey(`cloud-drive/users/${userA}/../../${userB}/x`, "cloud-drive", userA), false);
  assert.equal(isUserScopedKey(`cloud-drive/users/${userA}/not-a-generated-key`, "cloud-drive", userA), false);
  assert.equal(isUserScopedKey(`cloud-drive/users/${userB}/11111111-2222-4333-8444-555555555555-file.zip`, "cloud-drive", userA), false);
});

test("copy source encodes special characters but preserves object key separators", () => {
  assert.equal(encodeCopySource("private-bucket", "folder/file name #1.pdf"), "private-bucket/folder/file%20name%20%231.pdf");
});

test("CORS origins are explicit and default to supported local ports", () => {
  assert.deepEqual(parseAllowedOrigins("https://demo.example, http://127.0.0.1:3000"), ["https://demo.example", "http://127.0.0.1:3000"]);
  assert.ok(parseAllowedOrigins("").includes("http://127.0.0.1:3002"));
});

test("invalid port/file limit values use safe defaults", () => {
  assert.equal(parsePositiveInteger("3001", 80), 3001);
  assert.equal(parsePositiveInteger("-2", 80), 80);
  assert.equal(parsePositiveInteger("abc", 80), 80);
});


test("download filename is derived from validated active and archived object keys", () => {
  const active = `cloud-drive/users/${userA}/11111111-2222-4333-8444-555555555555-report final.pdf`;
  const archived = `cloud-drive/users/${userA}/archived/11111111-2222-4333-8444-555555555555-résumé (final).pdf`;
  assert.equal(fileNameFromObjectKey(active, "cloud-drive", userA), "report final.pdf");
  assert.equal(fileNameFromObjectKey(archived, "cloud-drive", userA), "résumé (final).pdf");
  assert.throws(() => fileNameFromObjectKey(active, "cloud-drive", userB), /Invalid user-scoped/);
});

test("download Content-Disposition forces attachment and supports UTF-8 filenames safely", () => {
  const header = buildAttachmentContentDisposition('résumé "final".pdf');
  assert.match(header, /^attachment; filename=/);
  assert.match(header, /filename\*=UTF-8''/);
  assert.doesNotMatch(header, /[\r\n]/);
  assert.match(header, /%C3%A9/);
});


test("inline preview Content-Disposition sanitizes filenames and supports UTF-8", () => {
  const header = buildInlineContentDisposition('résumé "preview".pdf');
  assert.match(header, /^inline; filename=/);
  assert.match(header, /filename\*=UTF-8''/);
  assert.doesNotMatch(header, /[\r\n]/);
  assert.match(header, /%C3%A9/);
});

test("browser preview allowlist accepts passive media and rejects active or unknown content", () => {
  for (const type of ["application/pdf", "image/png", "image/jpeg", "text/plain; charset=utf-8", "text/csv", "audio/mpeg", "video/mp4", "application/json"]) {
    assert.equal(isBrowserViewableContentType(type), true, `${type} should be viewable`);
  }
  for (const type of ["text/html", "image/svg+xml", "application/xhtml+xml", "text/javascript", "application/xml", "application/octet-stream", ""]) {
    assert.equal(isBrowserViewableContentType(type), false, `${type} should not be previewable`);
  }
});
