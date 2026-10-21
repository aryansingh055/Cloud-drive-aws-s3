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

class FakeClassList {
  constructor(initial = []) { this.items = new Set(initial); }
  add(...names) { names.forEach(name => this.items.add(name)); }
  remove(...names) { names.forEach(name => this.items.delete(name)); }
  contains(name) { return this.items.has(name); }
  toggle(name, force) {
    const next = force === undefined ? !this.items.has(name) : Boolean(force);
    if (next) this.items.add(name); else this.items.delete(name);
    return next;
  }
}

class FakeElement {
  constructor(id = "", dataset = {}, classes = []) {
    this.id = id;
    this.dataset = dataset;
    this.classList = new FakeClassList(classes);
    this.style = {};
    this.hidden = false;
    this.attributes = {};
    this.listeners = {};
    this.children = [];
    this._innerHTML = "";
    this.textContent = "";
    this.value = "";
    this.type = "password";
  }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  appendChild(child) { this.children.push(child); return child; }
  querySelector(selector) {
    if (selector === "span") {
      if (!this._span) this._span = new FakeElement();
      return this._span;
    }
    if (selector === "button") {
      if (!this._button) this._button = new FakeElement();
      return this._button;
    }
    return new FakeElement();
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML === "") this.children = [];
  }
  get innerHTML() { return this._innerHTML; }
}

function createRuntime() {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const elements = new Map(ids.map(id => [id, new FakeElement(id)]));
  const tabs = ["all", "images", "documents", "media"].map(filter => new FakeElement("", { filter }, ["tab"]));
  const navItems = ["all", "all", "images", "documents", "media"].map(view => new FakeElement("", { view }, ["nav-item"]));
  const themeChoices = ["dark", "light"].map(theme => new FakeElement("", { theme }, ["theme-choice"]));
  const body = new FakeElement("body");
  const location = {
    hostname: "127.0.0.1",
    search: "?preview=1",
    href: "http://127.0.0.1:3000/frontend/dashboard.html?preview=1",
    replace(url) { this.href = url; }
  };
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const document = {
    body,
    querySelector(selector) {
      if (selector.startsWith("#")) return elements.get(selector.slice(1)) || null;
      return new FakeElement();
    },
    querySelectorAll(selector) {
      if (selector === ".tab") return tabs;
      if (selector === ".nav-item[data-view]") return navItems;
      if (selector === ".theme-choice") return themeChoices;
      return [];
    },
    createElement(tag) { return new FakeElement(tag); },
    addEventListener() {}
  };
  const window = {
    __CLOUD_DRIVE_APP_STARTED__: false,
    location,
    localStorage,
    CLOUD_DRIVE_APP_CONFIG: { apiBaseUrl: "http://localhost:3001", readmeUrl: "./README.md" },
    CLOUD_DRIVE_AUTH: { client: null, error: "Test mode has no Supabase client.", configured: false },
    addEventListener() {},
    setTimeout() { return 1; },
    clearTimeout() {}
  };
  const context = {
    window, document, URL, URLSearchParams, Headers,
    localStorage, console, fetch: async () => { throw new Error("Fetch should not run in local preview mode"); },
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout
  };
  vm.runInNewContext(appSource, context, { filename: "frontend/app.js", timeout: 1500 });
  return { elements, window, location, tabs, body };
}

test("local dashboard preview renders sample rows without auth or backend calls", () => {
  const { elements, body, tabs } = createRuntime();
  assert.equal(elements.get("dashboardLoading").hidden, true);
  assert.equal(elements.get("appShell").hidden, false);
  assert.equal(elements.get("fileList").children.length, 5);
  assert.ok(body.children.some(child => child.className === "local-preview-banner"));
  assert.equal(tabs.find(tab => tab.dataset.filter === "all").querySelector("span").textContent, 5);
  assert.equal(elements.get("selectAllFiles").disabled, true);
  assert.equal(elements.get("deleteSelectedBtn").hidden, true);
});


test("preview search and setup modal work while file mutations remain guarded", async () => {
  const { elements } = createRuntime();
  const search = elements.get("searchInput");
  search.value = "Banner";
  search.listeners.input({ target: search });
  assert.equal(elements.get("fileList").children.length, 1);

  elements.get("setupBtn").listeners.click();
  assert.equal(elements.get("modalBackdrop").hidden, false);

  await elements.get("fileInput").listeners.change({ target: { files: [{ name: "blocked.txt", size: 1 }] } });
  assert.equal(elements.get("toastTitle").textContent, "Local preview only");
});
