import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres"; // sesuaikan dengan path kamu

export async function GET() {
    try {
        const approver = await prisma.approver.findMany({});

        return NextResponse.json(approver);
    } catch (err) {
        console.error("❌ Error get approver:", err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, email, jabatan, nik } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Nama dan tipe approver wajib diisi." },
        { status: 400 }
      );
    }

    const newApprover = await prisma.approver.create({
      data: {
        name,
        type,
        email: email || null,
        jabatan: type === "internal" ? jabatan || null : null,
        nik: type === "internal" ? nik || null : null,
      },
    });

    return NextResponse.json(newApprover);
  } catch (err) {
    console.error("❌ Error create approver:", err);
    return NextResponse.json({ error: "Gagal membuat approver." }, { status: 500 });
  }
}