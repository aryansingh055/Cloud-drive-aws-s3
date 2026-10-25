import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const source = fs.readFileSync(path.join(root, "frontend/supabase-client.js"), "utf8");

test("shared Supabase client is created once even if the bootstrap script is included twice", () => {
  let calls = 0;
  const fakeClient = { auth: {} };
  const window = {
    CLOUD_DRIVE_SUPABASE: { url: "https://example.supabase.co", anonKey: "sb_publishable_test" },
    supabase: { createClient(url, key, options) { calls++; assert.equal(url, "https://example.supabase.co"); assert.equal(key, "sb_publishable_test"); assert.equal(options.auth.persistSession, true); return fakeClient; } }
  };
  vm.runInNewContext(source, { window }, { filename: "frontend/supabase-client.js" });
  vm.runInNewContext(source, { window }, { filename: "frontend/supabase-client.js" });
  assert.equal(calls, 1);
  assert.equal(window.CLOUD_DRIVE_AUTH.client, fakeClient);
  assert.equal(window.CLOUD_DRIVE_AUTH.configured, true);
});

test("placeholder configuration produces actionable error and does not instantiate a client", () => {
  const window = { CLOUD_DRIVE_SUPABASE: { url: "https://YOUR-PROJECT.supabase.co", anonKey: "YOUR_SUPABASE_PUBLISHABLE_KEY" }, supabase: { createClient() { throw new Error("Should not initialize placeholder config"); } } };
  vm.runInNewContext(source, { window }, { filename: "frontend/supabase-client.js" });
  assert.equal(window.CLOUD_DRIVE_AUTH.client, null);
  assert.match(window.CLOUD_DRIVE_AUTH.error, /Project URL and publishable key/i);
});
