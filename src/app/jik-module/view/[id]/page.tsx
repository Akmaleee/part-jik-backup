"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { renderAsync } from "docx-preview";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Tambahkan beberapa styling dasar untuk dokumen
// Anda bisa memindahkannya ke file CSS global Anda
const documentStyles = `
  .docx-preview-container {
    background: #f8f8f8;
    padding: 2rem;
    max-width: 900px;
    margin: 20px auto;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    border-radius: 8px;
  }
  .docx-wrapper {
    background: #fff;
    padding: 3rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .docx-preview-container p {
    line-height: 1.6;
  }
  .docx-preview-container h1 {
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .docx-preview-container h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.8rem;
  }
`;

export default function JikViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const viewerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !viewerRef.current) return;

    // Tambahkan style ke head
    const styleElement = document.createElement("style");
    styleElement.innerHTML = documentStyles;
    document.head.appendChild(styleElement);

    const fetchAndRenderDoc = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Panggil API yang sama dengan 'Generate DOCX'
        const response = await fetch("/api/jik/generate-docx", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jikId: parseInt(id, 10) }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Gagal mengambil dokumen");
        }

        // 2. Ambil file sebagai Blob
        const docxBlob = await response.blob();

        // 3. Render blob ke dalam div target
        if (viewerRef.current) {
          const container = viewerRef.current;
          container.className = "docx-preview-container"; 

          // `renderAsync` akan me-render file di dalam elemen yang disediakan
          await renderAsync(
            docxBlob, // File blob
            container, // Elemen HTML target
            undefined, // <-- PERBAIKAN: diubah dari null ke undefined
            {
              className: "docx-wrapper", 
              inWrapper: true, 
              ignoreWidth: false,
              ignoreHeight: false,
            }
          );
          console.log("Dokumen berhasil dirender.");
        }
      } catch (err: any) {
        console.error("Error rendering DOCX:", err);
        setError(err.message || "Terjadi kesalahan saat menampilkan file.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndRenderDoc();

    // Cleanup style saat komponen di-unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [id]);

  return (
    <div className="p-6">
      <Button variant="outline" onClick={() => window.history.back()}>
        &larr; Kembali ke List
      </Button>

      {loading && (
        <Card className="mt-4 shadow-md bg-white rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
            <span className="text-lg text-muted-foreground">
              Memuat preview dokumen...
            </span>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mt-4 shadow-md bg-white rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-red-600">
            <AlertTriangle className="h-10 w-10" />
            <span className="text-lg font-semibold">Gagal Memuat File</span>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Div ini akan menjadi target untuk rendering DOCX */}
      <div ref={viewerRef} />
    </div>
  );
}