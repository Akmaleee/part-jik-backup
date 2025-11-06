import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres"; // sesuaikan dengan path kamu

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      companyId,
      jikTitle,
      unitName,
      initiativePartnership,
      investValue,
      contractDurationYears,
      jik_approvers,
      sections,
      is_finish,
    } = body;

    let progressRecord = await prisma.progress.create({
      data: {
        company_id: Number(companyId),
        step_id: 3, // step JIK
        status_id: is_finish === 1 ? 3 : null,
      },
    });

    // Simpan ke PostgreSQL
    const jik = await prisma.jik.create({
      data: {
        company_id: companyId,
        judul: jikTitle,
        nama_unit: unitName,
        initiative_partnership: initiativePartnership,
        invest_value: investValue,
        contract_duration_years: contractDurationYears,
        // Simpan sections sebagai JSON (kolom jsonb)
        document_initiative: sections,
        progress_id: progressRecord ? progressRecord.id : null,
        jik_approvers: {
          // 3️⃣ Sekaligus insert approvers
          create:
            jik_approvers?.map((a: any) => ({
              name: a.name,
              jabatan: a.jabatan || null,
              nik: a.nik || null,
              type: a.type,
            })) ?? [],
        },
      },
      include: {
        jik_approvers: true,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        is_finish === 1
          ? "JIK created & progress initialized"
          : "JIK saved successfully",
      data: jik,
    });
  } catch (err) {
    console.error("❌ Error saving JIK document:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const jiks = await prisma.jik.findMany({
      // --- PERUBAHAN DI SINI ---
      where: {
        deleted_at: null, // Hanya ambil JIK yang belum di soft-delete
      },
      // --- AKHIR PERUBAHAN ---
      include: {
        company: true, // kalau mau tampilkan data perusahaan juga
        progress: {
          include: {
            step: true,
            status: true,
          },
        },
        jik_approvers: true,
      },
      orderBy: {
        created_at: "desc", // optional: urutkan dari yang terbaru
      },
    });

    return NextResponse.json(jiks);
  } catch (err) {
    console.error("❌ Error get mom:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres"; // sesuaikan dengan path kamu

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     const {
//       companyId,
//       jikTitle,
//       unitName,
//       initiativePartnership,
//       investValue,
//       contractDurationYears,
//       jik_approvers,
//       sections,
//       is_finish,
//     } = body;

//     let progressRecord = await prisma.progress.create({
//         data: {
//             company_id: Number(companyId),
//             step_id: 3, // step JIK
//             status_id: is_finish === 1 ? 3 : null,
//         },
//     });

//     // Simpan ke PostgreSQL
//     const jik = await prisma.jik.create({
//       data: {
//         company_id: companyId,
//         judul: jikTitle,
//         nama_unit: unitName,
//         initiative_partnership: initiativePartnership,
//         invest_value: investValue,
//         contract_duration_years: contractDurationYears,
//         // Simpan sections sebagai JSON (kolom jsonb)
//         document_initiative: sections,
//         progress_id: progressRecord ? progressRecord.id : null,
//         jik_approvers: {
//           // 3️⃣ Sekaligus insert approvers
//           create: jik_approvers?.map((a: any) => ({
//             name: a.name,
//             jabatan: a.jabatan || null,
//             nik: a.nik || null,
//             type: a.type,
//           })) ?? [],
//         },
//       },
//       include: {
//         jik_approvers: true,
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       message:
//         is_finish === 1
//           ? "JIK created & progress initialized"
//           : "JIK saved successfully",
//       data: jik,
//     });
//   } catch (err) {
//     console.error("❌ Error saving JIK document:", err);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }

// export async function GET() {
//   try {
//     const jiks = await prisma.jik.findMany({
//       include: {
//         company: true, // kalau mau tampilkan data perusahaan juga
//         progress: {
//           include: {
//             step: true,
//             status: true,
//           },
//         },
//         jik_approvers: true,
//       },
//       orderBy: {
//         created_at: 'desc', // optional: urutkan dari yang terbaru
//       },
//     });

//     return NextResponse.json(jiks);
//   } catch (err) {
//     console.error("❌ Error get mom:", err);
//     return NextResponse.json({ error: err }, { status: 500 });
//   }
// }

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres"; // sesuaikan dengan path kamu

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     const {
//       companyId,
//       jikTitle,
//       unitName,
//       initiativePartnership,
//       investValue,
//       contractDurationYears,
//       sections,
//       is_finish,
//     } = body;

//     let progressRecord = await prisma.progress.create({
//         data: {
//             company_id: Number(companyId),
//             step_id: 3, // step JIK
//             status_id: is_finish === 1 ? 3 : null,
//         },
//     });

//     // Simpan ke PostgreSQL
//     const jik = await prisma.jik.create({
//       data: {
//         company_id: companyId,
//         judul: jikTitle,
//         nama_unit: unitName,
//         initiative_partnership: initiativePartnership,
//         invest_value: investValue,
//         contract_duration_years: contractDurationYears,
//         // Simpan sections sebagai JSON (kolom jsonb)
//         document_initiative: sections,
//         progress_id: progressRecord ? progressRecord.id : null,
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       message:
//         is_finish === 1
//           ? "JIK created & progress initialized"
//           : "JIK saved successfully",
//       data: jik,
//     });
//   } catch (err) {
//     console.error("❌ Error saving JIK document:", err);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }

// export async function GET() {
//   try {
//     const jiks = await prisma.jik.findMany({
//       include: {
//         company: true, // kalau mau tampilkan data perusahaan juga
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

//     return NextResponse.json(jiks);
//   } catch (err) {
//     console.error("❌ Error get mom:", err);
//     return NextResponse.json({ error: err }, { status: 500 });
//   }
// }