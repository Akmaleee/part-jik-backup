// instrumentation.ts
export async function register() {
  // Hanya jalan di server Node.js, bukan Edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureBucketExistsAndLog } = await import("@/lib/minio-bootstrap");
    await ensureBucketExistsAndLog();
  }
}
