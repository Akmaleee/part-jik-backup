import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, fileUrl, step_name } = body;

    const STEP_MAP: Record<string, number> = {
      MOM: 1,
      NDA: 2,
      JIK: 3,
      MSA: 4,
      MOU: 5,
    };

    if (!companyId || !fileUrl) {
      return NextResponse.json(
        { error: "companyId dan fileUrl wajib diisi" },
        { status: 400 }
      );
    }

    // 🔍 Cek apakah company ada
    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company tidak ditemukan" },
        { status: 404 }
      );
    }

    // 🔍 Ambil progress milik company (bisa ambil yang terakhir)
    // let progress = await prisma.progress.findFirst({
    //   where: { company_id: Number(companyId) },
    //   orderBy: { id: "desc" },
    // });

    // // Jika belum ada progress, buat baru
    // if (!progress) {
    //   progress = await prisma.progress.create({
    //     data: {
    //       company_id: Number(companyId),
    //     },
    //   });
    // }

    let progress = await prisma.progress.create({
        data: {
            company_id: Number(companyId),
            step_id: STEP_MAP[step_name as keyof typeof STEP_MAP] ?? null,  // get step id based on step_name
            status_id: 1,
        },
    });

    // 📝 Simpan dokumen ke tabel Document
    const document = await prisma.document.create({
      data: {
        progress_id: progress.id,
        document_url: fileUrl,
      },
      include: {
        progress: {
          include: {
            company: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Dokumen berhasil disimpan",
        data: document,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error create document:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server", details: String(error) },
      { status: 500 }
    );
  }
}


// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { companyId, fileUrl } = body;

//     if (!companyId || !fileUrl) {
//       return NextResponse.json(
//         { error: "companyId dan fileUrl wajib diisi" },
//         { status: 400 }
//       );
//     }

//     // 🔍 Cek apakah company ada
//     const company = await prisma.company.findUnique({
//       where: { id: Number(companyId) },
//     });

//     if (!company) {
//       return NextResponse.json(
//         { error: "Company tidak ditemukan" },
//         { status: 404 }
//       );
//     }

//     // 🔍 Ambil progress milik company (bisa ambil yang terakhir)
//     // let progress = await prisma.progress.findFirst({
//     //   where: { company_id: Number(companyId) },
//     //   orderBy: { id: "desc" },
//     // });

//     // // Jika belum ada progress, buat baru
//     // if (!progress) {
//     //   progress = await prisma.progress.create({
//     //     data: {
//     //       company_id: Number(companyId),
//     //     },
//     //   });
//     // }

//     let progress = await prisma.progress.create({
//         data: {
//             company_id: Number(companyId),
//             step_id: 2, // step NDA
//             status_id: 1,
//         },
//     });

//     // 📝 Simpan dokumen ke tabel Document
//     const document = await prisma.document.create({
//       data: {
//         progress_id: progress.id,
//         document_url: fileUrl,
//       },
//       include: {
//         progress: {
//           include: {
//             company: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(
//       {
//         message: "Dokumen berhasil disimpan",
//         data: document,
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error("❌ Error create document:", error);
//     return NextResponse.json(
//       { error: "Terjadi kesalahan server", details: String(error) },
//       { status: 500 }
//     );
//   }
// }
