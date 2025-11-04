// "use client";

// import React, { useState } from "react";
// import DetailDocument, { Form } from "./detail-document";
// import { Button } from "@/components/ui/button";
// import ContentDocument, { ContentSection } from "./content-document"; // <= export tipe
// import { gql } from "@apollo/client";
// import { useMutation } from "@apollo/client/react";
// import type { JSONContent } from "@tiptap/react";

// const CREATE_DOCUMENT = gql`
//   mutation CreateDocument($input: CreateDocumentInput!) {
//     createDocument(input: $input) {
//       id
//       companyName
//       contractDurationYears
//       createdAt
//     }
//   }
// `;

// // helper: konversi durasi ke "tahun"
// export function toYears(
//   d?: { amount: number; unit: "day" | "month" | "year" } | number | string | null
// ): number | undefined {
//   if (d == null) return undefined;

//   // 1️⃣ Kalau number → anggap langsung dalam tahun
//   if (typeof d === "number") {
//     return Number.isFinite(d) ? d : undefined;
//   }

//   // 2️⃣ Kalau string → parsing angka dan unit
//   if (typeof d === "string") {
//     const raw = d.trim().toLowerCase();
//     const m = raw.match(/^([\d.,]+)\s*([a-z\u00E0-\u017F]*)?/i);
//     if (!m) return undefined;

//     const num = Number(m[1].replace(",", "."));
//     if (!Number.isFinite(num)) return undefined;

//     const unit = (m[2] || "year").trim();
//     if (/^(y|yr|year|tahun)$/i.test(unit)) return num;
//     if (/^(mo|mon|month|bulan|bln)$/i.test(unit)) return num / 12;
//     if (/^(d|day|hari)$/i.test(unit)) return num / 365;
//     if (!unit) return num;
//     return undefined;
//   }

//   // 3️⃣ Kalau object → gunakan unit sesuai definisi
//   if (typeof d === "object" && "amount" in d && "unit" in d) {
//     const { amount, unit } = d;
//     if (typeof amount !== "number" || !Number.isFinite(amount)) return undefined;

//     switch (unit) {
//       case "day":
//         return amount / 365;
//       case "month":
//         return amount / 12;
//       case "year":
//         return amount;
//       default:
//         return undefined;
//     }
//   }

//   return undefined;
// }

// export default function JikModule() {
//   const [form, setForm] = useState<Form>({
//     companyName: "",
//     jikTitle: "",
//     unitName: "",
//     initiativePartnership: "",
//     investValue: null,
//     contractDuration: null,
//   });

//   // sections dari ContentDocument (di-lift up)
//   const [sections, setSections] = useState<ContentSection[]>([]);

//   const [createDocument, { loading }] = useMutation(CREATE_DOCUMENT);

//   async function handleSubmit() {
//     // --- VALIDASI RINGAN ---
//     const companyName = form.companyName?.trim() ?? "";
//     const jikTitle = form.jikTitle?.trim() ?? "";
//     const unitName = form.unitName?.trim() ?? "";
//     if (!companyName || !jikTitle || !unitName) {
//       alert("Company Name, JIK Title, dan Unit Name wajib diisi.");
//       return;
//     }

//     // --- NORMALISASI NILAI ---
//     const initiativePartnership = form.initiativePartnership?.trim() || undefined;

//     // investValue -> string (ikut pattern kode kamu sebelumnya)
//     const investValue =
//       form.investValue !== null && form.investValue !== undefined
//         ? String(form.investValue)
//         : undefined;

//     // contractDuration -> tahun (number)
//     const contractDurationYears = toYears(form.contractDuration);
//     console.log(toYears(form.contractDuration));
    

//     // --- SIAPKAN PAYLOAD ---
//     const detailPayload = {
//       companyName,
//       jikTitle,
//       unitName,
//       initiativePartnership,
//       investValue,
//       contractDurationYears,
//     };

//     // Content/Mongo payload (trap dulu)
//     const contentPayload = {
//       sections: sections.map((s) => ({
//         title: s.title,d
//         content: s.content as JSONContent,
//       })),
//     };

//     // --- LOG DULU BIAR KELIHATAN (trap) ---
//     console.log("[DETAIL → Postgres]", detailPayload);
//     console.log("[CONTENT → Mongo]", contentPayload);

//     try {
//       // 1) Simpan detail ke Postgres
//       const res = await createDocument({
//         variables: { input: detailPayload },
//       });

//       // (opsional) ambil id dokumen buat link ke Mongo nanti
//       const documentId: string | undefined = res?.data?.createDocument?.id;

//       // 2) Simpan content ke Mongo → TODO: sambungkan mutation di sini
//       // await createDocumentContent({ variables: { documentId, sections: contentPayload.sections } });

//       alert("Draft tersimpan (Detail OK, Content tertangkap di console).");

//       // Reset form + (opsional) reset sections
//       setForm({
//         companyName: "",
//         jikTitle: "",
//         unitName: "",
//         initiativePartnership: "",
//         investValue: null,
//         contractDuration: null,
//       });
//       // Jika mau reset content juga, aktifkan baris ini:
//       // setSections([]);
//     } catch (err) {
//       console.error(err);
//       alert("Gagal menyimpan. Cek console untuk detail error.");
//     }
//   }

//   return (
//     <>
//       <DetailDocument form={form} setForm={setForm} />

//       <div className="bg-white w-full rounded-2xl shadow p-6 mt-6">

//         {/* TERIMA CALLBACK SECTIONS */}
//         <ContentDocument onChange={setSections} />

//         <Button
//           type="button"
//           onClick={handleSubmit}
//           disabled={loading}
//           aria-busy={loading}
//         >
//           {loading ? "Saving..." : "Save"}
//         </Button>
//       </div>
//     </>
//   );
// }

"use client";

import React, { useState } from "react";
import DetailDocument, { Form } from "./detail-document";
import { Button } from "@/components/ui/button";
import ContentDocument, { ContentSection } from "./content-document";
import type { JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";

// helper: konversi durasi ke tahun
export function toYears(
  d?: { amount: number; unit: "day" | "month" | "year" } | number | string | null
): number | undefined {
  if (d == null) return undefined;

  if (typeof d === "number") return Number.isFinite(d) ? d : undefined;

  if (typeof d === "string") {
    const raw = d.trim().toLowerCase();
    const m = raw.match(/^([\d.,]+)\s*([a-z\u00E0-\u017F]*)?/i);
    if (!m) return undefined;

    const num = Number(m[1].replace(",", "."));
    if (!Number.isFinite(num)) return undefined;

    const unit = (m[2] || "year").trim();
    if (/^(y|yr|year|tahun)$/i.test(unit)) return num;
    if (/^(mo|mon|month|bulan|bln)$/i.test(unit)) return num / 12;
    if (/^(d|day|hari)$/i.test(unit)) return num / 365;
    if (!unit) return num;
    return undefined;
  }

  if (typeof d === "object" && "amount" in d && "unit" in d) {
    const { amount, unit } = d;
    if (typeof amount !== "number" || !Number.isFinite(amount)) return undefined;

    switch (unit) {
      case "day":
        return amount / 365;
      case "month":
        return amount / 12;
      case "year":
        return amount;
      default:
        return undefined;
    }
  }

  return undefined;
}

export default function JikModule() {
  const [form, setForm] = useState<Form>({
    companyId: null,
    jikTitle: "",
    unitName: "",
    initiativePartnership: "",
    investValue: null,
    contractDuration: null,
  });

  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(isFinish: 0 | 1) {
    const companyId =
      typeof form.companyId === "number" && !isNaN(form.companyId)
        ? form.companyId
        : undefined;
    const jikTitle = form.jikTitle?.trim() ?? "";
    const unitName = form.unitName?.trim() ?? "";

    if (!companyId || !jikTitle || !unitName) {
      alert("Company Name, JIK Title, dan Unit Name wajib diisi.");
      return;
    }

    const initiativePartnership = form.initiativePartnership?.trim() || undefined;
    const investValue =
      form.investValue !== null && form.investValue !== undefined
        ? String(form.investValue)
        : undefined;
    const contractDurationYears = toYears(form.contractDuration);

    const payload = {
      companyId,
      jikTitle,
      unitName,
      initiativePartnership,
      investValue,
      contractDurationYears,
      sections: sections.map((s) => ({
        title: s.title,
        content: s.content as JSONContent,
      })),
      is_finish: isFinish,
    };

    console.log("🔹 Payload yang dikirim:", payload);

    setLoading(true);
    try {
      const res = await fetch("/api/jik", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gagal menyimpan dokumen: ${res.status} ${errText}`);
      }

      const data = await res.json();
      console.log("✅ Response dari server:", data);

      router.push(`/jik-module/list-jik`);
    } catch (err) {
      console.error("❌ Error saat menyimpan:", err);
      alert("Gagal menyimpan. Lihat console untuk detail error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DetailDocument form={form} setForm={setForm} />

      <div className="bg-white w-full rounded-2xl shadow p-6 mt-6">
        <ContentDocument onChange={setSections} />

        <div className="mt-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSubmit(0)} // ⬅️ Simpan draft
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Draft"}
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit(1)} // ⬅️ Publish dokumen
            disabled={loading}
          >
            {loading ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </>
  );
}
