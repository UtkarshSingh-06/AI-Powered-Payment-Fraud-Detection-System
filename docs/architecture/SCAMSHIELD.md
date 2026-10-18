# ScamShield Architecture

ScamShield is an integrated threat-intelligence and online-fraud investigation capability inside FraudShield. It collects indicators from legitimate public feeds, stores append-preserving evidence, and correlates indicators with deterministic rules for analyst review.

## Scope

| In scope | Out of scope (v1) |
|----------|-------------------|
| Feed ingestion (URLhaus, OpenPhish community) | Automatic blocking / takedown |
| Normalize URL / domain / IP / hash | Fetching submitted URLs (SSRF) |
| Source observations + provenance | ML / LLM campaign detection |
| Explainable confidence | Fabricated accuracy metrics |
| Deterministic correlations | New microservices |
| Analyst API + Vite UI | Production deploy without approval |

## Active deployment path

- **API**: Express backend (`backend/`) on `/api/scamshield/*`
- **UI**: Vite React app (`frontend/`) — also the Render monolith path (`Dockerfile.render` → `SERVE_FRONTEND=true`)
- **Gateway**: `/api/*` already proxies to backend; no new gateway service required
- **DB**: PostgreSQL tables via versioned migrations in `backend/migrations/`

## Feed sources (verified)

### URLhaus (abuse.ch)

- Docs: https://urlhaus.abuse.ch/api/
- **Auth**: Free Auth-Key from https://auth.abuse.ch/ (mandatory since mid-2025)
- **Rate limit / fair use**: CSV/JSON dumps regenerate every ~5 minutes — do not poll faster
- **License**: Community API under fair-use; commercial use may require paid abuse.ch API
- Env: `URLHAUS_AUTH_KEY`

### OpenPhish Community Feed

- Source: https://github.com/openphish/public_feed (`feed.txt`)
- Update cadence: ~12 hours
- **License**: Non-commercial only per OpenPhish terms — enable only if compliant
- Env: `OPENPHISH_ENABLED=true`, optional `OPENPHISH_FEED_URL`

## Data model

- `threat_indicators` — deduped by `(indicator_type, value_normalized)`
- `source_observations` — append-preserving; unique `(source_id, source_ref, indicator_id)`
- `indicator_relationships` — rule-id + explanation + confidence
- `scamshield_investigations` / `investigation_indicators`
- `feed_ingest_runs` — idempotency keys + status

Migrations are transactional and have matching `.down.sql` files. No whole-table truncate of intelligence data.

## Correlation rules (deterministic)

1. `rule.url_hosts_domain` — URL ↔ domain
2. `rule.shared_domain` — indicators sharing a host
3. `rule.shared_payload_hash` — shared hash tags / hash indicators
4. `rule.same_campaign_tag` — distinctive non-generic tags (generic tags like `malware`/`c2` ignored)

## Security defaults

- Never automatically HTTP-fetch analyst-submitted or feed URL **targets**
- Reject private/reserved IPs, credentials-in-URL, non-http(s) schemes
- Parameterized SQL; secrets via env only
- Ingest rate-limited; confidence action is always `investigate_only`
- AuthZ: analyst/admin + `scamshield:read|write|ingest` permissions

## API (authenticated)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/scamshield/indicators` | read |
| GET | `/api/scamshield/indicators/:id` | read |
| POST | `/api/scamshield/indicators` | write (manual, no fetch) |
| POST | `/api/scamshield/ingest/:feed` | ingest |
| POST | `/api/scamshield/correlate` | write |
| CRUD | `/api/scamshield/investigations*` | read/write |

## Tests

```bash
cd backend && npm test
```

External feeds are mocked; tests do not require live threat feeds or Postgres (in-memory store when `DATABASE_URL` unset).
