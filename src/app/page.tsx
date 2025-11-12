import { prisma } from "@/lib/prisma/postgres";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Building,
  FileCheck,
  FileLock,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { ReactNode } from "react";

// =======================================================================
// Komponen Kartu Statistik (DIPERBARUI)
// =======================================================================
interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
}

const StatCard = ({ title, value, icon, description }: StatCardProps) => (
  <Card className="h-full">
    {/* Header sudah diperbaiki: min-h-16 & items-start */}
    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-16">
      <CardTitle className="text-sm font-medium">
        {title}
      </CardTitle>
      <div className="h-4 w-4 text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      {/* PERBAIKAN TERAKHIR:
        - Menambahkan 'min-h-8' (2rem) dan 'flex items-center'.
        - Ini memberikan 'ruang' vertikal yang konsisten untuk angka
        - dan 'items-center' akan meratakannya di tengah,
        - menyelesaikan masalah perataan glyph '1' vs '0'.
      */}
      <div className="text-2xl font-bold min-h-8 flex items-center">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </CardContent>
  </Card>
);

// =======================================================================
// Komponen Kartu Tabel Status (Reusable)
// =======================================================================
interface StatusTableCardProps {
  title: string;
  stats: Array<{ id?: string | number; name: string; count: number }>;
}

const StatusTableCard = ({ title, stats }: StatusTableCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((status) => (
            <TableRow key={status.name}>
              <TableCell className="font-medium">{status.name}</TableCell>
              <TableCell className="text-right">{status.count}</TableCell>
            </TableRow>
          ))}
          {stats.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={2}
                className="text-center text-muted-foreground"
              >
                Data tidak ditemukan
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

// =======================================================================
// Komponen KARTU AKTIVITAS (Reusable)
// =======================================================================
interface ActivityItem {
  id: number;
  title: string;
  updated_at: Date;
  company: { name: string };
  progress: { status: { name: string } | null } | null;
  link: string;
  icon: ReactNode;
}

interface ActivityCardProps {
  title: string;
  items: ActivityItem[];
  emptyMessage: string;
}

/**
 * Komponen reusable untuk menampilkan daftar aktivitas terbaru (MoM atau JIK).
 */
const ActivityCard = ({ title, items, emptyMessage }: ActivityCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-4">
            <div className="rounded-full bg-secondary p-2">{item.icon}</div>
            <div className="flex-1">
              <Link
                href={item.link}
                className="font-medium hover:underline"
              >
                {item.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {item.company.name} -{" "}
                {format(new Date(item.updated_at), "dd MMM yyyy")}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {item.progress?.status?.name || "Draft"}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

// =======================================================================
// Halaman Dashboard Utama
// =======================================================================
export default async function DashboardPage() {
  if (!prisma) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-red-500">
          Error: Koneksi database tidak tersedia.
        </p>
      </div>
    );
  }

  // 1. Mengambil data agregat (total count) secara paralel
  const [
    momCount,
    jikCount,
    companyCount,
    statuses,
    allSteps,
  ] = await Promise.all([
    prisma.mom.count(),
    prisma.jik.count(),
    prisma.company.count(),
    prisma.status.findMany(),
    prisma.step.findMany(),
  ]);

  // 2. Mengambil data untuk rincian status MoM dan JIK
  const moms = await prisma.mom.findMany({
    select: { progress: { select: { status_id: true } } },
  });
  const jiks = await prisma.jik.findMany({
    select: { progress: { select: { status_id: true } } },
  });

  // 3. Memproses data status MoM (Terpisah)
  const momStatusCounts = statuses.map((status) => ({
    id: status.id,
    name: status.name,
    count: moms.filter((m) => m.progress?.status_id === status.id).length,
  }));
  const noStatusMoms = moms.filter((m) => !m.progress?.status_id).length;
  const allMomStatusStats = [
    { id: 0, name: "Draft (Belum Diproses)", count: noStatusMoms },
    ...momStatusCounts,
  ];

  // 4. Memproses data status JIK (Terpisah)
  const jikStatusCounts = statuses.map((status) => ({
    id: status.id,
    name: status.name,
    count: jiks.filter((j) => j.progress?.status_id === status.id).length,
  }));
  const noStatusJiks = jiks.filter((j) => !j.progress?.status_id).length;
  const allJikStatusStats = [
    { id: 0, name: "Draft (Belum Diproses)", count: noStatusJiks },
    ...jikStatusCounts,
  ];

  // 5. Mengambil dan memproses data Dokumen (NDA, MOU, MSA, dll.)
  const documents = await prisma.document.findMany({
    include: {
      progress: {
        include: {
          step: { select: { name: true } },
          status: { select: { name: true } },
        },
      },
    },
  });

  // 6. Agregasi untuk Kartu Statistik Atas (Total per Tipe Step)
  const stepCounts: Record<string, number> = {};
  allSteps.forEach((step) => {
    stepCounts[step.name] = 0;
  });

  // 7. Agregasi untuk Tabel Status per Tipe Step (NDA, MOU, MSA)
  const stepStatusCounts: Record<string, Record<string, number>> = {};
  const stepDraftCounts: Record<string, number> = {};

  allSteps.forEach((step) => {
    stepStatusCounts[step.name] = {};
    statuses.forEach((status) => {
      stepStatusCounts[step.name][status.name] = 0;
    });
    stepDraftCounts[step.name] = 0;
  });

  documents.forEach((doc) => {
    const stepName = doc.progress?.step?.name;
    const statusName = doc.progress?.status?.name;

    if (stepName && stepCounts[stepName] !== undefined) {
      stepCounts[stepName]++;
    }

    if (stepName && allSteps.find((s) => s.name === stepName)) {
      if (statusName) {
        stepStatusCounts[stepName][statusName]++;
      } else {
        stepDraftCounts[stepName]++;
      }
    }
  });

  // 8. Helper untuk membuat array data status
  const createStatusArray = (stepName: string) => {
    if (!stepStatusCounts[stepName]) return [];
    
    const stats = statuses.map((status) => ({
      name: status.name,
      count: stepStatusCounts[stepName][status.name] || 0,
    }));
    
    stats.unshift({
      name: "Draft (Belum Diproses)",
      count: stepDraftCounts[stepName] || 0,
    });
    
    return stats;
  };

  const ndaStatusStats = createStatusArray("NDA");
  const mouStatusStats = createStatusArray("MOU");
  const msaStatusStats = createStatusArray("MSA");

  // 9. Mengambil Aktivitas Terbaru (MoM & JIK)
  const [recentMoms, recentJiks] = await Promise.all([
    prisma.mom.findMany({
      orderBy: { updated_at: "desc" },
      take: 5,
      include: {
        company: { select: { name: true } },
        progress: { include: { status: { select: { name: true } } } },
      },
    }),
    prisma.jik.findMany({
      orderBy: { updated_at: "desc" },
      take: 5,
      include: {
        company: { select: { name: true } },
        progress: { include: { status: { select: { name: true } } } },
      },
    }),
  ]);

  // 10. Memformat data untuk ActivityCard
  const momItems: ActivityItem[] = recentMoms.map((mom) => ({
    id: mom.id,
    title: mom.title,
    updated_at: mom.updated_at,
    company: mom.company,
    progress: mom.progress,
    link: `/mom/view/${mom.id}`,
    icon: <FileText className="h-5 w-5 text-secondary-foreground" />,
  }));

  const jikItems: ActivityItem[] = recentJiks.map((jik) => ({
    id: jik.id,
    title: jik.judul, // Sesuai schema 'Jik'
    updated_at: jik.updated_at,
    company: jik.company,
    progress: jik.progress,
    link: `/jik-module/view/${jik.id}`, // Sesuai struktur folder jik
    icon: <Briefcase className="h-5 w-5 text-secondary-foreground" />,
  }));

  // =======================================================================
  // Render Halaman
  // =======================================================================
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

      {/* Grid untuk Kartu Statistik Utama */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Minutes of Meeting"
          value={momCount}
          icon={<FileText />}
        />
        <StatCard
          title="Total Justifikasi Inisiatif"
          value={jikCount}
          icon={<Briefcase />}
        />
        <StatCard
          title="Total NDA"
          value={stepCounts["NDA"] || 0}
          icon={<FileLock />}
        />
        <StatCard
          title="Total MOU"
          value={stepCounts["MOU"] || 0}
          icon={<FileCheck />}
        />
        <StatCard
          title="Total MSA"
          value={stepCounts["MSA"] || 0}
          icon={<FileSpreadsheet />}
        />
        <StatCard
          title="Total Mitra"
          value={companyCount}
          icon={<Building />}
        />
      </div>

      {/* Grid untuk Tabel Rincian (2 Kolom) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Aktivitas MoM Terbaru */}
        <ActivityCard
          title="Aktivitas MoM Terbaru"
          items={momItems}
          emptyMessage="Belum ada aktivitas MoM."
        />

        {/* Aktivitas JIK Terbaru */}
        <ActivityCard
          title="Aktivitas JIK Terbaru"
          items={jikItems}
          emptyMessage="Belum ada aktivitas JIK."
        />

        {/* Status MoM */}
        <StatusTableCard
          title="Status Minutes of Meeting"
          stats={allMomStatusStats}
        />

        {/* Status JIK */}
        <StatusTableCard
          title="Status Justifikasi Inisiatif"
          stats={allJikStatusStats}
        />

        {/* Status NDA */}
        <StatusTableCard title="Status NDA" stats={ndaStatusStats} />

        {/* Status MOU */}
        <StatusTableCard title="Status MOU" stats={mouStatusStats} />

        {/* Status MSA */}
        <StatusTableCard title="Status MSA" stats={msaStatusStats} />
      </div>
    </div>
  );
}

// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Briefcase,
//   Building,
//   FileCheck,
//   FileLock,
//   FileSpreadsheet,
//   FileText,
// } from "lucide-react";
// import { format } from "date-fns";
// import Link from "next/link";
// import { ReactNode } from "react";

// // =======================================================================
// // Komponen Kartu Statistik (DIPERBARUI)
// // =======================================================================
// interface StatCardProps {
//   title: string;
//   value: string | number;
//   icon: ReactNode;
//   description?: string;
// }

// const StatCard = ({ title, value, icon, description }: StatCardProps) => (
//   <Card className="h-full">
//     {/* PERBAIKAN:
//       - 'min-h-16' (4rem) diterapkan pada CardHeader, bukan CardTitle.
//       - 'items-start' digunakan untuk meratakan judul & ikon ke atas.
//       - Ini memaksa semua CardHeader memiliki tinggi minimum yang sama.
//     */}
//     <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-16">
//       {/* Menghapus 'min-h-10' dan 'flex items-center' dari sini */}
//       <CardTitle className="text-sm font-medium">
//         {title}
//       </CardTitle>
//       <div className="h-4 w-4 text-muted-foreground">{icon}</div>
//     </CardHeader>
//     <CardContent>
//       <div className="text-2xl font-bold">{value}</div>
//       {description && (
//         <p className="text-xs text-muted-foreground">{description}</p>
//       )}
//     </CardContent>
//   </Card>
// );

// // =======================================================================
// // Komponen Kartu Tabel Status (Reusable)
// // =======================================================================
// interface StatusTableCardProps {
//   title: string;
//   stats: Array<{ id?: string | number; name: string; count: number }>;
// }

// const StatusTableCard = ({ title, stats }: StatusTableCardProps) => (
//   <Card>
//     <CardHeader>
//       <CardTitle>{title}</CardTitle>
//     </CardHeader>
//     <CardContent>
//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead>Status</TableHead>
//             <TableHead className="text-right">Jumlah</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {stats.map((status) => (
//             <TableRow key={status.name}>
//               <TableCell className="font-medium">{status.name}</TableCell>
//               <TableCell className="text-right">{status.count}</TableCell>
//             </TableRow>
//           ))}
//           {stats.length === 0 && (
//             <TableRow>
//               <TableCell
//                 colSpan={2}
//                 className="text-center text-muted-foreground"
//               >
//                 Data tidak ditemukan
//               </TableCell>
//             </TableRow>
//           )}
//         </TableBody>
//       </Table>
//     </CardContent>
//   </Card>
// );

// // =======================================================================
// // Komponen KARTU AKTIVITAS (Reusable)
// // =======================================================================
// interface ActivityItem {
//   id: number;
//   title: string;
//   updated_at: Date;
//   company: { name: string };
//   progress: { status: { name: string } | null } | null;
//   link: string;
//   icon: ReactNode;
// }

// interface ActivityCardProps {
//   title: string;
//   items: ActivityItem[];
//   emptyMessage: string;
// }

// /**
//  * Komponen reusable untuk menampilkan daftar aktivitas terbaru (MoM atau JIK).
//  */
// const ActivityCard = ({ title, items, emptyMessage }: ActivityCardProps) => (
//   <Card>
//     <CardHeader>
//       <CardTitle>{title}</CardTitle>
//     </CardHeader>
//     <CardContent>
//       <div className="space-y-4">
//         {items.map((item) => (
//           <div key={item.id} className="flex items-center space-x-4">
//             <div className="rounded-full bg-secondary p-2">{item.icon}</div>
//             <div className="flex-1">
//               <Link
//                 href={item.link}
//                 className="font-medium hover:underline"
//               >
//                 {item.title}
//               </Link>
//               <p className="text-sm text-muted-foreground">
//                 {item.company.name} -{" "}
//                 {format(new Date(item.updated_at), "dd MMM yyyy")}
//               </p>
//             </div>
//             <div className="text-sm text-muted-foreground">
//               {item.progress?.status?.name || "Draft"}
//             </div>
//           </div>
//         ))}
//         {items.length === 0 && (
//           <p className="text-sm text-muted-foreground">{emptyMessage}</p>
//         )}
//       </div>
//     </CardContent>
//   </Card>
// );

// // =======================================================================
// // Halaman Dashboard Utama
// // =======================================================================
// export default async function DashboardPage() {
//   if (!prisma) {
//     return (
//       <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//         <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
//         <p className="text-red-500">
//           Error: Koneksi database tidak tersedia.
//         </p>
//       </div>
//     );
//   }

//   // 1. Mengambil data agregat (total count) secara paralel
//   const [
//     momCount,
//     jikCount,
//     companyCount,
//     statuses,
//     allSteps,
//   ] = await Promise.all([
//     prisma.mom.count(),
//     prisma.jik.count(),
//     prisma.company.count(),
//     prisma.status.findMany(),
//     prisma.step.findMany(),
//   ]);

//   // 2. Mengambil data untuk rincian status MoM dan JIK
//   const moms = await prisma.mom.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });
//   const jiks = await prisma.jik.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });

//   // 3. Memproses data status MoM (Terpisah)
//   const momStatusCounts = statuses.map((status) => ({
//     id: status.id,
//     name: status.name,
//     count: moms.filter((m) => m.progress?.status_id === status.id).length,
//   }));
//   const noStatusMoms = moms.filter((m) => !m.progress?.status_id).length;
//   const allMomStatusStats = [
//     { id: 0, name: "Draft (Belum Diproses)", count: noStatusMoms },
//     ...momStatusCounts,
//   ];

//   // 4. Memproses data status JIK (Terpisah)
//   const jikStatusCounts = statuses.map((status) => ({
//     id: status.id,
//     name: status.name,
//     count: jiks.filter((j) => j.progress?.status_id === status.id).length,
//   }));
//   const noStatusJiks = jiks.filter((j) => !j.progress?.status_id).length;
//   const allJikStatusStats = [
//     { id: 0, name: "Draft (Belum Diproses)", count: noStatusJiks },
//     ...jikStatusCounts,
//   ];

//   // 5. Mengambil dan memproses data Dokumen (NDA, MOU, MSA, dll.)
//   const documents = await prisma.document.findMany({
//     include: {
//       progress: {
//         include: {
//           step: { select: { name: true } },
//           status: { select: { name: true } },
//         },
//       },
//     },
//   });

//   // 6. Agregasi untuk Kartu Statistik Atas (Total per Tipe Step)
//   const stepCounts: Record<string, number> = {};
//   allSteps.forEach((step) => {
//     stepCounts[step.name] = 0;
//   });

//   // 7. Agregasi untuk Tabel Status per Tipe Step (NDA, MOU, MSA)
//   const stepStatusCounts: Record<string, Record<string, number>> = {};
//   const stepDraftCounts: Record<string, number> = {};

//   allSteps.forEach((step) => {
//     stepStatusCounts[step.name] = {};
//     statuses.forEach((status) => {
//       stepStatusCounts[step.name][status.name] = 0;
//     });
//     stepDraftCounts[step.name] = 0;
//   });

//   documents.forEach((doc) => {
//     const stepName = doc.progress?.step?.name;
//     const statusName = doc.progress?.status?.name;

//     if (stepName && stepCounts[stepName] !== undefined) {
//       stepCounts[stepName]++;
//     }

//     if (stepName && allSteps.find((s) => s.name === stepName)) {
//       if (statusName) {
//         stepStatusCounts[stepName][statusName]++;
//       } else {
//         stepDraftCounts[stepName]++;
//       }
//     }
//   });

//   // 8. Helper untuk membuat array data status
//   const createStatusArray = (stepName: string) => {
//     if (!stepStatusCounts[stepName]) return [];
    
//     const stats = statuses.map((status) => ({
//       name: status.name,
//       count: stepStatusCounts[stepName][status.name] || 0,
//     }));
    
//     stats.unshift({
//       name: "Draft (Belum Diproses)",
//       count: stepDraftCounts[stepName] || 0,
//     });
    
//     return stats;
//   };

//   const ndaStatusStats = createStatusArray("NDA");
//   const mouStatusStats = createStatusArray("MOU");
//   const msaStatusStats = createStatusArray("MSA");

//   // 9. Mengambil Aktivitas Terbaru (MoM & JIK)
//   const [recentMoms, recentJiks] = await Promise.all([
//     prisma.mom.findMany({
//       orderBy: { updated_at: "desc" },
//       take: 5,
//       include: {
//         company: { select: { name: true } },
//         progress: { include: { status: { select: { name: true } } } },
//       },
//     }),
//     prisma.jik.findMany({
//       orderBy: { updated_at: "desc" },
//       take: 5,
//       include: {
//         company: { select: { name: true } },
//         progress: { include: { status: { select: { name: true } } } },
//       },
//     }),
//   ]);

//   // 10. Memformat data untuk ActivityCard
//   const momItems: ActivityItem[] = recentMoms.map((mom) => ({
//     id: mom.id,
//     title: mom.title,
//     updated_at: mom.updated_at,
//     company: mom.company,
//     progress: mom.progress,
//     link: `/mom/view/${mom.id}`,
//     icon: <FileText className="h-5 w-5 text-secondary-foreground" />,
//   }));

//   const jikItems: ActivityItem[] = recentJiks.map((jik) => ({
//     id: jik.id,
//     title: jik.judul, // Sesuai schema 'Jik'
//     updated_at: jik.updated_at,
//     company: jik.company,
//     progress: jik.progress,
//     link: `/jik-module/view/${jik.id}`, // Sesuai struktur folder jik
//     icon: <Briefcase className="h-5 w-5 text-secondary-foreground" />,
//   }));

//   // =======================================================================
//   // Render Halaman
//   // =======================================================================
//   return (
//     <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//       <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

//       {/* Grid untuk Kartu Statistik Utama */}
//       <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
//         <StatCard
//           title="Total Minutes of Meeting"
//           value={momCount}
//           icon={<FileText />}
//         />
//         <StatCard
//           title="Total Justifikasi Inisiatif"
//           value={jikCount}
//           icon={<Briefcase />}
//         />
//         <StatCard
//           title="Total NDA"
//           value={stepCounts["NDA"] || 0}
//           icon={<FileLock />}
//         />
//         <StatCard
//           title="Total MOU"
//           value={stepCounts["MOU"] || 0}
//           icon={<FileCheck />}
//         />
//         <StatCard
//           title="Total MSA"
//           value={stepCounts["MSA"] || 0}
//           icon={<FileSpreadsheet />}
//         />
//         <StatCard
//           title="Total Mitra"
//           value={companyCount}
//           icon={<Building />}
//         />
//       </div>

//       {/* Grid untuk Tabel Rincian (2 Kolom) */}
//       <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
//         {/* Aktivitas MoM Terbaru */}
//         <ActivityCard
//           title="Aktivitas MoM Terbaru"
//           items={momItems}
//           emptyMessage="Belum ada aktivitas MoM."
//         />

//         {/* Aktivitas JIK Terbaru */}
//         <ActivityCard
//           title="Aktivitas JIK Terbaru"
//           items={jikItems}
//           emptyMessage="Belum ada aktivitas JIK."
//         />

//         {/* Status MoM */}
//         <StatusTableCard
//           title="Status Minutes of Meeting"
//           stats={allMomStatusStats}
//         />

//         {/* Status JIK */}
//         <StatusTableCard
//           title="Status Justifikasi Inisiatif"
//           stats={allJikStatusStats}
//         />

//         {/* Status NDA */}
//         <StatusTableCard title="Status NDA" stats={ndaStatusStats} />

//         {/* Status MOU */}
//         <StatusTableCard title="Status MOU" stats={mouStatusStats} />

//         {/* Status MSA */}
//         <StatusTableCard title="Status MSA" stats={msaStatusStats} />
//       </div>
//     </div>
//   );
// }

// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Briefcase,
//   Building,
//   FileCheck,
//   FileLock,
//   FileSpreadsheet,
//   FileText,
// } from "lucide-react";
// import { format } from "date-fns";
// import Link from "next/link";
// import { ReactNode } from "react";

// // =======================================================================
// // Komponen Kartu Statistik
// // =======================================================================
// interface StatCardProps {
//   title: string;
//   value: string | number;
//   icon: ReactNode;
//   description?: string;
// }

// const StatCard = ({ title, value, icon, description }: StatCardProps) => (
//   <Card>
//     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//       <CardTitle className="text-sm font-medium">{title}</CardTitle>
//       <div className="h-4 w-4 text-muted-foreground">{icon}</div>
//     </CardHeader>
//     <CardContent>
//       <div className="text-2xl font-bold">{value}</div>
//       {description && (
//         <p className="text-xs text-muted-foreground">{description}</p>
//       )}
//     </CardContent>
//   </Card>
// );

// // =======================================================================
// // Komponen Kartu Tabel Status (Reusable)
// // =======================================================================
// interface StatusTableCardProps {
//   title: string;
//   stats: Array<{ id?: string | number; name: string; count: number }>;
// }

// const StatusTableCard = ({ title, stats }: StatusTableCardProps) => (
//   <Card>
//     <CardHeader>
//       <CardTitle>{title}</CardTitle>
//     </CardHeader>
//     <CardContent>
//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead>Status</TableHead>
//             <TableHead className="text-right">Jumlah</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {stats.map((status) => (
//             <TableRow key={status.name}>
//               <TableCell className="font-medium">{status.name}</TableCell>
//               <TableCell className="text-right">{status.count}</TableCell>
//             </TableRow>
//           ))}
//           {stats.length === 0 && (
//             <TableRow>
//               <TableCell
//                 colSpan={2}
//                 className="text-center text-muted-foreground"
//               >
//                 Data tidak ditemukan
//               </TableCell>
//             </TableRow>
//           )}
//         </TableBody>
//       </Table>
//     </CardContent>
//   </Card>
// );

// // =======================================================================
// // Komponen KARTU AKTIVITAS (Reusable Baru)
// // =======================================================================
// interface ActivityItem {
//   id: number;
//   title: string;
//   updated_at: Date;
//   company: { name: string };
//   progress: { status: { name: string } | null } | null;
//   link: string;
//   icon: ReactNode;
// }

// interface ActivityCardProps {
//   title: string;
//   items: ActivityItem[];
//   emptyMessage: string;
// }

// /**
//  * Komponen reusable untuk menampilkan daftar aktivitas terbaru (MoM atau JIK).
//  */
// const ActivityCard = ({ title, items, emptyMessage }: ActivityCardProps) => (
//   <Card>
//     <CardHeader>
//       <CardTitle>{title}</CardTitle>
//     </CardHeader>
//     <CardContent>
//       <div className="space-y-4">
//         {items.map((item) => (
//           <div key={item.id} className="flex items-center space-x-4">
//             <div className="rounded-full bg-secondary p-2">{item.icon}</div>
//             <div className="flex-1">
//               <Link
//                 href={item.link}
//                 className="font-medium hover:underline"
//               >
//                 {item.title}
//               </Link>
//               <p className="text-sm text-muted-foreground">
//                 {item.company.name} -{" "}
//                 {format(new Date(item.updated_at), "dd MMM yyyy")}
//               </p>
//             </div>
//             <div className="text-sm text-muted-foreground">
//               {item.progress?.status?.name || "Draft"}
//             </div>
//           </div>
//         ))}
//         {items.length === 0 && (
//           <p className="text-sm text-muted-foreground">{emptyMessage}</p>
//         )}
//       </div>
//     </CardContent>
//   </Card>
// );

// // =======================================================================
// // Halaman Dashboard Utama (Logika Diperbarui)
// // =======================================================================
// export default async function DashboardPage() {
//   if (!prisma) {
//     return (
//       <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//         <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
//         <p className="text-red-500">
//           Error: Koneksi database tidak tersedia.
//         </p>
//       </div>
//     );
//   }

//   // 1. Mengambil data agregat (total count) secara paralel
//   const [
//     momCount,
//     jikCount,
//     companyCount,
//     statuses,
//     allSteps,
//   ] = await Promise.all([
//     prisma.mom.count(),
//     prisma.jik.count(),
//     prisma.company.count(),
//     prisma.status.findMany(),
//     prisma.step.findMany(),
//   ]);

//   // 2. Mengambil data untuk rincian status MoM dan JIK
//   const moms = await prisma.mom.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });
//   const jiks = await prisma.jik.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });

//   // 3. Memproses data status MoM (Terpisah)
//   const momStatusCounts = statuses.map((status) => ({
//     id: status.id,
//     name: status.name,
//     count: moms.filter((m) => m.progress?.status_id === status.id).length,
//   }));
//   const noStatusMoms = moms.filter((m) => !m.progress?.status_id).length;
//   const allMomStatusStats = [
//     { id: 0, name: "Draft (Belum Diproses)", count: noStatusMoms },
//     ...momStatusCounts,
//   ];

//   // 4. Memproses data status JIK (Terpisah)
//   const jikStatusCounts = statuses.map((status) => ({
//     id: status.id,
//     name: status.name,
//     count: jiks.filter((j) => j.progress?.status_id === status.id).length,
//   }));
//   const noStatusJiks = jiks.filter((j) => !j.progress?.status_id).length;
//   const allJikStatusStats = [
//     { id: 0, name: "Draft (Belum Diproses)", count: noStatusJiks },
//     ...jikStatusCounts,
//   ];

//   // 5. Mengambil dan memproses data Dokumen (NDA, MOU, MSA, dll.)
//   const documents = await prisma.document.findMany({
//     include: {
//       progress: {
//         include: {
//           step: { select: { name: true } },
//           status: { select: { name: true } },
//         },
//       },
//     },
//   });

//   // 6. Agregasi untuk Kartu Statistik Atas (Total per Tipe Step)
//   const stepCounts: Record<string, number> = {};
//   allSteps.forEach((step) => {
//     stepCounts[step.name] = 0;
//   });

//   // 7. Agregasi untuk Tabel Status per Tipe Step (NDA, MOU, MSA)
//   const stepStatusCounts: Record<string, Record<string, number>> = {};
//   const stepDraftCounts: Record<string, number> = {};

//   allSteps.forEach((step) => {
//     stepStatusCounts[step.name] = {};
//     statuses.forEach((status) => {
//       stepStatusCounts[step.name][status.name] = 0;
//     });
//     stepDraftCounts[step.name] = 0;
//   });

//   documents.forEach((doc) => {
//     const stepName = doc.progress?.step?.name;
//     const statusName = doc.progress?.status?.name;

//     if (stepName && stepCounts[stepName] !== undefined) {
//       stepCounts[stepName]++;
//     }

//     if (stepName && allSteps.find((s) => s.name === stepName)) {
//       if (statusName) {
//         stepStatusCounts[stepName][statusName]++;
//       } else {
//         stepDraftCounts[stepName]++;
//       }
//     }
//   });

//   // 8. Helper untuk membuat array data status
//   const createStatusArray = (stepName: string) => {
//     if (!stepStatusCounts[stepName]) return [];
    
//     const stats = statuses.map((status) => ({
//       name: status.name,
//       count: stepStatusCounts[stepName][status.name] || 0,
//     }));
    
//     stats.unshift({
//       name: "Draft (Belum Diproses)",
//       count: stepDraftCounts[stepName] || 0,
//     });
    
//     return stats;
//   };

//   const ndaStatusStats = createStatusArray("NDA");
//   const mouStatusStats = createStatusArray("MOU");
//   const msaStatusStats = createStatusArray("MSA");

//   // 9. Mengambil Aktivitas Terbaru (MoM & JIK)
//   const [recentMoms, recentJiks] = await Promise.all([
//     prisma.mom.findMany({
//       orderBy: { updated_at: "desc" },
//       take: 5,
//       include: {
//         company: { select: { name: true } },
//         progress: { include: { status: { select: { name: true } } } },
//       },
//     }),
//     prisma.jik.findMany({
//       orderBy: { updated_at: "desc" },
//       take: 5,
//       include: {
//         company: { select: { name: true } },
//         progress: { include: { status: { select: { name: true } } } },
//       },
//     }),
//   ]);

//   // 10. Memformat data untuk ActivityCard
//   const momItems: ActivityItem[] = recentMoms.map((mom) => ({
//     id: mom.id,
//     title: mom.title,
//     updated_at: mom.updated_at,
//     company: mom.company,
//     progress: mom.progress,
//     link: `/mom/view/${mom.id}`,
//     icon: <FileText className="h-5 w-5 text-secondary-foreground" />,
//   }));

//   const jikItems: ActivityItem[] = recentJiks.map((jik) => ({
//     id: jik.id,
//     title: jik.judul, // Sesuai schema 'Jik'
//     updated_at: jik.updated_at,
//     company: jik.company,
//     progress: jik.progress,
//     link: `/jik-module/view/${jik.id}`, // Sesuai struktur folder jik
//     icon: <Briefcase className="h-5 w-5 text-secondary-foreground" />,
//   }));

//   // =======================================================================
//   // Render Halaman
//   // =======================================================================
//   return (
//     <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//       {/* <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2> */}

//       {/* Grid untuk Kartu Statistik Utama */}
//       <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
//         <StatCard
//           title="Total Minutes of Meeting (MoM)"
//           value={momCount}
//           icon={<FileText />}
//         />
//         <StatCard
//           title="Total Justifikasi Inisiatif (JIK)"
//           value={jikCount}
//           icon={<Briefcase />}
//         />
//         <StatCard
//           title="Total NDA"
//           value={stepCounts["NDA"] || 0}
//           icon={<FileLock />}
//         />
//         <StatCard
//           title="Total MOU"
//           value={stepCounts["MOU"] || 0}
//           icon={<FileCheck />}
//         />
//         <StatCard
//           title="Total MSA"
//           value={stepCounts["MSA"] || 0}
//           icon={<FileSpreadsheet />}
//         />
//         <StatCard
//           title="Total Mitra"
//           value={companyCount}
//           icon={<Building />}
//         />
//       </div>

//       {/* Grid untuk Tabel Rincian (DIUBAH ke 2 Kolom) */}
//       <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
//         {/* Aktivitas MoM Terbaru */}
//         <ActivityCard
//           title="Aktivitas MoM Terbaru"
//           items={momItems}
//           emptyMessage="Belum ada aktivitas MoM."
//         />

//         {/* Aktivitas JIK Terbaru */}
//         <ActivityCard
//           title="Aktivitas JIK Terbaru"
//           items={jikItems}
//           emptyMessage="Belum ada aktivitas JIK."
//         />

//         {/* Status MoM */}
//         <StatusTableCard
//           title="Status Minutes of Meeting (MoM)"
//           stats={allMomStatusStats}
//         />

//         {/* Status JIK */}
//         <StatusTableCard
//           title="Status Justifikasi Inisiatif (JIK)"
//           stats={allJikStatusStats}
//         />

//         {/* Status NDA */}
//         <StatusTableCard title="Status NDA" stats={ndaStatusStats} />

//         {/* Status MOU */}
//         <StatusTableCard title="Status MOU" stats={mouStatusStats} />

//         {/* Status MSA */}
//         <StatusTableCard title="Status MSA" stats={msaStatusStats} />
//       </div>
//     </div>
//   );
// }

// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Briefcase,
//   Building,
//   FileCheck,
//   FileLock,
//   FileSpreadsheet,
//   FileText,
// } from "lucide-react";
// import { format } from "date-fns";
// import Link from "next/link";
// import { ReactNode } from "react";

// // =======================================================================
// // Komponen Kartu Statistik (Tidak Berubah)
// // =======================================================================
// interface StatCardProps {
//   title: string;
//   value: string | number;
//   icon: ReactNode;
//   description?: string;
// }

// const StatCard = ({ title, value, icon, description }: StatCardProps) => (
//   <Card>
//     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//       <CardTitle className="text-sm font-medium">{title}</CardTitle>
//       <div className="h-4 w-4 text-muted-foreground">{icon}</div>
//     </CardHeader>
//     <CardContent>
//       <div className="text-2xl font-bold">{value}</div>
//       {description && (
//         <p className="text-xs text-muted-foreground">{description}</p>
//       )}
//     </CardContent>
//   </Card>
// );

// // =======================================================================
// // Komponen KARTU TABEL STATUS (Reusable Baru)
// // =======================================================================
// interface StatusTableCardProps {
//   title: string;
//   stats: Array<{ id?: string | number; name: string; count: number }>;
// }

// /**
//  * Komponen reusable untuk menampilkan tabel status untuk satu jenis dokumen.
//  */
// const StatusTableCard = ({ title, stats }: StatusTableCardProps) => (
//   <Card>
//     <CardHeader>
//       <CardTitle>{title}</CardTitle>
//     </CardHeader>
//     <CardContent>
//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead>Status</TableHead>
//             <TableHead className="text-right">Jumlah</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {stats.map((status) => (
//             <TableRow key={status.name}>
//               <TableCell className="font-medium">{status.name}</TableCell>
//               <TableCell className="text-right">{status.count}</TableCell>
//             </TableRow>
//           ))}
//           {stats.length === 0 && (
//             <TableRow>
//               <TableCell
//                 colSpan={2}
//                 className="text-center text-muted-foreground"
//               >
//                 Data tidak ditemukan
//               </TableCell>
//             </TableRow>
//           )}
//         </TableBody>
//       </Table>
//     </CardContent>
//   </Card>
// );

// // =======================================================================
// // Halaman Dashboard Utama (Logika Diperbarui)
// // =======================================================================
// export default async function DashboardPage() {
//   if (!prisma) {
//     return (
//       <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//         <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
//         <p className="text-red-500">
//           Error: Koneksi database tidak tersedia.
//         </p>
//       </div>
//     );
//   }

//   // 1. Mengambil data agregat (total count) secara paralel
//   const [
//     momCount,
//     jikCount,
//     companyCount,
//     statuses,
//     allSteps,
//   ] = await Promise.all([
//     prisma.mom.count(),
//     prisma.jik.count(),
//     prisma.company.count(),
//     prisma.status.findMany(),
//     prisma.step.findMany(),
//   ]);

//   // 2. Mengambil data untuk rincian status MoM dan JIK
//   const moms = await prisma.mom.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });
//   const jiks = await prisma.jik.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });

//   // 3. Memproses data status MoM (Terpisah)
//   const momStatusCounts = statuses.map((status) => ({
//     id: status.id,
//     name: status.name,
//     count: moms.filter((m) => m.progress?.status_id === status.id).length,
//   }));
//   const noStatusMoms = moms.filter((m) => !m.progress?.status_id).length;
//   const allMomStatusStats = [
//     { id: 0, name: "Draft (Belum Diproses)", count: noStatusMoms },
//     ...momStatusCounts,
//   ];

//   // 4. Memproses data status JIK (Terpisah)
//   const jikStatusCounts = statuses.map((status) => ({
//     id: status.id,
//     name: status.name,
//     count: jiks.filter((j) => j.progress?.status_id === status.id).length,
//   }));
//   const noStatusJiks = jiks.filter((j) => !j.progress?.status_id).length;
//   const allJikStatusStats = [
//     { id: 0, name: "Draft (Belum Diproses)", count: noStatusJiks },
//     ...jikStatusCounts,
//   ];

//   // 5. Mengambil dan memproses data Dokumen (NDA, MOU, MSA, dll.)
//   const documents = await prisma.document.findMany({
//     include: {
//       progress: {
//         include: {
//           step: { select: { name: true } },
//           status: { select: { name: true } },
//         },
//       },
//     },
//   });

//   // 6. Agregasi untuk Kartu Statistik Atas (Total per Tipe Step)
//   const stepCounts: Record<string, number> = {};
//   allSteps.forEach((step) => {
//     stepCounts[step.name] = 0;
//   });

//   // 7. Agregasi untuk Tabel Status per Tipe Step (NDA, MOU, MSA)
//   const stepStatusCounts: Record<string, Record<string, number>> = {};
//   const stepDraftCounts: Record<string, number> = {};

//   allSteps.forEach((step) => {
//     stepStatusCounts[step.name] = {};
//     statuses.forEach((status) => {
//       stepStatusCounts[step.name][status.name] = 0;
//     });
//     stepDraftCounts[step.name] = 0;
//   });

//   documents.forEach((doc) => {
//     const stepName = doc.progress?.step?.name;
//     const statusName = doc.progress?.status?.name;

//     // Hitung untuk kartu statistik (Total)
//     if (stepName && stepCounts[stepName] !== undefined) {
//       stepCounts[stepName]++;
//     }

//     // Hitung untuk tabel status terpisah
//     if (stepName && allSteps.find((s) => s.name === stepName)) {
//       if (statusName) {
//         stepStatusCounts[stepName][statusName]++;
//       } else {
//         stepDraftCounts[stepName]++;
//       }
//     }
//   });

//   // 8. Helper untuk membuat array data status
//   const createStatusArray = (stepName: string) => {
//     if (!stepStatusCounts[stepName]) return [];
    
//     const stats = statuses.map((status) => ({
//       name: status.name,
//       count: stepStatusCounts[stepName][status.name] || 0,
//     }));
    
//     stats.unshift({
//       name: "Draft (Belum Diproses)",
//       count: stepDraftCounts[stepName] || 0,
//     });
    
//     return stats;
//   };

//   const ndaStatusStats = createStatusArray("NDA");
//   const mouStatusStats = createStatusArray("MOU");
//   const msaStatusStats = createStatusArray("MSA");

//   // 9. Mengambil 5 MoM terakhir yang diperbarui (Aktivitas Terbaru)
//   const recentMoms = await prisma.mom.findMany({
//     orderBy: {
//       updated_at: "desc",
//     },
//     take: 5,
//     include: {
//       company: { select: { name: true } },
//       progress: { include: { status: { select: { name: true } } } },
//     },
//   });

//   return (
//     <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//       {/* <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2> */}

//       {/* Grid untuk Kartu Statistik Utama */}
//       <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
//         <StatCard
//           title="Total Minutes of Meeting (MoM)"
//           value={momCount}
//           icon={<FileText />}
//         />
//         <StatCard
//           title="Total Justifikasi Inisiatif (JIK)"
//           value={jikCount}
//           icon={<Briefcase />}
//         />
//         <StatCard
//           title="Total NDA"
//           value={stepCounts["NDA"] || 0}
//           icon={<FileLock />}
//         />
//         <StatCard
//           title="Total MOU"
//           value={stepCounts["MOU"] || 0}
//           icon={<FileCheck />}
//         />
//         <StatCard
//           title="Total MSA"
//           value={stepCounts["MSA"] || 0}
//           icon={<FileSpreadsheet />}
//         />
//         <StatCard
//           title="Total Mitra"
//           value={companyCount}
//           icon={<Building />}
//         />
//       </div>

//       {/* Grid untuk Tabel Rincian (Sekarang 3 Kolom) */}
//       <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//         {/* Aktivitas MoM Terbaru */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Aktivitas MoM Terbaru</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               {recentMoms.map((mom) => (
//                 <div key={mom.id} className="flex items-center space-x-4">
//                   <div className="rounded-full bg-secondary p-2">
//                     <FileText className="h-5 w-5 text-secondary-foreground" />
//                   </div>
//                   <div className="flex-1">
//                     <Link
//                       href={`/mom/view/${mom.id}`}
//                       className="font-medium hover:underline"
//                     >
//                       {mom.title}
//                     </Link>
//                     <p className="text-sm text-muted-foreground">
//                       {mom.company.name} -{" "}
//                       {format(new Date(mom.updated_at), "dd MMM yyyy")}
//                     </p>
//                   </div>
//                   <div className="text-sm text-muted-foreground">
//                     {mom.progress?.status?.name || "Draft"}
//                   </div>
//                 </div>
//               ))}
//               {recentMoms.length === 0 && (
//                 <p className="text-sm text-muted-foreground">
//                   Belum ada aktivitas MoM.
//                 </p>
//               )}
//             </div>
//           </CardContent>
//         </Card>

//         {/* Status MoM */}
//         <StatusTableCard
//           title="Status Minutes of Meeting (MoM)"
//           stats={allMomStatusStats}
//         />

//         {/* Status JIK */}
//         <StatusTableCard
//           title="Status Justifikasi Inisiatif (JIK)"
//           stats={allJikStatusStats}
//         />

//         {/* Status NDA */}
//         <StatusTableCard title="Status NDA" stats={ndaStatusStats} />

//         {/* Status MOU */}
//         <StatusTableCard title="Status MOU" stats={mouStatusStats} />

//         {/* Status MSA */}
//         <StatusTableCard title="Status MSA" stats={msaStatusStats} />
//       </div>
//     </div>
//   );
// }

// import { prisma } from "@/lib/prisma/postgres";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Briefcase,
//   Building,
//   FileCheck,
//   FileLock,
//   FileSpreadsheet,
//   FileText,
// } from "lucide-react";
// import { format } from "date-fns";
// import Link from "next/link";
// import { ReactNode } from "react";

// /**
//  * Komponen Kartu Statistik
//  * Menampilkan judul, nilai, dan ikon untuk data statistik utama.
//  */
// interface StatCardProps {
//   title: string;
//   value: string | number;
//   icon: ReactNode;
//   description?: string;
// }

// const StatCard = ({ title, value, icon, description }: StatCardProps) => (
//   <Card>
//     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//       <CardTitle className="text-sm font-medium">{title}</CardTitle>
//       <div className="h-4 w-4 text-muted-foreground">{icon}</div>
//     </CardHeader>
//     <CardContent>
//       <div className="text-2xl font-bold">{value}</div>
//       {description && (
//         <p className="text-xs text-muted-foreground">{description}</p>
//       )}
//     </CardContent>
//   </Card>
// );

// /**
//  * Halaman Dashboard Utama
//  * Mengambil dan menampilkan data agregat dari database.
//  */
// export default async function DashboardPage() {
//   if (!prisma) {
//     return (
//       <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//         <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
//         <p className="text-red-500">
//           Error: Koneksi database tidak tersedia.
//         </p>
//       </div>
//     );
//   }

//   // 1. Mengambil data agregat (total count) secara paralel
//   const [
//     momCount,
//     jikCount,
//     companyCount,
//     statuses,
//     allSteps,
//   ] = await Promise.all([
//     prisma.mom.count(),
//     prisma.jik.count(),
//     prisma.company.count(),
//     prisma.status.findMany(),
//     prisma.step.findMany(),
//   ]);

//   // 2. Mengambil data untuk rincian status MoM dan JIK
//   const moms = await prisma.mom.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });
//   const jiks = await prisma.jik.findMany({
//     select: { progress: { select: { status_id: true } } },
//   });

//   // 3. Memproses data status MoM dan JIK
//   const momJikStatusCounts = statuses.map((status) => {
//     const momInStatus = moms.filter(
//       (m) => m.progress?.status_id === status.id
//     ).length;
//     const jikInStatus = jiks.filter(
//       (j) => j.progress?.status_id === status.id
//     ).length;
//     return {
//       id: status.id,
//       name: status.name,
//       momCount: momInStatus,
//       jikCount: jikInStatus,
//     };
//   });

//   // Menghitung MoM/JIK yang belum memiliki status (draft)
//   const noStatusMoms = moms.filter((m) => !m.progress?.status_id).length;
//   const noStatusJiks = jiks.filter((j) => !j.progress?.status_id).length;

//   const allMomJikStatusStats = [
//     {
//       id: 0,
//       name: "Draft (Belum Diproses)",
//       momCount: noStatusMoms,
//       jikCount: noStatusJiks,
//     },
//     ...momJikStatusCounts,
//   ];

//   // 4. Mengambil dan memproses data Dokumen (NDA, MOU, MSA, dll.)
//   const documents = await prisma.document.findMany({
//     include: {
//       progress: {
//         include: {
//           step: { select: { name: true } },
//           status: { select: { name: true } },
//         },
//       },
//     },
//   });

//   // Agregasi hitungan berdasarkan Tipe Step (untuk kartu statistik)
//   const stepCounts: Record<string, number> = {};
//   allSteps.forEach((step) => {
//     stepCounts[step.name] = 0;
//   });

//   // Agregasi hitungan berdasarkan Status (untuk tabel status dokumen)
//   const docStatusCounts: Record<string, number> = {};
//   statuses.forEach((status) => {
//     docStatusCounts[status.name] = 0;
//   });
//   let docsWithNoStatus = 0;

//   documents.forEach((doc) => {
//     // Hitung berdasarkan Step
//     if (doc.progress?.step?.name) {
//       if (stepCounts[doc.progress.step.name] !== undefined) {
//         stepCounts[doc.progress.step.name]++;
//       }
//     }

//     // Hitung berdasarkan Status
//     if (doc.progress?.status?.name) {
//       docStatusCounts[doc.progress.status.name]++;
//     } else {
//       docsWithNoStatus++;
//     }
//   });

//   // Konversi ke array untuk tabel Status Dokumen
//   const docStatusStats = statuses.map((status) => ({
//     name: status.name,
//     count: docStatusCounts[status.name] || 0,
//   }));
//   docStatusStats.unshift({
//     name: "Draft (Belum Diproses)",
//     count: docsWithNoStatus,
//   });

//   // 5. Mengambil 5 MoM terakhir yang diperbarui (Aktivitas Terbaru)
//   const recentMoms = await prisma.mom.findMany({
//     orderBy: {
//       updated_at: "desc",
//     },
//     take: 5,
//     include: {
//       company: { select: { name: true } },
//       progress: { include: { status: { select: { name: true } } } },
//     },
//   });

//   return (
//     <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
//       <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

//       {/* Grid untuk Kartu Statistik Utama */}
//       <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
//         <StatCard
//           title="Total Minutes of Meeting (MoM)"
//           value={momCount}
//           icon={<FileText />}
//         />
//         <StatCard
//           title="Total Justifikasi Inisiatif (JIK)"
//           value={jikCount}
//           icon={<Briefcase />}
//         />
//         <StatCard
//           title="Total NDA"
//           value={stepCounts["NDA"] || 0}
//           icon={<FileLock />}
//         />
//         <StatCard
//           title="Total MOU"
//           value={stepCounts["MOU"] || 0}
//           icon={<FileCheck />}
//         />
//         <StatCard
//           title="Total MSA"
//           value={stepCounts["MSA"] || 0}
//           icon={<FileSpreadsheet />}
//         />
//         <StatCard
//           title="Total Mitra"
//           value={companyCount}
//           icon={<Building />}
//         />
//       </div>

//       {/* Grid untuk Tabel Rincian */}
//       <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//         {/* Tabel Rincian Status MoM & JIK */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Status Dokumen (MoM & JIK)</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Status</TableHead>
//                   <TableHead className="text-center">Jumlah MoM</TableHead>
//                   <TableHead className="text-center">Jumlah JIK</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {allMomJikStatusStats.map((status) => (
//                   <TableRow key={status.id}>
//                     <TableCell className="font-medium">{status.name}</TableCell>
//                     <TableCell className="text-center">
//                       {status.momCount}
//                     </TableCell>
//                     <TableCell className="text-center">
//                       {status.jikCount}
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </CardContent>
//         </Card>

//         {/* Status Dokumen (NDA/MOU/dll.) */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Status Dokumen (NDA/MOU/MSA)</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Status</TableHead>
//                   <TableHead className="text-right">Jumlah</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {docStatusStats.map((status) => (
//                   <TableRow key={status.name}>
//                     <TableCell className="font-medium">{status.name}</TableCell>
//                     <TableCell className="text-right">{status.count}</TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </CardContent>
//         </Card>

//         {/* Daftar Aktivitas MoM Terbaru */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Aktivitas MoM Terbaru</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               {recentMoms.map((mom) => (
//                 <div key={mom.id} className="flex items-center space-x-4">
//                   <div className="rounded-full bg-secondary p-2">
//                     <FileText className="h-5 w-5 text-secondary-foreground" />
//                   </div>
//                   <div className="flex-1">
//                     <Link
//                       href={`/mom/view/${mom.id}`}
//                       className="font-medium hover:underline"
//                     >
//                       {mom.title}
//                     </Link>
//                     <p className="text-sm text-muted-foreground">
//                       {mom.company.name} -{" "}
//                       {format(new Date(mom.updated_at), "dd MMM yyyy")}
//                     </p>
//                   </div>
//                   <div className="text-sm text-muted-foreground">
//                     {mom.progress?.status?.name || "Draft"}
//                   </div>
//                 </div>
//               ))}
//               {recentMoms.length === 0 && (
//                 <p className="text-sm text-muted-foreground">
//                   Belum ada aktivitas MoM.
//                 </p>
//               )}
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }