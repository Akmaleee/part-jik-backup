export const runtime = "nodejs";        // <- WAJIB: AWS SDK v3 butuh Node, bukan Edge
export const dynamic = "force-dynamic"; // aman untuk dev

import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, MINIO_BUCKET, PUBLIC_BASE_URL } from "@/lib/minio";
import { randomUUID } from "crypto";
// (opsional) bikin bucket kalau belum ada + log koneksi
import { ensureBucketExistsAndLog } from "@/lib/minio-bootstrap";

// inisialisasi sekali saat module load
void ensureBucketExistsAndLog();

export async function POST(req: NextRequest) {
  try {
    const { mime, ext, size } = (await req.json()) as {
      mime: string; ext?: string; size?: number;
    };

    if (!mime?.startsWith("image/")) {
      return Response.json({ error: "Only images allowed" }, { status: 400 });
    }
    if (size && size > 5 * 1024 * 1024) {
      return Response.json({ error: "Max 5MB" }, { status: 413 });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const id = randomUUID();
    const safeExt = ext ? `.${ext.replace(/^\./, "")}` : "";
    const key = `jik/${today}/${id}${safeExt}`;

    const command = new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      ContentType: mime,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
    const publicUrl = `${PUBLIC_BASE_URL}/${key}`;

    return Response.json({ uploadUrl, key, publicUrl });
  } catch (e: any) {
    // >>> LOG LENGKAP DI TERMINAL
    console.error("Presign error:", {
      name: e?.name,
      message: e?.message,
      code: e?.code,
      $metadata: e?.$metadata,
      stack: e?.stack,
    });
    // >>> KIRIM BALIK DETAIL RINGKAS KE CLIENT (biar gampang debug)
    return Response.json(
      { error: "Presign failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
