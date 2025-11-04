// app/api/company/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres"; // pastikan prisma client-mu di sini

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, picMitra, kontakMitra, picPartnership } = body;

    if (!name || !picMitra || !kontakMitra || !picPartnership) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: {
        name: body.name,
        pic_mitra: body.picMitra,
        kontak_mitra: body.kontakMitra,
        pic_partnership: body.picPartnership,
        logo_mitra_url: body.logo,
      },
    });

    return NextResponse.json(company);
  } catch (err) {
    console.error("❌ Error creating company:", err);
    return NextResponse.json({ error: "Gagal membuat company" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const company = await prisma.company.findMany();

    return NextResponse.json(company);
  } catch (err) {
    console.error("❌ Error get company:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
