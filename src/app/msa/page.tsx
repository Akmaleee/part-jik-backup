"use client";

import { UploadModal } from "@/components/input/upload-modal";
import { DataTable } from "@/components/layout/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function MsaPage() {
  const [msas, setMsas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Ambil data awal
  useEffect(() => {
    setLoading(true);

    fetch("/api/msa")
      .then((res) => res.json())
      .then((data) => {
        setMsas(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const columns = [
    { key: "company.name", label: "Nama Perusahaan" },
    { key: "step.name", label: "Jenis Dokumen" },
  ];

  // 🔍 Filter data secara real-time
  const filteredNdas = useMemo(() => {
    return msas.filter((c) =>
      c.company?.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [msas, filter]);

  // 📤 Upload file ke server eksternal + simpan ke /api/document
  const handleUpload = async (file: File, companyId?: string) => {
    if (!companyId) {
      alert("Silakan pilih perusahaan terlebih dahulu");
      return;
    }

    try {
      // 1️⃣ Upload file ke server eksternal
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("http://10.83.252.204:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Gagal upload file eksternal");

      const result = await uploadRes.json();
      const fileUrl = result?.data?.url;

      console.log("✅ File berhasil diupload:", fileUrl);

      // 2️⃣ Kirim data ke backend kamu (/api/document)
      const docPayload = {
        companyId,
        fileUrl,
        fileName: result?.data?.file,
        step_name: "MSA",
        status: result?.data?.status ?? "processing",
      };

      const documentRes = await fetch("/api/document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(docPayload),
      });

      if (!documentRes.ok) throw new Error("Gagal simpan data ke /api/document");

      const newDoc = await documentRes.json();

      // 3️⃣ Tambahkan hasil ke state
      setMsas((prev) => [...prev, newDoc]);
      console.log("📄 Dokumen berhasil disimpan:", newDoc);
    } catch (err) {
      console.error("❌ Proses upload gagal:", err);
      alert("Upload gagal, periksa console untuk detail.");
    }
  };

  return (
    <div className="p-6">
      <Card className="shadow-md bg-white rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-2xl font-bold">MSA Tracker</CardTitle>

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

            {/* Tombol tambah */}
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium w-8 h-8 rounded-sm shadow transition duration-200 flex items-center justify-center"
              onClick={() => setIsOpen(true)}
              title="Upload MSA Baru"
            >
              +
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span>Loading data...</span>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredNdas} type="nda" />
          )}
        </CardContent>
      </Card>

      {/* Modal Upload */}
      <UploadModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleUpload}
        title="Upload MSA Baru"
        isSelectCompany={1} // tampilkan dropdown company
      />
    </div>
  );
}