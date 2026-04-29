# Insighta CLI (`insighta`)

Global Node.js CLI for **Stage 3 (TRD)**: GitHub OAuth with **PKCE**, token storage, and profile API access.

**Repository:** https://github.com/Nuel-09/Insighta-Cli  

**Production API base URL (for testing against live backend):**  
`https://hngstage-0-production.up.railway.app`

## Install (global)

```bash
git clone https://github.com/Nuel-09/Insighta-Cli.git
cd Insighta-Cli
npm install
npm install -g .
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `INSIGHTA_API_URL` | `http://localhost:3000` | Backend base URL only (scheme + host, no path). For production: `https://hngstage-0-production.up.railway.app` |
| `INSIGHTA_OAUTH_PORT` | `8765` | Local callback server listens on `http://127.0.0.1:<port>/callback`. **Register this exact redirect URL** in your GitHub OAuth app (e.g. `http://127.0.0.1:8765/callback`). |

Example session against live API:

```bash
set INSIGHTA_API_URL=https://hngstage-0-production.up.railway.app
insighta login
insighta whoami
insighta profiles list --page 1 --limit 5
```

PowerShell: `$env:INSIGHTA_API_URL="https://hngstage-0-production.up.railway.app"`

## Token handling

- Tokens are stored at **`~/.insighta/credentials.json`** (file mode `0600` where supported).
- **Access** token expiry is read from the JWT `exp` claim; before each API call the client refreshes if the access token is near expiry.
- On **401**, the client attempts one **refresh** using `POST /auth/refresh` with the stored **refresh** token, then retries the request once.
- **Logout** calls `POST /auth/logout` and deletes the credentials file.

## Commands (TRD)

**Auth**

| Command | Description |
|---------|-------------|
| `insighta login` | PKCE: local callback, browser to GitHub, `POST /auth/github/token`, save tokens. |
| `insighta logout` | Server-side refresh revocation + clear local file. |
| `insighta whoami` | `GET /api/me` with Bearer token. |

**Profiles**

| Command | Description |
|---------|-------------|
| `insighta profiles list` | Optional flags: `--gender`, `--country` (ISO2), `--age-group`, `--min-age`, `--max-age`, `--min-gender-probability`, `--min-country-probability`, `--sort-by`, `--order`, `--page`, `--limit`. |
| `insighta profiles get <id>` | Single profile. |
| `insighta profiles search "<q>"` | Natural language search; optional `--page`, `--limit`. |
| `insighta profiles create --name "..."` | Admin only. |
| `insighta profiles export --format csv` | Admin only; same filter flags as `list`; saves `profiles_<timestamp>.csv` in the **current working directory**. |

All API calls send `Authorization: Bearer` and `X-API-Version: 1`.

## Run / test / CI

```bash
npm install
npm test
```

`npm test` runs `node --check` on `cli.js` and `lib/**/*.js`.  

**GitHub Actions:** on push/PR to `main`, CI runs `npm test` (`.github/workflows/ci.yml`). Keep CI green before merging.

## Related repos & live URLs

| Repo | URL |
|------|-----|
| Backend | https://github.com/Nuel-09/HNG_STAGE-1 · Live API https://hngstage-0-production.up.railway.app |
| Web portal | https://github.com/Nuel-09/Insighta-WebPortal · Live https://insighta-webportal-production.up.railway.app |

## Conventional commits

Use `type(scope): message` (e.g. `feat(auth): add PKCE login`).
