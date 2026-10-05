# Murmur: expected StackPrism links

Murmur turns podcast episodes into shareable clips. Four repos: `murmur-web` (Next.js), `murmur-api` (Fastify on Fly), `murmur-transcriber` (Python on Render) and `murmur-clipper` (renderer on Fly plus a Cloudflare Worker).

Pick order is web, api, transcriber, clipper. It matters for the shared Supabase project: the Supabase ref `qzmvhtrplkwexadnbcfo` is first used by `murmur-web`, so every other repo's database link points at web.

Machine-readable version: `expected-links.json`. Evidence is `repo/path#Lline`.

## T1: must be found (hosts)

| Key | Why | Evidence |
|---|---|---|
| `host:murmur-web->murmur-api:api.murmurclips.app` | Calls api.murmurclips.app, served by murmur-api | murmur-web/.env.example#L2, murmur-api/infra/dns.tf#L1, murmur-api/fly.toml#L1 |
| `host:murmur-api->murmur-transcriber:murmur-transcriber.onrender.com` | Calls murmur-transcriber.onrender.com, served by murmur-transcriber | murmur-api/fly.toml#L10, murmur-transcriber/render.yaml#L3 |
| `host:murmur-transcriber->murmur-api:api.murmurclips.app` | Calls api.murmurclips.app, served by murmur-api | murmur-transcriber/.env.example#L1, murmur-api/infra/dns.tf#L1, murmur-api/fly.toml#L1 |
| `host:murmur-clipper->murmur-api:api.murmurclips.app` | Calls api.murmurclips.app, served by murmur-api | murmur-clipper/fly.toml#L5, murmur-api/infra/dns.tf#L1, murmur-api/fly.toml#L1 |

## T2: must be found (managed databases)

| Key | Why | Evidence |
|---|---|---|
| `database:murmur-api->murmur-web:supabase:qzmvhtrplkwexadnbcfo` | Shares the Supabase project qzmvhtrplkwexadnbcfo with murmur-web | murmur-api/.env.example#L1, murmur-web/.env.example#L3 |
| `database:murmur-transcriber->murmur-web:supabase:qzmvhtrplkwexadnbcfo` | Shares the Supabase project qzmvhtrplkwexadnbcfo with murmur-web | murmur-transcriber/.env.example#L2, murmur-web/.env.example#L3 |

## T3: real but must NOT be found

| Key | Why it is missed | Evidence |
|---|---|---|
| `host:murmur-api->murmur-clipper:murmur-clipper.fly.dev` | URL lives only in a deploy-time secret (CLIPPER_URL via `fly secrets set`; empty in .env.example) | murmur-api/src/lib/clipper.ts#L14, murmur-clipper/fly.toml#L1 |
| `host:murmur-transcriber->murmur-clipper:murmur-clipper.fly.dev` | Python source is never selected | murmur-transcriber/app/clipper_client.py#L7, murmur-clipper/fly.toml#L1 |
| `host:murmur-web->murmur-clipper:clips.murmurclips.app` | Worker routes aren't an exposes source; DNS record is AAAA `100::` | murmur-web/.env.example#L5, murmur-clipper/edge/wrangler.toml#L4 |

## Unresolved uses (must be reported)

- murmur-web: host `clips.murmurclips.app`, host `8f3c2a1b9d7e4f60a5b1c2d3e4f5a6b7.r2.cloudflarestorage.com`
- murmur-api: host `o4507123.ingest.de.sentry.io`
- murmur-transcriber: queue `transcribe_jobs`

## Traps

- Self-URLs: `NEXT_PUBLIC_SITE_URL` (murmur-web/.env.example#L1) and `CORS_ORIGINS` (murmur-api/fly.toml#L9) name Murmur's own site; no cross-repo link may come from them.
- Credentials: `hunter2`, `s3cret`, `sk_test_51Hxxxxxxxxxxxxxxxx` in `.env.example` files (for example murmur-api/.env.example#L2-L4) are fake secrets and must never produce facts.
- `pro-annual` (murmur-web/app/api/billing/route.ts#L7, #L18) is a billing plan literal, not a queue: must produce no queue fact.
- `edge/wrangler.toml` `ORIGIN_URL` (murmur-clipper/edge/wrangler.toml#L7) is the clipper's own origin, murmur-clipper.fly.dev: a self-reference, no link.
