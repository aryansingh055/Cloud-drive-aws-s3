import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const authSource = fs.readFileSync(path.join(root, "frontend/auth.js"), "utf8");

class TestClassList {
  constructor() { this.values = new Set(); }
  toggle(name, force) { const next = force === undefined ? !this.values.has(name) : Boolean(force); if (next) this.values.add(name); else this.values.delete(name); return next; }
}
class TestElement {
  constructor(id) { this.id=id; this.listeners={}; this.classList=new TestClassList(); this.dataset={}; this.attributes={}; this.hidden=false; this.required=false; this.disabled=false; this.textContent=""; this.value=""; this.type="password"; this.autocomplete=""; }
  addEventListener(name, callback) { this.listeners[name]=callback; }
  setAttribute(name,value) { this.attributes[name]=String(value); }
}

function authRuntime({ client = null, configError = "Supabase is not configured.", session = null } = {}) {
  const names = ["authForm","authSubmit","authMessage","authEyebrow","authTitle","authSubtitle","nameField","confirmField","authName","authConfirm","authPassword","loginTab","registerTab","passwordToggle","googleBtn","authEmail"];
  const els = new Map(names.map(id => [id,new TestElement(id)]));
  const loc = { href:"http://127.0.0.1:3002/frontend/index.html", origin:"http://127.0.0.1:3002", pathname:"/frontend/index.html", replace(url){this.href=url;} };
  let sessionState = session;
  const listeners=[];
  const auth = {
    async getSession() { return { data: { session: sessionState }, error: null }; },
    onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: { unsubscribe(){} } } }; },
    async signInWithPassword({email,password}) {
      if (password === "bad") return {data:{session:null,user:null},error:{message:"Invalid login credentials"}};
      sessionState={access_token:"mock",user:{id:"11111111-2222-4333-8444-555555555555",email,user_metadata:{full_name:"Test User"}}};
      listeners.forEach(cb=>cb("SIGNED_IN",sessionState));
      return {data:{session:sessionState,user:sessionState.user},error:null};
    },
    async signUp({email}) { return {data:{session:null,user:{email}},error:null}; },
    async signInWithOAuth() { return {error:{message:"Google provider is not enabled"}}; }
  };
  const window = { __CLOUD_DRIVE_AUTH_UI_STARTED__:false, CLOUD_DRIVE_AUTH:{client:client === "mock" ? {auth} : client, error:configError}, location:loc, setTimeout, clearTimeout };
  const document = { querySelector(selector) { return els.get(selector.slice(1)) || null; } };
  vm.runInNewContext(authSource,{window,document,URL,console,setTimeout,clearTimeout},{filename:"frontend/auth.js",timeout:1500});
  return {els,window,loc,auth, get session(){return sessionState;}};
}

test("login form redirects to separate dashboard after successful Supabase session", async () => {
  const runtime=authRuntime({client:"mock"});
  await new Promise(resolve=>setImmediate(resolve));
  runtime.els.get("authEmail").value="test@example.com";
  runtime.els.get("authPassword").value="valid-password";
  await runtime.els.get("authForm").listeners.submit({preventDefault(){}});
  assert.match(runtime.loc.href,/\/frontend\/dashboard\.html$/);
  assert.equal(runtime.els.get("authMessage").hidden,true);
});

test("registration reports email confirmation when Supabase returns no session", async () => {
  const runtime=authRuntime({client:"mock"});
  await new Promise(resolve=>setImmediate(resolve));
  runtime.els.get("registerTab").listeners.click();
  runtime.els.get("authName").value="Test User";
  runtime.els.get("authEmail").value="test@example.com";
  runtime.els.get("authPassword").value="valid-password";
  runtime.els.get("authConfirm").value="valid-password";
  await runtime.els.get("authForm").listeners.submit({preventDefault(){}});
  assert.match(runtime.els.get("authMessage").textContent,/Check your email to confirm/i);
  assert.equal(runtime.els.get("authMessage").hidden,false);
});

test("missing Supabase configuration is shown in the form instead of causing an uncaught exception", async () => {
  const runtime=authRuntime();
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(runtime.els.get("authMessage").textContent,/Supabase is not configured/i);
  assert.equal(runtime.els.get("authMessage").hidden,false);
});
