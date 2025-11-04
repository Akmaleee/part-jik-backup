import { s3, MINIO_BUCKET } from "@/lib/minio";
import { HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";

export async function ensureBucketExistsAndLog() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
    console.log(`\x1b[32m✅ MinIO connected: bucket "${MINIO_BUCKET}" found\x1b[0m`);
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") {
      await s3.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
      console.log(`\x1b[36m🪣 MinIO bucket "${MINIO_BUCKET}" created\x1b[0m`);
    } else {
      console.error("\x1b[31m❌ MinIO connection failed\x1b[0m", err);
    }
  }
}
