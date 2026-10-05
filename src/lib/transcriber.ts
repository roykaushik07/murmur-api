import { config } from "./config.js";
import { presignAudioUrl } from "./storage.js";

/** Asks murmur-transcriber to start a job. It answers 202 and reports back on /webhooks/transcriber. */
export async function requestTranscription(episodeId: string, sourceKey: string): Promise<void> {
  const res = await fetch(`${config.TRANSCRIBER_URL}/v1/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ episode_id: episodeId, audio_url: await presignAudioUrl(sourceKey) }),
  });

  if (res.status !== 202) {
    throw new Error(`transcriber rejected job ${episodeId}: ${res.status}`);
  }
}
