const path = require("path");
const os = require("os");

// Centralized CLI defaults so env overrides are easy during demos/deploys.
const getApiUrl = () => process.env.INSIGHTA_API_URL || "http://localhost:3000";

const getCallbackPort = () => Number(process.env.INSIGHTA_OAUTH_PORT || 8765);

// TRD location for persisted CLI credentials.
const getCredentialsPath = () =>
  path.join(os.homedir(), ".insighta", "credentials.json");

module.exports = { getApiUrl, getCallbackPort, getCredentialsPath };
