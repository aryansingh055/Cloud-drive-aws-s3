(() => {
  if (window.__CLOUD_DRIVE_AUTH_UI_STARTED__) return;
  window.__CLOUD_DRIVE_AUTH_UI_STARTED__ = true;

  const $ = (selector) => document.querySelector(selector);
  const clientState = window.CLOUD_DRIVE_AUTH || {};
  const authClient = clientState.client || null;
  let mode = "login";
  let redirecting = false;
  const form = $("#authForm");
  const submit = $("#authSubmit");
  const message = $("#authMessage");

  function showMessage(text = "", type = "info") {
    message.textContent = text;
    message.dataset.type = type;
    message.hidden = !text;
  }

  function setMode(nextMode) {
    mode = nextMode;
    const registering = mode === "register";
    $("#authEyebrow").textContent = registering ? "GET STARTED" : "WELCOME BACK";
    $("#authTitle").textContent = registering ? "Create your account" : "Sign in to Cloud Drive";
    $("#authSubtitle").textContent = registering
      ? "Create an account to access your personal workspace."
      : "Enter your details to access your personal workspace.";
    submit.textContent = registering ? "Create account" : "Sign in";
    $("#nameField").hidden = !registering;
    $("#confirmField").hidden = !registering;
    $("#authName").required = registering;
    $("#authConfirm").required = registering;
    $("#authPassword").autocomplete = registering ? "new-password" : "current-password";
    $("#loginTab").classList.toggle("active", !registering);
    $("#registerTab").classList.toggle("active", registering);
    $("#loginTab").setAttribute("aria-selected", String(!registering));
    $("#registerTab").setAttribute("aria-selected", String(registering));
    showMessage();
  }

  function redirectToDashboard() {
    if (redirecting) return;
    redirecting = true;
    showMessage();
    window.location.replace(new URL("./dashboard.html", window.location.href).href);
  }

  async function withTimeout(promise, milliseconds, messageText) {
    let timeoutId;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error(messageText)), milliseconds);
        })
      ]);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function init() {
    if (!authClient) {
      showMessage(clientState.error || "Supabase is not configured. Check frontend/supabase-config.js.", "error");
      return;
    }
    try {
      const result = await withTimeout(
        authClient.auth.getSession(),
        10000,
        "Supabase session check timed out. Check your connection and Supabase Project URL, then refresh."
      );
      if (result.error) throw result.error;
      if (result.data?.session?.user) {
        redirectToDashboard();
        return;
      }
      authClient.auth.onAuthStateChange((event, session) => {
        if (session?.user && ["SIGNED_IN", "INITIAL_SESSION", "USER_UPDATED"].includes(event)) {
          redirectToDashboard();
        }
      });
    } catch (error) {
      showMessage(error?.message || "Could not initialize sign-in. Refresh and try again.", "error");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!authClient) {
      showMessage(clientState.error || "Supabase is not configured. Check frontend/supabase-config.js.", "error");
      return;
    }
    const email = $("#authEmail").value.trim();
    const password = $("#authPassword").value;
    submit.disabled = true;
    showMessage(mode === "register" ? "Creating your account…" : "Signing you in…");
    try {
      if (mode === "register") {
        const name = $("#authName").value.trim();
        if (!name) throw new Error("Enter your name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (password !== $("#authConfirm").value) throw new Error("Passwords do not match.");
        const redirectUrl = new URL("./index.html", window.location.href).href;
        const { data, error } = await authClient.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: redirectUrl }
        });
        if (error) throw error;
        if (data?.session?.user) redirectToDashboard();
        else showMessage("Account created. Check your email to confirm it, then return here and sign in.", "success");
      } else {
        const { data, error } = await authClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.session?.user) redirectToDashboard();
        else {
          const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
          if (sessionError) throw sessionError;
          if (sessionData?.session?.user) redirectToDashboard();
          else showMessage("Sign-in returned without an active session. Confirm your email and try again.", "error");
        }
      }
    } catch (error) {
      showMessage(error?.message || "Authentication failed. Please try again.", "error");
    } finally {
      submit.disabled = false;
    }
  });

  $("#loginTab").addEventListener("click", () => setMode("login"));
  $("#registerTab").addEventListener("click", () => setMode("register"));
  $("#passwordToggle").addEventListener("click", () => {
    const input = $("#authPassword");
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    $("#passwordToggle").textContent = visible ? "Show" : "Hide";
    $("#passwordToggle").setAttribute("aria-label", visible ? "Show password" : "Hide password");
  });
  $("#googleBtn").addEventListener("click", async () => {
    if (!authClient) {
      showMessage(clientState.error || "Configure Supabase first, then enable Google in Authentication → Sign In / Providers.", "error");
      return;
    }
    try {
      const redirectUrl = new URL("./dashboard.html", window.location.href).href;
      const { error } = await authClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl }
      });
      if (error) throw error;
    } catch (error) {
      showMessage(error?.message || "Google sign-in could not start. Confirm the Google provider is configured in Supabase.", "error");
    }
  });

  setMode("login");
  init();
})();
