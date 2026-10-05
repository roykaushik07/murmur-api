import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/db.js";

const CreateClip = z.object({
  episodeId: z.string().uuid(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  style: z.enum(["bold", "minimal", "karaoke"]).default("bold"),
});

export const clipRoutes: FastifyPluginAsync = async (app) => {
  // Public: used by the share page, exposes nothing but render state.
  app.get<{ Params: { id: string } }>("/:id/public", async (req, reply) => {
    const clip = await db.clip.findUnique({ where: { id: req.params.id } });
    return clip ?? reply.notFound();
  });

  app.register(async (authed) => {
    authed.addHook("preHandler", requireUser);

    authed.get<{ Querystring: { episodeId?: string } }>("/", async (req) =>
      db.clip.findMany({
        where: { userId: req.userId, episodeId: req.query.episodeId },
        orderBy: { createdAt: "desc" },
      }),
    );

    authed.post("/", async (req, reply) => {
      const body = CreateClip.parse(req.body);
      const episode = await db.episode.findFirst({ where: { id: body.episodeId, userId: req.userId } });
      if (!episode) return reply.notFound();
      if (body.endMs <= body.startMs) return reply.badRequest("endMs must be after startMs");

      const clip = await db.clip.create({ data: { ...body, userId: req.userId } });
      return reply.code(201).send(clip);
    });
  });
};
