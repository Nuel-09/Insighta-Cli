const { getApiUrl } = require("./config");
const { readCredentials, writeCredentials } = require("./store");
const { getExpMs } = require("./jwt");

const API_HEADERS = {
  "Content-Type": "application/json",
  "X-API-Version": "1"
};

async function tryRefresh(creds) {
  const api = getApiUrl();
  const res = await fetch(`${api}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: creds.refresh_token })
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.statusCode = res.status;
    throw err;
  }
  const accessExp = getExpMs(body.access_token);
  const next = {
    ...creds,
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    access_expires_at: accessExp || Date.now() + 3 * 60 * 1000
  };
  writeCredentials(next);
  return next;
}

async function ensureFreshCredentials() {
  let creds = readCredentials();
  if (!creds?.access_token || !creds?.refresh_token) {
    const err = new Error("Not logged in. Run: insighta login");
    err.code = "NOT_LOGGED_IN";
    throw err;
  }

  const exp = creds.access_expires_at || getExpMs(creds.access_token);
  const skew = 15 * 1000;
  if (exp && Date.now() > exp - skew) {
    creds = await tryRefresh(creds);
  }
  return creds;
}

async function apiFetch(path, options = {}, didRefresh = false) {
  const creds = await ensureFreshCredentials();
  const url = path.startsWith("http")
    ? path
    : `${getApiUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    ...API_HEADERS,
    Authorization: `Bearer ${creds.access_token}`,
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && creds.refresh_token && !didRefresh) {
    await tryRefresh(creds);
    return apiFetch(path, options, true);
  }
  return res;
}

async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body.message || body.status || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

module.exports = {
  getApiUrl,
  ensureFreshCredentials,
  tryRefresh,
  apiFetch,
  apiJson,
  readCredentials,
  writeCredentials,
  getExpMs,
  API_HEADERS
};
