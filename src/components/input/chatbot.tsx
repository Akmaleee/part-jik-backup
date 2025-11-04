"use client";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL!;
const API_URL_GENERATE = `${BASE_URL}/generate`;
const API_URL_SEARCH = `${BASE_URL}/search`;

const sectionOptions = [
  "Latar Belakang Inisiatif Kemitraan",
  "Maksud dan Tujuan Inisiatif",
  "Ruang Lingkup dan Deskripsi Inisiatif Kemitraan",
  "Asumsi-asumsi yang digunakan",
  "Analisis bisnis, cost benefit, analisis finansial, dan analisis risiko beserta mitigasi risiko",
  "Gambaran hak dan kewajiban",
  "Pengungkapan atas kebijakan/proses bisnis yang dikesampingkan",
  "Rekomendasi Keputusan",
  "Keputusan",
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [section, setSection] = useState(sectionOptions[0]);
  const [query, setQuery] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseHtml, setResponseHtml] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const pathname = usePathname();
  if (pathname === "/login" || pathname.includes("/chat")) return null;

  // ✅ Copy hasil ke clipboard
  const handleCopy = async () => {
    if (responseHtml) {
      const plainText = responseHtml.replace(/<[^>]*>?/gm, "");
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ✅ Handle Submit untuk kedua mode
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponseHtml(null);
    setSearchResults([]);

    try {
      let res;
      if (isSearchMode) {
        // 🔍 Mode Search File
        res = await fetch(`${API_URL_SEARCH}?q=${encodeURIComponent(query)}`, {
          method: "GET",
          headers: { accept: "application/json" },
        });
      } else {
        // 🧠 Mode Generate Section
        const formData = new FormData();
        formData.append("query", query);
        formData.append("section", section);
        formData.append("webSearch", webSearch.toString());
        res = await fetch(API_URL_GENERATE, { method: "POST", body: formData });
      }

      if (!res.ok) throw new Error("Gagal memproses permintaan");
      const data = await res.json();

      if (isSearchMode) {
        // 🔍 tampilkan hasil dalam bentuk list UI
        if (data?.data?.length > 0) {
          setSearchResults(data.data);
        } else {
          setSearchResults([]);
          setResponseHtml("<p>Tidak ditemukan hasil pencarian.</p>");
        }
      } else {
        // 🧠 mode generate
        setResponseHtml(
          data.data?.answer ? data.data.answer : "<p>Tidak ada hasil.</p>"
        );
      }
    } catch (err: any) {
      setResponseHtml(`<p style="color:red;">${err.message}</p>`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 🔘 Tombol Chatbot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-2xl z-50"
      >
        💬
      </button>

      {/* 💬 Panel Chatbot */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white shadow-xl rounded-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-2 bg-blue-600 text-white rounded-t-2xl">
            <span className="font-semibold flex items-center gap-2">
              {isSearchMode ? (
                <>
                  🔍 <span>Search File</span>
                </>
              ) : (
                <>AI JIK Assistant</>
              )}
            </span>
            {/* 🔁 Toggle Switch Mode */}
            <button
              onClick={() => {
                setIsSearchMode(!isSearchMode);
                setResponseHtml(null);
                setSearchResults([]);
              }}
              className="text-xs bg-white text-blue-600 font-semibold px-3 py-1 rounded-md hover:bg-gray-100"
            >
              {isSearchMode ? "Switch to Generate" : "Switch to Search"}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
            {!isSearchMode ? (
              <>
                {/* 🧠 Mode Generate */}
                <label className="text-sm font-medium">Bagian JIK</label>
                <select
                  className="border border-gray-300 rounded-md p-2 text-sm"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                >
                  {sectionOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                <label className="text-sm font-medium">
                  Pertanyaan / Instruksi
                </label>
                <textarea
                  className="border border-gray-300 rounded-md p-2 text-sm min-h-[80px]"
                  placeholder="Tuliskan instruksi atau pertanyaan..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  required
                />

                {/* ✅ Toggle Web Search */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="webSearch"
                    checked={webSearch}
                    onChange={(e) => setWebSearch(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <label htmlFor="webSearch" className="text-sm text-gray-700">
                    Gunakan <strong>Web Search</strong>
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* 🔍 Mode Search */}
                <label className="text-sm font-medium">
                  Masukkan Keyword Pencarian
                </label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Contoh: imani prima"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  required
                />
              </>
            )}

            {/* Tombol Submit */}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md text-sm mt-2"
            >
              {loading
                ? "⏳ Processing..."
                : isSearchMode
                ? "Search File"
                : "Generate Section"}
            </button>
          </form>

          {/* Output */}
          {(responseHtml || searchResults.length > 0) && (
            <div className="relative border-t border-gray-200">
              {/* Tombol Copy */}
              {!isSearchMode && (
                <div className="flex justify-end px-4 py-2">
                  <button
                    onClick={handleCopy}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                </div>
              )}

              {/* 🧠 Hasil Generate */}
              {!isSearchMode && responseHtml && (
                <div
                  className="p-4 max-h-56 overflow-y-auto text-sm prose"
                  dangerouslySetInnerHTML={{ __html: responseHtml }}
                />
              )}

              {/* 🔍 Hasil Search (List UI) */}
              {isSearchMode && searchResults.length > 0 && (
                <div className="p-3 max-h-72 overflow-y-auto space-y-3">
                  {searchResults.map((item, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
                    >
                      <a
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-semibold text-sm break-all hover:underline"
                      >
                        {item.path}
                      </a>
                      <div className="mt-2 text-xs text-gray-700 space-y-1">
                        {item.highlight?.map((h: any, j: number) => (
                          <p
                            key={j}
                            dangerouslySetInnerHTML={{
                              __html: h.sentence,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
