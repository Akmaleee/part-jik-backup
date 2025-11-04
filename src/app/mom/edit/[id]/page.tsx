
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import DetailDocument from "@/app/mom/create/detail-document";
import ContentDocument, { MomContentSection } from "@/app/mom/create/content-document";
import NextActionDocument from "@/app/mom/create/next-action-document";
import { ApproverDocument } from "@/app/mom/create/approver-document";
import AttachmentDocument from "@/app/mom/create/attachment-document";

// Interface ini harus sama dengan di halaman create
export interface MomForm {
  companyId: string;
  judul: string;
  tanggalMom: string;
  peserta: string;
  venue: string;
  waktu: string;
  content: MomContentSection[];
  approvers: { name: string; email: string; type: string }[];
  // Tipe 'files' diubah menjadi 'any[]' untuk menerima data dari DB (objek) dan file baru (File)
  attachments: { sectionName: string, files: any[] }[];
  nextActions: { action: string; target: string; pic: string }[];
}

// Tipe data yang diharapkan dari API GET /api/mom/[id]
interface FetchedMomData {
  id: number;
  title: string;
  company_id: number;
  date: string; // ISO string date
  time: string;
  venue: string;
  count_attendees: string | null;
  content: MomContentSection[];
  approvers: { name: string; email: string; type: string }[];
  next_actions: { action: string; target: string; pic: string }[];
  attachments: {
    id: number;
    section_name: string;
    files: { id: number; file_name: string; url: string }[];
  }[];
}

export default function EditMomPage() {
  const router = useRouter();
  const params = useParams();
  const momId = params.id as string;

  // State utama form, null saat awal
  const [form, setForm] = useState<MomForm | null>(null);
  
  // State loading untuk submit
  const [loading, setLoading] = useState(false);
  // State loading untuk fetch data awal
  const [isFetching, setIsFetching] = useState(true);

  // Fetch data MOM saat halaman dimuat
  useEffect(() => {
    if (!momId) return;

    async function fetchMomData() {
      setIsFetching(true);
      try {
        const res = await fetch(`/api/mom/${momId}`); // Asumsi GET route ini ada
        if (!res.ok) {
          throw new Error("Gagal mengambil data MOM. Mungkin tidak ditemukan.");
        }
        
        const data: FetchedMomData = await res.json();

        // Format data dari database agar sesuai dengan state MomForm
        const formattedForm: MomForm = {
          judul: data.title,
          companyId: data.company_id.toString(),
          // Format tanggal YYYY-MM-DD untuk input date
          tanggalMom: new Date(data.date).toISOString().split('T')[0], 
          waktu: data.time,
          venue: data.venue,
          peserta: data.count_attendees || "",
          content: data.content,
          approvers: data.approvers || [],
          nextActions: data.next_actions || [],
          attachments: data.attachments.map(att => ({
            sectionName: att.section_name,
            files: att.files || [] // Ini adalah objek {id, file_name, url}
          })) || [],
        };
        
        setForm(formattedForm);

      } catch (err: any) {
        console.error(err);
        alert(err.message);
        router.push("/mom/list-mom"); // Kembali ke list jika gagal
      } finally {
        setIsFetching(false);
      }
    }

    fetchMomData();
  }, [momId, router]);

  // Handler standar
  const handleContentChange = useCallback((sections: MomContentSection[]) => {
    setForm((prev) => (prev ? { ...prev, content: sections } : null));
  }, []);

  function handleChange(field: string, value: any) {
    setForm((prev) => (prev ? { ...prev, [field as keyof MomForm]: value } : null));
  }

  // Handler untuk submit (UPDATE)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    const submitter = (e.nativeEvent as any).submitter;
    const isFinish = submitter?.name === "finish" ? 1 : 0;

    // Validasi
    const required = ["companyId", "judul", "tanggalMom", "peserta", "venue", "waktu"];
    for (const field of required) {
      const value = form[field as keyof MomForm];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        alert(`Field ${field} wajib diisi.`);
        return;
      }
    }

    setLoading(true);
    try {
      // Logika upload attachment yang kompleks:
      // Pisahkan file yang sudah ada (objek) dengan file baru (File)
      const uploadedAttachments = await Promise.all(
        form.attachments.map(async (section) => {
          const newFiles = section.files.filter(f => f instanceof File) as File[];
          const existingFiles = section.files.filter(f => !(f instanceof File));

          // Jika tidak ada file baru, kembalikan file yang sudah ada
          if (newFiles.length === 0) {
            return {
              sectionName: section.sectionName,
              files: existingFiles,
            };
          }

          // Jika ada file baru, upload
          const formData = new FormData();
          newFiles.forEach((file) => formData.append("files", file));

          const res = await fetch("/api/uploads/attachment", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Gagal upload file baru di section " + section.sectionName);
          const uploaded = await res.json();
          const filesArray = Array.isArray(uploaded) ? uploaded : [uploaded];

          // Gabungkan file lama dan file yang baru diupload
          return {
            sectionName: section.sectionName,
            files: [...existingFiles, ...filesArray],
          };
        })
      );

      const payload = {
        ...form,
        attachments: uploadedAttachments,
        content: form.content.map((s: any) => ({
          label: s.label,
          content: s.content || "",
        })),
        approvers: form.approvers.filter(
          (a) => a.name.trim() || a.email.trim()
        ),
        nextActions: form.nextActions.filter(
          (a) => a.action.trim() || a.target.trim() || a.pic.trim()
        ),
        is_finish: isFinish,
      };

      // Panggil API PUT/PATCH, bukan POST
      const res = await fetch(`/api/mom/${momId}`, {
        method: "PUT", // Gunakan PUT untuk update
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal update MOM");
      }

      alert("MOM berhasil di-update!");
      router.push("/mom/list-mom"); // Kembali ke list setelah sukses
    } catch (err: any) {
      console.error(err);
      alert("Gagal meng-update MOM: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Tampilkan loading saat data awal sedang diambil
  if (isFetching || !form) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl text-center">
        <p>Loading data MOM...</p>
      </div>
    );
  }

  // Render form setelah data siap
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Edit Minutes of Meeting</h1>
      <form onSubmit={handleSubmit}>
        <DetailDocument form={form} setForm={setForm} handleChange={handleChange} />
        
        {/* Komponen ContentDocument Anda HARUS dimodifikasi 
          untuk menerima 'initialContent' 
        */}
        <ContentDocument 
          initialContent={form.content} 
          onChange={handleContentChange} 
        />
        
        <NextActionDocument form={form} setForm={setForm} handleChange={handleChange} />
        <ApproverDocument form={form} handleChange={handleChange} />
        
        {/* Komponen AttachmentDocument Anda HARUS dimodifikasi 
          untuk menerima 'initialSections' 
        */}
        <AttachmentDocument 
          sections={form.attachments} 
          handleChange={handleChange} 
        />

        <div className="w-full bg-white rounded-2xl shadow p-6">
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/mom/list-mom")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" name="save" disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
            <Button type="submit" name="finish" disabled={loading}>
              {loading ? "Updating..." : "Update & Finish"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
