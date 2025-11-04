import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";

export async function POST(req: Request) {
  try {
    const { id, type, action, current_status, url } = await req.json();

    // 🧩 Validasi
    if (!id || !action)
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });

    // 🧭 Mapping status dan step
    const STATUS_MAP: Record<string, number> = {
      Approve: 2,
      Upload: 4,
      Sign: 5,
    };

    const STEP_MAP: Record<string, number> = {
      MOM: 1,
      NDA: 2,
      JIK: 3,
      MSA: 4,
      MOU: 5,
    };

    let document_data = null;

    // 🧱 Kondisi per type
    if (type === "MOM") {
      STATUS_MAP.Send = 1;
      STATUS_MAP.Approve = 4;

      document_data = await prisma.mom.findUnique({
        where: { id },
        include: { progress: true },
      });
    }

    if (["NDA", "MOU", "MSA"].includes(type)) {
      if (current_status === "Review Legal Tsat") STATUS_MAP.Approve = 3;
      if (current_status === "Signing Mitra") STATUS_MAP.Upload = 5;
    }

    if (type === "JIK") {
      STATUS_MAP.Send = 3;
      STATUS_MAP.Upload = 5;

      document_data = await prisma.jik.findUnique({
        where: { id },
        include: { progress: true },
      });
    }

    const nextStatus = STATUS_MAP[action] || null;
    if (!nextStatus)
      return NextResponse.json({ error: "Invalid action or status map" }, { status: 400 });

    console.log("🧾 Update progress:", { id, type, action, nextStatus, current_status });

    // 🚀 Transaction atomic
    const result = await prisma.$transaction(async (tx) => {
      const new_progress = await tx.progress.create({
        data: {
          company_id: document_data.company_id,
          step_id: STEP_MAP[type],
          status_id: nextStatus,
        },
      });

      let document_record = null;

      // Kalau ada file yang di-upload
      if (url) {
        document_record = await tx.document.create({
          data: {
            progress_id: new_progress.id,
            document_url: url,
          },
        });
      }

      // Update relasi ke dokumen utama
      if (type.toUpperCase() === "JIK") {
        await tx.jik.update({
          where: { id },
          data: { progress_id: new_progress.id },
        });
      } else if (type.toUpperCase() === "MOM") {
        await tx.mom.update({
          where: { id },
          data: { progress_id: new_progress.id },
        });
      }

      return { new_progress, document_record };
    });

    // ✅ Return sukses
    return NextResponse.json({
      message: `Progress updated to progress id "${result.new_progress.id}" for ${type}`,
      id,
      type,
      action,
      document: result.document_record,
    });
  } catch (err) {
    console.error("❌ Error updating progress:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
