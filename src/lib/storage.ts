import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config.js";

const r2 = new S3Client({
  region: "auto",
  endpoint: config.R2_ENDPOINT,
  credentials: {
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
  },
});

/** Short-lived GET URL so the transcriber and clipper can fetch source audio from R2. */
export function presignAudioUrl(sourceKey: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: config.R2_BUCKET, Key: sourceKey }), { expiresIn });
}
