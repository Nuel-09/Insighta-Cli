const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");
const open = require("open");
const { getApiUrl, getCallbackPort } = require("./config");
const { generateVerifier, challengeFromVerifier } = require("./pkce");
const { writeCredentials } = require("./store");
const { getExpMs } = require("./jwt");

const openBrowser = (url) => open(url);

// Temporary localhost listener used only during OAuth login completion.
function waitForCallback(expectedState, port, timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url || "/", `http://127.0.0.1:${port}`);
        if (u.pathname !== "/callback") {
          res.writeHead(404);
          res.end();
          return;
        }
        const code = u.searchParams.get("code");
        const state = u.searchParams.get("state");
        if (!code || !state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<p>Missing code or state.</p>");
          return;
        }
        if (state !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<p>Invalid state.</p>");
          server.close();
          reject(new Error("OAuth state mismatch"));
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<p>Login complete. You can close this window.</p>");
        server.close(() => resolve(code));
      } catch (e) {
        server.close();
        reject(e);
      }
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {});

    const t = setTimeout(() => {
      server.close();
      reject(new Error("Login timed out"));
    }, timeoutMs);
    server.on("close", () => clearTimeout(t));
  });
}

async function runLogin(spinner) {
  const api = getApiUrl();
  const port = getCallbackPort();
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const state = crypto.randomBytes(24).toString("hex");
  const code_verifier = generateVerifier();
  const code_challenge = challengeFromVerifier(code_verifier);

  const authorizeUrl = new URL(`${api}/auth/github`);
  // CLI PKCE parameters are forwarded to backend /auth/github.
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", code_challenge);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);

  const waitPromise = waitForCallback(state, port);
  spinner.start("Waiting for browser login…");

  await openBrowser(authorizeUrl.toString());

  const code = await waitPromise;

  const tokenRes = await fetch(`${api}/auth/github/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier,
      redirect_uri: redirectUri
    })
  });
  const tokenText = await tokenRes.text();
  let tokenBody;
  try {
    tokenBody = JSON.parse(tokenText);
  } catch {
    throw new Error(tokenText || `Token exchange failed (${tokenRes.status})`);
  }
  if (!tokenRes.ok) {
    throw new Error(tokenBody.message || `Token exchange failed (${tokenRes.status})`);
  }

  const accessExp =
    getExpMs(tokenBody.access_token) || Date.now() + 3 * 60 * 1000;
  const username = tokenBody.user?.username || "user";

  writeCredentials({
    access_token: tokenBody.access_token,
    refresh_token: tokenBody.refresh_token,
    username,
    access_expires_at: accessExp
  });

  spinner.succeed(`Logged in as @${username}`);
}

module.exports = { runLogin };
