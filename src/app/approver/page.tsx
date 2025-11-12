"use client";

import { CreateApproverModal } from "@/components/approver/create-modal";
import { DataTable } from "@/components/layout/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function ApproverPage() {
  const [approvers, setApprovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // Ambil data awal
  useEffect(() => {
    setLoading(true);

    fetch(`/api/approver`)
      .then((res) => res.json())
      .then((data) => {
        setApprovers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const columns = [
    { key: "name", label: "Nama" },
    { key: "type", label: "Tipe Approver" },
    { key: "email", label: "Email" },
    { key: "jabatan", label: "Jabatan" },
  ];

  // 🔍 Filter data secara real-time
  const filteredApprover = useMemo(() => {
    return approvers.filter((c) =>
      c.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [approvers, filter]);

  return (
    <div className="p-6">
      <Card className="shadow-md bg-white rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-2xl font-bold">List Approver</CardTitle>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama approver..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Tombol tambah */}
            <CreateApproverModal />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span>Loading data...</span>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredApprover} type="approver" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}