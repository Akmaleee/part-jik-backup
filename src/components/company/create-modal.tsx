"use client";

import { useState } from "react";
import { Description, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";

interface CreateCompanyModalProps {
  onCompanyCreated?: (company: any) => void;
}

export function CreateCompanyModal({ onCompanyCreated }: CreateCompanyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    picMitra: "",
    kontakMitra: "",
    picPartnership: "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file)); // tampilkan preview
    }
  }

  async function uploadLogoToMinio(file: File) {
    const formData = new FormData();
    formData.append("files", file);

    const res = await fetch("/api/uploads/attachment", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload gagal");
    return data.url as string; // URL hasil upload MinIO
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { name, picMitra, kontakMitra, picPartnership } = form;

    if (!name || !picMitra || !kontakMitra || !picPartnership) {
      alert("Semua field wajib diisi.");
      setLoading(false);
      return;
    }

    try {
      let logoUrl: string | undefined;

      // 1️⃣ Upload logo ke MinIO kalau ada
      if (logoFile) {
        logoUrl = await uploadLogoToMinio(logoFile);
      }

      // 2️⃣ Kirim data ke API /api/company
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          picMitra,
          kontakMitra,
          picPartnership,
          logo: logoUrl, // kirim url logo
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan company");

      alert(`Company "${data.name}" berhasil dibuat!`);
      onCompanyCreated?.(data);

      setForm({ name: "", picMitra: "", kontakMitra: "", picPartnership: "" });
      setLogoFile(null);
      setLogoPreview(null);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Tombol tambah */}
      <button
        type="button"
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium w-8 h-8 rounded-sm shadow transition duration-200 flex items-center justify-center"
        onClick={() => setIsOpen(true)}
        title="Tambah Company Baru"
      >
        +
      </button>

      {/* Modal */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-md w-full space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <DialogTitle className="text-xl font-bold text-gray-900">
                Tambah Company Baru
              </DialogTitle>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Description className="text-sm text-gray-600">
              Isi informasi company dan upload logo
            </Description>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {["name", "picMitra", "kontakMitra", "picPartnership"].map((field) => (
                <div key={field}>
                  <label
                    htmlFor={field}
                    className="block mb-1 text-sm font-medium text-gray-700"
                  >
                    {field === "name"
                      ? "Nama Company"
                      : field === "picMitra"
                      ? "PIC Mitra"
                      : field === "kontakMitra"
                      ? "Kontak Mitra"
                      : "PIC Partnership"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id={field}
                    value={(form as any)[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
                    required
                  />
                </div>
              ))}

              {/* Upload Logo */}
              <div>
                <label
                  htmlFor="logo"
                  className="block mb-1 text-sm font-medium text-gray-700"
                >
                  Logo Perusahaan (opsional)
                </label>
                <input
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2
                    file:mr-3 file:rounded-md file:border-none 
                    file:bg-gray-500 file:text-white 
                    file:px-3 file:py-1.5 file:text-sm 
                    hover:file:bg-gray-600 transition"
                />
                {logoPreview && (
                  <div className="mt-2">
                    <img
                      src={logoPreview}
                      alt="Preview Logo"
                      className="h-20 rounded border object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Tombol Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={loading}
                  onClick={handleSubmit}
                >
                  {loading ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
