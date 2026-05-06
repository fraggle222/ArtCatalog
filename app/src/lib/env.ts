export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

type StorageMode = "local" | "r2";

function getStorageMode(): StorageMode {
  const mode = process.env.STORAGE_MODE ?? "local";
  if (mode !== "local" && mode !== "r2") {
    throw new Error(`Invalid STORAGE_MODE: ${mode}`);
  }
  return mode;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET,
  storageMode: getStorageMode(),
  uploadDir: process.env.UPLOAD_DIR ?? "./public/uploads",
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2BucketName: process.env.R2_BUCKET_NAME,
  r2Endpoint: process.env.R2_ENDPOINT,
  r2SignedUrlTtlSeconds: Number(process.env.R2_SIGNED_URL_TTL_SECONDS ?? "900"),
};
