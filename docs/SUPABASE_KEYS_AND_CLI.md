# Supabase API Keys and CLI Connection

Use this to configure all Supabase keys and push migrations from the CLI.

## 1. Where to get the keys

In the Supabase dashboard (**Connect to your project** / **Project Settings → API**):

| What you need | Where to get it | Use for |
|---------------|-----------------|---------|
| **Project URL** | **API Keys** tab → "Project URL" | Backend + Frontend |
| **Anon key** (public) | **API Keys** tab → "Anon key" or "Publishable key" | Frontend auth only |
| **Service Role key** (secret) | **API settings** (link under API Keys: "For secret keys, see API settings") → copy **service_role** key | Backend + DB only (never in frontend) |

- **Project URL** looks like: `https://exmwrsrwhzvxcnhcflwb.supabase.co`
- **Project ref** (for CLI) is the subdomain: `exmwrsrwhzvxcnhcflwb`

---

## 2. Backend `.env` (project root)

Create or edit `.env` in the project root (copy from `.env.example`). For Supabase Postgres:

```env
DB_BACKEND=supabase
SUPABASE_URL=https://exmwrsrwhzvxcnhcflwb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key from API settings>
```

- Get **SUPABASE_SERVICE_ROLE_KEY** from: Dashboard → **Project Settings** → **API** → open **API settings** if needed → copy the **service_role** secret key.
- Do **not** use the anon key here. The backend must use the **service role** key to read/write scan results and run migrations.

Optional:

```env
SUPABASE_SCAN_RESULTS_TABLE=scan_results
```

---

## 3. Frontend (auth)

In `frontend/.env` or `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://exmwrsrwhzvxcnhcflwb.supabase.co
VITE_SUPABASE_ANON_KEY=<paste anon key from API Keys tab>
```

- Use the **anon** (public) key only in the frontend, never the service_role key.

---

## 4. CLI: push migrations

To push all migration files in `supabase/migrations/` to your linked project:

### Option A: Supabase CLI (recommended)

1. **Install and log in** (one-time):
   ```bash
   npx supabase login
   ```
   (Or install globally: `npm i -g supabase` then `supabase login`.)

2. **Link and push** from the project root:
   ```bash
   cd /path/to/ExtensionShield
   npx supabase link --project-ref exmwrsrwhzvxcnhcflwb
   npx supabase db push
   ```
   Use your project ref if different (the subdomain of your Project URL).

3. Or use the project script (same ref by default):
   ```bash
   ./scripts/supabase_push_env.sh prod
   ```
   For another project: `SUPABASE_PROJECT_REF=your-ref ./scripts/supabase_push_env.sh prod` or `./scripts/supabase_push_env.sh your-ref`.

### Option B: Without CLI (e.g. CI with DATABASE_URL)

If you have a direct Postgres URL and prefer not to use the CLI:

```bash
# In .env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (and optionally DATABASE_URL or SUPABASE_DB_URL)
python scripts/run_supabase_migrations.py
```

---

## 5. Checklist

- [ ] **Project URL** in backend `.env` as `SUPABASE_URL`
- [ ] **Service Role key** from API settings in backend `.env` as `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **DB_BACKEND=supabase** in backend `.env`
- [ ] **Anon key** in `frontend/.env` as `VITE_SUPABASE_ANON_KEY`
- [ ] **Project URL** in `frontend/.env` as `VITE_SUPABASE_URL`
- [ ] CLI: `npx supabase login` then `npx supabase link --project-ref <ref>` then `npx supabase db push` (or `./scripts/supabase_push_env.sh prod`)

Validate after setup:

```bash
make validate-postgres
# or
VALIDATE_EXTENSION_ID=some-id uv run python scripts/validate_postgres_local.py
```

---

## 6. Google (and GitHub) OAuth – Supabase-style setup

ExtensionShield uses **Sign in with Google** (and GitHub) via Supabase Auth. Follow [Supabase’s Login with Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

### 6.1 Google Cloud Console

1. **Google Cloud project**  
   Create or select a project at [Google Cloud Console](https://console.cloud.google.com/).

2. **OAuth client**  
   In [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (type **Web application**).

3. **Authorized JavaScript origins**  
   Add your app origins (these should match **Site URL** / redirect config in Supabase):
   - Production: `https://your-domain.com`
   - Local: `http://localhost:5173` and/or `http://127.0.0.1:5173` (use the port your frontend runs on).

4. **Authorized redirect URIs**  
   Add the **Supabase** callback URL (not your app’s `/auth/callback`):
   - **Hosted project**: get it from **Dashboard → Authentication → Providers → Google** (e.g. `https://<project-ref>.supabase.co/auth/v1/callback`).
   - **Local Supabase**: `http://127.0.0.1:54321/auth/v1/callback`.

5. **Scopes**  
   In [Data Access (Scopes)](https://console.cloud.google.com/auth/scopes): ensure `openid`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile` are configured (Supabase needs these).

6. **Client ID and Client secret**  
   Copy both; you’ll add them in Supabase (and for local, in env).

### 6.2 Supabase Dashboard (hosted project)

1. **Authentication → Providers → Google**  
   Enable Google and paste **Client ID** and **Client Secret**.

2. **Redirect URLs**  
   In **Authentication → URL Configuration**, add the URLs where your app is allowed to receive the post-login redirect (our app uses a single callback route):
   - Production: `https://your-domain.com/auth/callback`
   - Local: `http://localhost:5173/auth/callback` and/or `http://127.0.0.1:5173/auth/callback` (match your frontend origin and port).

3. **Site URL**  
   Set to your main app URL (e.g. `https://your-domain.com` or `http://localhost:5173` for local).

### 6.3 Local development (Supabase running via CLI)

When using **local** Supabase (`supabase start`), the Google provider is configured in `supabase/config.toml` and env:

1. In project root `.env` (create from `.env.example`), add:
   ```env
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   ```

2. `supabase/config.toml` already contains:
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
   skip_nonce_check = false
   ```

3. In **Google Cloud Console**, for the same OAuth client, add the **local** Supabase callback as an authorized redirect URI: `http://127.0.0.1:54321/auth/v1/callback`.

4. Restart local Supabase after changing config or env:
   ```bash
   npx supabase stop
   npx supabase start
   ```

### 6.4 Verify from terminal

- **Hosted project**  
  No CLI flag to “verify” Google provider; confirm in **Dashboard → Authentication → Providers** that Google is enabled and Client ID is set.

- **Local project**  
  Ensure config is loaded and Auth is running (Docker must be running for `supabase start`):
  ```bash
  npx supabase status
  ```
  You should see `API URL: http://127.0.0.1:54321` and no errors. If you see warnings like `environment variable is unset: SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, add those variables to your root `.env` before running `supabase start`. Then try signing in with Google in the app; if the redirect or token exchange fails, check:
  - Redirect URLs in Dashboard (hosted) or that you’re using `http://127.0.0.1:54321/auth/v1/callback` in Google Console for local.
  - Browser console and network tab for the `/auth/v1/callback` and `/auth/callback` requests.

- **Application code**  
  The app uses the PKCE flow: `signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback' } })` and exchanges the code on `/auth/callback` with `exchangeCodeForSession(code)`. No extra terminal step is required for this; verification is “sign in with Google” in the UI.

---

## 7. Auto sign-out after 15 minutes (session timeout)

ExtensionShield signs users out automatically **15 minutes after sign-in** so sessions don’t stay open indefinitely.

- **How it works (all plans)**  
  The frontend records “session started at” when the user signs in and runs a timer. After 15 minutes it calls `signOut()`, so the user must sign in again. This works for Google, GitHub, and email sign-in.

- **Optional: Supabase Dashboard (Pro plan)**  
  For server-enforced limits as well, use **Authentication → Configuration → Sessions** in the [Supabase Dashboard](https://supabase.com/dashboard/project/_/auth/sessions). You can set:
  - **Time-box user sessions** – e.g. 15 minutes so sessions end after a fixed time.
  - **Inactivity timeout** – end sessions that haven’t been refreshed within a duration.

  Session checks run when the session is refreshed (e.g. on the next API call), so the effective duration can be “timeout + JWT expiry”. See [User sessions](https://supabase.com/docs/guides/auth/sessions) for details.
