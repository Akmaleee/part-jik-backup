import { NextResponse, NextRequest } from "next/server"; // Import NextRequest
import { prisma } from "@/lib/prisma/postgres";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// --- 1. UBAH NAMA SKEMA ASLI ---
// Ini adalah skema dasar, bagus untuk 'create'
const baseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company_id: z.number().min(1, "Company is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  venue: z.string().optional(),
  count_attendees: z.string().optional(),
  content: z.any().optional(), // Tipe JSON
  approvers: z
    .array(
      z.object({
        name: z.string().min(1, "Approver name is required"),
        type: z.string().optional(),
        email: z.string().optional(),
      })
    )
    .optional(),
  next_actions: z
    .array(
      z.object({
        action: z.string().min(1, "Action is required"),
        target: z.string().min(1, "Target is required"),
        pic: z.string().min(1, "PIC is required"),
      })
    )
    .optional(),
});

// --- 2. BUAT SKEMA BARU UNTUK UPDATE ---
// Gunakan .partial() untuk membuat semua field opsional
const updateFormSchema = baseFormSchema.partial();

// GET (Mengambil 1 MOM)
export async function GET(
  request: NextRequest, // --- 3. UBAH SIGNATUR FUNGSI ---
  { params }: { params: { id: string } } // params sekarang aman diakses
) {
  try {
    const id = parseInt(params.id); // Ini sekarang aman

    const mom = await prisma.mom.findUnique({
      where: { id: id, deleted_at: null }, // Tambahkan filter soft delete
      include: {
        company: true,
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
    return NextResponse.json(mom);
  } catch (error) {
    console.error("[MOM_GET_ID] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT (Update 1 MOM)
export async function PUT(
  request: NextRequest, // --- 3. UBAH SIGNATUR FUNGSI ---
  { params }: { params: { id: string } } // params sekarang aman diakses
) {
  try {
    const id = parseInt(params.id); // Ini sekarang aman
    const body = await request.json();

    // --- 4. GUNAKAN SKEMA UPDATE (PARTIAL) ---
    const validatedData = updateFormSchema.parse(body);

    const { approvers, next_actions, ...momData } = validatedData;

    const updatedMom = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update data MOM utama
      const mom = await tx.mom.update({
        where: { id: id },
        data: {
          ...momData,
          // --- 5. TANGANI 'date' YANG MUNGKIN UNDEFINED ---
          date: momData.date ? new Date(momData.date) : undefined,
        },
      });

      // 2. Hapus/Buat approvers baru (HANYA JIKA ADA DI BODY)
      if (approvers) {
        await tx.approver.deleteMany({
          where: { mom_id: id },
        });
        await tx.approver.createMany({
          data: approvers.map((approver) => ({
            ...approver,
            mom_id: id,
          })),
        });
      }

      // 4. Hapus/Buat next_actions baru (HANYA JIKA ADA DI BODY)
      if (next_actions) {
        await tx.nextAction.deleteMany({
          where: { mom_id: id },
        });
        await tx.nextAction.createMany({
          data: next_actions.map((action) => ({
            ...action,
            mom_id: id,
          })),
        });
      }

      return mom;
    });

    return NextResponse.json(updatedMom, { status: 200 });
  } catch (error) {
    console.error("[MOM_PUT_ID] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE (Soft Delete 1 MOM)
export async function DELETE(
  request: NextRequest, // --- 3. UBAH SIGNATUR FUNGSI ---
  { params }: { params: { id: string } } // params sekarang aman diakses
) {
  try {
    const id = parseInt(params.id); // Ini sekarang aman

    const momExists = await prisma.mom.findUnique({
      where: { id: id },
    });

    if (!momExists) {
      return NextResponse.json({ error: "MOM not found" }, { status: 404 });
    }

    const softDeletedMom = await prisma.mom.update({
      where: { id: id },
      data: {
        deleted_at: new Date(),
      },
    });

    return NextResponse.json(softDeletedMom, { status: 200 });
  } catch (error) {
    console.error("[MOM_DELETE_ID] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import { Prisma } from "@prisma/client";
// import { z } from "zod";

// /**
//  * ============================================================================
//  * HANDLER GET: Mengambil satu MOM berdasarkan ID
//  * ============================================================================
//  */
// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const momId = parseInt(params.id);
//     if (isNaN(momId)) {
//       return NextResponse.json({ error: "Invalid MOM ID" }, { status: 400 });
//     }

//     const mom = await prisma.mom.findUnique({
//       where: { id: momId },
//       include: {
//         company: true,
//         progress: {
//           include: {
//             step: true,
//             status: true,
//           },
//         },
//         approvers: true,
//         next_actions: true,
//         attachments: {
//           include: {
//             files: true,
//           },
//         },
//       },
//     });

//     if (!mom) {
//       return NextResponse.json({ error: "MOM not found" }, { status: 404 });
//     }

//     const formattedAttachments = (mom.attachments || []).map((section: any) => ({
//       ...section,
//       sectionName: section.section_name,
//       files: (section.files || []).map((file: any) => ({
//         ...file,
//         fileName: file.file_name,
//       })),
//     }));

//     return NextResponse.json({ ...mom, attachments: formattedAttachments });

//   } catch (error) {
//     console.error("Error fetching MOM:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// /**
//  * ============================================================================
//  * HANDLER PUT: Meng-update MOM yang ada
//  * ============================================================================
//  */
// export async function PUT(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const momId = parseInt(params.id);
//     if (isNaN(momId)) {
//       return NextResponse.json({ error: "Invalid MOM ID" }, { status: 400 });
//     }

//     const body = await request.json();

//     const {
//       attachments,
//       approvers,
//       nextActions,
//       companyId,
//       judul,
//       tanggalMom,
//       waktu,
//       venue,
//       peserta,
//       content,
//       is_finish, // ✅ 1. Ambil flag 'is_finish' dari body
//     } = body;

//     if (!judul || !companyId || !tanggalMom || !venue) {
//       return NextResponse.json(
//         { error: "Field wajib (judul, company, tanggal, venue) harus diisi." },
//         { status: 400 }
//       );
//     }

//     const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
//       // 1. HAPUS SEMUA RELASI LAMA
//       await tx.momAttachmentFile.deleteMany({
//         where: { section: { mom_id: momId } },
//       });
//       await tx.momAttachmentSection.deleteMany({
//         where: { mom_id: momId },
//       });
//       await tx.approver.deleteMany({
//         where: { mom_id: momId },
//       });
//       await tx.nextAction.deleteMany({
//         where: { mom_id: momId },
//       });

//       // 2. UPDATE DATA UTAMA MOM & BUAT ULANG RELASI
//       const updatedMom = await tx.mom.update({
//         where: { id: momId },
//         data: {
//           title: judul,
//           company_id: Number(companyId),
//           date: new Date(tanggalMom),
//           time: waktu,
//           venue: venue,
//           count_attendees: peserta,
//           content: content,
          
//           attachments: {
//             create: (attachments ?? []).map((section: any) => ({
//               section_name: section.sectionName,
//               files: {
//                 create: (section.files ?? []).map((file: any) => ({
//                   file_name: file.file_name || file.name, 
//                   url: file.url,
//                 })),
//               },
//             })),
//           },
//           approvers: {
//             create: (approvers ?? []).map((approver: any) => ({
//               name: approver.name,
//               email: approver.email,
//               type: approver.type,
//             })),
//           },
//           next_actions: {
//             create: (nextActions ?? []).map((action: any) => ({
//               action: action.action,
//               target: action.target,
//               pic: action.pic,
//             })),
//           },
//         },
//         // Kita perlu 'progress_id' untuk langkah selanjutnya
//         include: {
//           attachments: { include: { files: true } },
//           approvers: true,
//           next_actions: true,
//           progress: true, // Pastikan 'progress_id' ter-load
//         }
//       });

//       // ✅ 2. LOGIKA BARU UNTUK UPDATE STATUS
//       // Cek jika tombol "Update & Finish" (is_finish == 1) ditekan
//       // dan MOM ini memiliki data progress (progress_id)
//       if (is_finish && updatedMom.progress_id) {
//         await tx.progress.update({
//           where: { id: updatedMom.progress_id },
//           data: {
//             // Asumsi ID 1 = "Review Mitra" (atau step pertama setelah draft)
//             step_id: 1, 
//             // Asumsi ID 1 = "Pending" (status default untuk step baru)
//             status_id: 1,
//           },
//         });
//       }

//       return updatedMom;
//     });

//     return NextResponse.json(transaction, { status: 200 });

//   } catch (error: any) {
//     console.error("Error updating MOM:", error);
//     if (error.name === 'ZodError' || error.code === 'P2023') {
//       return NextResponse.json({ error: "Data tidak valid.", details: error.message }, { status: 400 });
//     }
//     if (error.message.includes("Invalid Date")) {
//        return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
//     }
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// /**
//  * ============================================================================
//  * HANDLER DELETE: Menghapus MOM berdasarkan ID
//  * ============================================================================
//  */
// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const momId = parseInt(params.id);
//     if (isNaN(momId)) {
//       return NextResponse.json({ error: "Invalid MOM ID" }, { status: 400 });
//     }

//     await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
//       // 1. Hapus relasi
//       await tx.momAttachmentFile.deleteMany({
//         where: { section: { mom_id: momId } },
//       });
//       await tx.momAttachmentSection.deleteMany({
//         where: { mom_id: momId },
//       });
//       await tx.approver.deleteMany({
//         where: { mom_id: momId },
//       });
//       await tx.nextAction.deleteMany({
//         where: { mom_id: momId },
//       });
      
//       await tx.progress.deleteMany({
//         where: { 
//           moms: {
//             some: {
//               id: momId
//             }
//           }
//         } 
//       });
      
//       // 2. Hapus MOM utama
//       await tx.mom.delete({
//         where: { id: momId },
//       });
//     });

//     return NextResponse.json(
//       { message: "MOM berhasil dihapus" },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("Error deleting MOM:", error);
//     if (error.code === 'P2025') { // Record not found
//        return NextResponse.json({ error: "MOM tidak ditemukan" }, { status: 404 });
//     }
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
