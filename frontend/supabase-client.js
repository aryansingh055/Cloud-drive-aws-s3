/*
 * Creates one Supabase browser client per page.
 * Keeps SDK/config failures visible and avoids duplicate global lexical declarations.
 */
(() => {
  if (window.__CLOUD_DRIVE_AUTH_BOOTSTRAPPED__) return;
  window.__CLOUD_DRIVE_AUTH_BOOTSTRAPPED__ = true;

  const config = window.CLOUD_DRIVE_SUPABASE || {};
  let client = null;
  let error = "";

  const projectUrl = typeof config.url === "string" ? config.url.trim() : "";
  const publishableKey = typeof config.anonKey === "string" ? config.anonKey.trim() : "";
  const placeholder = !projectUrl || !publishableKey ||
    /YOUR[-_]PROJECT|YOUR_SUPABASE|PLACEHOLDER/i.test(projectUrl + " " + publishableKey);

  if (placeholder) {
    error = "Add your Supabase Project URL and publishable key in frontend/supabase-config.js.";
  } else if (!/^https:\/\//i.test(projectUrl)) {
    error = "The Supabase Project URL must start with https://.";
  } else if (!window.supabase || typeof window.supabase.createClient !== "function") {
    error = "The Supabase SDK did not load. Check your internet connection and refresh this page.";
  } else {
    try {
      client = window.supabase.createClient(projectUrl, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce"
        }
      });
    } catch (cause) {
      error = cause?.message || "Supabase could not be initialized. Check the Project URL and publishable key.";
    }
  }

  window.CLOUD_DRIVE_AUTH = Object.freeze({ client, error, configured: Boolean(client) });
})();
