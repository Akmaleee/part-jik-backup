"use client";

import { CreateCompanyModal } from "@/components/company/create-modal";
import { InputString } from "@/components/input";
import InputSelect from "@/components/input/input-select";
import { useEffect, useState } from "react";

interface Company {
  id: string;
  name: string;
}

interface DetailDocumentProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (field: string, value: any) => void;
}

export default function DetailDocument({ form, setForm, handleChange }: DetailDocumentProps) {
  const [companies, setCompanies] = useState<Company[]>([]);

  const inputFields = [
    { title: "Tanggal MOM", id: "tanggalMom", type: "date", value: form.tanggalMom },
    { title: "Peserta", id: "peserta", type: "text", value: form.peserta },
    { title: "Venue", id: "venue", type: "text", value: form.venue },
    { title: "Waktu (ex: 09.00-10.00)", id: "waktu", type: "text", value: form.waktu },
  ];

  function handleCompanyCreated(newCompany: Company) {
    setCompanies((prev) => [...prev, newCompany]);
    setForm((prev: any) => ({ ...prev, companyId: newCompany.id }));
  }

  useEffect(() => {
      const fetchCompanies = async () => {
        try {
          const res = await fetch("/api/company");
          if (!res.ok) throw new Error("Gagal mengambil data perusahaan");
          const data = await res.json();
          setCompanies(data);
        } catch (error) {
          console.error(error);
        }
      };
  
      fetchCompanies();
    }, []);

  return (
    <div className="w-full bg-white rounded-2xl shadow p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Detail MOM</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputString
          title="Judul MOM"
          id="judul"
          value={form.judul}
          onChange={(e) => handleChange("judul", e.target.value)}
        />

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <InputSelect
              title="Perusahaan"
              id="companyId"
              value={form.companyId}
              onChange={(val) => handleChange("companyId", val as string)}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Pilih perusahaan..."
              required
              widthClass="w-full"
            />
          </div>
          <div className="pb-2">
            <CreateCompanyModal onCompanyCreated={handleCompanyCreated} />
          </div>
        </div>

        {inputFields.map((field) => (
          <InputString
            key={field.id}
            title={field.title}
            id={field.id}
            type={field.type}
            value={field.value}
            onChange={(e) => handleChange(field.id, e.target.value)}
          />
        ))}
      </div>
    </div>
  );
}
