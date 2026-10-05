import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import * as Sentry from "@sentry/node";
import Fastify from "fastify";
import { config } from "./lib/config.js";
import { clipRoutes } from "./routes/clips.js";
import { episodeRoutes } from "./routes/episodes.js";
import { webhookRoutes } from "./routes/webhooks.js";

Sentry.init({ dsn: config.SENTRY_DSN, tracesSampleRate: 0.1 });

const app = Fastify({ logger: true });

await app.register(sensible);
await app.register(cors, {
  origin: config.CORS_ORIGINS.split(",").filter(Boolean),
  credentials: true,
});

app.get("/healthz", async () => ({ ok: true }));

await app.register(episodeRoutes, { prefix: "/episodes" });
await app.register(clipRoutes, { prefix: "/clips" });
await app.register(webhookRoutes, { prefix: "/webhooks" });

app.setErrorHandler((err, _req, reply) => {
  Sentry.captureException(err);
  reply.send(err);
});

await app.listen({ port: config.PORT, host: "0.0.0.0" });
