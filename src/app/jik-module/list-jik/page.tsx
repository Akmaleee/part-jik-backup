"use client";

import { DataTable } from "@/components/layout/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function ListJikPage() {

  const [jiks, setJiks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/jik")
        .then((res) => res.json())
        .then((data) => {
        const formatted = data.map((jik: any) => ({
            ...jik,
            invest_value:
            jik.invest_value != null
                ? `Rp.${Number(jik.invest_value).toLocaleString("id-ID")}`
                : "-",
            contract_duration_years:
            jik.contract_duration_years != null
                ? `${jik.contract_duration_years} Tahun`
                : "-",
        }));

        setJiks(formatted);
        setLoading(false);
        })
        .catch(() => setLoading(false));
    }, []);

  const columns = [
    { key: "company.name", label: "Nama Perusahaan" },
    { key: "judul", label: "Judul JIK" },
    { key: "invest_value", label: "Invest Value" },
    { key: "contract_duration_years", label: "Durasi Kontrak" },
  ];

  // 🔍 Filter data secara real-time
  const filteredJiks = useMemo(() => {
    return jiks.filter((c) =>
      c.company?.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [jiks, filter]);

  const handleCustomAction = (action: string, row: any) => {
    switch (action) {
      case "Upload":
        console.log(`🟡 Upload dokumen untuk ${row.judul}`);
        // TODO: buka modal upload file atau panggil API upload
        break;

      case "Approve":
        console.log(`✅ Approve dokumen: ${row.judul}`);
        // TODO: panggil API approve dokumen
        break;

      case "Sign":
        console.log(`✍️ Sign dokumen: ${row.judul}`);
        // TODO: tampilkan dialog tanda tangan
        break;

      default:
        console.log(`⚙️ Action "${action}" belum di-handle`);
    }
  };

  return (
    <div className="p-6">
      <Card className="shadow-md bg-white rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-2xl font-bold">JIK List</CardTitle>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari perusahaan..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            {/* <CreatseCompanyModal /> */}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span>Loading data...</span>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredJiks} type="jik" onCustomAction={handleCustomAction} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}