import { NextResponse } from "next/server";
import { Client } from "minio";
import { randomUUID } from "crypto";

const minioClient = new Client({
  endPoint: "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

const BUCKET = process.env.MINIO_BUCKET!;
const ENDPOINT = process.env.MINIO_ENDPOINT!; // contoh: http://localhost:9000

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Tidak ada file yang dikirim" }, { status: 400 });
    }

    // 🧠 Kalau cuma satu file, proses langsung
    if (files.length === 1) {
      const file = files[0];
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueName = `uploads/${randomUUID()}-${file.name}`;

      await minioClient.putObject(BUCKET, uniqueName, buffer);

      const fileUrl = `${ENDPOINT}/${BUCKET}/${uniqueName}`;

      return NextResponse.json({
        file_name: file.name,
        url: fileUrl,
      });
    }

    // 🧠 Kalau multiple files, upload semua
    const uploadedFiles: { file_name: string; url: string }[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueName = `uploads/${randomUUID()}-${file.name}`;

      await minioClient.putObject(BUCKET, uniqueName, buffer);

      uploadedFiles.push({
        file_name: file.name,
        url: `${ENDPOINT}/${BUCKET}/${uniqueName}`,
      });
    }

    return NextResponse.json(uploadedFiles);
  } catch (error) {
    console.error("❌ Upload gagal:", error);
    return NextResponse.json({ error: "Gagal upload file" }, { status: 500 });
  }
}
