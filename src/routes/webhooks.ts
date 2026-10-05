import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { z } from "zod";
import { config } from "../lib/config.js";
import { db } from "../lib/db.js";

const stripe = new Stripe(config.STRIPE_SECRET_KEY);

const TOLERANCE_SECONDS = 5 * 60;

const TranscriptCompleted = z.object({
  event: z.literal("transcript.completed"),
  episodeId: z.string().uuid(),
  language: z.string(),
  segments: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })),
});

const ClipReady = z.object({
  event: z.literal("clip.ready"),
  renderId: z.string(),
  episodeId: z.string().uuid(),
  key: z.string().min(1),
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** The transcriber signs "<timestamp>.<raw body>" with HMAC-SHA256 (hex). */
function validSignature(raw: Buffer, timestamp: string | undefined, signature: string | undefined): boolean {
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", config.TRANSCRIBER_WEBHOOK_SECRET)
    .update(`${timestamp}.`)
    .update(raw)
    .digest("hex");
  return safeEqual(expected, signature);
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Signatures are computed over the raw body, so keep it as a buffer.
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  app.post("/transcriber", async (req, reply) => {
    const raw = req.body as Buffer;
    if (
      !validSignature(
        raw,
        req.headers["x-murmur-timestamp"] as string | undefined,
        req.headers["x-murmur-signature"] as string | undefined,
      )
    ) {
      return reply.unauthorized("bad signature");
    }

    let json: unknown;
    try {
      json = JSON.parse(raw.toString());
    } catch {
      return reply.badRequest("invalid JSON");
    }
    const parsed = TranscriptCompleted.safeParse(json);
    if (!parsed.success) return reply.badRequest("unexpected payload");
    const { episodeId, segments } = parsed.data;

    const durationMs = segments.length ? Math.round(Math.max(...segments.map((s) => s.end)) * 1000) : null;
    await db.$transaction([
      db.segment.deleteMany({ where: { episodeId } }),
      db.segment.createMany({
        data: segments.map((s) => ({
          episodeId,
          startMs: Math.round(s.start * 1000),
          endMs: Math.round(s.end * 1000),
          text: s.text,
        })),
      }),
      db.episode.update({ where: { id: episodeId }, data: { status: "ready", durationMs } }),
    ]);
    return reply.code(204).send();
  });

  app.post("/clipper", async (req, reply) => {
    const auth = req.headers.authorization ?? "";
    if (!safeEqual(auth, `Bearer ${config.CLIPPER_WEBHOOK_TOKEN}`)) return reply.unauthorized();

    let json: unknown;
    try {
      json = JSON.parse((req.body as Buffer).toString());
    } catch {
      return reply.badRequest("invalid JSON");
    }
    const parsed = ClipReady.safeParse(json);
    if (!parsed.success) return reply.badRequest("unexpected payload");

    const { count } = await db.clip.updateMany({
      where: { renderId: parsed.data.renderId, episodeId: parsed.data.episodeId },
      data: { status: "done", fileKey: parsed.data.key },
    });
    return count === 0 ? reply.notFound() : reply.code(204).send();
  });

  app.post("/stripe", async (req, reply) => {
    const signature = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, signature, config.STRIPE_WEBHOOK_SECRET);
    } catch {
      return reply.badRequest("bad signature");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await db.subscription.upsert({
        where: { userId: session.client_reference_id! },
        create: {
          userId: session.client_reference_id!,
          stripeCustomerId: session.customer as string,
          plan: "pro",
        },
        update: { plan: "pro" },
      });
    }
    return reply.code(204).send();
  });
};
