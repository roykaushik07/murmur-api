import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(8080),
  CORS_ORIGINS: z.string().default(""),
  SUPABASE_URL: z.string(),
  TRANSCRIBER_URL: z.string(),
  TRANSCRIBER_WEBHOOK_SECRET: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  SENTRY_DSN: z.string().optional(),
});

export const config = Env.parse(process.env);
