"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { renderAsync } from "docx-preview";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

export default function MomViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const viewerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !viewerRef.current) return;

    const styleElement = document.createElement("style");
    styleElement.innerHTML = documentStyles;
    document.head.appendChild(styleElement);

    const fetchAndRenderDoc = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 🟡 PERUBAHAN DI SINI: Gunakan API MOM
        const response = await fetch("/api/mom/generate-docx", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ momId: parseInt(id, 10) }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Gagal mengambil dokumen");
        }

        const docxBlob = await response.blob();

        if (viewerRef.current) {
          const container = viewerRef.current;
          container.className = "docx-preview-container"; 

          await renderAsync(
            docxBlob, 
            container, 
            undefined,
            {
              className: "docx-wrapper", 
              inWrapper: true, 
              ignoreWidth: false,
              ignoreHeight: false,
            }
          );
          console.log("Dokumen MoM berhasil dirender.");
        }
      } catch (err: any) {
        console.error("Error rendering DOCX:", err);
        setError(err.message || "Terjadi kesalahan saat menampilkan file.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndRenderDoc();

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
              Memuat preview MoM...
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

      <div ref={viewerRef} />
    </div>
  );
}