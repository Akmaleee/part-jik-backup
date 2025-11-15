import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";
import { NextRequest } from "next/server"; // Impor NextRequest untuk tipe

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      companyId,
      judul,
      tanggalMom,
      peserta,
      venue,
      waktu,
      content,
      approvers,
      attachments,
      nextActions,
      is_finish,
    } = body;

    // Validasi minimal
    if (!judul || !tanggalMom || !peserta || !venue || !waktu) {
      return NextResponse.json({ error: "Field wajib diisi." }, { status: 400 });
    }

    let progressRecord = await prisma.progress.create({
      data: {
        company_id: Number(companyId),
        step_id: 1, // step MOM
        status_id: is_finish === 1 ? 1 : null,
      },
    });

    // Simpan ke database
    const newMom = await prisma.mom.create({
      data: {
        company_id: Number(companyId),
        title: judul ?? "",
        date: new Date(tanggalMom),
        time: waktu,
        venue,
        count_attendees: (peserta) || null,
        content,
        progress_id: progressRecord ? progressRecord.id : null,
        
        mom_approvers: approvers?.length
        ? {
            create: approvers
              .filter((a: { approver_id: number }) => a.approver_id)
              .map((a: { approver_id: number }) => ({
                approver: {
                  connect: { id: a.approver_id },
                },
              })),
          }
        : undefined,

        attachments: attachments?.length
          ? {
              create: attachments.map((section: any) => ({
                section_name: section.sectionName || "Untitled",
                files: {
                  create: Array.isArray(section.files)
                    ? section.files
                        .filter((f: any) => f?.url) // hanya file yang sudah diupload
                        .map((file: any) => ({
                          file_name: file.file_name || file.name || "unknown",
                          url: file.url || "",
                        }))
                    : [],
                },
              })),
            }
          : undefined,

        next_actions: nextActions?.length
          ? {
              create: nextActions
                .filter(
                  (a: { action: string; target: string; pic: string }) =>
                    a.action?.trim() || a.target?.trim() || a.pic?.trim()
                )
                .map((a: { action: string; target: string; pic: string }) => ({
                  action: a.action,
                  target: a.target,
                  pic: a.pic,
                })),
            }
          : undefined,
      },
      include: {
        mom_approvers: { include: { approver: true } },
        attachments: true,
        next_actions: true, // 🆕 ikut return
      },
    });

    return NextResponse.json({
      success: true,
      message:
        is_finish === 1
          ? "MOM created & progress initialized"
          : "MOM saved successfully",
      data: newMom,
    });
  } catch (err: any) { // <-- Perbaikan tipe error ada di sini
    console.error("❌ Gagal create MOM:", err);
    if ((err as any).name === 'PrismaClientValidationError') {
         console.error("Kesalahan Validasi Prisma:", (err as any).message);
         return NextResponse.json({ error: "Kesalahan Validasi Data.", details: (err as any).message }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal membuat MOM", details: (err as any).message }, { status: 500 });
  }
}

// ========================================================================
// FUNGSI GET YANG DIPERBAIKI
// ========================================================================
export async function GET(request: NextRequest) { // Gunakan NextRequest untuk akses searchParams
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get("company_id");

    // Tentukan klausa 'where' dasar
    let whereClause: any = {
      deleted_at: null, // <-- PERBAIKAN: Hanya ambil yang deleted_at-nya null
    };

    // Jika ada company_id di parameter URL, tambahkan ke filter
    if (company_id) {
      whereClause.company_id = parseInt(company_id);
    }

    const moms = await prisma.mom.findMany({
      where: whereClause, // <-- Terapkan filter di sini
      include: {
        attachments: {
          include: {
            files: true, // ambil semua file dalam setiap attachment section
          },
        },
        company: true, // kalau mau tampilkan data perusahaan juga
        mom_approvers: { include: { approver: true } }, // contoh relasi lain
        next_actions: true, // kalau kamu mau ambil juga
        progress: {
          include: {
            step: true,
            status: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc', // optional: urutkan dari yang terbaru
      },
    });

    return NextResponse.json(moms);
  } catch (err: any) { // <-- Perbaikan tipe error
    console.error("❌ Error get mom:", err);
    return NextResponse.json({ error: "Gagal mengambil data MoM", details: err.message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     const {
//       companyId,
//       judul,
//       tanggalMom,
//       peserta,
//       venue,
//       waktu,
//       content,
//       approvers,
//       attachments,
//       nextActions,
//       is_finish,
//     } = body;

//     // Validasi minimal
//     if (!judul || !tanggalMom || !peserta || !venue || !waktu) {
//       return NextResponse.json({ error: "Field wajib diisi." }, { status: 400 });
//     }

//     let progressRecord = await prisma.progress.create({
//       data: {
//         company_id: Number(companyId),
//         step_id: 1, // step MOM
//         status_id: is_finish === 1 ? 1 : null,
//       },
//     });

//     // Simpan ke database
//     const newMom = await prisma.mom.create({
//       data: {
//         company_id: Number(companyId),
//         title: judul ?? "",
//         date: new Date(tanggalMom),
//         time: waktu,
//         venue,
//         count_attendees: (peserta) || null,
//         content,
//         progress_id: progressRecord ? progressRecord.id : null,
        
//         mom_approvers: approvers?.length
//         ? {
//             create: approvers
//               .filter((a: { approver_id: number }) => a.approver_id)
//               .map((a: { approver_id: number }) => ({
//                 approver: {
//                   connect: { id: a.approver_id },
//                 },
//               })),
//           }
//         : undefined,

//         attachments: attachments?.length
//           ? {
//               create: attachments.map((section: any) => ({
//                 section_name: section.sectionName || "Untitled",
//                 files: {
//                   create: Array.isArray(section.files)
//                     ? section.files
//                         .filter((f: any) => f?.url) // hanya file yang sudah diupload
//                         .map((file: any) => ({
//                           file_name: file.file_name || file.name || "unknown",
//                           url: file.url || "",
//                         }))
//                     : [],
//                 },
//               })),
//             }
//           : undefined,

//         next_actions: nextActions?.length
//           ? {
//               create: nextActions
//                 .filter(
//                   (a: { action: string; target: string; pic: string }) =>
//                     a.action?.trim() || a.target?.trim() || a.pic?.trim()
//                 )
//                 .map((a: { action: string; target: string; pic: string }) => ({
//                   action: a.action,
//                   target: a.target,
//                   pic: a.pic,
//                 })),
//             }
//           : undefined,
//       },
//       include: {
//         mom_approvers: { include: { approver: true } },
//         attachments: true,
//         next_actions: true, // 🆕 ikut return
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       message:
//         is_finish === 1
//           ? "MOM created & progress initialized"
//           : "MOM saved successfully",
//       data: newMom,
//     });
//   } catch (err: any) { // <-- PERBAIKAN ADA DI BARIS INI
//     console.error("❌ Gagal create MOM:", err);
//     if ((err as any).name === 'PrismaClientValidationError') {
//          console.error("Kesalahan Validasi Prisma:", (err as any).message);
//          return NextResponse.json({ error: "Kesalahan Validasi Data.", details: (err as any).message }, { status: 400 });
//     }
//     return NextResponse.json({ error: "Gagal membuat MOM", details: (err as any).message }, { status: 500 });
//   }
// }

// export async function GET() {
//   try {
//     const moms = await prisma.mom.findMany({
//       include: {
//         attachments: {
//           include: {
//             files: true, // ambil semua file dalam setiap attachment section
//           },
//         },
//         company: true, // kalau mau tampilkan data perusahaan juga
//         mom_approvers: { include: { approver: true } }, // contoh relasi lain
//         next_actions: true, // kalau kamu mau ambil juga
//         progress: {
//           include: {
//             step: true,
//             status: true,
//           },
//         },
//       },
//       orderBy: {
//         created_at: 'desc', // optional: urutkan dari yang terbaru
//       },
//     });

//     return NextResponse.json(moms);
//   } catch (err) {
//     console.error("❌ Error get mom:", err);
//     return NextResponse.json({ error: err }, { status: 500 });
//   }
// }


// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     const {
//       companyId,
//       judul,
//       tanggalMom,
//       peserta,
//       venue,
//       waktu,
//       content,
//       approvers,
//       attachments,
//       nextActions,
//       is_finish,
//     } = body;

//     // Validasi minimal
//     if (!judul || !tanggalMom || !peserta || !venue || !waktu) {
//       return NextResponse.json({ error: "Field wajib diisi." }, { status: 400 });
//     }

//     let progressRecord = await prisma.progress.create({
//       data: {
//         company_id: Number(companyId),
//         step_id: 1, // step MOM
//         status_id: is_finish === 1 ? 1 : null,
//       },
//     });

//     // Simpan ke database
//     const newMom = await prisma.mom.create({
//       data: {
//         company_id: Number(companyId),
//         title: judul ?? "",
//         date: new Date(tanggalMom),
//         time: waktu,
//         venue,
//         count_attendees: (peserta) || null,
//         content,
//         progress_id: progressRecord ? progressRecord.id : null,
        
//         approvers: approvers?.length
//           ? {
//               create: approvers
//                 .filter(
//                   (a: { name: string; email: string; type: string }) => 
//                     a.name?.trim() || a.email?.trim()
//                 )
//                 .map((a: { name: string; email: string; type: string }) => ({
//                   name: a.name,
//                   email: a.email,
//                   type: a.type,
//                 })),
//             }
//           : undefined,

//         attachments: attachments?.length
//           ? {
//               create: attachments.map((section: any) => ({
//                 section_name: section.sectionName || "Untitled",
//                 files: {
//                   create: Array.isArray(section.files)
//                     ? section.files
//                         .filter((f: any) => f?.url) // hanya file yang sudah diupload
//                         .map((file: any) => ({
//                           file_name: file.file_name || file.name || "unknown",
//                           url: file.url || "",
//                         }))
//                     : [],
//                 },
//               })),
//             }
//           : undefined,

//         next_actions: nextActions?.length
//           ? {
//               create: nextActions
//                 .filter(
//                   (a: { action: string; target: string; pic: string }) =>
//                     a.action?.trim() || a.target?.trim() || a.pic?.trim()
//                 )
//                 .map((a: { action: string; target: string; pic: string }) => ({
//                   action: a.action,
//                   target: a.target,
//                   pic: a.pic,
//                 })),
//             }
//           : undefined,
//       },
//       include: {
//         approvers: true,
//         attachments: true,
//         next_actions: true, // 🆕 ikut return
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       message:
//         is_finish === 1
//           ? "MOM created & progress initialized"
//           : "MOM saved successfully",
//       data: newMom,
//     });
//   } catch (err: any) { // <-- PERBAIKAN ADA DI BARIS INI
//     console.error("❌ Gagal create MOM:", err);
//     if ((err as any).name === 'PrismaClientValidationError') {
//          console.error("Kesalahan Validasi Prisma:", (err as any).message);
//          return NextResponse.json({ error: "Kesalahan Validasi Data.", details: (err as any).message }, { status: 400 });
//     }
//     return NextResponse.json({ error: "Gagal membuat MOM", details: (err as any).message }, { status: 500 });
//   }
// }

// export async function GET() {
//   try {
//     const moms = await prisma.mom.findMany({
//       include: {
//         attachments: {
//           include: {
//             files: true, // ambil semua file dalam setiap attachment section
//           },
//         },
//         company: true, // kalau mau tampilkan data perusahaan juga
//         approvers: true, // contoh relasi lain
//         next_actions: true, // kalau kamu mau ambil juga
//         progress: {
//           include: {
//             step: true,
//             status: true,
//           },
//         },
//       },
//       orderBy: {
//         created_at: 'desc', // optional: urutkan dari yang terbaru
//       },
//     });

//     return NextResponse.json(moms);
//   } catch (err) {
//     console.error("❌ Error get mom:", err);
//     return NextResponse.json({ error: err }, { status: 500 });
//   }
// }



// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     const {
//       companyId,
//       judul,
//       tanggalMom,
//       peserta,
//       venue,
//       waktu,
//       content,
//       approvers,
//       attachments,
//       nextActions,
//       is_finish,
//     } = body;

//     // Validasi minimal
//     if (!judul || !tanggalMom || !peserta || !venue || !waktu) {
//       return NextResponse.json({ error: "Field wajib diisi." }, { status: 400 });
//     }

//     let progressRecord = await prisma.progress.create({
//       data: {
//         company_id: Number(companyId),
//         step_id: 1, // step MOM
//         status_id: is_finish === 1 ? 1 : null,
//       },
//     });

//     // Simpan ke database
//     const newMom = await prisma.mom.create({
//       data: {
//         company_id: Number(companyId),
//         title: judul ?? "",
//         date: new Date(tanggalMom),
//         time: waktu,
//         venue,
//         count_attendees: Number(peserta) || null,
//         content,
//         progress_id: progressRecord ? progressRecord.id : null,
//         approvers: approvers?.length
//           ? {
//               create: approvers
//                 .filter((a: { name: string }) => a.name?.trim())
//                 .map((a: { name: string }) => ({ name: a.name })),
//             }
//           : undefined,

//         attachments: attachments?.length
//           ? {
//               create: attachments.map((section: any) => ({
//                 section_name: section.sectionName || "Untitled",
//                 files: {
//                   create: Array.isArray(section.files)
//                     ? section.files
//                         .filter((f: any) => f?.url) // hanya file yang sudah diupload
//                         .map((file: any) => ({
//                           file_name: file.file_name || file.name || "unknown",
//                           url: file.url || "",
//                         }))
//                     : [],
//                 },
//               })),
//             }
//           : undefined,

//         next_actions: nextActions?.length
//           ? {
//               create: nextActions
//                 .filter(
//                   (a: { action: string; target: string; pic: string }) =>
//                     a.action?.trim() || a.target?.trim() || a.pic?.trim()
//                 )
//                 .map((a: { action: string; target: string; pic: string }) => ({
//                   action: a.action,
//                   target: a.target,
//                   pic: a.pic,
//                 })),
//             }
//           : undefined,
//       },
//       include: {
//         approvers: true,
//         attachments: true,
//         next_actions: true, // 🆕 ikut return
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       message:
//         is_finish === 1
//           ? "MOM created & progress initialized"
//           : "MOM saved successfully",
//       data: newMom,
//     });
//   } catch (err) {
//     console.error("❌ Gagal create MOM:", err);
//     return NextResponse.json({ error: "Gagal membuat MOM" }, { status: 500 });
//   }
// }

// export async function GET() {
//   try {
//     const moms = await prisma.mom.findMany({
//       include: {
//         attachments: {
//           include: {
//             files: true, // ambil semua file dalam setiap attachment section
//           },
//         },
//         company: true, // kalau mau tampilkan data perusahaan juga
//         approvers: true, // contoh relasi lain
//         next_actions: true, // kalau kamu mau ambil juga
//         progress: {
//           include: {
//             step: true,
//             status: true,
//           },
//         },
//       },
//       orderBy: {
//         created_at: 'desc', // optional: urutkan dari yang terbaru
//       },
//     });

//     return NextResponse.json(moms);
//   } catch (err) {
//     console.error("❌ Error get mom:", err);
//     return NextResponse.json({ error: err }, { status: 500 });
//   }
// }