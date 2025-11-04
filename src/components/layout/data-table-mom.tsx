"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal } from "lucide-react"; // 1. Import Loader2
import { StatusTracker } from "./status-tracker";

interface DataTableProps {
  caption?: string;
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
  type?: "mom" | "nda" | "company" | "msa" | "mou" | "jik" | string;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  // 2. Tambahkan props untuk state loading
  generatingId?: number | null;
  deletingId?: number | null;
}

export function DataTable({
  caption,
  columns,
  data,
  type = "default",
  onView,
  onEdit,
  onDelete,
  generatingId, // 3. Ambil props
  deletingId,   // 3. Ambil props
}: DataTableProps) {
  const getValue = (obj: any, path: string) =>
    path.split(".").reduce((acc, part) => acc && acc[part], obj);

  const allowedStatusTypes = ["mom", "nda", "company", "msa", "mou", "jik"];
  const showStatus = allowedStatusTypes.includes(type.toLowerCase());

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        {caption && <TableCaption>{caption}</TableCaption>}

        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-center">No</TableHead>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
            {showStatus && <TableHead>Status</TableHead>}
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length > 0 ? (
            data.map((row, i) => {
              // 4. Cek apakah baris ini sedang loading
              const isGenerating = generatingId === row.id;
              const isDeleting = deletingId === row.id;
              const isBusy = isGenerating || isDeleting;

              return (
                <TableRow key={i}>
                  <TableCell className="text-center font-medium">
                    {i + 1}
                  </TableCell>

                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {getValue(row, col.key) ?? "-"}
                    </TableCell>
                  ))}

                  {showStatus && (
                    <TableCell>
                      <StatusTracker
                        stepName={row.progress?.step?.name || type}
                        currentStatus={row.progress?.status?.name || "Draft"}
                      />
                    </TableCell>
                  )}

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isBusy}>
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>

                      {/* 5. Terapkan state loading/disabled ke dropdown */}
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onView?.(row)}
                          disabled={isBusy}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            type === "mom" ? "Generate Docs" : "View"
                          )}
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => onEdit?.(row)}
                          disabled={isBusy}
                        >
                          Edit
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => onDelete?.(row)}
                          disabled={isBusy}
                        >
                          {isDeleting ? (
                             <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete"
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length + (showStatus ? 3 : 2)}
                className="text-center py-6 text-muted-foreground"
              >
                No data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}