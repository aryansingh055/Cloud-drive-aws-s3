import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const html = fs.readFileSync(path.join(root, "frontend/dashboard.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "frontend/app.js"), "utf8");

class Classes {
  constructor(initial = []) { this.values = new Set(initial); }
  add(...items) { items.forEach(item => this.values.add(item)); }
  remove(...items) { items.forEach(item => this.values.delete(item)); }
  toggle(item, force) { const next = force === undefined ? !this.values.has(item) : Boolean(force); if (next) this.values.add(item); else this.values.delete(item); return next; }
  contains(item) { return this.values.has(item); }
}
class Element {
  constructor(id = "", dataset = {}, classes = []) {
    this.id = id; this.dataset = dataset; this.classList = new Classes(classes); this.style = {};
    this.hidden = false; this.disabled = false; this.checked = false; this.indeterminate = false;
    this.attributes = {}; this.listeners = {}; this.children = []; this.value = ""; this.textContent = ""; this._innerHTML = "";
  }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  appendChild(child) { this.children.push(child); return child; }
  querySelector(selector) { if (selector === "span") { this._span ||= new Element(); return this._span; } return new Element(); }
  set innerHTML(value) { this._innerHTML = String(value); if (this._innerHTML === "") this.children = []; }
  get innerHTML() { return this._innerHTML; }
}

async function createAuthenticatedRuntime() {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const elements = new Map(ids.map(id => [id, new Element(id)]));
  const tabs = ["all", "images", "documents", "media"].map(filter => new Element("", { filter }, ["tab"]));
  const navItems = ["all", "all", "images", "documents", "media"].map(view => new Element("", { view }, ["nav-item"]));
  const themeChoices = ["dark", "light"].map(theme => new Element("", { theme }, ["theme-choice"]));
  const body = new Element("body");
  const location = { hostname: "127.0.0.1", search: "", href: "http://127.0.0.1:3000/frontend/dashboard.html", replace(url) { this.href = url; }, assign(url) { this.href = url; } };
  const firstKey = "cloud-drive/users/11111111-2222-4333-8444-555555555555/11111111-2222-4333-8444-555555555555-first.txt";
  const secondKey = "cloud-drive/users/11111111-2222-4333-8444-555555555555/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-second.pdf";
  let files = [
    { id: firstKey, key: firstKey, name: "first.txt", size: 10, created: 20, createdLabel: "Today" },
    { id: secondKey, key: secondKey, name: "second.pdf", size: 20, created: 10, createdLabel: "Yesterday" }
  ];
  const deleteRequests = [];
  const viewRequests = [];
  const openedTabs = [];
  const session = { access_token: "mock-token", user: { id: "11111111-2222-4333-8444-555555555555", email: "test@example.com", user_metadata: { full_name: "Test User" } } };
  const auth = {
    async getSession() { return { data: { session }, error: null }; },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
    async signOut() { return { error: null }; }
  };
  const window = {
    __CLOUD_DRIVE_APP_STARTED__: false, location, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    CLOUD_DRIVE_APP_CONFIG: { apiBaseUrl: "http://localhost:3001", readmeUrl: "./README.md" },
    CLOUD_DRIVE_AUTH: { client: { auth }, error: "", configured: true },
    addEventListener() {}, setTimeout, clearTimeout, confirm() { return true; },
    open(url, target) {
      const tab = { opener: window, closed: false, target, location: { href: url }, close() { this.closed = true; } };
      openedTabs.push(tab);
      return tab;
    }
  };
  const document = {
    body,
    querySelector(selector) { return selector.startsWith("#") ? elements.get(selector.slice(1)) || null : new Element(); },
    querySelectorAll(selector) { if (selector === ".tab") return tabs; if (selector === ".nav-item[data-view]") return navItems; if (selector === ".theme-choice") return themeChoices; return []; },
    createElement(tag) { return new Element(tag); }, addEventListener() {}
  };
  const fetch = async (url, options = {}) => {
    const parsed = new URL(String(url));
    if (parsed.pathname === "/api/storage/status") return { ok: true, status: 200, async json() { return { connected: true }; } };
    if (parsed.pathname === "/api/files/view" && (!options.method || options.method === "GET")) {
      viewRequests.push(parsed.searchParams.get("key"));
      return { ok: true, status: 200, async json() { return { url: "https://cloud-drive-aryan.s3.ap-south-1.amazonaws.com/signed-preview", expiresIn: 900, contentType: "application/pdf" }; } };
    }
    if (parsed.pathname === "/api/files" && options.method === "DELETE") {
      const { key } = JSON.parse(options.body);
      deleteRequests.push(key);
      files = files.filter(file => file.id !== key);
      return { ok: true, status: 200, async json() { return { deleted: true }; } };
    }
    if (parsed.pathname === "/api/files" && (!options.method || options.method === "GET")) return { ok: true, status: 200, async json() { return { files }; } };
    throw new Error(`Unexpected test API request: ${parsed.pathname} ${options.method || "GET"}`);
  };
  vm.runInNewContext(appSource, { window, document, URL, URLSearchParams, Headers, localStorage: window.localStorage, fetch, console, setTimeout, clearTimeout }, { filename: "frontend/app.js", timeout: 1500 });
  await new Promise(resolve => setTimeout(resolve, 20));
  return { elements, deleteRequests, viewRequests, openedTabs, keys: [firstKey, secondKey] };
}

test("selecting multiple files and confirming bulk delete removes each through the authenticated API", async () => {
  const { elements, deleteRequests, keys } = await createAuthenticatedRuntime();
  const fileList = elements.get("fileList");
  const checkboxFor = key => {
    const target = { dataset: { selectId: encodeURIComponent(key) }, checked: true, closest(selector) { return selector === ".file-row-select" ? this : null; } };
    return target;
  };
  fileList.listeners.change({ target: checkboxFor(keys[0]) });
  assert.equal(elements.get("deleteSelectedBtn").hidden, false);
  assert.equal(elements.get("deleteSelectedBtn").textContent, "Delete selected (1)");
  fileList.listeners.change({ target: checkboxFor(keys[1]) });
  assert.equal(elements.get("deleteSelectedBtn").textContent, "Delete selected (2)");

  await elements.get("deleteSelectedBtn").listeners.click();
  assert.deepEqual(deleteRequests, keys);
  assert.equal(fileList.children.length, 0);
  assert.equal(elements.get("headerCount").textContent, 0);
  assert.equal(elements.get("deleteSelectedBtn").hidden, true);
  assert.equal(elements.get("toastTitle").textContent, "Files deleted");
});


test("View action opens a new isolated tab and navigates it to the authenticated signed preview URL", async () => {
  const { elements, viewRequests, openedTabs, keys } = await createAuthenticatedRuntime();
  const fileList = elements.get("fileList");
  const target = { closest(selector) {
    if (selector !== "[data-action]") return null;
    return { dataset: { action: "view", id: encodeURIComponent(keys[0]) } };
  } };
  fileList.listeners.click({ target });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(viewRequests.length, 1);
  assert.equal(viewRequests[0], keys[0]);
  assert.equal(openedTabs.length, 1);
  assert.equal(openedTabs[0].opener, null);
  assert.equal(openedTabs[0].location.href, "https://cloud-drive-aryan.s3.ap-south-1.amazonaws.com/signed-preview");
  assert.equal(openedTabs[0].closed, false);
});
