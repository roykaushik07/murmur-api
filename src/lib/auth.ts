import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";

const jwks = createRemoteJWKSet(new URL(`${config.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

/** Verifies the Supabase access token sent by murmur-web and sets request.userId. */
export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.unauthorized("missing bearer token");
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, {
      issuer: `${config.SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });
    request.userId = payload.sub!;
  } catch {
    return reply.unauthorized("invalid token");
  }
}
