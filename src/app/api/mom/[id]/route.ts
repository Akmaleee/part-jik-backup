// src/app/api/mom/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";

// [FUNGSI GET TETAP SAMA]
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const mom = await prisma.mom.findUnique({
      where: { id: Number(params.id) },
      include: {
        company: true,
        mom_approvers: {
          include: {
            approver: true,
          },
        },
        attachments: { include: { files: true } },
        next_actions: true,
        progress: { include: { step: true, status: true } },
      },
    });

    if (!mom) {
      return NextResponse.json({ error: "MoM not found" }, { status: 404 });
    }

    return NextResponse.json(mom);
  } catch (err) {
    console.error("❌ Error get mom by id:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// [PERBAIKAN] - FUNGSI PUT DENGAN TRANSAKSI
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const momId = Number(params.id);

  if (!momId) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const {
      company_id,
      title,
      date,
      time,
      venue,
      count_attendees,
      content,
      mom_approvers, // Array of { approverId: number }
      attachments,   // Array of { name: string, files: [{ name, url }] }
      next_actions,  // Array of { action, target, pic }
      is_finish,
    } = body;

    // [PERBAIKAN] Gunakan transaksi untuk menghapus relasi lama dengan aman
    const updatedMom = await prisma.$transaction(async (tx) => {
      
      // --- 1. FASE PENGHAPUSAN (DELETE) ---
      // Hapus "cucu" (files) terlebih dahulu
      await tx.momAttachmentFile.deleteMany({
        where: { section: { mom_id: momId } },
      });

      // Setelah cucu dihapus, aman untuk menghapus "anak" (sections)
      await tx.momAttachmentSection.deleteMany({
        where: { mom_id: momId },
      });

      // Hapus "anak" lainnya
      await tx.nextAction.deleteMany({
        where: { mom_id: momId },
      });

      await tx.momApprover.deleteMany({
        where: { mom_id: momId },
      });

      // --- 2. FASE UPDATE PROGRESS ---
      if (is_finish) {
        const existingMom = await tx.mom.findUnique({
          where: { id: momId },
          select: { progress_id: true },
        });
        if (existingMom?.progress_id) {
          await tx.progress.update({
            where: { id: existingMom.progress_id },
            data: { status_id: 2 }, // Selesai
          });
        }
      }

      // --- 3. FASE UPDATE & PEMBUATAN ULANG (UPDATE & CREATE) ---
      const mom = await tx.mom.update({
        where: { id: momId },
        data: {
          company_id: Number(company_id),
          title,
          date: new Date(date),
          time,
          venue,
          count_attendees,
          content, // Asumsi 'content' adalah JSON yang valid
          updated_at: new Date(),

          // Buat ulang semua relasi berdasarkan payload dari frontend
          
          // Buat ulang approvers
          mom_approvers: {
            create: mom_approvers.map((a: { approverId: number }) => ({
              // Pastikan nama FK_nya benar (approver_id sesuai schema)
              approver_id: a.approverId, 
            })),
          },

          // Buat ulang attachments dan files-nya
          attachments: {
            create: attachments.map((section: { name: string; files: any[] }) => ({
              section_name: section.name,
              files: {
                create: section.files.map((file: { name: string; url: string }) => ({
                  file_name: file.name,
                  url: file.url,
                })),
              },
            })),
          },

          // Buat ulang next actions
          next_actions: {
            create: next_actions.map((action: { action: string; target: string; pic: string }) => ({
              action: action.action,
              target: action.target,
              pic: action.pic,
            })),
          },
        },
        // Sertakan data yang baru dibuat untuk dikembalikan ke frontend
        include: {
          mom_approvers: { include: { approver: true } },
          attachments: { include: { files: true } },
          next_actions: true,
        },
      });

      return mom;
    }); // --- Akhir dari Transaksi ---

    return NextResponse.json({
      success: true,
      message: "MoM updated successfully",
      data: updatedMom,
    });

  } catch (err: unknown) {
    console.error("❌ Error updating MoM:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// [FUNGSI DELETE TETAP SAMA]
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Soft delete
    await prisma.mom.update({
      where: { id: Number(params.id) },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "MoM soft-deleted successfully",
    });
  } catch (err: unknown) {
    console.error("❌ Error deleting MoM:", err);
    if (err instanceof Error) {
        // Cek kode error Prisma P2025 (Record not found)
      if ((err as any).code === "P2025") {
        return NextResponse.json({ error: "MoM not found" }, { status: 404 });
      }
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma/postgres';
// import { Prisma } from '@prisma/client';

// // [GET] Handler - Mengambil data MoM untuk halaman edit
// export async function GET(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const id = parseInt(params.id); 

//     const mom = await prisma.mom.findUnique({
//       where: { id: id, deleted_at: null }, 
//       include: {
//         company: true,
//         next_actions: true,
//         attachments: {
//           include: {
//             files: true,
//           },
//         },
//         // Ambil relasi approver melalui tabel join
//         mom_approvers: {
//           include: {
//             approver: true, 
//           },
//         },
//       },
//     });

//     if (!mom) {
//       return NextResponse.json({ error: 'MOM not found' }, { status: 404 });
//     }

//     // Transformasi data agar frontend tetap bisa menerima format `approvers`
//     const { mom_approvers, ...restOfMom } = mom;
//     const responseData = {
//       ...restOfMom,
//       // Ubah mom_approvers: [{ approver: {...} }] -> approvers: [...]
//       approvers: mom_approvers.map(ma => ma.approver),
//       // Kirim juga ID approver mentah, mungkin berguna untuk form
//       approverIds: mom_approvers.map(ma => ma.approver_id),
//     };

//     return NextResponse.json(responseData, { status: 200 });

//   } catch (error: any) {
//     console.error('[MOM_GET_ID] Error:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch MOM', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// // [PUT] Handler - Menyimpan perubahan dari halaman edit
// export async function PUT(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const id = parseInt(params.id);
//     const body = await req.json();
    
//     const { 
//       company_id, 
//       title, 
//       date, 
//       time, 
//       venue, 
//       count_attendees, 
//       content, 
//       next_actions, 
//       approverIds, // Diubah dari 'approvers'
//       attachments 
//     } = body;

//     // Validasi (Sederhana)
//     if (!title || !company_id) {
//       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
//     }

//     const updatedMom = await prisma.$transaction(async (tx) => {
//       // 1. Update detail dasar Mom
//       const mom = await tx.mom.update({
//         where: { id: id },
//         data: {
//           company_id: parseInt(company_id),
//           title,
//           date: new Date(date),
//           time,
//           venue,
//           count_attendees,
//           // --- PERBAIKAN: Hapus 'as Prisma.JsonValue' ---
//           content: content, 
//           // --- AKHIR PERBAIKAN ---
//           updated_at: new Date(),
//         },
//       });

//       // 2. Handle Next Actions (Hapus yang lama, buat yang baru)
//       await tx.nextAction.deleteMany({
//         where: { mom_id: id },
//       });
//       if (next_actions && Array.isArray(next_actions) && next_actions.length > 0) {
//         await tx.nextAction.createMany({
//           data: next_actions.map((action: any) => ({
//             action: action.action,
//             target: action.target,
//             pic: action.pic,
//             mom_id: id,
//           })),
//         });
//       }

//       // 3. Handle Approvers (Hapus relasi lama, buat relasi baru)
//       await tx.momApprover.deleteMany({
//         where: { mom_id: id }
//       });

//       if (approverIds && Array.isArray(approverIds) && approverIds.length > 0) {
//         await tx.momApprover.createMany({
//           data: approverIds.map((approverId: number) => ({
//             mom_id: id,
//             approver_id: approverId
//           }))
//         });
//       }

//       // 4. Handle Attachments (Logika kompleks, hapus dan buat ulang)
//       // Hapus file lama dan section lama
//       await tx.momAttachmentFile.deleteMany({
//         where: { section: { mom_id: id } },
//       });
//       await tx.momAttachmentSection.deleteMany({
//         where: { mom_id: id },
//       });

//       // Buat section baru dan file baru
//       if (attachments && Array.isArray(attachments) && attachments.length > 0) {
//         for (const section of attachments) {
//           const createdSection = await tx.momAttachmentSection.create({
//             data: {
//               mom_id: id,
//               section_name: section.section_name,
//             },
//           });

//           if (section.files && Array.isArray(section.files) && section.files.length > 0) {
//             await tx.momAttachmentFile.createMany({
//               data: section.files.map((file: any) => ({
//                 section_id: createdSection.id,
//                 file_name: file.file_name,
//                 url: file.url,
//               })),
//             });
//           }
//         }
//       }

//       return mom;
//     });

//     return NextResponse.json(updatedMom, { status: 200 });
//   } catch (error: any) {
//     console.error('[MOM_PUT_ID] Error:', error);
//     return NextResponse.json(
//       { error: 'Failed to update MOM', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// // [DELETE] Handler - Soft delete
// export async function DELETE(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const id = parseInt(params.id);

//     // Soft delete MoM
//     await prisma.mom.update({
//       where: { id: id },
//       data: { deleted_at: new Date() },
//     });

//     return NextResponse.json({ message: 'MOM soft deleted' }, { status: 200 });
//   } catch (error: any) {
//     console.error('[MOM_DELETE_ID] Error:', error);
//     return NextResponse.json(
//       { error: 'Failed to delete MOM', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// import { NextResponse, NextRequest } from "next/server"; // Import NextRequest
// import { prisma } from "@/lib/prisma/postgres";
// import { z } from "zod";
// import { Prisma } from "@prisma/client";

// // --- 1. UBAH NAMA SKEMA ASLI ---
// // Ini adalah skema dasar, bagus untuk 'create'
// const baseFormSchema = z.object({
//   title: z.string().min(1, "Title is required"),
//   company_id: z.number().min(1, "Company is required"),
//   date: z.string().min(1, "Date is required"),
//   time: z.string().optional(),
//   venue: z.string().optional(),
//   count_attendees: z.string().optional(),
//   content: z.any().optional(), // Tipe JSON
//   approvers: z
//     .array(
//       z.object({
//         name: z.string().min(1, "Approver name is required"),
//         type: z.string().optional(),
//         email: z.string().optional(),
//       })
//     )
//     .optional(),
//   next_actions: z
//     .array(
//       z.object({
//         action: z.string().min(1, "Action is required"),
//         target: z.string().min(1, "Target is required"),
//         pic: z.string().min(1, "PIC is required"),
//       })
//     )
//     .optional(),
// });

// // --- 2. BUAT SKEMA BARU UNTUK UPDATE ---
// // Gunakan .partial() untuk membuat semua field opsional
// const updateFormSchema = baseFormSchema.partial();

// // GET (Mengambil 1 MOM)
// export async function GET(
//   request: NextRequest, // --- 3. UBAH SIGNATUR FUNGSI ---
//   { params }: { params: { id: string } } // params sekarang aman diakses
// ) {
//   try {
//     const id = parseInt(params.id); // Ini sekarang aman

//     const mom = await prisma.mom.findUnique({
//       where: { id: id, deleted_at: null }, // Tambahkan filter soft delete
//       include: {
//         company: true,
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
//     return NextResponse.json(mom);
//   } catch (error) {
//     console.error("[MOM_GET_ID] Error:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// // PUT (Update 1 MOM)
// export async function PUT(
//   request: NextRequest, // --- 3. UBAH SIGNATUR FUNGSI ---
//   { params }: { params: { id: string } } // params sekarang aman diakses
// ) {
//   try {
//     const id = parseInt(params.id); // Ini sekarang aman
//     const body = await request.json();

//     // --- 4. GUNAKAN SKEMA UPDATE (PARTIAL) ---
//     const validatedData = updateFormSchema.parse(body);

//     const { approvers, next_actions, ...momData } = validatedData;

//     const updatedMom = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
//       // 1. Update data MOM utama
//       const mom = await tx.mom.update({
//         where: { id: id },
//         data: {
//           ...momData,
//           // --- 5. TANGANI 'date' YANG MUNGKIN UNDEFINED ---
//           date: momData.date ? new Date(momData.date) : undefined,
//         },
//       });

//       // 2. Hapus/Buat approvers baru (HANYA JIKA ADA DI BODY)
//       if (approvers) {
//         await tx.approver.deleteMany({
//           where: { mom_id: id },
//         });
//         await tx.approver.createMany({
//           data: approvers.map((approver) => ({
//             ...approver,
//             mom_id: id,
//           })),
//         });
//       }

//       // 4. Hapus/Buat next_actions baru (HANYA JIKA ADA DI BODY)
//       if (next_actions) {
//         await tx.nextAction.deleteMany({
//           where: { mom_id: id },
//         });
//         await tx.nextAction.createMany({
//           data: next_actions.map((action) => ({
//             ...action,
//             mom_id: id,
//           })),
//         });
//       }

//       return mom;
//     });

//     return NextResponse.json(updatedMom, { status: 200 });
//   } catch (error) {
//     console.error("[MOM_PUT_ID] Error:", error);
//     if (error instanceof z.ZodError) {
//       return NextResponse.json({ error: error.issues }, { status: 400 });
//     }
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// // DELETE (Soft Delete 1 MOM)
// export async function DELETE(
//   request: NextRequest, // --- 3. UBAH SIGNATUR FUNGSI ---
//   { params }: { params: { id: string } } // params sekarang aman diakses
// ) {
//   try {
//     const id = parseInt(params.id); // Ini sekarang aman

//     const momExists = await prisma.mom.findUnique({
//       where: { id: id },
//     });

//     if (!momExists) {
//       return NextResponse.json({ error: "MOM not found" }, { status: 404 });
//     }

//     const softDeletedMom = await prisma.mom.update({
//       where: { id: id },
//       data: {
//         deleted_at: new Date(),
//       },
//     });

//     return NextResponse.json(softDeletedMom, { status: 200 });
//   } catch (error) {
//     console.error("[MOM_DELETE_ID] Error:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

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
