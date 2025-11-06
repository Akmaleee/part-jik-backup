"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { JSONContent } from "@tiptap/react";

// --- Impor komponen dari folder 'create' ---
import DetailDocument, {
  Form,
} from "../../create/detail-document";
import ContentDocument, {
  ContentSection,
} from "../../create/content-document";
import { JikApproverForm } from "../../create/approver-document";
import { toYears } from "../../create/page"; // Impor helper 'toYears'

export default function JikEditPage() {
  const [form, setForm] = useState<Form>({
    companyId: null,
    jikTitle: "",
    unitName: "",
    initiativePartnership: "",
    investValue: null,
    contractDuration: null,
    jik_approvers: [],
  });
  
  // State untuk initial content TipTap
  const [initialSections, setInitialSections] = useState<ContentSection[]>([]);
  // State untuk menyimpan perubahan content
  const [updatedSections, setUpdatedSections] = useState<ContentSection[]>([]);
  
  const [loading, setLoading] = useState(false); // Loading untuk submit
  const [pageLoading, setPageLoading] = useState(true); // Loading untuk fetch data
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  // --- 1. FETCH DATA EKSISTING ---
  useEffect(() => {
    if (id) {
      setPageLoading(true);
      fetch(`/api/jik/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Gagal memuat data");
          }
          return res.json();
        })
        .then((data) => {
          // Set form detail
          setForm({
            companyId: data.company_id,
            jikTitle: data.judul,
            unitName: data.nama_unit,
            initiativePartnership: data.initiative_partnership,
            investValue: data.invest_value ? Number(data.invest_value) : null,
            // 'contractDuration' akan diisi 'number' (tahun)
            contractDuration: data.contract_duration_years,
            jik_approvers: data.jik_approvers || [],
          });
          
          // Set content untuk TipTap editor
          const sections = data.document_initiative || [];
          setInitialSections(sections);
          setUpdatedSections(sections); // Inisialisasi updatedSections

          setError(null);
        })
        .catch((err) => {
          console.error("❌ Error fetching JIK:", err);
          setError(err.message);
        })
        .finally(() => {
          setPageLoading(false);
        });
    }
  }, [id]);

  function handleChange(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // --- 2. FUNGSI SUBMIT (UPDATE) ---
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

    const initiativePartnership =
      form.initiativePartnership?.trim() || undefined;
    const investValue =
      form.investValue !== null && form.investValue !== undefined
        ? String(form.investValue)
        : undefined;
        
    // 'form.contractDuration' sudah berisi angka (tahun) dari 'useEffect'
    // atau dari input 'DurationTimeInput'
    const contractDuration = form.contractDuration; 

    const payload = {
      companyId,
      jikTitle,
      unitName,
      initiativePartnership,
      investValue,
      contractDuration, // Kirim 'contractDuration' (bukan '...Years')
      jik_approvers: form.jik_approvers.map((a) => ({
        name: a.name.trim(),
        jabatan: a.jabatan?.trim() || null,
        nik: a.nik?.trim() || null,
        type: a.type,
      })),
      sections: updatedSections.map((s) => ({
        title: s.title,
        content: s.content as JSONContent,
      })),
      is_finish: isFinish,
    };

    console.log("🔹 Payload update yang dikirim:", payload);

    setLoading(true);
    try {
      const res = await fetch(`/api/jik/${id}`, { // Target API [id]
        method: "PATCH", // --- Method PATCH ---
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
      console.log("✅ Response update dari server:", data);

      router.push(`/jik-module/list-jik`);
    } catch (err) {
      console.error("❌ Error saat update:", err);
      alert("Gagal update. Lihat console untuk detail error.");
    } finally {
      setLoading(false);
    }
  }

  // --- 3. RENDER ---
  if (pageLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Memuat data JIK...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-md">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <>
      <DetailDocument form={form} setForm={setForm} />

      <div className="bg-white w-full rounded-2xl shadow p-6 mt-6">
        <ContentDocument
          onChange={setUpdatedSections}
          initialContent={initialSections} // <-- Pass data awal ke editor
        />
      </div>

      <JikApproverForm form={form} handleChange={handleChange} />

      <div className="bg-white w-full rounded-2xl shadow p-6 mt-6">
        <div className="mt-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSubmit(0)} // ⬅️ Simpan draft
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Save Draft"}
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit(1)} // ⬅️ Update dokumen
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Document"}
          </Button>
        </div>
      </div>
    </>
  );
}