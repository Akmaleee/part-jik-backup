import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: "us-east-1",                       // arbitrary utk MinIO
  endpoint: process.env.MINIO_ENDPOINT!,     // contoh: http://localhost:9000
  forcePathStyle: true,                      // WAJIB utk MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "partnership";
// base url publik untuk <img src="..."> (ubah sesuai gateway/reverse proxy kamu)
export const PUBLIC_BASE_URL =
  process.env.MINIO_PUBLIC_BASE_URL || "http://localhost:9000/partnership";
