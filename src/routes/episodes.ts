import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { requestTranscription } from "../lib/transcriber.js";

const CreateEpisode = z.object({
  title: z.string().min(1).max(200),
  sourceKey: z.string().min(1),
});

export const episodeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireUser);

  app.get("/", async (req) =>
    db.episode.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } }),
  );

  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const episode = await db.episode.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { segments: { orderBy: { startMs: "asc" } } },
    });
    return episode ?? reply.notFound();
  });

  app.post("/", async (req, reply) => {
    const body = CreateEpisode.parse(req.body);
    const episode = await db.episode.create({
      data: { userId: req.userId, title: body.title, sourceKey: body.sourceKey, status: "transcribing" },
    });

    await requestTranscription({
      episodeId: episode.id,
      sourceKey: episode.sourceKey,
      callbackPath: "/webhooks/transcriber",
    });

    return reply.code(201).send(episode);
  });
};
