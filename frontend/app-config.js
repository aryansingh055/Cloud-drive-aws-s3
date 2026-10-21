/* Public frontend configuration. These values are not secrets. */
window.CLOUD_DRIVE_APP_CONFIG = Object.freeze({
  // Local default. After deploying the backend, replace this with your Render API URL.
  apiBaseUrl: "http://localhost:3001",
  // Local README is bundled in frontend for both Live Server and Vercel root-directory deployments.
  readmeUrl: "./README.md"
});
