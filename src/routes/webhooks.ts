import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { z } from "zod";
import { config } from "../lib/config.js";
import { db } from "../lib/db.js";

const stripe = new Stripe(config.STRIPE_SECRET_KEY);

const TranscriberEvent = z.object({
  episodeId: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  durationMs: z.number().int().optional(),
});

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Stripe needs the raw body to verify the signature.
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  app.post("/transcriber", async (req, reply) => {
    if (req.headers["x-murmur-secret"] !== config.TRANSCRIBER_WEBHOOK_SECRET) {
      return reply.unauthorized();
    }
    const event = TranscriberEvent.parse(JSON.parse((req.body as Buffer).toString()));
    await db.episode.update({
      where: { id: event.episodeId },
      data: {
        status: event.status === "completed" ? "ready" : "failed",
        durationMs: event.durationMs,
      },
    });
    return reply.code(204).send();
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
