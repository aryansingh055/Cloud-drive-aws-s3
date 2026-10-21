import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const app = fs.readFileSync(path.join(root, "frontend/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "frontend/dashboard.html"), "utf8");
const css = fs.readFileSync(path.join(root, "frontend/styles.css"), "utf8");

test("multi-select uses visible file keys, confirms the destructive action, and calls the authenticated delete API per key", () => {
  assert.match(app, /selectedFiles = state\.files\.filter\(file => state\.selectedKeys\.has\(file\.id\)\)/);
  assert.match(app, /window\.confirm\(`Delete \$\{selectedFiles\.length\} selected file/);
  assert.match(app, /body: JSON\.stringify\(\{ key: file\.id \}\)/);
  assert.match(app, /const deletedIds = new Set\(\)/);
  assert.match(app, /const failures = \[\]/);
  assert.match(app, /Some files could not be deleted/);
});

test("row and select-all checkboxes have accessible labels and selection resets on changing views", () => {
  assert.match(html, /id="selectAllFiles"[^>]*aria-label="Select all visible files"/);
  assert.match(app, /class="file-select-checkbox file-row-select" data-select-id/);
  assert.match(app, /function clearSelection\(\)/);
  assert.match(app, /state\.filter = tab\.dataset\.filter;\s*clearSelection\(\)/);
  assert.match(css, /\.file-select-checkbox/);
  assert.match(css, /\.bulk-delete-btn\[hidden\]\{display:none!important\}/);
});
