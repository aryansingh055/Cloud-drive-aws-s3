(() => {
  if (window.__CLOUD_DRIVE_APP_STARTED__) return;
  window.__CLOUD_DRIVE_APP_STARTED__ = true;

// Early diagnostics: keep the auth gate from appearing to hang forever if a script or auth call fails.
window.addEventListener("error", (event) => {
  const loading = document.getElementById("dashboardLoading");
  if (!loading || loading.hidden) return;
  const title = document.getElementById("dashboardLoadingTitle");
  const message = document.getElementById("dashboardLoadingText");
  if (title) title.textContent = "Dashboard could not start";
  if (message) message.textContent = "A browser script error stopped the dashboard. Refresh once; if it continues, open F12 → Console and share the red error message.";
});
window.addEventListener("unhandledrejection", () => {
  const loading = document.getElementById("dashboardLoading");
  if (!loading || loading.hidden) return;
  const title = document.getElementById("dashboardLoadingTitle");
  const message = document.getElementById("dashboardLoadingText");
  if (title) title.textContent = "Could not verify your sign-in";
  if (message) message.textContent = "Supabase did not finish checking the session. Check your internet connection and the browser Console, then try again.";
});

const appConfig = window.CLOUD_DRIVE_APP_CONFIG || {};
const authState = window.CLOUD_DRIVE_AUTH || {};
const authClient = authState.client || null;

function safeLocalStorageGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeLocalStorageSet(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}
async function withTimeout(promise, milliseconds, message) {
  let timerId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = window.setTimeout(() => reject(new Error(message)), milliseconds);
      })
    ]);
  } finally {
    window.clearTimeout(timerId);
  }
}
function resolveApiBase() {
  const raw = safeLocalStorageGet("cloudDriveApiBase") || appConfig.apiBaseUrl || "http://localhost:3001";
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported protocol");
    return parsed.href.replace(/\/+$/, "");
  } catch { return "http://localhost:3001"; }
}

const state = {
  user: null,
  authMode: "login",
  authReady: false,
  files: [],
  selectedKeys: new Set(),
  filter: "all",
  search: "",
  sortNewest: true,
  connected: false,
  previewMode: false,
  quota: 1024 * 1024 * 1024,
  apiBase: resolveApiBase()
};

const README_URL = safeLocalStorageGet("cloudDriveReadmeUrl") || appConfig.readmeUrl || "./README.md";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
// The page-wide Supabase client is created once by supabase-client.js.
const supabaseSdkError = authState.error || (!authClient ? "Supabase client is unavailable." : "");


const els = {
  fileInput: $("#fileInput"),
  dropZone: $("#dropZone"),
  fileList: $("#fileList"),
  emptyState: $("#emptyState"),
  connectionBadge: $("#connectionBadge"),
  connectionText: $("#connectionText"),
  toast: $("#toast"),
  modal: $("#modalBackdrop"),
  settings: $("#settingsBackdrop"),
  about: $("#aboutBackdrop"),
  appShell: $("#appShell"),
  dashboardLoading: $("#dashboardLoading")
};

function showApp(user) {
  state.user = user;
  state.authReady = true;
  els.dashboardLoading.hidden = true;
  els.appShell.hidden = false;
}

function showAuth() {
  state.user = null;
  state.authReady = true;
  state.files = [];
  window.location.replace("./index.html");
}

async function signOut() {
  if (!authClient) {
    window.location.replace("./index.html");
    return;
  }
  const { error } = await authClient.auth.signOut();
  if (error) {
    showToast("Sign out failed", error.message);
    return;
  }
  closeSettings();
  window.location.replace("./index.html");
}

function formatBytes(bytes) {
  if (!bytes) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function typeOf(file) {
  const t = file.type || "";
  const ext = file.name.split(".").pop().toLowerCase();
  if (t.startsWith("image/") || ["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return "images";
  if (t.startsWith("video/") || t.startsWith("audio/") || ["mp4","mov","webm","mp3","wav"].includes(ext)) return "media";
  if (["pdf","doc","docx","txt","xls","xlsx","ppt","pptx","csv"].includes(ext) || t.includes("pdf") || t.includes("document") || t.includes("sheet")) return "documents";
  if (["zip","rar","7z","tar","gz"].includes(ext)) return "archives";
  return "other";
}

function iconFor(category) {
  const icons = {
    images: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="m4 17 5-5 3.5 3 2.5-2.5L20 17"/></svg>',
    documents: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6M9 18h4"/></svg>',
    media: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>',
    archives: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6"/></svg>',
    other: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/></svg>'
  };
  return icons[category] || icons.other;
}

function showToast(title, message) {
  $("#toastTitle").textContent = title;
  $("#toastMessage").textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 4800);
}

function openModal() { els.modal.hidden = false; }
function closeModal() { els.modal.hidden = true; }
function openSettings() { els.settings.hidden = false; }
function closeSettings() { els.settings.hidden = true; }
function openAbout() { els.about.hidden = false; }
function closeAbout() { els.about.hidden = true; }

function setConnected(value) {
  state.connected = Boolean(value);
  els.connectionBadge.classList.toggle("connected", state.connected);
  els.connectionText.textContent = state.connected ? "Connected to Cloud S3" : "Not Connected to Your Bucket";
  $("#setupBtn").innerHTML = state.connected ? "Storage connected <span>→</span>" : "Storage setup <span>→</span>";
  $("#setupBtn").setAttribute("aria-label", state.connected ? "Open storage connection details" : "Open storage setup");

  const modalTitle = $("#connectionModalTitle");
  const modalText = $("#connectionModalText");
  if (modalTitle && modalText) {
    modalTitle.textContent = state.connected ? "S3 storage connected" : "Connect your storage";
    modalText.textContent = state.connected
      ? "Your Node.js backend can reach the configured S3 bucket. You can now upload, browse, download, rename and delete files directly through this workspace."
      : "Your S3 storage is not connected right now. This guide explains the setup; the actual credentials will stay on the server side and will never be placed in the browser.";
  }
}


function updateStats() {
  const total = state.files.reduce((sum, file) => sum + file.size, 0);
  $("#fileCount").textContent = state.files.length;
  $("#headerCount").textContent = state.files.length;
  $("#usedText").textContent = `${formatBytes(total)} used`;
  $("#quotaText").textContent = "1 GB quota";
  $("#sidebarStorage").textContent = `${formatBytes(total)} / 1 GB`;
  const pct = Math.min(100, (total / state.quota) * 100);
  $("#storageFill").style.width = `${pct}%`;
  $("#sidebarProgress").style.width = `${pct}%`;

  const counts = { images: 0, documents: 0, media: 0 };
  state.files.forEach(file => { if (counts[file.category] !== undefined) counts[file.category]++; });
  $("#imageCount").textContent = counts.images;
  $("#docCount").textContent = counts.documents;
  $("#mediaCount").textContent = counts.media;

  $$(".tab").forEach(tab => {
    const filter = tab.dataset.filter;
    const count = filter === "all"
      ? state.files.length
      : state.files.filter(file => file.category === filter).length;
    const badge = tab.querySelector("span");
    if (badge) badge.textContent = count;
  });
}

function visibleFiles() {
  let result = [...state.files];
  if (state.filter !== "all") result = result.filter(file => file.category === state.filter);
  if (state.search.trim()) {
    const query = state.search.toLowerCase();
    result = result.filter(file => file.name.toLowerCase().includes(query));
  }
  result.sort((a, b) => state.sortNewest ? b.created - a.created : a.name.localeCompare(b.name));
  return result;
}

function render() {
  const files = visibleFiles();
  els.fileList.innerHTML = "";
  els.emptyState.style.display = files.length ? "none" : "block";

  files.forEach((file, index) => {
    const tr = document.createElement("tr");
    tr.className = "file-row";
    tr.style.animationDelay = `${Math.min(index * 25, 150)}ms`;
    const safeId = encodeURIComponent(file.id);
    tr.innerHTML = `
      <td class="select-col"><input type="checkbox" class="file-select-checkbox file-row-select" data-select-id="${safeId}" aria-label="Select ${escapeHtml(file.name)}" ${state.selectedKeys.has(file.id) ? "checked" : ""} ${state.previewMode ? "disabled" : ""} /></td>
      <td><div class="file-name"><span class="file-icon">${iconFor(file.category)}</span><span>${escapeHtml(file.name)}</span></div></td>
      <td>${file.category[0].toUpperCase() + file.category.slice(1)}</td>
      <td>${formatBytes(file.size)}</td>
      <td>${escapeHtml(file.createdLabel || "—")}</td>
      <td><div class="file-actions">
        <button class="small-action" data-action="view" data-id="${safeId}" ${state.previewMode ? "disabled" : ""}>View</button>
        <button class="small-action" data-action="download" data-id="${safeId}" ${state.previewMode ? "disabled" : ""}>Download</button>
        <button class="small-action" data-action="rename" data-id="${safeId}" ${state.previewMode ? "disabled" : ""}>Rename</button>
        <button class="small-action danger" data-action="delete" data-id="${safeId}" ${state.previewMode ? "disabled" : ""}>Delete</button>
      </div></td>
    `;
    els.fileList.appendChild(tr);
  });
  updateStats();
  updateSelectionUi(files);
}

function updateSelectionUi(files = visibleFiles()) {
  const selectedCount = state.selectedKeys.size;
  const deleteButton = $("#deleteSelectedBtn");
  const selectAll = $("#selectAllFiles");
  deleteButton.hidden = selectedCount === 0;
  deleteButton.disabled = state.previewMode || !state.connected || selectedCount === 0;
  deleteButton.textContent = `Delete selected (${selectedCount})`;

  const selectedVisible = files.filter(file => state.selectedKeys.has(file.id)).length;
  selectAll.checked = files.length > 0 && selectedVisible === files.length;
  selectAll.indeterminate = selectedVisible > 0 && selectedVisible < files.length;
  selectAll.disabled = state.previewMode || files.length === 0;
}

function clearSelection() {
  state.selectedKeys.clear();
  updateSelectionUi();
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!authClient) throw new Error(supabaseSdkError || "Supabase is not configured.");
  const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData?.session?.access_token) throw new Error("Your session has expired. Please sign in again.");
  headers.set("Authorization", `Bearer ${sessionData.session.access_token}`);
  const response = await fetch(`${state.apiBase}${path}`, { ...options, headers });
  let responseData = {};
  try { responseData = await response.json(); } catch {}
  if (response.status === 401) {
    state.connected = false;
    if (state.user) showToast("Session expired", "Please sign in again to continue.");
  }
  if (!response.ok) throw new Error(responseData.message || `Request failed (${response.status})`);
  return responseData;
}

async function checkConnection(showErrors = false) {
  if (state.previewMode) {
    setConnected(false);
    return false;
  }
  try {
    const data = await api("/api/storage/status");
    setConnected(data.connected === true);
    if (data.connected) {
      await loadFiles();
      if (showErrors) showToast("S3 connected", "Your configured bucket is reachable and ready for uploads.");
    } else if (showErrors) {
      showToast("S3 storage is not connected", "Start the Node.js API and configure the bucket in backend/.env.");
    }
    return data.connected === true;
  } catch (error) {
    setConnected(false);
    if (showErrors) showToast("Backend unavailable", "Start the Cloud Drive API and check the API URL in Settings.");
    return false;
  }
}

async function loadFiles() {
  const data = await api("/api/files");
  state.files = (data.files || []).map(file => ({
    ...file,
    category: typeOf(file),
    created: file.created || Date.now(),
    createdLabel: file.createdLabel || "—"
  }));
  const currentKeys = new Set(state.files.map(file => file.id));
  state.selectedKeys = new Set([...state.selectedKeys].filter(key => currentKeys.has(key)));
  render();
}

async function addFiles(fileList) {
  if (state.previewMode) {
    showToast("Local preview only", "Uploads are disabled in preview mode. Sign in and connect your S3 backend to upload files.");
    els.fileInput.value = "";
    return;
  }
  const incoming = [...fileList];
  if (!incoming.length) return;
  if (!state.connected) await checkConnection(false);
  if (!state.connected) {
    showToast("S3 storage is not connected", "Configure the Node.js backend and your private S3 bucket before uploading.");
    openModal();
    return;
  }

  const currentTotal = state.files.reduce((sum, file) => sum + file.size, 0);
  const incomingTotal = incoming.reduce((sum, file) => sum + file.size, 0);
  if (currentTotal + incomingTotal > state.quota) {
    showToast("Storage quota reached", "These files would take you above the 1 GB dashboard quota.");
    return;
  }

  try {
    showToast("Uploading files", `${incoming.length} file${incoming.length === 1 ? "" : "s"} is being uploaded to S3.`);
    for (const file of incoming) {
      const signed = await api("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size })
      });
      const uploadResponse = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": signed.contentType || file.type || "application/octet-stream" },
        body: file
      });
      if (!uploadResponse.ok) throw new Error(`Upload failed for ${file.name}`);
    }
    await loadFiles();
    showToast("Upload complete", `${incoming.length} file${incoming.length === 1 ? "" : "s"} uploaded to your S3 bucket.`);
  } catch (error) {
    showToast("Upload failed", error.message || "Could not upload to S3.");
    await checkConnection(false);
  } finally {
    els.fileInput.value = "";
  }
}

async function viewFile(id) {
  if (state.previewMode) return showToast("Local preview only", "File previews are disabled in preview mode.");
  if (!state.connected) return showToast("S3 storage is not connected", "Connect the backend before viewing files.");

  // Open a placeholder synchronously from the click handler so browser popup blockers do not
  // reject the tab after the authenticated API request completes. The tab is detached from
  // the app window before navigation and receives only a short-lived, object-scoped URL.
  const previewWindow = window.open("about:blank", "_blank");
  if (!previewWindow) {
    return showToast("Preview blocked", "Allow pop-ups for this local Cloud Drive page, then click View again.");
  }
  try {
    try { previewWindow.opener = null; } catch {}
    const data = await api(`/api/files/view?key=${encodeURIComponent(id)}`);
    previewWindow.location.href = data.url;
  } catch (error) {
    try { previewWindow.close(); } catch {}
    showToast("View failed", error.message || "This file could not be previewed. Try Download instead.");
  }
}

async function downloadFile(id) {
  if (state.previewMode) return showToast("Local preview only", "Downloads are disabled in preview mode.");
  if (!state.connected) return showToast("S3 storage is not connected", "Connect the backend before downloading files.");
  try {
    const data = await api(`/api/files/download?key=${encodeURIComponent(id)}`);
    // The presigned S3 response is signed with Content-Disposition: attachment.
    // Navigate in the current tab so the browser downloads instead of opening a new tab.
    window.location.assign(data.url);
  } catch (error) {
    showToast("Download failed", error.message || "Could not create a download link.");
  }
}

async function deleteFile(id) {
  if (state.previewMode) return showToast("Local preview only", "Deleting files is disabled in preview mode.");
  if (!state.connected) return showToast("S3 storage is not connected", "Connect the backend before deleting files.");
  const file = state.files.find(x => x.id === id);
  if (!file) return;
  try {
    await api("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: id })
    });
    state.files = state.files.filter(x => x.id !== id);
    state.selectedKeys.delete(id);
    render();
    showToast("File deleted", `${file.name} was removed from your S3 bucket.`);
  } catch (error) {
    showToast("Delete failed", error.message || "Could not delete the S3 object.");
  }
}


async function deleteSelectedFiles() {
  if (state.previewMode) return showToast("Local preview only", "Deleting files is disabled in preview mode.");
  if (!state.connected) return showToast("S3 storage is not connected", "Connect the backend before deleting files.");

  const selectedFiles = state.files.filter(file => state.selectedKeys.has(file.id));
  if (!selectedFiles.length) return;
  const confirmed = window.confirm(`Delete ${selectedFiles.length} selected file${selectedFiles.length === 1 ? "" : "s"} from your S3 bucket? This cannot be undone.`);
  if (!confirmed) return;

  const deleteButton = $("#deleteSelectedBtn");
  deleteButton.disabled = true;
  const deletedIds = new Set();
  const failures = [];

  for (const file of selectedFiles) {
    try {
      await api("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: file.id })
      });
      deletedIds.add(file.id);
      state.selectedKeys.delete(file.id);
    } catch (error) {
      failures.push({ file, message: error?.message || "Request failed." });
    }
  }

  state.files = state.files.filter(file => !deletedIds.has(file.id));
  render();

  if (failures.length) {
    const summary = `${deletedIds.size} deleted; ${failures.length} failed. ${failures[0].file.name}: ${failures[0].message}`;
    showToast("Some files could not be deleted", summary);
  } else {
    showToast("Files deleted", `${deletedIds.size} file${deletedIds.size === 1 ? "" : "s"} removed from your S3 bucket.`);
  }
}

async function renameFile(id) {
  if (state.previewMode) return showToast("Local preview only", "Renaming files is disabled in preview mode.");
  if (!state.connected) return showToast("S3 storage is not connected", "Connect the backend before renaming files.");
  const file = state.files.find(x => x.id === id);
  if (!file) return;
  const nextName = window.prompt("Enter a new file name", file.name);
  if (nextName === null) return;
  const cleanName = nextName.trim();
  if (!cleanName || cleanName === file.name) return;
  try {
    await api("/api/files/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: id, name: cleanName })
    });
    await loadFiles();
    showToast("File renamed", `${file.name} was renamed to ${cleanName}.`);
  } catch (error) {
    showToast("Rename failed", error.message || "Could not rename the S3 object.");
  }
}


$("#uploadBtn").addEventListener("click", () => state.connected ? els.fileInput.click() : openModal());
$("#heroUpload").addEventListener("click", () => state.connected ? els.fileInput.click() : openModal());
$("#browseBtn").addEventListener("click", () => state.connected ? els.fileInput.click() : openModal());
$("#emptyUpload").addEventListener("click", () => state.connected ? els.fileInput.click() : openModal());
$("#setupBtn").addEventListener("click", openModal);
$("#setupFooter").addEventListener("click", openModal);
$("#connectionBadge").addEventListener("click", () => {
  if (state.connected) showToast("S3 connected", "Your backend can reach the configured bucket.");
  else openModal();
});
$("#notificationsBtn").addEventListener("click", () => showToast("Notifications", "No new notifications right now."));
$("#storageMenuBtn").addEventListener("click", () => showToast("Storage overview", "Usage is calculated from the files currently returned by S3."));
$("#modalClose").addEventListener("click", closeModal);
$("#modalDone").addEventListener("click", closeModal);
$("#modalGuide").addEventListener("click", () => { window.location.href = README_URL; });
$("#toastClose").addEventListener("click", () => els.toast.classList.remove("show"));

$("#fileInput").addEventListener("change", e => addFiles(e.target.files));
$("#dropZone").addEventListener("dragover", e => { e.preventDefault(); els.dropZone.classList.add("dragover"); });
$("#dropZone").addEventListener("dragleave", () => els.dropZone.classList.remove("dragover"));
$("#dropZone").addEventListener("drop", e => { e.preventDefault(); els.dropZone.classList.remove("dragover"); addFiles(e.dataTransfer.files); });

$("#searchInput").addEventListener("input", e => { state.search = e.target.value; clearSelection(); render(); });
$("#sortBtn").addEventListener("click", () => {
  state.sortNewest = !state.sortNewest;
  $("#sortBtn").innerHTML = state.sortNewest ? "Recent <span>⌄</span>" : "Name <span>⌄</span>";
  render();
});

$("#tabs").addEventListener("click", e => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  state.filter = tab.dataset.filter;
  clearSelection();
  $$(".tab").forEach(x => x.classList.toggle("active", x === tab));
  render();
});

$$(".nav-item[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".nav-item[data-view]").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.dataset.view === "all" ? "all" : btn.dataset.view;
    clearSelection();
    const matching = $$(".tab").find(t => t.dataset.filter === state.filter);
    if (matching) {
      $$(".tab").forEach(x => x.classList.toggle("active", x === matching));
      render();
    } else {
      $$(".tab").forEach(x => x.classList.remove("active"));
      render();
    }
  });
});

els.fileList.addEventListener("change", e => {
  const checkbox = e.target.closest(".file-row-select");
  if (!checkbox) return;
  const id = decodeURIComponent(checkbox.dataset.selectId);
  if (checkbox.checked) state.selectedKeys.add(id);
  else state.selectedKeys.delete(id);
  updateSelectionUi();
});

$("#selectAllFiles").addEventListener("change", e => {
  const visible = visibleFiles();
  if (e.target.checked) visible.forEach(file => state.selectedKeys.add(file.id));
  else visible.forEach(file => state.selectedKeys.delete(file.id));
  render();
});

$("#deleteSelectedBtn").addEventListener("click", deleteSelectedFiles);

els.fileList.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = decodeURIComponent(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === "delete") deleteFile(id);
  else if (action === "view") viewFile(id);
  else if (action === "download") downloadFile(id);
  else if (action === "rename") renameFile(id);
});

$("#learnBtn").addEventListener("click", openModal);

// Authentication is handled on index.html; this page only verifies the existing session.
$("#logoutSettingsBtn").addEventListener("click", signOut);

// Settings
$("#settingsBtn").addEventListener("click", openSettings);
$("#settingsClose").addEventListener("click", closeSettings);
$("#aboutBtn").addEventListener("click", () => { closeSettings(); openAbout(); });
$("#aboutClose").addEventListener("click", closeAbout);
$("#aboutDone").addEventListener("click", closeAbout);
$("#howConnectBtn").addEventListener("click", () => { closeSettings(); openModal(); });

$$(".theme-choice").forEach(btn => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;
    document.body.classList.toggle("light", theme === "light");
    safeLocalStorageSet("cloudDriveTheme", theme);
    $$(".theme-choice").forEach(x => {
      const active = x === btn;
      x.classList.toggle("active", active);
      x.setAttribute("aria-pressed", String(active));
    });
  });
});

const savedTheme = safeLocalStorageGet("cloudDriveTheme");
if (savedTheme === "light") {
  document.body.classList.add("light");
  $$(".theme-choice").forEach(x => {
    const active = x.dataset.theme === "light";
    x.classList.toggle("active", active);
    x.setAttribute("aria-pressed", String(active));
  });
}

[els.modal, els.settings, els.about].forEach(backdrop => {
  backdrop.addEventListener("click", e => { if (e.target === backdrop) backdrop.hidden = true; });
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeModal(); closeSettings(); closeAbout(); }
});

async function initializeAuth() {
  const loadingTitle = $("#dashboardLoadingTitle");
  const loadingText = $("#dashboardLoadingText");
  const loginLink = $("#dashboardLoginLink");
  const localPreviewRequested = new URLSearchParams(window.location.search).get("preview") === "1";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  // Preview mode is intentionally restricted to local development hosts only.
  // It shows sample UI data and never contacts Supabase or the S3 backend.
  if (localPreviewRequested && isLocalHost) {
    state.previewMode = true;
    state.user = { email: "local-preview@cloud-drive.test", user_metadata: { full_name: "Local Preview" } };
    state.files = [
      { id: "preview-file-1", name: "Project-Architecture.pdf", size: 2457600, category: "documents", created: Date.now() - 3600000, createdLabel: "Today, 2:15 PM", archived: false },
      { id: "preview-file-2", name: "Cloud-Drive-Banner.png", size: 1843200, category: "images", created: Date.now() - 86400000, createdLabel: "Yesterday", archived: false },
      { id: "preview-file-3", name: "AWS-Notes.docx", size: 524288, category: "documents", created: Date.now() - 172800000, createdLabel: "Oct 8, 2026", archived: false },
      { id: "preview-file-4", name: "Backup-Archive.zip", size: 7340032, category: "archives", created: Date.now() - 259200000, createdLabel: "Oct 7, 2026", archived: true },
      { id: "preview-file-5", name: "Dashboard-Walkthrough.mp4", size: 12582912, category: "media", created: Date.now() - 345600000, createdLabel: "Oct 6, 2026", archived: false }
    ];
    showApp(state.user);
    setConnected(false);
    render();
    const banner = document.createElement("div");
    banner.className = "local-preview-banner";
    banner.innerHTML = '<strong>LOCAL PREVIEW</strong><span>Sample files only · Uploads and file changes are disabled</span><button type="button" aria-label="Exit preview">Exit preview</button>';
    document.body.appendChild(banner);
    banner.querySelector("button").addEventListener("click", () => { window.location.href = "./dashboard.html"; });
    return;
  }

  try {
    if (!authClient) {
      loadingTitle.textContent = "Supabase setup needed";
      loadingText.textContent = authState.error || "Check frontend/supabase-config.js and refresh this page.";
      loginLink.href = "./index.html?setup=supabase";
      return;
    }

    const { data: { session }, error } = await withTimeout(
      authClient.auth.getSession(),
      10000,
      "Session check timed out. Check your internet connection and the Supabase URL/key, then refresh."
    );
    if (error) throw error;
    if (!session?.user) {
      loadingTitle.textContent = "Please sign in first";
      loadingText.textContent = "The cloud dashboard is private. Taking you to the login page…";
      loginLink.href = "./index.html";
      window.location.replace("./index.html");
      return;
    }

    showApp(session.user);
    setConnected(false);
    render();
    await checkConnection(false);

    authClient.auth.onAuthStateChange((_event, sessionState) => {
      if (!sessionState?.user) {
        window.location.replace("./index.html");
      } else {
        state.user = sessionState.user;
      }
    });
  } catch (error) {
    loadingTitle.textContent = "Could not verify your sign-in";
    loadingText.textContent = error?.message || "Check your internet connection and Supabase Project URL/key, then return to login and try again.";
    loginLink.href = "./index.html";
  }
}

setConnected(false);
render();
initializeAuth();

})();
