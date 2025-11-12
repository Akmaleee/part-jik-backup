"use client";

import { useState } from "react";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { X } from "lucide-react";

interface CreateApproverModalProps {
  onApproverCreated?: (approver: any) => void;
}

export function CreateApproverModal({ onApproverCreated }: CreateApproverModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "",
    email: "",
    jabatan: "",
    nik: "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { name, type, email, jabatan, nik } = form;

    if (!name || !type) {
      alert("Nama dan tipe wajib diisi.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/approver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          email: email || null,
          jabatan: type === "internal" ? jabatan : null,
          nik: type === "internal" ? nik : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan approver");

      alert(`Approver "${data.name}" berhasil ditambahkan!`);
      onApproverCreated?.(data);

      // reset form
      setForm({ name: "", type: "", email: "", jabatan: "", nik: "" });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan approver.");
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
        title="Tambah Approver Baru"
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
                Tambah Approver Baru
              </DialogTitle>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Description className="text-sm text-gray-600">
              Isi informasi approver di bawah ini
            </Description>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block mb-1 text-sm font-medium text-gray-700"
                >
                  Nama Approver <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label
                  htmlFor="type"
                  className="block mb-1 text-sm font-medium text-gray-700"
                >
                  Tipe Approver <span className="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
                  required
                >
                  <option value="">Pilih tipe</option>
                  <option value="internal">Internal</option>
                  <option value="eksternal">Eksternal</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block mb-1 text-sm font-medium text-gray-700"
                >
                  Email (opsional)
                </label>
                <input
                  type="email"
                  id="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
                />
              </div>

              {/* Conditional fields for internal */}
              {form.type === "internal" && (
                <>
                  <div>
                    <label
                      htmlFor="jabatan"
                      className="block mb-1 text-sm font-medium text-gray-700"
                    >
                      Jabatan
                    </label>
                    <input
                      type="text"
                      id="jabatan"
                      value={form.jabatan}
                      onChange={(e) => handleChange("jabatan", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="nik"
                      className="block mb-1 text-sm font-medium text-gray-700"
                    >
                      NIK
                    </label>
                    <input
                      type="text"
                      id="nik"
                      value={form.nik}
                      onChange={(e) => handleChange("nik", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
                    />
                  </div>
                </>
              )}

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
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={loading}
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