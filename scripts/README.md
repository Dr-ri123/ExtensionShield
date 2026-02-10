# Scripts Directory

Essential production and deployment scripts for ExtensionShield.

## 📋 Current Scripts

### 🚀 Production & Deployment
- **`start_api.sh`** - Starts the API server (production)
- **`deploy.sh`** - Deploys to Railway
- **`sync_railway_env.sh`** - Syncs local .env to Railway environment
- **`check_railway_env.sh`** - Validates Railway environment variables (used in Makefile)

### 🔒 Security & CSP
- **`setup-production-csp.sh`** - Builds frontend and sets up CSP for production
- **`verify-csp.sh`** - Comprehensive CSP verification (dev & production)
- **`security_smoke.sh`** - Security smoke tests

### 🗄️ Database
- **`supabase_push_env.sh`** - Same link + db push for **staging** and **prod** (run for each environment)
- **`run_supabase_migrations.py`** - Runs Supabase migrations (used by start_api.sh when CLI not used)
- **`lint_migrations.py`** - Validates migration files

## 🧹 Cleanup Summary

**Removed test/experimental scripts:**
- `test_watson_connection.py` - Test script
- `test_report_view_model_assertions.py` - Test script
- `test_validation.py` - Test script
- `validate_privacy_compliance_context.py` - Test script
- `generate_ui_report_payload.py` - Test data generator
- `check_extension_sast.py` - Analysis tool
- `analyze_extension_patterns.py` - Analysis tool

**Removed freelancer management scripts:**
- `create_freelancer_repo.sh` - Large one-time setup script
- `merge_freelancer_changes.sh` - Simple git helper
- `validate_submission.py` - Submission validator

**Consolidated CSP scripts:**
- Removed `test-csp-production.sh` (functionality covered by `verify-csp.sh`)

## 📝 Usage

### Start API
```bash
./scripts/start_api.sh
```

### Supabase (staging & production)
```bash
./scripts/supabase_push_env.sh prod
SUPABASE_STAGING_REF=<staging-ref> ./scripts/supabase_push_env.sh staging
```
See [docs/DATABASE_README.md](../docs/DATABASE_README.md) for details.

### Deploy to Railway
```bash
./scripts/deploy.sh
```

### Check Railway Environment
```bash
./scripts/check_railway_env.sh
```

### Setup Production CSP
```bash
./scripts/setup-production-csp.sh
./scripts/verify-csp.sh
```

