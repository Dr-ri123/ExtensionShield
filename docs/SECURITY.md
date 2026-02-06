# Security Guide

## Environment Variables & Secrets Management

### Required Environment Variables

ExtensionShield requires the following environment variables:

#### LLM Provider (Required)
- `OPENAI_API_KEY` - OpenAI API key (if using OpenAI provider)
- `WATSONX_API_KEY` - WatsonX API key (if using WatsonX provider)
- `RITS_API_KEY` - RITS API key (if using RITS provider)
- `LLM_PROVIDER` - One of: `openai`, `watsonx`, `rits`, `ollama`
- `LLM_MODEL` - Model name (e.g., `gpt-4o`)

#### Optional Integrations
- `VIRUSTOTAL_API_KEY` - VirusTotal API key for malware detection (optional)
- `SUPABASE_URL` - Supabase project URL (for production persistence)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for backend writes)
- `ADMIN_API_KEY` - Admin API key for protected endpoints

### Setting Environment Variables

#### Local Development
1. Copy the template: `cp env.production.template .env`
2. Edit `.env` and add your API keys
3. **Never commit `.env` to git** (it's already in `.gitignore`)

#### Production (Railway/Docker)
Set environment variables in your deployment platform's dashboard. Never hardcode secrets in code or configuration files.

### Rotating Exposed Keys

If you suspect your API keys have been exposed:

1. **Immediately rotate the keys**:
   - OpenAI: https://platform.openai.com/api-keys
   - VirusTotal: https://www.virustotal.com/gui/join-us
   - Supabase: https://app.supabase.com/project/_/settings/api

2. **Update your environment variables** in all environments (local, staging, production)

3. **Remove exposed keys from git history** (see below)

### Removing Secrets from Git History

If secrets were accidentally committed to git:

1. **Install git-filter-repo** (recommended):
   ```bash
   # macOS
   brew install git-filter-repo
   
   # Linux (Debian/Ubuntu)
   sudo apt install git-filter-repo
   
   # Python (universal)
   pip install git-filter-repo
   ```

2. **Remove the file from history**:
   ```bash
   git filter-repo --path images/env --invert-paths
   ```

3. **Clean up git references**:
   ```bash
   git for-each-ref --format="%(refname)" refs/original/ | xargs -r git update-ref -d
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

4. **Force push to remote** (⚠️ **WARNING**: This rewrites history):
   ```bash
   git push --force --all
   git push --force --tags
   ```

   **Important**: Coordinate with your team before force-pushing, as this rewrites git history.

### Security Best Practices

1. **Never commit secrets**:
   - Use `.env` files for local development (already in `.gitignore`)
   - Use environment variables in production
   - Use secrets management services (AWS Secrets Manager, HashiCorp Vault, etc.) for production

2. **Enable secret scanning**:
   - GitHub: Enable "Secret scanning" in repository settings
   - GitLab: Enable "Secret Detection" in CI/CD settings

3. **Use pre-commit hooks** (optional):
   ```bash
   # Install detect-secrets
   pip install detect-secrets
   
   # Scan before committing
   detect-secrets scan .env > .secrets.baseline
   ```

4. **Regular key rotation**:
   - Rotate API keys every 90 days
   - Rotate immediately if exposure is suspected

5. **Principle of least privilege**:
   - Use service-specific API keys when possible
   - Limit API key permissions to minimum required

### Files to Never Commit

The following files are already in `.gitignore`:
- `.env` and `.env.*` (except templates)
- `images/env` (never commit; should not exist in repo history; use env templates instead)
- `*.db` (database files)
- `extensions_storage/` (downloaded extensions)

### Reporting Security Issues

If you discover a security vulnerability, please email: **snorzang65@gmail.com**

Do not open a public GitHub issue for security vulnerabilities.

