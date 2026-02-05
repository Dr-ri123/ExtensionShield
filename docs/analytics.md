# Privacy-first Analytics (Pageviews)

ExtensionShield tracks **page views** without storing IPs, user IDs, or other PII.

## Storage (SQLite)

Table: `page_views_daily`

- `day` TEXT (UTC, `YYYY-MM-DD`)
- `path` TEXT (route path like `/research`)
- `count` INTEGER
- Primary key: `(day, path)`

## API

### POST `/api/telemetry/pageview`

Body:

```json
{ "path": "/research" }
```

Behavior:

- Server computes day in **UTC**
- Upserts `(day, path)` and increments `count`
- Returns `{ day, path, count }`

### GET `/api/telemetry/summary?days=14`

Returns aggregated counts:

- `by_day`: counts per day
- `by_path`: counts per path
- `rows`: raw `(day, path, count)` rows

Note: this endpoint is **open for now** (intended to be admin-only later).


