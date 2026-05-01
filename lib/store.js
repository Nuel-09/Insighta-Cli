const fs = require("fs");
const path = require("path");
const { getCredentialsPath } = require("./config");

// Reads stored CLI auth state; returns null when missing/corrupt.
const readCredentials = () => {
  const p = getCredentialsPath();
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

const writeCredentials = (data) => {
  const p = getCredentialsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    // ignore on Windows
  }
};

// Used by logout and invalid-session recovery flows.
const clearCredentials = () => {
  const p = getCredentialsPath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
};

module.exports = { readCredentials, writeCredentials, clearCredentials };
