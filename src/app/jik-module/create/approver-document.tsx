"use client";

import { Button } from "@/components/ui/button";
import { InputString } from "@/components/input";
import { Trash2 } from "lucide-react";
import { useEffect } from "react";

interface JikApprover {
  name: string;
  jabatan?: string;
  nik?: string;
  type: "Inisiator" | "Pemeriksa" | "Pemberi Persetujuan";
}

interface JikApproverFormProps {
  form: { jik_approvers: JikApprover[] };
  handleChange: (field: string, value: any) => void;
}

const approverSections = [
  { type: "Inisiator", label: "Inisiator" },
  { type: "Pemeriksa", label: "Pemeriksa" },
  { type: "Pemberi Persetujuan", label: "Pemberi Persetujuan" },
] as const;

export function JikApproverForm({ form, handleChange }: JikApproverFormProps) {
  // 🧠 Pastikan setiap tipe punya minimal 1 approver
  useEffect(() => {
    const newApprovers = [...form.jik_approvers];
    let updated = false;

    approverSections.forEach(({ type }) => {
      const hasApprover = newApprovers.some((a) => a.type === type);
      if (!hasApprover) {
        newApprovers.push({ name: "", jabatan: "", nik: "", type });
        updated = true;
      }
    });

    if (updated) handleChange("jik_approvers", newApprovers);
  }, [form.jik_approvers, handleChange]);

  function handleApproverChange(
    index: number,
    field: keyof JikApprover,
    value: string
  ) {
    const newApprovers = [...form.jik_approvers];
    newApprovers[index] = {
      ...newApprovers[index],
      [field]: value,
    };
    handleChange("jik_approvers", newApprovers);
  }

  function addApprover(type: JikApprover["type"]) {
    handleChange("jik_approvers", [
      ...form.jik_approvers,
      { name: "", jabatan: "", nik: "", type },
    ]);
  }

  function removeApprover(index: number) {
    const target = form.jik_approvers[index];
    const sameType = form.jik_approvers.filter((a) => a.type === target.type);

    // 🚫 Cegah hapus kalau cuma tersisa satu untuk tipe itu
    if (sameType.length <= 1) return;

    const newApprovers = form.jik_approvers.filter((_, i) => i !== index);
    handleChange("jik_approvers", newApprovers);
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Daftar Approver JIK
      </h2>

      {approverSections.map(({ type, label }) => {
        const filtered = form.jik_approvers.filter((a) => a.type === type);

        return (
          <div key={type} className="mb-8">
            <h3 className="text-lg font-semibold mb-3">{label}</h3>

            <div className="flex flex-col gap-4">
              {filtered.map((approver, idx) => {
                const globalIndex = form.jik_approvers.findIndex(
                  (a) => a === approver
                );

                return (
                  <div
                    key={globalIndex}
                    className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-4 items-end"
                  >
                    <InputString
                      title="Nama"
                      placeholder="Masukkan nama"
                      value={approver.name}
                      onChange={(e) =>
                        handleApproverChange(
                          globalIndex,
                          "name",
                          e.target.value
                        )
                      }
                    />
                    <InputString
                      title="Jabatan"
                      placeholder="Masukkan jabatan"
                      value={approver.jabatan || ""}
                      onChange={(e) =>
                        handleApproverChange(
                          globalIndex,
                          "jabatan",
                          e.target.value
                        )
                      }
                    />
                    <InputString
                      title="NIK"
                      placeholder="Masukkan NIK"
                      value={approver.nik || ""}
                      onChange={(e) =>
                        handleApproverChange(globalIndex, "nik", e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeApprover(globalIndex)}
                      className="h-10 w-10 p-2"
                      disabled={filtered.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => addApprover(type)}
              className="mt-4"
            >
              + Tambah {label}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
