# Auth Setup (Supabase)

ExtensionShield uses **Supabase Auth** in the frontend and verifies access tokens on the backend via **JWKS**.

## Frontend env vars (Vite)

Set these (local dev: `frontend/.env.local`, production: your deploy env):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Example:

```bash
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon-key>"
```

## Backend env vars (FastAPI)

Backend derives JWKS from `SUPABASE_URL`:

- `SUPABASE_URL` (required for JWT verification)
- `SUPABASE_JWT_AUD` (optional, default: `authenticated`)

Example:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_JWT_AUD="authenticated"
```

## Supabase dashboard setup

In Supabase:

- Enable **Google** provider in **Authentication → Providers**
- Add your app URL(s) to **Authentication → URL Configuration**:
  - Site URL: `http://localhost:5173` (dev) and your production domain
  - Redirect URLs: include your exact origins (Supabase OAuth redirects back to `window.location.origin`)


