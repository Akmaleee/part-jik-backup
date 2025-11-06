"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusTracker } from "./status-tracker";
import { ActionTable } from "./action-table";
import { UploadModal } from "../input/upload-modal";

interface DataTableProps {
  caption?: string;
  columns: { key: string; label: string }[];
  data: Record<string, any>[]; // initial data
  type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onCustomAction?: (action: string, row: any) => void; // DARI KODE ANDA
  generatingId?: number | null;
  deletingId?: number | null; // <-- 1. TAMBAHKAN PROP INI
}

export function DataTable({
  caption,
  columns,
  data,
  type = "default",
  onView,
  onEdit,
  onDelete,
  onCustomAction, // DARI KODE ANDA
  generatingId,
  deletingId, // <-- 2. TERIMA PROP INI
}: DataTableProps) {
  // 🧠 state lokal supaya DataTable bisa refresh tanpa reload
  const [rows, setRows] = useState<Record<string, any>[]>(data);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // kalau prop data berubah dari luar, update state juga
  useEffect(() => {
    setRows(data);
  }, [data]);

  // ambil nested value dari object
  const getValue = (obj: any, path: string) =>
    path.split(".").reduce((acc, part) => acc && acc[part], obj);

  // tampilkan kolom status untuk tipe tertentu
  const showStatus = ["mom", "nda", "company", "msa", "mou", "jik"].includes(
    type.toLowerCase()
  );

  // 🔁 fungsi handle untuk aksi custom (Send / Approve / Upload / Sign)
  // --- MODIFIKASI: Kirim 'onCustomAction' langsung ke ActionTable ---
  const handleCustomAction = async (action: string, row: any) => {
    // 💡 'Generate DOCX', 'Edit', 'Delete' akan ditangani oleh 'list-jik/page.tsx'
    //    Kita hanya perlu mem-bypass-nya ke onCustomAction
    if (onCustomAction) {
      onCustomAction(action, row);
    }

    // Logika 'Upload' dipisah karena menggunakan modal
    if (action === "Upload") {
      setSelectedRow(row);
      setUploadOpen(true);
      return; // stop di sini
    }

    // Logika 'Generate DOCX', 'Edit', 'Delete' tidak boleh memanggil API progress
    if (
      action === "Generate DOCX" ||
      action === "Edit" ||
      action === "Delete" ||
      action === "View" // View juga tidak
    ) {
      return; // stop di sini
    }

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          type: row.progress?.step?.name || type,
          action,
          current_status: row.progress?.status?.name,
        }),
      });

      if (!res.ok) throw new Error("Failed to update progress");

      const updated = await res.json();
      console.log("✅ Updated:", updated);

      // 🔁 Re-fetch data tabel sesuai tipe dokumen
      const refetchUrl = `/api/${type.toLowerCase()}`;
      const refreshRes = await fetch(refetchUrl);

      if (!refreshRes.ok) throw new Error("Failed to refetch data");

      const freshData = await refreshRes.json();
      
      // Cek jika data adalah array sebelum update
      if (Array.isArray(freshData)) {
        setRows(freshData);
      } else {
        console.error("Refetched data is not an array:", freshData);
      }

    } catch (err) {
      console.error("❌ Gagal update progress:", err);
    }
  };

  const handleUpload = async (file: File) => {
    if (!selectedRow) return;
    console.log("📁 Uploading file for:", selectedRow.id);

    try {
      // --- 1️⃣ Upload file ke MinIO lewat API uploads/attachment ---
      const formData = new FormData();
      formData.append("files", file);

      const uploadRes = await fetch("/api/uploads/attachment", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload gagal");

      const uploaded = await uploadRes.json();
      const fileUrl = uploaded?.url || uploaded?.[0]?.url;

      console.log("✅ File uploaded:", fileUrl);

      // --- 2️⃣ Kirim ke API /api/progress untuk update status + file URL ---
      const progressRes = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRow.id,
          type: selectedRow.progress?.step?.name || type,
          action: "Upload",
          current_status: selectedRow.progress?.status?.name,
          url: fileUrl, // 🆕 kirim URL hasil upload
        }),
      });

      if (!progressRes.ok) throw new Error("Gagal update progress");
      const updated = await progressRes.json();

      console.log("🧾 Progress updated:", updated);

      // --- 3️⃣ Re-fetch data untuk refresh tabel ---
      const refetch = await fetch(`/api/${type.toLowerCase()}`);
      const fresh = await refetch.json();
      
      if (Array.isArray(fresh)) {
         setRows(fresh);
      }

    } catch (err) {
      console.error("❌ Gagal upload atau update progress:", err);
    }

    setUploadOpen(false);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          {caption && <TableCaption>{caption}</TableCaption>}

          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">No</TableHead>

              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}

              {showStatus && <TableHead>Status</TableHead>}

              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center font-medium">
                    {i + 1}
                  </TableCell>

                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {getValue(row, col.key) ?? "-"}
                    </TableCell>
                  ))}

                  {showStatus && (
                    <TableCell>
                      <StatusTracker
                        stepName={row.progress?.step?.name || type}
                        currentStatus={
                          row.progress?.status?.name ||
                          row.status?.name ||
                          "Draft"
                        }
                      />
                    </TableCell>
                  )}

                  <TableCell className="text-right">
                    <ActionTable
                      row={row}
                      type={type}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onCustomAction={handleCustomAction}
                      generatingId={generatingId}
                      deletingId={deletingId} // <-- 3. KIRIM PROP KE ACTIONTABLE
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showStatus ? 3 : 2)}
                  className="text-center py-6 text-muted-foreground"
                >
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
        title={`Upload Dokumen ${type.toUpperCase()}`}
      />
    </>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { StatusTracker } from "./status-tracker";
// import { ActionTable } from "./action-table";
// import { UploadModal } from "../input/upload-modal";

// interface DataTableProps {
//   caption?: string;
//   columns: { key: string; label: string }[];
//   data: Record<string, any>[]; // initial data
//   type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
//   onCustomAction?: (action: string, row: any) => void; // DARI KODE ANDA
//   generatingId?: number | null; // <-- 1. TAMBAHKAN PROP INI
// }

// export function DataTable({
//   caption,
//   columns,
//   data,
//   type = "default",
//   onView,
//   onEdit,
//   onDelete,
//   onCustomAction, // DARI KODE ANDA
//   generatingId, // <-- 2. TERIMA PROP INI
// }: DataTableProps) {
//   // 🧠 state lokal supaya DataTable bisa refresh tanpa reload
//   const [rows, setRows] = useState<Record<string, any>[]>(data);
//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [selectedRow, setSelectedRow] = useState<any>(null);

//   // kalau prop data berubah dari luar, update state juga
//   useEffect(() => {
//     setRows(data);
//   }, [data]);

//   // ambil nested value dari object
//   const getValue = (obj: any, path: string) =>
//     path.split(".").reduce((acc, part) => acc && acc[part], obj);

//   // tampilkan kolom status untuk tipe tertentu
//   const showStatus =
//     ["mom", "nda", "company", "msa", "mou", "jik"].includes(type.toLowerCase());

//   // 🔁 fungsi handle untuk aksi custom (Send / Approve / Upload / Sign)
//   // --- MODIFIKASI: Kirim 'onCustomAction' langsung ke ActionTable ---
//   const handleCustomAction = async (action: string, row: any) => {
//     // 💡 'Generate DOCX' akan ditangani oleh 'list-jik/page.tsx'
//     //    Kita hanya perlu mem-bypass-nya ke onCustomAction
//     if (onCustomAction) {
//       onCustomAction(action, row);
//     }
    
//     // Logika 'Upload' dipisah karena menggunakan modal
//     if (action === "Upload") {
//       setSelectedRow(row);
//       setUploadOpen(true);
//       return; // stop di sini
//     }
    
//     // Logika 'Generate DOCX' tidak boleh memanggil API progress
//     if (action === "Generate DOCX") {
//       return; // stop di sini
//     }

//     try {
//       const res = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: row.id,
//           type: row.progress?.step?.name || type,
//           action,
//           current_status: row.progress?.status?.name,
//         }),
//       });

//       if (!res.ok) throw new Error("Failed to update progress");

//       const updated = await res.json();
//       console.log("✅ Updated:", updated);

//       // 🔁 Re-fetch data tabel sesuai tipe dokumen
//       const refetchUrl = `/api/${type.toLowerCase()}`;
//       const refreshRes = await fetch(refetchUrl);

//       if (!refreshRes.ok) throw new Error("Failed to refetch data");

//       const freshData = await refreshRes.json();

//       // 🧩 Update isi tabel tanpa reload halaman
//       setRows(freshData);
//     } catch (err) {
//       console.error("❌ Gagal update progress:", err);
//     }
//   };

//   const handleUpload = async (file: File) => {
//     if (!selectedRow) return;
//     console.log("📁 Uploading file for:", selectedRow.id);

//     try {
//       // --- 1️⃣ Upload file ke MinIO lewat API uploads/attachment ---
//       const formData = new FormData();
//       formData.append("files", file);

//       const uploadRes = await fetch("/api/uploads/attachment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!uploadRes.ok) throw new Error("Upload gagal");

//       const uploaded = await uploadRes.json();
//       const fileUrl = uploaded?.url || uploaded?.[0]?.url;

//       console.log("✅ File uploaded:", fileUrl);

//       // --- 2️⃣ Kirim ke API /api/progress untuk update status + file URL ---
//       const progressRes = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: selectedRow.id,
//           type: selectedRow.progress?.step?.name || type,
//           action: "Upload",
//           current_status: selectedRow.progress?.status?.name,
//           url: fileUrl, // 🆕 kirim URL hasil upload
//         }),
//       });

//       if (!progressRes.ok) throw new Error("Gagal update progress");
//       const updated = await progressRes.json();

//       console.log("🧾 Progress updated:", updated);

//       // --- 3️⃣ Re-fetch data untuk refresh tabel ---
//       const refetch = await fetch(`/api/${type.toLowerCase()}`);
//       const fresh = await refetch.json();
//       setRows(fresh);

//     } catch (err) {
//       console.error("❌ Gagal upload atau update progress:", err);
//     }

//     setUploadOpen(false);
//   };

//   return (
//     <>
//       <div className="overflow-x-auto rounded-xl border border-border">
//         <Table>
//           {caption && <TableCaption>{caption}</TableCaption>}

//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-[50px] text-center">No</TableHead>

//               {columns.map((col) => (
//                 <TableHead key={col.key}>{col.label}</TableHead>
//               ))}

//               {showStatus && <TableHead>Status</TableHead>}

//               <TableHead className="w-[60px]"></TableHead>
//             </TableRow>
//           </TableHeader>

//           <TableBody>
//             {rows.length > 0 ? (
//               rows.map((row, i) => (
//                 <TableRow key={i}>
//                   <TableCell className="text-center font-medium">
//                     {i + 1}
//                   </TableCell>

//                   {columns.map((col) => (
//                     <TableCell key={col.key}>
//                       {getValue(row, col.key) ?? "-"}
//                     </TableCell>
//                   ))}

//                   {showStatus && (
//                     <TableCell>
//                       <StatusTracker
//                         stepName={row.progress?.step?.name || type}
//                         currentStatus={row.progress?.status?.name || row.status?.name || "Draft"}
//                       />
//                     </TableCell>
//                   )}

//                   <TableCell className="text-right">
//                     <ActionTable
//                       row={row}
//                       type={type}
//                       onView={onView}
//                       onEdit={onEdit}
//                       onDelete={onDelete}
//                       onCustomAction={handleCustomAction}
//                       generatingId={generatingId} // <-- 3. KIRIM PROP KE ACTIONTABLE
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell
//                   colSpan={columns.length + (showStatus ? 3 : 2)}
//                   className="text-center py-6 text-muted-foreground"
//                 >
//                   No data available
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>

//       <UploadModal
//           open={uploadOpen}
//           onClose={() => setUploadOpen(false)}
//           onSubmit={handleUpload}
//           title={`Upload Dokumen ${type.toUpperCase()}`}
//         />
//       </>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { StatusTracker } from "./status-tracker";
// import { ActionTable } from "./action-table";
// import { UploadModal } from "../input/upload-modal";

// interface DataTableProps {
//   caption?: string;
//   columns: { key: string; label: string }[];
//   data: Record<string, any>[]; // initial data
//   type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
//   onView?: (row: any) => void;
//   onEdit?: (row: any) => void;
//   onDelete?: (row: any) => void;
// }

// export function DataTable({
//   caption,
//   columns,
//   data,
//   type = "default",
//   onView,
//   onEdit,
//   onDelete,
// }: DataTableProps) {
//   // 🧠 state lokal supaya DataTable bisa refresh tanpa reload
//   const [rows, setRows] = useState<Record<string, any>[]>(data);
//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [selectedRow, setSelectedRow] = useState<any>(null);

//   // kalau prop data berubah dari luar, update state juga
//   useEffect(() => {
//     setRows(data);
//   }, [data]);

//   // ambil nested value dari object
//   const getValue = (obj: any, path: string) =>
//     path.split(".").reduce((acc, part) => acc && acc[part], obj);

//   // tampilkan kolom status untuk tipe tertentu
//   const showStatus =
//     ["mom", "nda", "company", "msa", "mou", "jik"].includes(type.toLowerCase());

//   // 🔁 fungsi handle untuk aksi custom (Send / Approve / Upload / Sign)
//   const handleCustomAction = async (action: string, row: any) => {
//     if (action === "Upload") {
//       setSelectedRow(row);
//       setUploadOpen(true);
//       return; // stop di sini biar gak lanjut ke fetch progress
//     }

//     try {
//       const res = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: row.id,
//           type: row.progress?.step?.name || type,
//           action,
//           current_status: row.progress?.status?.name,
//         }),
//       });

//       if (!res.ok) throw new Error("Failed to update progress");

//       const updated = await res.json();
//       console.log("✅ Updated:", updated);

//       // 🔁 Re-fetch data tabel sesuai tipe dokumen
//       const refetchUrl = `/api/${type.toLowerCase()}`;
//       const refreshRes = await fetch(refetchUrl);

//       if (!refreshRes.ok) throw new Error("Failed to refetch data");

//       const freshData = await refreshRes.json();

//       // 🧩 Update isi tabel tanpa reload halaman
//       setRows(freshData);
//     } catch (err) {
//       console.error("❌ Gagal update progress:", err);
//     }
//   };

//   const handleUpload = async (file: File) => {
//     if (!selectedRow) return;
//     console.log("📁 Uploading file for:", selectedRow.id);

//     try {
//       // --- 1️⃣ Upload file ke MinIO lewat API uploads/attachment ---
//       const formData = new FormData();
//       formData.append("files", file);

//       const uploadRes = await fetch("/api/uploads/attachment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!uploadRes.ok) throw new Error("Upload gagal");

//       const uploaded = await uploadRes.json();
//       const fileUrl = uploaded?.url || uploaded?.[0]?.url;

//       console.log("✅ File uploaded:", fileUrl);

//       // --- 2️⃣ Kirim ke API /api/progress untuk update status + file URL ---
//       const progressRes = await fetch("/api/progress", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: selectedRow.id,
//           type: selectedRow.progress?.step?.name || type,
//           action: "Upload",
//           current_status: selectedRow.progress?.status?.name,
//           url: fileUrl, // 🆕 kirim URL hasil upload
//         }),
//       });

//       if (!progressRes.ok) throw new Error("Gagal update progress");
//       const updated = await progressRes.json();

//       console.log("🧾 Progress updated:", updated);

//       // --- 3️⃣ Re-fetch data untuk refresh tabel ---
//       const refetch = await fetch(`/api/${type.toLowerCase()}`);
//       const fresh = await refetch.json();
//       setRows(fresh);

//     } catch (err) {
//       console.error("❌ Gagal upload atau update progress:", err);
//     }

//     setUploadOpen(false);
//   };

//   return (
//     <>
//       <div className="overflow-x-auto rounded-xl border border-border">
//         <Table>
//           {caption && <TableCaption>{caption}</TableCaption>}

//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-[50px] text-center">No</TableHead>

//               {columns.map((col) => (
//                 <TableHead key={col.key}>{col.label}</TableHead>
//               ))}

//               {showStatus && <TableHead>Status</TableHead>}

//               <TableHead className="w-[60px]"></TableHead>
//             </TableRow>
//           </TableHeader>

//           <TableBody>
//             {rows.length > 0 ? (
//               rows.map((row, i) => (
//                 <TableRow key={i}>
//                   <TableCell className="text-center font-medium">
//                     {i + 1}
//                   </TableCell>

//                   {columns.map((col) => (
//                     <TableCell key={col.key}>
//                       {getValue(row, col.key) ?? "-"}
//                     </TableCell>
//                   ))}

//                   {showStatus && (
//                     <TableCell>
//                       <StatusTracker
//                         stepName={row.progress?.step?.name || type}
//                         currentStatus={row.progress?.status?.name || row.status?.name || "Draft"}
//                       />
//                     </TableCell>
//                   )}

//                   <TableCell className="text-right">
//                     <ActionTable
//                       row={row}
//                       type={type}
//                       onView={onView}
//                       onEdit={onEdit}
//                       onDelete={onDelete}
//                       onCustomAction={handleCustomAction}
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell
//                   colSpan={columns.length + (showStatus ? 3 : 2)}
//                   className="text-center py-6 text-muted-foreground"
//                 >
//                   No data available
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>

//       <UploadModal
//           open={uploadOpen}
//           onClose={() => setUploadOpen(false)}
//           onSubmit={handleUpload}
//           title={`Upload Dokumen ${type.toUpperCase()}`}
//         />
//       </>
//   );
// }
