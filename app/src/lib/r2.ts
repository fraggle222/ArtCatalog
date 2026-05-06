import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, requireEnv } from "@/lib/env";

function getR2Endpoint() {
  if (env.r2Endpoint) {
    return env.r2Endpoint;
  }
  const accountId = requireEnv("R2_ACCOUNT_ID");
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function getBucketName() {
  return requireEnv("R2_BUCKET_NAME");
}

export async function uploadBufferToR2(
  storageKey: string,
  buffer: Buffer,
  contentType: string
) {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
    Body: buffer,
    ContentType: contentType,
  });
  await client.send(command);
}

export async function deleteObjectFromR2(storageKey: string) {
  const client = getR2Client();
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
  });
  await client.send(command);
}

export async function getSignedR2Url(storageKey: string) {
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
  });
  return getSignedUrl(client, command, {
    expiresIn: env.r2SignedUrlTtlSeconds,
  });
}

export function r2PlaceholderUrl(storageKey: string) {
  return `r2://${getBucketName()}/${storageKey}`;
}
