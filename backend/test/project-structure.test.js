import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const frontend = path.join(root, "frontend");
const read = (file) => fs.readFileSync(file, "utf8");

function idsFrom(html) {
  return [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
}

function localScriptSources(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1]).filter(src => src.startsWith("./"));
}

test("all local frontend scripts referenced by HTML exist", () => {
  for (const page of ["index.html", "dashboard.html"]) {
    const html = read(path.join(frontend, page));
    for (const source of localScriptSources(html)) {
      assert.ok(fs.existsSync(path.join(frontend, source.slice(2))), `${page} references missing ${source}`);
    }
  }
});

test("login and dashboard HTML have unique IDs", () => {
  for (const page of ["index.html", "dashboard.html"]) {
    const ids = idsFrom(read(path.join(frontend, page)));
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual([...new Set(duplicates)], [], `${page} has duplicate IDs`);
  }
});

test("dashboard ID selectors resolve and shared auth client avoids duplicate supabase lexical binding", () => {
  const html = read(path.join(frontend, "dashboard.html"));
  const ids = new Set(idsFrom(html));
  const app = read(path.join(frontend, "app.js"));
  const referenced = [...app.matchAll(/\$\(["']#([A-Za-z0-9_-]+)["']\)/g)].map(match => match[1]);
  const missing = [...new Set(referenced.filter(id => !ids.has(id)))];
  assert.deepEqual(missing, [], `app.js references missing IDs: ${missing.join(", ")}`);
  for (const script of ["app.js", "auth.js", "supabase-client.js"]) {
    const source = read(path.join(frontend, script));
    assert.doesNotMatch(source, /\b(?:const|let|var)\s+supabase\s*=/, `${script} redeclares a global-looking supabase binding`);
  }
});

test("dashboard uses authenticated storage status and public health route is reserved for host checks", () => {
  const app = read(path.join(frontend, "app.js"));
  const server = read(path.join(root, "backend/src/server.js"));
  assert.match(app, /api\("\/api\/storage\/status"\)/);
  assert.match(server, /app\.get\("\/api\/health", \(_req, res\) =>/);
  assert.match(server, /app\.get\("\/api\/storage\/status", async \(req, res\) =>/);
});

test("Render blueprint includes server-side Supabase auth variables", () => {
  const render = read(path.join(root, "render.yaml"));
  assert.match(render, /key: SUPABASE_URL/);
  assert.match(render, /key: SUPABASE_SERVICE_ROLE_KEY/);
});

test("frontend ships no real AWS access key or service-role secret", () => {
  for (const entry of fs.readdirSync(frontend)) {
    if (!entry.endsWith(".js") && !entry.endsWith(".html")) continue;
    const source = read(path.join(frontend, entry));
    assert.doesNotMatch(source, /AKIA[0-9A-Z]{16}/, `${entry} includes an AWS access key pattern`);
    assert.doesNotMatch(source, /sb_secret_[A-Za-z0-9_-]{20,}/, `${entry} includes a Supabase secret key pattern`);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{20,}["']/, `${entry} includes a hard-coded service-role key`);
  }
});


test("V12 removes Archive navigation and the two sidebar cards, without replacing them", () => {
  const dashboard = read(path.join(frontend, "dashboard.html"));
  const app = read(path.join(frontend, "app.js"));
  assert.doesNotMatch(dashboard, /data-view="archived"|data-filter="archived"|>Archived</i);
  assert.doesNotMatch(dashboard, /class="account-card"|class="developer-card"/);
  assert.doesNotMatch(dashboard, /id="accountName"|id="accountEmail"|id="accountAvatar"|id="logoutBtn"/);
  assert.match(dashboard, /class="plan-card"/);
  assert.match(dashboard, /id="settingsBtn"/);
  assert.match(dashboard, /id="selectAllFiles"/);
  assert.match(dashboard, /id="deleteSelectedBtn"/);
  assert.doesNotMatch(app, /archiveFile\(|data-action="archive"|f === "archived"/);
  assert.match(app, /async function deleteSelectedFiles\(\)/);
  assert.match(app, /state\.selectedKeys\.add/);
  assert.match(app, /method: "DELETE"/);
});

test("V12 includes purposeful SVG navigation icons and preserves attachment downloads", () => {
  const dashboard = read(path.join(frontend, "dashboard.html"));
  const app = read(path.join(frontend, "app.js"));
  const server = read(path.join(root, "backend/src/server.js"));
  for (const label of ["Overview", "All Files", "Images", "Documents"]) assert.ok(dashboard.includes(`>${label}</button>`), `${label} navigation exists`);
  assert.ok((dashboard.match(/class="nav-icon" aria-hidden="true"><svg/g) || []).length >= 5, "SVG navigation icons exist");
  assert.match(app, /window\.location\.assign\(data\.url\)/);
  assert.doesNotMatch(app, /window\.open\(data\.url/);
  assert.match(server, /ResponseContentDisposition:\s*buildAttachmentContentDisposition\(downloadName\)/);
});

test("V12 view action is authenticated, scoped to the user's object, and only previews safe MIME types", () => {
  const dashboard = read(path.join(frontend, "dashboard.html"));
  const app = read(path.join(frontend, "app.js"));
  const server = read(path.join(root, "backend/src/server.js"));
  const security = read(path.join(root, "backend/src/security.js"));
  assert.match(app, /data-action="view"/);
  assert.match(app, /async function viewFile\(id\)/);
  assert.match(app, /api\(`\/api\/files\/view\?key=\$\{encodeURIComponent\(id\)\}`\)/);
  assert.match(app, /previewWindow\.location\.href = data\.url/);
  assert.match(server, /app\.get\("\/api\/files\/view"/);
  assert.match(server, /isUserScopedKey\(key, PREFIX, user\.id\)/);
  assert.match(server, /isBrowserViewableContentType\(contentType\)/);
  assert.match(server, /ResponseContentDisposition:\s*buildInlineContentDisposition\(viewName\)/);
  assert.match(security, /export function isBrowserViewableContentType/);
  assert.doesNotMatch(dashboard, /data-action="view"/); // Row actions are rendered by app.js, not hardcoded into the static template.
});
