"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Search  } from "lucide-react";
import { DataTable } from "@/components/layout/data-table";
import { CreateCompanyModal } from "@/components/company/create-modal";
import { Input } from "@/components/ui/input";

export default function CompanyPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/company")
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Nama Perusahaan" },
    { key: "pic_mitra", label: "PIC Mitra" },
    { key: "kontak_mitra", label: "Kontak Mitra" },
    { key: "pic_partnership", label: "PIC Partnership" },
  ];

  // 🔍 Filter data secara real-time
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) =>
      c.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [companies, filter]);

  return (
    <div className="p-6">
      <Card className="shadow-md bg-white rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-2xl font-bold">Company List</CardTitle>

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
            <CreateCompanyModal />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span>Loading data...</span>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredCompanies} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
