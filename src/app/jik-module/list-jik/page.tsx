"use client";

import { DataTable } from "@/components/layout/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation"; 
import { useEffect, useMemo, useState } from "react";

export default function ListJikPage() {
  const [jiks, setJiks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const router = useRouter(); // Sudah ada

  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchJiks = () => {
    setLoading(true);
    fetch("/api/jik")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
           console.error("Data fetched is not an array:", data);
           setJiks([]);
           setLoading(false);
           return;
        }
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
  };

  useEffect(() => {
    fetchJiks(); 
  }, []);

  const columns = [
    { key: "company.name", label: "Nama Perusahaan" },
    { key: "judul", label: "Judul JIK" },
    { key: "invest_value", label: "Invest Value" },
    { key: "contract_duration_years", label: "Durasi Kontrak" },
  ];

  const filteredJiks = useMemo(() => {
    return jiks.filter((c) =>
      c.company?.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [jiks, filter]);

  const handleGenerateDocx = async (jik: any) => {
    setGeneratingId(jik.id); 
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

      const disposition = response.headers.get("Content-Disposition");
      let fileName = `JIK-${jik.judul || jik.id}.docx`; 
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
      window.alert(
        `Error generating DOCX: ${error.message || "Unknown error"}`
      );
    } finally {
      setGeneratingId(null); 
    }
  };

  const handleDeleteJik = async (jik: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus JIK "${jik.judul}"?`)) {
      return;
    }

    setDeletingId(jik.id); 
    console.log(`Deleting JIK: "${jik.judul}"...`);

    try {
      const response = await fetch(`/api/jik/${jik.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus JIK");
      }

      console.log(`Successfully deleted: ${jik.judul}`);
      setJiks((prevJiks) => prevJiks.filter((j) => j.id !== jik.id));
      
    } catch (error: any) {
      console.error("Error deleting JIK:", error);
      window.alert(
        `Error deleting JIK: ${error.message || "Unknown error"}`
      );
    } finally {
      setDeletingId(null); 
    }
  };


  // --- 🔴 DI SINILAH PERBAIKANNYA ---
  const handleCustomAction = (action: string, row: any) => {
    switch (action) {
      
      // --- 1. TAMBAHKAN CASE UNTUK "View" ---
      case "View":
        console.log(`👁️ View dokumen: ${row.judul}`);
        // Arahkan ke halaman preview baru yang tadi dibuat
        router.push(`/jik-module/view/${row.id}`);
        break;
      // --- AKHIR TAMBAHAN ---

      case "Edit":
        console.log(`✏️ Edit dokumen: ${row.judul}`);
        router.push(`/jik-module/edit/${row.id}`);
        break;

      case "Delete":
        console.log(`🗑️ Delete dokumen: ${row.judul}`);
        handleDeleteJik(row);
        break;

      case "Upload":
        console.log(`🟡 Upload dokumen untuk ${row.judul}`);
        // Ditangani oleh data-table.tsx
        break;

      case "Approve":
        console.log(`✅ Approve dokumen: ${row.judul}`);
        // Ditangani oleh data-table.tsx
        break;

      case "Sign":
        console.log(`✍️ Sign dokumen: ${row.judul}`);
        // Ditangani oleh data-table.tsx
        break;

      case "Generate DOCX":
        console.log(`🚀 Generating DOCX for ${row.judul}`);
        handleGenerateDocx(row);
        break;

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
            <DataTable
              columns={columns}
              data={filteredJiks}
              type="jik"
              onCustomAction={handleCustomAction}
              generatingId={generatingId}
              deletingId={deletingId} 
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
// import { useRouter } from "next/navigation"; // 1. Import useRouter
// import { useEffect, useMemo, useState } from "react";

// export default function ListJikPage() {
//   const [jiks, setJiks] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("");
//   const router = useRouter(); // 2. Inisialisasi router

//   // State untuk melacak JIK ID yang sedang digenerate
//   const [generatingId, setGeneratingId] = useState<number | null>(null);
//   // 3. State baru untuk melacak JIK ID yang sedang didelete
//   const [deletingId, setDeletingId] = useState<number | null>(null);

//   // --- 4. Fungsi untuk Fetch Data ---
//   const fetchJiks = () => {
//     setLoading(true);
//     fetch("/api/jik")
//       .then((res) => res.json())
//       .then((data) => {
//         if (!Array.isArray(data)) {
//            // Handle jika respons bukan array (misal: error)
//            console.error("Data fetched is not an array:", data);
//            setJiks([]);
//            setLoading(false);
//            return;
//         }
//         const formatted = data.map((jik: any) => ({
//           ...jik,
//           invest_value:
//             jik.invest_value != null
//               ? `Rp.${Number(jik.invest_value).toLocaleString("id-ID")}`
//               : "-",
//           contract_duration_years:
//             jik.contract_duration_years != null
//               ? `${jik.contract_duration_years} Tahun`
//               : "-",
//         }));

//         setJiks(formatted);
//         setLoading(false);
//       })
//       .catch(() => setLoading(false));
//   };

//   useEffect(() => {
//     fetchJiks(); // Panggil fungsi fetch data
//   }, []);

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

//   /**
//    * Menangani pemanggilan API dan download untuk generate DOCX.
//    */
//   const handleGenerateDocx = async (jik: any) => {
//     setGeneratingId(jik.id); // Mulai loading
//     console.log(`Generating DOCX for: "${jik.judul}"...`);

//     try {
//       const response = await fetch("/api/jik/generate-docx", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ jikId: jik.id }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Gagal membuat dokumen");
//       }

//       // Ambil nama file dari header
//       const disposition = response.headers.get("Content-Disposition");
//       let fileName = `JIK-${jik.judul || jik.id}.docx`; // Nama default
//       if (disposition && disposition.includes("filename=")) {
//         const fileNameRegex = /filename="([^"]+)"/;
//         const match = disposition.match(fileNameRegex);
//         if (match && match[1]) {
//           fileName = match[1];
//         }
//       }

//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = fileName;
//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//       window.URL.revokeObjectURL(url);
//       console.log(`Successfully downloaded: ${fileName}`);
//     } catch (error: any) {
//       console.error("Error generating DOCX:", error);
//       window.alert(
//         `Error generating DOCX: ${error.message || "Unknown error"}`
//       );
//     } finally {
//       setGeneratingId(null); // Selesai loading
//     }
//   };

//   // --- 5. FUNGSI HELPER BARU UNTUK DELETE ---
//   const handleDeleteJik = async (jik: any) => {
//     // Konfirmasi sebelum delete
//     if (!window.confirm(`Apakah Anda yakin ingin menghapus JIK "${jik.judul}"?`)) {
//       return;
//     }

//     setDeletingId(jik.id); // Mulai loading delete
//     console.log(`Deleting JIK: "${jik.judul}"...`);

//     try {
//       const response = await fetch(`/api/jik/${jik.id}`, {
//         method: "DELETE",
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Gagal menghapus JIK");
//       }

//       console.log(`Successfully deleted: ${jik.judul}`);
      
//       // Update state untuk menghapus JIK dari UI tanpa refresh
//       setJiks((prevJiks) => prevJiks.filter((j) => j.id !== jik.id));
      
//       // (Opsional) Tampilkan notifikasi sukses
//       // window.alert("JIK berhasil dihapus."); 

//     } catch (error: any) {
//       console.error("Error deleting JIK:", error);
//       window.alert(
//         `Error deleting JIK: ${error.message || "Unknown error"}`
//       );
//     } finally {
//       setDeletingId(null); // Selesai loading delete
//     }
//   };


//   // --- 6. 'handleCustomAction' DIMODIFIKASI ---
//   const handleCustomAction = (action: string, row: any) => {
//     switch (action) {
//       // --- CASE BARU DITAMBAHKAN ---
//       case "Edit":
//         console.log(`✏️ Edit dokumen: ${row.judul}`);
//         router.push(`/jik-module/edit/${row.id}`);
//         break;

//       case "Delete":
//         console.log(`🗑️ Delete dokumen: ${row.judul}`);
//         handleDeleteJik(row); // Panggil helper delete
//         break;
//       // --- AKHIR CASE BARU ---

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

//       case "Generate DOCX":
//         console.log(`🚀 Generating DOCX for ${row.judul}`);
//         handleGenerateDocx(row); // Panggil helper yang baru dibuat
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
//             // --- 7. PROPS 'deletingId' DITAMBAHKAN ---
//             <DataTable
//               columns={columns}
//               data={filteredJiks}
//               type="jik"
//               onCustomAction={handleCustomAction}
//               generatingId={generatingId}
//               deletingId={deletingId} // <-- Prop ini dikirim ke DataTable
//             />
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

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

//   // --- 1. STATE BARU DITAMBAHKAN ---
//   // State untuk melacak JIK ID yang sedang digenerate
//   const [generatingId, setGeneratingId] = useState<number | null>(null);

//   useEffect(() => {
//     setLoading(true);
//     fetch("/api/jik")
//       .then((res) => res.json())
//       .then((data) => {
//         const formatted = data.map((jik: any) => ({
//           ...jik,
//           invest_value:
//             jik.invest_value != null
//               ? `Rp.${Number(jik.invest_value).toLocaleString("id-ID")}`
//               : "-",
//           contract_duration_years:
//             jik.contract_duration_years != null
//               ? `${jik.contract_duration_years} Tahun`
//               : "-",
//         }));

//         setJiks(formatted);
//         setLoading(false);
//       })
//       .catch(() => setLoading(false));
//   }, []);

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

//   // --- 2. FUNGSI HELPER BARU DITAMBAHKAN ---
//   /**
//    * Menangani pemanggilan API dan download untuk generate DOCX.
//    */
//   const handleGenerateDocx = async (jik: any) => {
//     setGeneratingId(jik.id); // Mulai loading
//     console.log(`Generating DOCX for: "${jik.judul}"...`);

//     try {
//       const response = await fetch("/api/jik/generate-docx", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ jikId: jik.id }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Gagal membuat dokumen");
//       }

//       // Ambil nama file dari header
//       const disposition = response.headers.get("Content-Disposition");
//       let fileName = `JIK-${jik.judul || jik.id}.docx`; // Nama default
//       if (disposition && disposition.includes("filename=")) {
//         const fileNameRegex = /filename="([^"]+)"/;
//         const match = disposition.match(fileNameRegex);
//         if (match && match[1]) {
//           fileName = match[1];
//         }
//       }

//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = fileName;
//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//       window.URL.revokeObjectURL(url);
//       console.log(`Successfully downloaded: ${fileName}`);
//     } catch (error: any) {
//       console.error("Error generating DOCX:", error);
//       // Menggunakan window.alert untuk notifikasi error (tanpa toast)
//       window.alert(
//         `Error generating DOCX: ${error.message || "Unknown error"}`
//       );
//     } finally {
//       setGeneratingId(null); // Selesai loading
//     }
//   };

//   // --- 3. 'handleCustomAction' DIMODIFIKASI ---
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

//       // --- CASE BARU DITAMBAHKAN ---
//       case "Generate DOCX":
//         console.log(`🚀 Generating DOCX for ${row.judul}`);
//         handleGenerateDocx(row); // Panggil helper yang baru dibuat
//         break;
//       // --- AKHIR CASE BARU ---

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
//             // --- 4. PROPS 'generatingId' DITAMBAHKAN ---
//             <DataTable
//               columns={columns}
//               data={filteredJiks}
//               type="jik"
//               onCustomAction={handleCustomAction}
//               generatingId={generatingId} // <-- Prop ini dikirim ke DataTable
//             />
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

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