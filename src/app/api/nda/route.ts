import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres"; // sesuaikan dengan path kamu

export async function GET() {
  try {
    const ndas = await prisma.progress.findMany({
      include: {
        company: true, // kalau mau tampilkan data perusahaan juga
        step: true,
        status: true,
      },
      where: {
        step: {
            name: "NDA",
        }
      },
    });

    return NextResponse.json(ndas);
  } catch (err) {
    console.error("❌ Error get mom:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}