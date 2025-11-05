"use client";

import { DataTable } from "@/components/layout/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function ListJikPage() {
  const [jiks, setJiks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // --- 1. STATE BARU DITAMBAHKAN ---
  // State untuk melacak JIK ID yang sedang digenerate
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/jik")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((jik: any) => ({
          ...jik,
          invest_value:
            jik.invest_value != null
              ? `Rp.${Number(jik.invest_value).toLocaleString("id-ID")}`
              : "-",
          contract_duration_years:
            jik.contract_duration_years != null
              ? `${jik.contract_duration_years} Tahun`
              : "-",
        }));

        setJiks(formatted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const columns = [
    { key: "company.name", label: "Nama Perusahaan" },
    { key: "judul", label: "Judul JIK" },
    { key: "invest_value", label: "Invest Value" },
    { key: "contract_duration_years", label: "Durasi Kontrak" },
  ];

  // 🔍 Filter data secara real-time
  const filteredJiks = useMemo(() => {
    return jiks.filter((c) =>
      c.company?.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [jiks, filter]);

  // --- 2. FUNGSI HELPER BARU DITAMBAHKAN ---
  /**
   * Menangani pemanggilan API dan download untuk generate DOCX.
   */
  const handleGenerateDocx = async (jik: any) => {
    setGeneratingId(jik.id); // Mulai loading
    console.log(`Generating DOCX for: "${jik.judul}"...`);

    try {
      const response = await fetch("/api/jik/generate-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jikId: jik.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal membuat dokumen");
      }

      // Ambil nama file dari header
      const disposition = response.headers.get("Content-Disposition");
      let fileName = `JIK-${jik.judul || jik.id}.docx`; // Nama default
      if (disposition && disposition.includes("filename=")) {
        const fileNameRegex = /filename="([^"]+)"/;
        const match = disposition.match(fileNameRegex);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      console.log(`Successfully downloaded: ${fileName}`);
    } catch (error: any) {
      console.error("Error generating DOCX:", error);
      // Menggunakan window.alert untuk notifikasi error (tanpa toast)
      window.alert(
        `Error generating DOCX: ${error.message || "Unknown error"}`
      );
    } finally {
      setGeneratingId(null); // Selesai loading
    }
  };

  // --- 3. 'handleCustomAction' DIMODIFIKASI ---
  const handleCustomAction = (action: string, row: any) => {
    switch (action) {
      case "Upload":
        console.log(`🟡 Upload dokumen untuk ${row.judul}`);
        // TODO: buka modal upload file atau panggil API upload
        break;

      case "Approve":
        console.log(`✅ Approve dokumen: ${row.judul}`);
        // TODO: panggil API approve dokumen
        break;

      case "Sign":
        console.log(`✍️ Sign dokumen: ${row.judul}`);
        // TODO: tampilkan dialog tanda tangan
        break;

      // --- CASE BARU DITAMBAHKAN ---
      case "Generate DOCX":
        console.log(`🚀 Generating DOCX for ${row.judul}`);
        handleGenerateDocx(row); // Panggil helper yang baru dibuat
        break;
      // --- AKHIR CASE BARU ---

      default:
        console.log(`⚙️ Action "${action}" belum di-handle`);
    }
  };

  return (
    <div className="p-6">
      <Card className="shadow-md bg-white rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-2xl font-bold">JIK List</CardTitle>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari perusahaan..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            {/* <CreatseCompanyModal /> */}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span>Loading data...</span>
            </div>
          ) : (
            // --- 4. PROPS 'generatingId' DITAMBAHKAN ---
            <DataTable
              columns={columns}
              data={filteredJiks}
              type="jik"
              onCustomAction={handleCustomAction}
              generatingId={generatingId} // <-- Prop ini dikirim ke DataTable
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// "use client";

// import { DataTable } from "@/components/layout/data-table";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Loader2, Search } from "lucide-react";
// import { useEffect, useMemo, useState } from "react";

// export default function ListJikPage() {

//   const [jiks, setJiks] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("");

//   useEffect(() => {
//     setLoading(true);
//     fetch("/api/jik")
//         .then((res) => res.json())
//         .then((data) => {
//         const formatted = data.map((jik: any) => ({
//             ...jik,
//             invest_value:
//             jik.invest_value != null
//                 ? `Rp.${Number(jik.invest_value).toLocaleString("id-ID")}`
//                 : "-",
//             contract_duration_years:
//             jik.contract_duration_years != null
//                 ? `${jik.contract_duration_years} Tahun`
//                 : "-",
//         }));

//         setJiks(formatted);
//         setLoading(false);
//         })
//         .catch(() => setLoading(false));
//     }, []);

//   const columns = [
//     { key: "company.name", label: "Nama Perusahaan" },
//     { key: "judul", label: "Judul JIK" },
//     { key: "invest_value", label: "Invest Value" },
//     { key: "contract_duration_years", label: "Durasi Kontrak" },
//   ];

//   // 🔍 Filter data secara real-time
//   const filteredJiks = useMemo(() => {
//     return jiks.filter((c) =>
//       c.company?.name.toLowerCase().includes(filter.toLowerCase())
//     );
//   }, [jiks, filter]);

//   const handleCustomAction = (action: string, row: any) => {
//     switch (action) {
//       case "Upload":
//         console.log(`🟡 Upload dokumen untuk ${row.judul}`);
//         // TODO: buka modal upload file atau panggil API upload
//         break;

//       case "Approve":
//         console.log(`✅ Approve dokumen: ${row.judul}`);
//         // TODO: panggil API approve dokumen
//         break;

//       case "Sign":
//         console.log(`✍️ Sign dokumen: ${row.judul}`);
//         // TODO: tampilkan dialog tanda tangan
//         break;

//       default:
//         console.log(`⚙️ Action "${action}" belum di-handle`);
//     }
//   };

//   return (
//     <div className="p-6">
//       <Card className="shadow-md bg-white rounded-2xl">
//         <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//           <CardTitle className="text-2xl font-bold">JIK List</CardTitle>

//           <div className="flex items-center gap-3 w-full sm:w-auto">
//             <div className="relative w-full sm:w-64">
//               <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder="Cari perusahaan..."
//                 value={filter}
//                 onChange={(e) => setFilter(e.target.value)}
//                 className="pl-8"
//               />
//             </div>
//             {/* <CreatseCompanyModal /> */}
//           </div>
//         </CardHeader>

//         <CardContent>
//           {loading ? (
//             <div className="flex items-center justify-center py-10">
//               <Loader2 className="animate-spin mr-2 h-5 w-5" />
//               <span>Loading data...</span>
//             </div>
//           ) : (
//             <DataTable columns={columns} data={filteredJiks} type="jik" onCustomAction={handleCustomAction} />
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }