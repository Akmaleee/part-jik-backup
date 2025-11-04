"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File, companyId?: string) => void;
  title?: string;
  isSelectCompany?: number; // 0 atau 1
}

export function UploadModal({
  open,
  onClose,
  onSubmit,
  title = "Upload Document",
  isSelectCompany = 0,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  // 🔄 Ambil daftar perusahaan saat modal dibuka
  useEffect(() => {
    if (isSelectCompany === 1 && open) {
      fetch("/api/company")
        .then((res) => res.json())
        .then((data) => setCompanies(data))
        .catch((err) => console.error("Gagal memuat data company:", err));
    }
  }, [isSelectCompany, open]);

  const handleSubmit = async () => {
    if (!file) return;
    if (isSelectCompany === 1 && !selectedCompany) {
      alert("Silakan pilih perusahaan terlebih dahulu");
      return;
    }

    setLoading(true);
    await onSubmit(file, selectedCompany);
    setLoading(false);
    onClose();
    setFile(null);
    setSelectedCompany("");
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Background blur */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal content */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white dark:bg-neutral-900 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                >
                  {title}
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  {/* Select Company */}
                  {isSelectCompany === 1 && (
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Pilih Perusahaan
                      </label>
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800"
                      >
                        <option value="">-- Pilih perusahaan --</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* File Input */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      File Dokumen
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-semibold hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-200"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!file || loading}
                  >
                    {loading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
