# murmur-api

Backend for Murmur, the service that turns podcast episodes into shareable captioned clips.

Fastify 5 (TypeScript) with Prisma on the shared Supabase Postgres. Runs on Fly.io.

## How it fits

- **murmur-web** calls this API with the user's Supabase access token (verified here via JWKS).
- On episode creation the API asks **murmur-transcriber** to transcribe the audio over HTTP;
  the transcriber reports back on `/webhooks/transcriber`.
- Clip rendering is handled by **murmur-clipper**; finished clips are served from the clips CDN.
- Stripe webhooks arrive on `/webhooks/stripe` and keep the `subscriptions` table current.

## Local development

```sh
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

## Deploy

`.github/workflows/deploy.yml` builds the image, pushes it to GHCR and runs `flyctl deploy`.
DNS for the public hostname is managed with Terraform in `infra/`.
