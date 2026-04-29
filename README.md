# Insighta CLI (`insighta`)

Global Node.js CLI for **Stage 3 (TRD)**: GitHub OAuth with **PKCE**, token storage, and profile API access.

## Install (global)

```bash
cd stage3_Cli
npm install -g .
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `INSIGHTA_API_URL` | `http://localhost:3000` | Backend base URL (never hardcode in code paths). |
| `INSIGHTA_OAUTH_PORT` | `8765` | Local callback server listens on `http://127.0.0.1:<port>/callback`. **Register this exact redirect URL** in your GitHub OAuth app (e.g. `http://127.0.0.1:8765/callback`). |

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

## CI

```bash
npm test
```

## Conventional commits

Use `type(scope): message` (e.g. `feat(auth): add PKCE login`).
