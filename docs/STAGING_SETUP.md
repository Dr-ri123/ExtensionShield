# Staging environment setup (Supabase + deployment)

Same migrations in `supabase/migrations/` are applied to both staging and production; only the **project ref** and **env vars** differ per environment.

---

## 1. Create the staging project in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New project**.
3. Choose your organization, set a name (e.g. `extensionshield-staging`), set a DB password, and pick a region.
4. Wait for the project to be created.

---

## 2. Get the project ref

- **From the URL:**  
  After opening the project, the URL is  
  `https://supabase.com/dashboard/project/<project-ref>`  
  Copy the `<project-ref>` (e.g. `abcdefghijklmnopqrst`).

- **From project settings:**  
  **Project Settings** → **General** → **Reference ID**.

---

## 3. Push migrations to staging

From the repo root:

```bash
export SUPABASE_STAGING_REF=<your-staging-project-ref>
./scripts/supabase_push_env.sh staging
```

Or in one line:

```bash
SUPABASE_STAGING_REF=<your-staging-project-ref> ./scripts/supabase_push_env.sh staging
```

This will:

- Link the CLI to your staging project (`supabase link --project-ref <ref>`).
- Apply all migrations in `supabase/migrations/` (`supabase db push`).

For non-interactive use (e.g. CI):

```bash
SUPABASE_DB_PUSH_YES=1 SUPABASE_STAGING_REF=<ref> ./scripts/supabase_push_env.sh staging
```

---

## 4. Configure env in your staging deployment (e.g. Railway)

Your staging app needs the **same** Supabase env vars as production, but pointing at the **staging** project.

| Variable | Where to get it (Supabase dashboard) |
|----------|--------------------------------------|
| `SUPABASE_URL` | **Project Settings** → **API** → **Project URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Project Settings** → **API** → **Project API keys** → **service_role** (secret) |

Optional but recommended for staging:

| Variable | Value |
|----------|--------|
| `DB_BACKEND` | `supabase` |

**Railway (or similar):**

1. Open your **staging** service/project.
2. Go to **Variables** (or **Environment**).
3. Add (or update):
   - `SUPABASE_URL` = staging project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = staging project’s `service_role` key
   - `DB_BACKEND` = `supabase`

Use the staging project’s values only for the staging deployment; keep production’s URL and keys for the production deployment.

---

## 5. Summary

| Step | Action |
|------|--------|
| 1 | Create staging project in Supabase dashboard. |
| 2 | Copy project ref from URL or **Project Settings** → **General**. |
| 3 | Run `SUPABASE_STAGING_REF=<ref> ./scripts/supabase_push_env.sh staging`. |
| 4 | In staging deployment (e.g. Railway), set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `DB_BACKEND=supabase` from the **staging** project’s **Project Settings** → **API**. |

Same migrations, different project ref and env per environment.
