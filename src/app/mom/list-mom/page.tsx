"use client";

import { DataTable } from "@/components/layout/data-table-mom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveAs } from "file-saver"; // 1. Import saveAs

export default function ListMomPage() {
  const router = useRouter();
  const [moms, setMoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // 2. State untuk melacak loading per baris
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 3. Buat fungsi fetch yang bisa dipakai ulang
  const fetchMoms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mom");
      if (!res.ok) throw new Error("Gagal mengambil data MOM");
      const data = await res.json();
      
      const formatted = data.map((mom: any) => ({
        ...mom,
        date: new Date(mom.date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      }));
      setMoms(formatted);
    } catch (err) {
      console.error(err);
      alert("Gagal memuat MOM");
    } finally {
      setLoading(false);
    }
  }, []);

  // Panggil fetchMoms saat komponen dimuat
  useEffect(() => {
    fetchMoms();
  }, [fetchMoms]);

  const columns = [
    { key: "company.name", label: "Nama Perusahaan" },
    { key: "title", label: "Judul MOM" },
    { key: "date", label: "Tanggal MOM" },
    { key: "venue", label: "Tempat Dilaksanakan" },
  ];

  const filteredMoms = useMemo(() => {
    return moms.filter(
      (c) =>
        c.company?.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.title.toLowerCase().includes(filter.toLowerCase())
    );
  }, [moms, filter]);

  // 4. Implementasi Logika Generate Docs
  const handleGenerateDocs = async (row: any) => {
    setGeneratingId(row.id);
    try {
      const response = await fetch('/api/mom/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ momId: row.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal generate DOCX');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `MOM_${row.id}.docx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1].replace(/"$/, '');
        }
      }
      saveAs(blob, fileName);
    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setGeneratingId(null);
    }
  };

  // 5. Implementasi Logika Edit
  const handleEdit = (row: any) => {
    router.push(`/mom/edit/${row.id}`);
  };

  // 6. Implementasi Logika Delete
  const handleDelete = async (row: any) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus MOM: ${row.title}?`)) {
      setDeletingId(row.id);
      try {
        const response = await fetch(`/api/mom/${row.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal menghapus MOM');
        }

        alert("MOM berhasil dihapus.");
        // Muat ulang data setelah berhasil hapus
        fetchMoms(); 
      } catch (error: any) {
        console.error("Error deleting MOM:", error);
        alert("Error: " + error.message);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="p-6">
      <Card className="shadow-md bg-white rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-2xl font-bold">MOM List</CardTitle>
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
          {loading && moms.length === 0 ? ( // Tampilkan loading hanya jika data belum ada
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span>Loading data...</span>
            </div>
          ) : (
            // 7. Teruskan state loading ke DataTable
            <DataTable
              columns={columns}
              data={filteredMoms}
              type="mom"
              onView={handleGenerateDocs}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
// import { useEffect, useMemo, useState } from "react";

// export default function ListMomPage() {

//   const [moms, setMoms] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("");

//   useEffect(() => {
//     fetch("/api/mom")
//       .then((res) => res.json())
//       .then((data) => {
//           const formatted = data.map((mom: any) => ({
//           ...mom,
//           date: new Date(mom.date).toLocaleDateString("id-ID", {
//             day: "2-digit",
//             month: "long",
//             year: "numeric",
//           }),
//         }));
//         setMoms(formatted);
//         setLoading(false);
//       })
//       .catch(() => setLoading(false));
//   }, []);

//   const columns = [
//     { key: "company.name", label: "Nama Perusahaan" },
//     { key: "title", label: "Judul MOM" },
//     { key: "date", label: "Tanggal MOM" },
//     { key: "venue", label: "Tempat Dilaksanakan" },
//   ];

//   // 🔍 Filter data secara real-time
//   const filteredMoms = useMemo(() => {
//     return moms.filter((c) =>
//       c.company?.name.toLowerCase().includes(filter.toLowerCase())
//     );
//   }, [moms, filter]);

//   return (
//     <div className="p-6">
//       <Card className="shadow-md bg-white rounded-2xl">
//         <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//           <CardTitle className="text-2xl font-bold">MOM List</CardTitle>

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
//             <DataTable columns={columns} data={filteredMoms} type="mom" />
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }