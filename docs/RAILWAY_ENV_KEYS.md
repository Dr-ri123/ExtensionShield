# Railway Environment Variables – ExtensionShield

Use this list to configure your **Railway** project. Set these in the Railway dashboard: **Project → Variables** (or **Service → Variables**).

---

## Build-time (Docker build – frontend)

These are passed as **build arguments** during `docker build`. Set them in Railway as **Variables**; they are used when building the frontend inside the image.

| Variable | Required | Description |
|----------|----------|-------------|
| **VITE_SUPABASE_URL** | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`). From Dashboard → Settings → API → Project URL. |
| **VITE_SUPABASE_ANON_KEY** | Yes | Supabase **anon** (public) key. From Dashboard → Settings → API → anon key. |
| **VITE_API_BASE_URL** | No | Optional. Leave empty when frontend is served by the same app (default). Set only if the API is on a different URL. |

---

## Runtime (backend / server)

These are read by the FastAPI app at **runtime**. Railway injects **PORT** automatically; do **not** set PORT yourself.

### Required (production with Supabase)

| Variable | Required | Description |
|----------|----------|-------------|
| **SUPABASE_URL** | Yes* | Same as VITE_SUPABASE_URL. Backend uses this for DB and Auth. |
| **SUPABASE_SERVICE_ROLE_KEY** | Yes* | **Service role** key (secret). From Dashboard → Settings → API → “API settings” → service_role. Never use anon key here. |
| **DB_BACKEND** | Yes* | Set to `supabase` when using Supabase. Omit or set to `sqlite` for SQLite (not recommended in prod). |
| **LLM_PROVIDER** | Yes | One of: `openai`, `watsonx`, `rits`, `ollama`, `groq`. |
| **OPENAI_API_KEY** | If OpenAI | Required when LLM_PROVIDER=openai or in fallback chain. |

*Required when you use Supabase for the database (recommended for production).

### LLM (choose one provider or use fallback)

| Variable | When | Description |
|----------|------|-------------|
| **OPENAI_API_KEY** | openai | OpenAI API key. |
| **LLM_MODEL** | Optional | e.g. `gpt-4o`, `gpt-4o-mini`. Defaults vary by provider. |
| **LLM_FALLBACK_CHAIN** | Optional | Comma-separated, e.g. `openai,watsonx`. |
| **LLM_PROVIDER_PRIMARY** | Optional | Override primary in fallback chain. |
| **LLM_TIMEOUT_SECONDS** | Optional | Default `25`. |
| **LLM_MAX_RETRIES_PER_PROVIDER** | Optional | Default `1`. |
| **WATSONX_API_KEY** | watsonx | IBM Watsonx API key. |
| **WATSONX_PROJECT_ID** | watsonx | Watsonx project ID. |
| **WATSONX_API_ENDPOINT** | watsonx | e.g. `https://us-south.ml.cloud.ibm.com`. |
| **RITS_API_KEY** | rits | Red Hat RITS API key. |
| **RITS_API_BASE_URL** | rits | RITS API base URL. |
| **GROQ_API_KEY** | groq | Groq API key. |
| **OLLAMA_BASE_URL** | ollama | e.g. `http://localhost:11434`. |

### Supabase (optional overrides)

| Variable | Required | Description |
|----------|----------|-------------|
| **SUPABASE_SCAN_RESULTS_TABLE** | No | Default `scan_results`. |
| **SUPABASE_JWT_AUD** | No | Default `authenticated`. |

### Application

| Variable | Required | Description |
|----------|----------|-------------|
| **PORT** | No | **Do not set.** Railway sets this automatically. |
| **ENV** / **APP_ENV** / **EXTENSION_SHIELD_ENV** | No | `local` \| `dev` \| `prod`. Affects validation and defaults. |
| **EXTENSION_STORAGE_PATH** | No | Default in Docker: `/app/extensions_storage`. |
| **DATABASE_PATH** | No | Default in Docker: `/app/data/extension-shield.db`. Used only when DB_BACKEND=sqlite. |
| **STORAGE_BACKEND** | No | `local` \| `supabase`. Default `local`. |
| **CORS_ORIGINS** | No | Comma-separated origins, or `*`. e.g. `https://extensionshield.com,https://xxx.railway.app`. |
| **CSP_REPORT_ONLY** | No | `true` to use report-only CSP. Default `false`. |
| **RATE_LIMIT_ENABLED** | No | `true` \| `false`. Default `true`. |
| **ADMIN_API_KEY** | No | Optional admin API key. |
| **TELEMETRY_ADMIN_KEY** | No | Optional telemetry admin key. |

### Optional integrations

| Variable | Required | Description |
|----------|----------|-------------|
| **VIRUSTOTAL_API_KEY** | No | VirusTotal API key for malware checks. |
| **CHROMESTATS_API_KEY** | No | Chrome Stats API key. |
| **CHROMESTATS_API_URL** | No | Default `https://chrome-stats.com`. |
| **CHROME_VERSION** | No | Default `118.0`. |

---

## Checklist for Railway

1. **Build-time (must be set before first deploy):**
   - [ ] `VITE_SUPABASE_URL`
   - [ ] `VITE_SUPABASE_ANON_KEY`

2. **Runtime – Supabase:**
   - [ ] `SUPABASE_URL` (same value as VITE_SUPABASE_URL)
   - [ ] `SUPABASE_SERVICE_ROLE_KEY`
   - [ ] `DB_BACKEND=supabase`

3. **Runtime – LLM:**
   - [ ] `LLM_PROVIDER` (e.g. `openai`)
   - [ ] `OPENAI_API_KEY` (if using OpenAI)

4. **Optional:**
   - [ ] `CORS_ORIGINS` (your production + Railway domain)
   - [ ] `ENV=production` or `APP_ENV=production`
   - [ ] `VIRUSTOTAL_API_KEY`
   - [ ] `LLM_FALLBACK_CHAIN`, `LLM_MODEL`, etc.

**Do not set:** `PORT` (Railway sets it).

See also: `scripts/check_railway_env.sh`, `.env.example`, `frontend/.env.example`, and `docs/SUPABASE_KEYS_AND_CLI.md`.
