"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import ContentDocument, { MomContentSection } from "./content-document";
import DetailDocument from "./detail-document";
import NextActionDocument from "./next-action-document";
import { ApproverDocument } from "./approver-document";
import AttachmentDocument from "@/app/mom/create/attachment-document";
import { Loader2 } from "lucide-react"; // Import Loader2

export interface MomForm {
  companyId: string;
  judul: string;
  tanggalMom: string;
  peserta: string;
  venue: string;
  waktu: string;
  content: MomContentSection[];
  approvers: { approver_id: number; }[];
  attachments: { sectionName: string; files: File[] }[];
  nextActions: { action: string; target: string; pic: string }[];
}

interface Company {
  id: string;
  name: string;
}

export default function CreateMomPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<MomForm>({
    companyId: "",
    judul: "",
    tanggalMom: "",
    peserta: "",
    venue: "",
    waktu: "",
    content: [],
    approvers: [{ approver_id: 0 }],
    attachments: [{ sectionName: "", files: []  }],
    nextActions: [{ action: "", target: "", pic: "" }],
  });

  // State 'generatedMomId' dihapus
  // State ini tetap dipakai untuk status loading tombol
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false); 
  
  const handleContentChange = useCallback((sections: MomContentSection[]) => {
    setForm((prev) => ({ ...prev, content: sections }));
  }, []);

  function handleChange(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field as keyof MomForm]: value }));
  }

  // ✅ FUNGSI BARU: Untuk generate dan langsung send ke endpoint
  async function generateAndSendDocx(momId: string, momTitle: string) {
    console.log(`MOM ${momId} dibuat, memulai generate DOCX...`);
    try {
      // 1. Panggil API untuk generate DOCX
      const docxResponse = await fetch('/api/mom/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ momId: momId }),
      });

      if (!docxResponse.ok) {
        const errorData = await docxResponse.json();
        throw new Error(errorData.error || 'Gagal generate DOCX');
      }

      const blob = await docxResponse.blob();
      
      // Ambil nama file dari header (opsional tapi bagus)
      const contentDisposition = docxResponse.headers.get('content-disposition');
      let fileName = `MOM_${momTitle.replace(/ /g, "_")}_${momId}.docx`;
      if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
          if (fileNameMatch && fileNameMatch.length > 1) {
              fileName = fileNameMatch[1].replace(/"$/, '');
          }
      }
      
      console.log(`DOCX (${fileName}) berhasil digenerate, mengupload ke endpoint...`);

      // 2. Kirim file (blob) ke endpoint eksternal
      const formData = new FormData();
      formData.append("file", blob, fileName); // Nama field "file"
      
      const uploadResponse = await fetch('http://10.83.252.204:8000/upload', {
        method: 'POST',
        body: formData,
        // (Tidak perlu 'Content-Type', FormData menanganinya sendiri)
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        throw new Error(`Gagal upload DOCX ke http://10.83.252.204:8000/upload. Error: ${uploadError}`);
      }

      console.log("DOCX berhasil di-upload ke endpoint eksternal.");
      alert("MOM berhasil disimpan, dan DOCX berhasil di-upload ke server.");

    } catch (error: any) {
      console.error("Kesalahan saat generate atau send DOCX:", error);
      // MOM sudah tersimpan, jadi jangan hentikan user, cukup beri peringatan
      alert(`Peringatan: MOM berhasil disimpan, TETAPI gagal generate/upload DOCX otomatis. Error: ${error.message}`);
    }
  }

  // ✅ FUNGSI handleSubmit (DIMODIFIKASI)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const submitter = (e.nativeEvent as any).submitter;
    const isFinish = submitter?.name === "finish"; // Cek apakah "Save & Finish"

    const required = ["companyId", "judul", "tanggalMom", "peserta", "venue", "waktu"];
    for (const field of required) {
      // ... (logika validasi Anda sudah benar)
      const value = form[field as keyof MomForm];
      if (typeof value === "string" && value.trim() === "") {
        alert(`Field ${field} wajib diisi.`);
        return;
      }
      if (value === null || value === undefined) {
        alert(`Field ${field} wajib diisi.`);
        return;
      }
    }

    // ... (Logika upload attachment Anda sudah benar)
    const uploadedAttachments = await Promise.all(
      form.attachments.map(async (section) => {
        const isFileArray = Array.isArray(section.files) && section.files.some(f => f instanceof File);
        if (!isFileArray) {
          return { sectionName: section.sectionName, files: section.files || [] };
        }
        const formData = new FormData();
        section.files.forEach((file) => {
          if (file instanceof File) formData.append("files", file);
        });
        const res = await fetch("/api/uploads/attachment", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Gagal upload file di section " + section.sectionName);
        const uploaded = await res.json();
        const filesArray = Array.isArray(uploaded) ? uploaded : [uploaded];
        return { sectionName: section.sectionName, files: filesArray };
      })
    );

    // ... (Logika payload Anda sudah benar)
    const formatted = form.content.map((s: any) => ({
      label: s.label,
      content: s.content || "",
    }));
    const payload = {
      ...form,
      attachments: uploadedAttachments,
      content: formatted,
      approvers: form.approvers
        .filter((a) => a.approver_id) // pastikan id ada
        .map((a) => ({
          approver_id: a.approver_id,
        })),
      nextActions: form.nextActions.filter(
        (a) => a.action.trim() || a.target.trim() || a.pic.trim()
      ),
      is_finish: isFinish ? 1 : 0, // Kirim status finish
    };

    setLoading(true); // Tampilkan loading "Saving..."
    try {
      // 1. Simpan MOM
      const res = await fetch("/api/mom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal create MOM");
      }

      const data = await res.json();
      const newMomId = data?.data?.id; // Ambil ID MOM baru

      // 2. Cek jika "Save & Finish" ditekan
      if (isFinish && newMomId) {
        setLoading(false); // Matikan loading "Saving..."
        setIsGeneratingDocx(true); // Nyalakan loading "Generating..."
        
        // Panggil fungsi generate dan upload
        await generateAndSendDocx(newMomId.toString(), payload.judul); 
        
        setIsGeneratingDocx(false); // Matikan loading "Generating..."
      } else {
        alert("MOM berhasil disimpan!");
      }
      
      router.push("/mom/list-mom"); // Redirect ke list

    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan MOM: " + err.message);
      setLoading(false); // Matikan loading jika ada error
      setIsGeneratingDocx(false); // Pastikan ini juga mati
    }
  }

  // Fungsi 'handleGenerateDocx' yang lama dihapus

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <form onSubmit={handleSubmit}>
        <DetailDocument form={form} setForm={setForm} handleChange={handleChange} /> 
        <ContentDocument onChange={handleContentChange}/>
        <NextActionDocument form={form} setForm={setForm} handleChange={handleChange} />
        <ApproverDocument form={form} handleChange={handleChange} />
        <AttachmentDocument sections={form.attachments} handleChange={handleChange} />

        <div className="w-full bg-white rounded-2xl shadow p-6">
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading || isGeneratingDocx} // Nonaktifkan saat proses
            >
              Cancel
            </Button>
            <Button type="submit" name="save" disabled={loading || isGeneratingDocx}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button type="submit" name="finish" disabled={loading || isGeneratingDocx}>
              {isGeneratingDocx ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isGeneratingDocx ? "Uploading..." : (loading ? "Saving..." : "Save & Finish")}
            </Button>
            {/* Tombol Generate DOCX manual dihapus */}
          </div>
        </div>
      </form>
    </div>
  );
}


// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { Button } from "@/components/ui/button";
// import { useRouter } from "next/navigation";
// import ContentDocument, { MomContentSection } from "./content-document";
// import DetailDocument from "./detail-document";
// import NextActionDocument from "./next-action-document";
// import { ApproverDocument } from "./approver-document";
// import AttachmentDocument from "@/app/mom/create/attachment-document";
// import { Loader2 } from "lucide-react"; // Import Loader2

// export interface MomForm {
//   companyId: string;
//   judul: string;
//   tanggalMom: string;
//   peserta: string;
//   venue: string;
//   waktu: string;
//   content: MomContentSection[];
//   approvers: { name: string; email: string; type: string }[];
//   attachments: { sectionName: string; files: File[] }[];
//   nextActions: { action: string; target: string; pic: string }[];
// }

// interface Company {
//   id: string;
//   name: string;
// }

// export default function CreateMomPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [companies, setCompanies] = useState<Company[]>([]);
//   const [form, setForm] = useState<MomForm>({
//     companyId: "",
//     judul: "",
//     tanggalMom: "",
//     peserta: "",
//     venue: "",
//     waktu: "",
//     content: [],
//     approvers: [{ name: "", email: "", type: "Internal" }],
//     attachments: [{ sectionName: "", files: []  }],
//     nextActions: [{ action: "", target: "", pic: "" }],
//   });

//   // State 'generatedMomId' dihapus
//   // State ini tetap dipakai untuk status loading tombol
//   const [isGeneratingDocx, setIsGeneratingDocx] = useState(false); 
  
//   const handleContentChange = useCallback((sections: MomContentSection[]) => {
//     setForm((prev) => ({ ...prev, content: sections }));
//   }, []);

//   function handleChange(field: string, value: any) {
//     setForm((prev) => ({ ...prev, [field as keyof MomForm]: value }));
//   }

//   // ✅ FUNGSI BARU: Untuk generate dan langsung send ke endpoint
//   async function generateAndSendDocx(momId: string, momTitle: string) {
//     console.log(`MOM ${momId} dibuat, memulai generate DOCX...`);
//     try {
//       // 1. Panggil API untuk generate DOCX
//       const docxResponse = await fetch('/api/mom/generate-docx', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ momId: momId }),
//       });

//       if (!docxResponse.ok) {
//         const errorData = await docxResponse.json();
//         throw new Error(errorData.error || 'Gagal generate DOCX');
//       }

//       const blob = await docxResponse.blob();
      
//       // Ambil nama file dari header (opsional tapi bagus)
//       const contentDisposition = docxResponse.headers.get('content-disposition');
//       let fileName = `MOM_${momTitle.replace(/ /g, "_")}_${momId}.docx`;
//       if (contentDisposition) {
//           const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
//           if (fileNameMatch && fileNameMatch.length > 1) {
//               fileName = fileNameMatch[1].replace(/"$/, '');
//           }
//       }
      
//       console.log(`DOCX (${fileName}) berhasil digenerate, mengupload ke endpoint...`);

//       // 2. Kirim file (blob) ke endpoint eksternal
//       const formData = new FormData();
//       formData.append("file", blob, fileName); // Nama field "file"
      
//       const uploadResponse = await fetch('http://10.83.252.204:8000/upload', {
//         method: 'POST',
//         body: formData,
//         // (Tidak perlu 'Content-Type', FormData menanganinya sendiri)
//       });

//       if (!uploadResponse.ok) {
//         const uploadError = await uploadResponse.text();
//         throw new Error(`Gagal upload DOCX ke http://10.83.252.204:8000/upload. Error: ${uploadError}`);
//       }

//       console.log("DOCX berhasil di-upload ke endpoint eksternal.");
//       alert("MOM berhasil disimpan, dan DOCX berhasil di-upload ke server.");

//     } catch (error: any) {
//       console.error("Kesalahan saat generate atau send DOCX:", error);
//       // MOM sudah tersimpan, jadi jangan hentikan user, cukup beri peringatan
//       alert(`Peringatan: MOM berhasil disimpan, TETAPI gagal generate/upload DOCX otomatis. Error: ${error.message}`);
//     }
//   }

//   // ✅ FUNGSI handleSubmit (DIMODIFIKASI)
//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();

//     const submitter = (e.nativeEvent as any).submitter;
//     const isFinish = submitter?.name === "finish"; // Cek apakah "Save & Finish"

//     const required = ["companyId", "judul", "tanggalMom", "peserta", "venue", "waktu"];
//     for (const field of required) {
//       // ... (logika validasi Anda sudah benar)
//       const value = form[field as keyof MomForm];
//       if (typeof value === "string" && value.trim() === "") {
//         alert(`Field ${field} wajib diisi.`);
//         return;
//       }
//       if (value === null || value === undefined) {
//         alert(`Field ${field} wajib diisi.`);
//         return;
//       }
//     }

//     // ... (Logika upload attachment Anda sudah benar)
//     const uploadedAttachments = await Promise.all(
//       form.attachments.map(async (section) => {
//         const isFileArray = Array.isArray(section.files) && section.files.some(f => f instanceof File);
//         if (!isFileArray) {
//           return { sectionName: section.sectionName, files: section.files || [] };
//         }
//         const formData = new FormData();
//         section.files.forEach((file) => {
//           if (file instanceof File) formData.append("files", file);
//         });
//         const res = await fetch("/api/uploads/attachment", { method: "POST", body: formData });
//         if (!res.ok) throw new Error("Gagal upload file di section " + section.sectionName);
//         const uploaded = await res.json();
//         const filesArray = Array.isArray(uploaded) ? uploaded : [uploaded];
//         return { sectionName: section.sectionName, files: filesArray };
//       })
//     );

//     // ... (Logika payload Anda sudah benar)
//     const formatted = form.content.map((s: any) => ({
//       label: s.label,
//       content: s.content || "",
//     }));
//     const payload = {
//       ...form,
//       attachments: uploadedAttachments,
//       content: formatted,
//       approvers: form.approvers.filter(
//         (a) => a.name.trim() !== "" || a.email.trim() !== ""
//       ),
//       nextActions: form.nextActions.filter(
//         (a) => a.action.trim() || a.target.trim() || a.pic.trim()
//       ),
//       is_finish: isFinish ? 1 : 0, // Kirim status finish
//     };

//     setLoading(true); // Tampilkan loading "Saving..."
//     try {
//       // 1. Simpan MOM
//       const res = await fetch("/api/mom", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const errorData = await res.json();
//         throw new Error(errorData.error || "Gagal create MOM");
//       }

//       const data = await res.json();
//       const newMomId = data?.data?.id; // Ambil ID MOM baru

//       // 2. Cek jika "Save & Finish" ditekan
//       if (isFinish && newMomId) {
//         setLoading(false); // Matikan loading "Saving..."
//         setIsGeneratingDocx(true); // Nyalakan loading "Generating..."
        
//         // Panggil fungsi generate dan upload
//         await generateAndSendDocx(newMomId.toString(), payload.judul); 
        
//         setIsGeneratingDocx(false); // Matikan loading "Generating..."
//       } else {
//         alert("MOM berhasil disimpan!");
//       }
      
//       router.push("/mom/list-mom"); // Redirect ke list

//     } catch (err: any) {
//       console.error(err);
//       alert("Gagal menyimpan MOM: " + err.message);
//       setLoading(false); // Matikan loading jika ada error
//       setIsGeneratingDocx(false); // Pastikan ini juga mati
//     }
//   }

//   // Fungsi 'handleGenerateDocx' yang lama dihapus

//   return (
//     <div className="container mx-auto py-8 px-4 max-w-6xl">
//       <form onSubmit={handleSubmit}>
//         <DetailDocument form={form} setForm={setForm} handleChange={handleChange} /> 
//         <ContentDocument onChange={handleContentChange}/>
//         <NextActionDocument form={form} setForm={setForm} handleChange={handleChange} />
//         <ApproverDocument form={form} handleChange={handleChange} />
//         <AttachmentDocument sections={form.attachments} handleChange={handleChange} />

//         <div className="w-full bg-white rounded-2xl shadow p-6">
//           <div className="flex gap-4 justify-end">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => router.back()}
//               disabled={loading || isGeneratingDocx} // Nonaktifkan saat proses
//             >
//               Cancel
//             </Button>
//             <Button type="submit" name="save" disabled={loading || isGeneratingDocx}>
//               {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//               Save
//             </Button>
//             <Button type="submit" name="finish" disabled={loading || isGeneratingDocx}>
//               {isGeneratingDocx ? (
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//               ) : null}
//               {isGeneratingDocx ? "Uploading..." : (loading ? "Saving..." : "Save & Finish")}
//             </Button>
//             {/* Tombol Generate DOCX manual dihapus */}
//           </div>
//         </div>
//       </form>
//     </div>
//   );
// }


// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { DurationTimeInput, InputString } from "@/components/input";
// import { CreateCompanyModal } from "@/components/company/create-modal";
// import { Button } from "@/components/ui/button";
// import { useRouter } from "next/navigation";
// import InputSelect from "@/components/input/input-select";
// import RichTextInput from "@/components/input/rich-text-input";
// import ContentDocument, { MomContentSection } from "./content-document";
// import type { JSONContent } from "@tiptap/react";
// import Attachment from "@/app/mom/create/attachment-document";
// import DetailDocument from "./detail-document";
// import NextActionDocument from "./next-action-document";
// import { ApproverDocument } from "./approver-document";
// import AttachmentDocument from "@/app/mom/create/attachment-document";

// export interface MomForm {
//   companyId: string;
//   judul: string;
//   tanggalMom: string;
//   peserta: string;
//   venue: string;
//   waktu: string;
//   content: MomContentSection[];
//   approvers: {name: string}[];
//   attachments: { sectionName: string, files: File[] }[];
//   nextActions: { action: string; target: string; pic: string }[];
// }

// interface Company {
//   id: string;
//   name: string;
// }

// export default function CreateMomPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [companies, setCompanies] = useState<Company[]>([]);
//   const [form, setForm] = useState<MomForm>({
//     companyId: "",
//     judul: "",
//     tanggalMom: "",
//     peserta: "",
//     venue: "",
//     waktu: "",
//     content: [],
//     approvers: [{ name: "" }],
//     attachments: [{ sectionName: "", files: []  }],
//     nextActions: [{ action: "", target: "", pic: "" }],
//   });
  
//   const handleContentChange = useCallback((sections: MomContentSection[]) => {
//     setForm((prev) => ({ ...prev, content: sections }));
//   }, []);

//   function handleChange(field: keyof MomForm, value: string) {
//     setForm((prev) => ({ ...prev, [field]: value }));
//   }

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();

//     const submitter = (e.nativeEvent as any).submitter;
//     const isFinish = submitter?.name === "finish" ? 1 : 0;

//     const required = ["companyId", "judul", "tanggalMom", "peserta", "venue", "waktu"];
//     for (const field of required) {
//       const value = form[field as keyof MomForm];

//       // kalau string, pastiin gak kosong
//       if (typeof value === "string" && value.trim() === "") {
//         alert(`Field ${field} wajib diisi.`);
//         return;
//       }

//       // kalau null/undefined
//       if (value === null || value === undefined) {
//         alert(`Field ${field} wajib diisi.`);
//         return;
//       }
//     }

//     // 1️⃣ Upload semua attachments ke MinIO
//     const uploadedAttachments = await Promise.all(
//       form.attachments.map(async (section) => {
//         // kalau ga ada file baru (misal sudah terupload)
//         const isFileArray = Array.isArray(section.files) && section.files.some(f => f instanceof File);
//         if (!isFileArray) {
//           // tetap kembalikan section agar ga hilang
//           return {
//             sectionName: section.sectionName,
//             files: section.files || [],
//           };
//         }

//         const formData = new FormData();
//         section.files.forEach((file) => {
//           if (file instanceof File) formData.append("files", file);
//         });

//         const res = await fetch("/api/uploads/attachment", {
//           method: "POST",
//           body: formData,
//         });

//         if (!res.ok) throw new Error("Gagal upload file di section " + section.sectionName);
//         const uploaded = await res.json();

//         // kalau single object, ubah jadi array
//         const filesArray = Array.isArray(uploaded) ? uploaded : [uploaded];

//         return {
//           sectionName: section.sectionName,
//           files: filesArray,
//         };
//       })
//     );

//     console.log("✅ Semua attachments:", uploadedAttachments);

//     // Format konten dari ContentDocument (TipTap)
//     const formatted = form.content.map((s: any) => ({
//       label: s.label, // pastikan title dari ContentDocument
//       content: s.content || "",
//     }));

//     // Gabung ke payload
//     const payload = {
//       ...form,
//       attachments: uploadedAttachments,
//       content: formatted,
//       nextActions: form.nextActions.filter(
//         (a) => a.action.trim() || a.target.trim() || a.pic.trim()
//       ),
//       is_finish: isFinish,
//     };

//     setLoading(true);
//     try {
//       const res = await fetch("/api/mom", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload), // ✅ pake payload, bukan form
//       });

//       if (!res.ok) throw new Error("Gagal create MOM");

//       const data = await res.json();
//       alert("MOM berhasil dibuat!");

//       router.push(`/mom/list-mom`);
//     } catch (err) {
//       console.error(err);
//       alert("Gagal menyimpan MOM. Cek console untuk detail.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="container mx-auto py-8 px-4 max-w-6xl">
//       <form onSubmit={handleSubmit}>
//         {/* Detail MOM Section */}
//         <DetailDocument form={form} setForm={setForm} handleChange={handleChange} />
        
//         {/* Content MOM Section */}
//         <ContentDocument onChange={handleContentChange}/>
        
//         {/* Next Action Section */}
//         <NextActionDocument form={form} setForm={setForm} handleChange={handleChange} />

//         {/* Approver Section */}
//         <ApproverDocument form={form} handleChange={handleChange} />

//         {/* Attachment Section */}
//         <AttachmentDocument sections={form.attachments} handleChange={handleChange} />

//         {/* Action Buttons */}
//         <div className="w-full bg-white rounded-2xl shadow p-6">
//           <div className="flex gap-4 justify-end">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => router.back()}
//               disabled={loading}
//             >
//               Cancel
//             </Button>
//             {/* Tombol Save biasa */}
//             <Button type="submit" name="save" disabled={loading}>
//               {loading ? "Saving..." : "Save"}
//             </Button>

//             {/* Tombol Save & Finish */}
//             <Button type="submit" name="finish" disabled={loading}>
//               {loading ? "Saving..." : "Save & Finish"}
//             </Button>
//           </div>
//         </div>
//       </form>
//     </div>
//   );
// }
