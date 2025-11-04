import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";
import { Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * ============================================================================
 * HANDLER GET: Mengambil satu MOM berdasarkan ID
 * ============================================================================
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const momId = parseInt(params.id);
    if (isNaN(momId)) {
      return NextResponse.json({ error: "Invalid MOM ID" }, { status: 400 });
    }

    const mom = await prisma.mom.findUnique({
      where: { id: momId },
      include: {
        company: true,
        progress: {
          include: {
            step: true,
            status: true,
          },
        },
        approvers: true,
        next_actions: true,
        attachments: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!mom) {
      return NextResponse.json({ error: "MOM not found" }, { status: 404 });
    }

    const formattedAttachments = (mom.attachments || []).map((section: any) => ({
      ...section,
      sectionName: section.section_name,
      files: (section.files || []).map((file: any) => ({
        ...file,
        fileName: file.file_name,
      })),
    }));

    return NextResponse.json({ ...mom, attachments: formattedAttachments });

  } catch (error) {
    console.error("Error fetching MOM:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * ============================================================================
 * HANDLER PUT: Meng-update MOM yang ada
 * ============================================================================
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const momId = parseInt(params.id);
    if (isNaN(momId)) {
      return NextResponse.json({ error: "Invalid MOM ID" }, { status: 400 });
    }

    const body = await request.json();

    const {
      attachments,
      approvers,
      nextActions,
      companyId,
      judul,
      tanggalMom,
      waktu,
      venue,
      peserta,
      content,
      is_finish, // ✅ 1. Ambil flag 'is_finish' dari body
    } = body;

    if (!judul || !companyId || !tanggalMom || !venue) {
      return NextResponse.json(
        { error: "Field wajib (judul, company, tanggal, venue) harus diisi." },
        { status: 400 }
      );
    }

    const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // 1. HAPUS SEMUA RELASI LAMA
      await tx.momAttachmentFile.deleteMany({
        where: { section: { mom_id: momId } },
      });
      await tx.momAttachmentSection.deleteMany({
        where: { mom_id: momId },
      });
      await tx.approver.deleteMany({
        where: { mom_id: momId },
      });
      await tx.nextAction.deleteMany({
        where: { mom_id: momId },
      });

      // 2. UPDATE DATA UTAMA MOM & BUAT ULANG RELASI
      const updatedMom = await tx.mom.update({
        where: { id: momId },
        data: {
          title: judul,
          company_id: Number(companyId),
          date: new Date(tanggalMom),
          time: waktu,
          venue: venue,
          count_attendees: peserta,
          content: content,
          
          attachments: {
            create: (attachments ?? []).map((section: any) => ({
              section_name: section.sectionName,
              files: {
                create: (section.files ?? []).map((file: any) => ({
                  file_name: file.file_name || file.name, 
                  url: file.url,
                })),
              },
            })),
          },
          approvers: {
            create: (approvers ?? []).map((approver: any) => ({
              name: approver.name,
              email: approver.email,
              type: approver.type,
            })),
          },
          next_actions: {
            create: (nextActions ?? []).map((action: any) => ({
              action: action.action,
              target: action.target,
              pic: action.pic,
            })),
          },
        },
        // Kita perlu 'progress_id' untuk langkah selanjutnya
        include: {
          attachments: { include: { files: true } },
          approvers: true,
          next_actions: true,
          progress: true, // Pastikan 'progress_id' ter-load
        }
      });

      // ✅ 2. LOGIKA BARU UNTUK UPDATE STATUS
      // Cek jika tombol "Update & Finish" (is_finish == 1) ditekan
      // dan MOM ini memiliki data progress (progress_id)
      if (is_finish && updatedMom.progress_id) {
        await tx.progress.update({
          where: { id: updatedMom.progress_id },
          data: {
            // Asumsi ID 1 = "Review Mitra" (atau step pertama setelah draft)
            step_id: 1, 
            // Asumsi ID 1 = "Pending" (status default untuk step baru)
            status_id: 1,
          },
        });
      }

      return updatedMom;
    });

    return NextResponse.json(transaction, { status: 200 });

  } catch (error: any) {
    console.error("Error updating MOM:", error);
    if (error.name === 'ZodError' || error.code === 'P2023') {
      return NextResponse.json({ error: "Data tidak valid.", details: error.message }, { status: 400 });
    }
    if (error.message.includes("Invalid Date")) {
       return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * ============================================================================
 * HANDLER DELETE: Menghapus MOM berdasarkan ID
 * ============================================================================
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const momId = parseInt(params.id);
    if (isNaN(momId)) {
      return NextResponse.json({ error: "Invalid MOM ID" }, { status: 400 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Hapus relasi
      await tx.momAttachmentFile.deleteMany({
        where: { section: { mom_id: momId } },
      });
      await tx.momAttachmentSection.deleteMany({
        where: { mom_id: momId },
      });
      await tx.approver.deleteMany({
        where: { mom_id: momId },
      });
      await tx.nextAction.deleteMany({
        where: { mom_id: momId },
      });
      
      await tx.progress.deleteMany({
        where: { 
          moms: {
            some: {
              id: momId
            }
          }
        } 
      });
      
      // 2. Hapus MOM utama
      await tx.mom.delete({
        where: { id: momId },
      });
    });

    return NextResponse.json(
      { message: "MOM berhasil dihapus" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting MOM:", error);
    if (error.code === 'P2025') { // Record not found
       return NextResponse.json({ error: "MOM tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
