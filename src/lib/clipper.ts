import { config } from "./config.js";
import { presignAudioUrl } from "./storage.js";

export type CaptionSegment = { start: number; end: number; text: string };

/** Starts a render on murmur-clipper (times in seconds) and returns its renderId. */
export async function requestRender(input: {
  episodeId: string;
  sourceKey: string;
  start: number;
  end: number;
  segments: CaptionSegment[];
}): Promise<string> {
  const res = await fetch(`${config.CLIPPER_URL}/v1/render`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      episodeId: input.episodeId,
      audioUrl: await presignAudioUrl(input.sourceKey),
      start: input.start,
      end: input.end,
      segments: input.segments,
    }),
  });

  if (res.status !== 202) {
    throw new Error(`clipper rejected render for ${input.episodeId}: ${res.status}`);
  }
  const { renderId } = (await res.json()) as { renderId: string };
  return renderId;
}
