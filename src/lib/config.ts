import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(8080),
  CORS_ORIGINS: z.string().default(""),
  SUPABASE_URL: z.string(),
  TRANSCRIBER_URL: z.string(),
  TRANSCRIBER_WEBHOOK_SECRET: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  CLIPPER_URL: z.string(),
  CLIPPER_WEBHOOK_TOKEN: z.string(),
  R2_ENDPOINT: z.string(),
  R2_BUCKET: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
});

export const config = Env.parse(process.env);
