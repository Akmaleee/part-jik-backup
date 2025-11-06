import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";

// Helper untuk validasi
function toYears(
  d?: { amount: number; unit: "day" | "month" | "year" } | number | string | null
): number | undefined {
  if (d == null) return undefined;
  if (typeof d === "number") return Number.isFinite(d) ? d : undefined;
  if (typeof d === "string") {
    const raw = d.trim().toLowerCase();
    const m = raw.match(/^([\d.,]+)\s*([a-z\u00E0-\u017F]*)?/i);
    if (!m) return undefined;
    const num = Number(m[1].replace(",", "."));
    if (!Number.isFinite(num)) return undefined;
    const unit = (m[2] || "year").trim();
    if (/^(y|yr|year|tahun)$/i.test(unit)) return num;
    if (/^(mo|mon|month|bulan|bln)$/i.test(unit)) return num / 12;
    if (/^(d|day|hari)$/i.test(unit)) return num / 365;
    if (!unit) return num;
    return undefined;
  }
  if (typeof d === "object" && "amount" in d && "unit" in d) {
    const { amount, unit } = d;
    if (typeof amount !== "number" || !Number.isFinite(amount)) return undefined;
    switch (unit) {
      case "day": return amount / 365;
      case "month": return amount / 12;
      case "year": return amount;
      default: return undefined;
    }
  }
  return undefined;
}


// --- GET JIK BY ID ---
// Digunakan untuk halaman edit
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid JIK ID" }, { status: 400 });
    }

    const jik = await prisma.jik.findFirst({
      where: {
        id: id,
        deleted_at: null, // Hanya ambil yang belum di-soft-delete
      },
      include: {
        company: true,
        jik_approvers: true,
        progress: {
          include: {
            step: true,
            status: true,
          },
        },
      },
    });

    if (!jik) {
      return NextResponse.json({ error: "JIK not found" }, { status: 404 });
    }

    return NextResponse.json(jik);
  } catch (err: any) {
    console.error("❌ Error fetching JIK:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

// --- PATCH / UPDATE JIK BY ID ---
// Digunakan untuk menyimpan perubahan dari halaman edit
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid JIK ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      companyId,
      jikTitle,
      unitName,
      initiativePartnership,
      investValue,
      contractDuration, // Terima 'contractDuration' dari form
      jik_approvers,
      sections,
      is_finish,
      // progress_id (jika diperlukan)
    } = body;

     // Validasi minimal
    if (!companyId || !jikTitle || !unitName) {
      return NextResponse.json({ error: "Company, JIK Title, dan Unit Name wajib diisi." }, { status: 400 });
    }

    // Normalisasi data seperti di form create
    const contractDurationYears = toYears(contractDuration);

    // TODO: Update logic 'progress' jika diperlukan
    // ... (misal: cek status_id berdasarkan is_finish)

    // Update JIK
    const updatedJik = await prisma.jik.update({
      where: { id: id },
      data: {
        company_id: companyId,
        judul: jikTitle,
        nama_unit: unitName,
        initiative_partnership: initiativePartnership,
        invest_value: investValue,
        contract_duration_years: contractDurationYears,
        document_initiative: sections,
        // Hapus/Update approvers yang ada
        jik_approvers: {
          deleteMany: {}, // Hapus semua approver lama
          create: jik_approvers?.map((a: any) => ({ // Buat ulang
            name: a.name,
            jabatan: a.jabatan || null,
            nik: a.nik || null,
            type: a.type,
          })) ?? [],
        },
        // (opsional) update progress_id jika berubah
        // progress: { update: { status_id: is_finish === 1 ? 3 : null } }
      },
      include: {
        jik_approvers: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "JIK updated successfully",
      data: updatedJik,
    });

  } catch (err: any) {
    console.error("❌ Error updating JIK:", err);
    if (err.code === 'P2025') { // Prisma error code for record not found
      return NextResponse.json({ error: "JIK not found to update" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}


// --- DELETE (SOFT DELETE) JIK BY ID ---
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid JIK ID" }, { status: 400 });
    }

    // Lakukan soft delete dengan meng-update 'deleted_at'
    await prisma.jik.update({
      where: {
        id: id,
      },
      data: {
        deleted_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "JIK soft-deleted successfully",
    });
  } catch (err: any) {
    console.error("❌ Error soft-deleting JIK:", err);
    if (err.code === 'P2025') { // Prisma error code for record not found
      return NextResponse.json({ error: "JIK not found to delete" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}