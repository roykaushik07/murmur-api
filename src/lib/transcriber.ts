import { config } from "./config.js";

export type TranscriptionRequest = {
  episodeId: string;
  sourceKey: string;
  callbackPath: string;
};

/** Asks murmur-transcriber to start a job. The transcriber answers 202 and reports back via webhook. */
export async function requestTranscription(job: TranscriptionRequest): Promise<void> {
  const res = await fetch(`${config.TRANSCRIBER_URL}/v1/transcriptions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-murmur-secret": config.TRANSCRIBER_WEBHOOK_SECRET,
    },
    body: JSON.stringify(job),
  });

  if (res.status !== 202) {
    throw new Error(`transcriber rejected job ${job.episodeId}: ${res.status}`);
  }
}
