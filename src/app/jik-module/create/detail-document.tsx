"use client";

import React, { useEffect, useState } from "react";
import { InputString, TextArea, CurrencyInput, DurationTimeInput } from "@/components/input";
import InputSelect from "@/components/input/input-select";
import { CreateCompanyModal } from "@/components/company/create-modal";

export type DurationValue = { amount: number; unit: "day" | "month" | "year" };

export type Company = {
  id: string | number;
  name: string;
};

export type Form = {
  companyId?: string | number | null;
  jikTitle: string;
  unitName: string;
  initiativePartnership: string;
  investValue?: number | null;
  contractDuration?: DurationValue | null;
  jik_approvers: JikApprover[];
};

export interface JikApprover {
  approverId: number | null;
  type: "Inisiator" | "Pemeriksa" | "Pemberi Persetujuan";
}

type DetailDocumentProps = {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
};

export default function DetailDocument({ form, setForm }: DetailDocumentProps) {
  const [companies, setCompanies] = useState<Company[]>([]);

  // Ambil data perusahaan dari API
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

  // Handler jika ada perusahaan baru dibuat
  function handleCompanyCreated(newCompany: Company) {
    setCompanies((prev) => [...prev, newCompany]);
    setForm((prev) => ({ ...prev, companyId: newCompany.id }));
  }

  // Setter util
  function setVal<K extends keyof Form>(k: K) {
    return (v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));
  }

  // Handler teks
  const onChangeField =
    (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  return (
    <div className="bg-white w-full rounded-2xl shadow p-6">
      <h1 className="font-bold mb-6 text-xl">Detail Document</h1>

      {/* 🔽 FIELD COMPANY */}
      <div className="w-full flex items-end gap-3 mb-4">
        {/* Dropdown perusahaan */}
        <div className="flex-1">
          <InputSelect
            title="Perusahaan"
            id="companyId"
            value={form.companyId ?? ""}
            onChange={(val) => setForm((p) => ({ ...p, companyId: val as string }))}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Pilih perusahaan..."
            required
            widthClass="w-full"
          />
        </div>

        {/* Tombol/modal tambah perusahaan */}
        <div className="pb-1">
          <CreateCompanyModal onCompanyCreated={handleCompanyCreated} />
        </div>
      </div>


      {/* 🔽 FIELD LAIN */}
      <div className="w-full flex flex-col mb-4">
        <InputString
          id="jikTitle"
          title="JIK Title"
          value={form.jikTitle}
          onChange={onChangeField("jikTitle")}
        />
      </div>

      <div className="w-full flex flex-col mb-4">
        <InputString
          id="unitName"
          title="Unit Name"
          value={form.unitName}
          onChange={onChangeField("unitName")}
        />
      </div>

      <div className="w-full flex flex-col mb-4">
        <TextArea
          id="initiativePartnership"
          title="Initiative Partnership"
          value={form.initiativePartnership}
          onChange={onChangeField("initiativePartnership")}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <CurrencyInput
          label="Invest Value"
          value={form.investValue ?? undefined}
          onValueChange={setVal("investValue")}
        />
        <DurationTimeInput
          label="Contract Duration"
          value={form.contractDuration ?? undefined}
          onValueChange={setVal("contractDuration")}
        />
      </div>
    </div>
  );
}

// "use client";

// import React, { useEffect, useState } from "react";
// import { InputString, TextArea, CurrencyInput, DurationTimeInput } from "@/components/input";
// import InputSelect from "@/components/input/input-select";
// import { CreateCompanyModal } from "@/components/company/create-modal";

// export type DurationValue = { amount: number; unit: "day" | "month" | "year" };

// export type Company = {
//   id: string | number;
//   name: string;
// };

// export type Form = {
//   companyId?: string | number | null;
//   jikTitle: string;
//   unitName: string;
//   initiativePartnership: string;
//   investValue?: number | null;
//   contractDuration?: DurationValue | null;
//   jik_approvers: JikApprover[];
// };

// export interface JikApprover {
//   name: string;
//   jabatan?: string;
//   nik?: string;
//   type: "Inisiator" | "Pemeriksa" | "Pemberi Persetujuan";
// }

// type DetailDocumentProps = {
//   form: Form;
//   setForm: React.Dispatch<React.SetStateAction<Form>>;
// };

// export default function DetailDocument({ form, setForm }: DetailDocumentProps) {
//   const [companies, setCompanies] = useState<Company[]>([]);

//   // Ambil data perusahaan dari API
//   useEffect(() => {
//     const fetchCompanies = async () => {
//       try {
//         const res = await fetch("/api/company");
//         if (!res.ok) throw new Error("Gagal mengambil data perusahaan");
//         const data = await res.json();
//         setCompanies(data);
//       } catch (error) {
//         console.error(error);
//       }
//     };

//     fetchCompanies();
//   }, []);

//   // Handler jika ada perusahaan baru dibuat
//   function handleCompanyCreated(newCompany: Company) {
//     setCompanies((prev) => [...prev, newCompany]);
//     setForm((prev) => ({ ...prev, companyId: newCompany.id }));
//   }

//   // Setter util
//   function setVal<K extends keyof Form>(k: K) {
//     return (v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));
//   }

//   // Handler teks
//   const onChangeField =
//     (key: keyof Form) =>
//     (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//       const value = e.target.value;
//       setForm((prev) => ({ ...prev, [key]: value }));
//     };

//   return (
//     <div className="bg-white w-full rounded-2xl shadow p-6">
//       <h1 className="font-bold mb-6 text-xl">Detail Document</h1>

//       {/* 🔽 FIELD COMPANY */}
//       <div className="w-full flex items-end gap-3 mb-4">
//         {/* Dropdown perusahaan */}
//         <div className="flex-1">
//           <InputSelect
//             title="Perusahaan"
//             id="companyId"
//             value={form.companyId ?? ""}
//             onChange={(val) => setForm((p) => ({ ...p, companyId: val as string }))}
//             options={companies.map((c) => ({ value: c.id, label: c.name }))}
//             placeholder="Pilih perusahaan..."
//             required
//             widthClass="w-full"
//           />
//         </div>

//         {/* Tombol/modal tambah perusahaan */}
//         <div className="pb-1">
//           <CreateCompanyModal onCompanyCreated={handleCompanyCreated} />
//         </div>
//       </div>


//       {/* 🔽 FIELD LAIN */}
//       <div className="w-full flex flex-col mb-4">
//         <InputString
//           id="jikTitle"
//           title="JIK Title"
//           value={form.jikTitle}
//           onChange={onChangeField("jikTitle")}
//         />
//       </div>

//       <div className="w-full flex flex-col mb-4">
//         <InputString
//           id="unitName"
//           title="Unit Name"
//           value={form.unitName}
//           onChange={onChangeField("unitName")}
//         />
//       </div>

//       <div className="w-full flex flex-col mb-4">
//         <TextArea
//           id="initiativePartnership"
//           title="Initiative Partnership"
//           value={form.initiativePartnership}
//           onChange={onChangeField("initiativePartnership")}
//         />
//       </div>

//       <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//         <CurrencyInput
//           label="Invest Value"
//           value={form.investValue ?? undefined}
//           onValueChange={setVal("investValue")}
//         />
//         <DurationTimeInput
//           label="Contract Duration"
//           value={form.contractDuration ?? undefined}
//           onValueChange={setVal("contractDuration")}
//         />
//       </div>
//     </div>
//   );
// }

// "use client";

// import React, { useEffect, useState } from "react";
// import { InputString, TextArea, CurrencyInput, DurationTimeInput } from "@/components/input";
// import InputSelect from "@/components/input/input-select";
// import { CreateCompanyModal } from "@/components/company/create-modal";

// export type DurationValue = { amount: number; unit: "day" | "month" | "year" };

// export type Company = {
//   id: string | number;
//   name: string;
// };

// export type Form = {
//   companyId?: string | number | null;
//   jikTitle: string;
//   unitName: string;
//   initiativePartnership: string;
//   investValue?: number | null;
//   contractDuration?: DurationValue | null;
// };

// type DetailDocumentProps = {
//   form: Form;
//   setForm: React.Dispatch<React.SetStateAction<Form>>;
// };

// export default function DetailDocument({ form, setForm }: DetailDocumentProps) {
//   const [companies, setCompanies] = useState<Company[]>([]);

//   // Ambil data perusahaan dari API
//   useEffect(() => {
//     const fetchCompanies = async () => {
//       try {
//         const res = await fetch("/api/company");
//         if (!res.ok) throw new Error("Gagal mengambil data perusahaan");
//         const data = await res.json();
//         setCompanies(data);
//       } catch (error) {
//         console.error(error);
//       }
//     };

//     fetchCompanies();
//   }, []);

//   // Handler jika ada perusahaan baru dibuat
//   function handleCompanyCreated(newCompany: Company) {
//     setCompanies((prev) => [...prev, newCompany]);
//     setForm((prev) => ({ ...prev, companyId: newCompany.id }));
//   }

//   // Setter util
//   function setVal<K extends keyof Form>(k: K) {
//     return (v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));
//   }

//   // Handler teks
//   const onChangeField =
//     (key: keyof Form) =>
//     (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//       const value = e.target.value;
//       setForm((prev) => ({ ...prev, [key]: value }));
//     };

//   return (
//     <div className="bg-white w-full rounded-2xl shadow p-6">
//       <h1 className="font-bold mb-6 text-xl">Detail Document</h1>

//       {/* 🔽 FIELD COMPANY */}
//       <div className="w-full flex items-end gap-3 mb-4">
//         {/* Dropdown perusahaan */}
//         <div className="flex-1">
//           <InputSelect
//             title="Perusahaan"
//             id="companyId"
//             value={form.companyId ?? ""}
//             onChange={(val) => setForm((p) => ({ ...p, companyId: val as string }))}
//             options={companies.map((c) => ({ value: c.id, label: c.name }))}
//             placeholder="Pilih perusahaan..."
//             required
//             widthClass="w-full"
//           />
//         </div>

//         {/* Tombol/modal tambah perusahaan */}
//         <div className="pb-1">
//           <CreateCompanyModal onCompanyCreated={handleCompanyCreated} />
//         </div>
//       </div>


//       {/* 🔽 FIELD LAIN */}
//       <div className="w-full flex flex-col mb-4">
//         <InputString
//           id="jikTitle"
//           title="JIK Title"
//           value={form.jikTitle}
//           onChange={onChangeField("jikTitle")}
//         />
//       </div>

//       <div className="w-full flex flex-col mb-4">
//         <InputString
//           id="unitName"
//           title="Unit Name"
//           value={form.unitName}
//           onChange={onChangeField("unitName")}
//         />
//       </div>

//       <div className="w-full flex flex-col mb-4">
//         <TextArea
//           id="initiativePartnership"
//           title="Initiative Partnership"
//           value={form.initiativePartnership}
//           onChange={onChangeField("initiativePartnership")}
//         />
//       </div>

//       <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
//         <CurrencyInput
//           label="Invest Value"
//           value={form.investValue ?? undefined}
//           onValueChange={setVal("investValue")}
//         />
//         <DurationTimeInput
//           label="Contract Duration"
//           value={form.contractDuration ?? undefined}
//           onValueChange={setVal("contractDuration")}
//         />
//       </div>
//     </div>
//   );
// }
