"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Table as TableIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";


type Props = {
  editor: Editor;
  /** batas maksimum grid ketika auto-expand */
  hardCap?: number;
  /** ukuran awal grid NxN sekaligus batas minimal shrink */
  start?: number;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export default function TableInsertPicker({
  editor,
  start = 5,
  hardCap = 50,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(start);
  const [cols, setCols] = useState(start);
  const [hover, setHover] = useState<[number, number]>([1, 1]);

  // reset state saat menu dibuka
  useEffect(() => {
    if (open) {
      setRows(start);
      setCols(start);
      setHover([1, 1]);
    }
  }, [open, start]);

  // AUTO-SHRINK: kecilkan grid mengikuti hover, tapi minimal = start
  useEffect(() => {
    const targetRows = Math.max(start, Math.min(rows, hover[0] + 1));
    const targetCols = Math.max(start, Math.min(cols, hover[1] + 1));
    if (targetRows !== rows) setRows(targetRows);
    if (targetCols !== cols) setCols(targetCols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover]);

  // AUTO-EXPAND: jika hover kena tepi, tambah 1 (maks hardCap)
  const handleHover = (r: number, c: number) => {
    const nr = clamp(r, 1, rows);
    const nc = clamp(c, 1, cols);
    setHover([nr, nc]);
    if (nr === rows && rows < hardCap) setRows((v) => clamp(v + 1, 1, hardCap));
    if (nc === cols && cols < hardCap) setCols((v) => clamp(v + 1, 1, hardCap));
  };

  const handleClick = (r: number, c: number) => {
    editor.chain().focus().insertTable({ rows: r, cols: c }).run();
    setOpen(false); // tutup dropdown setelah insert
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Toggle
          size="sm" className="inline-flex items-center"
          title="Insert table"
        >
          <TableIcon className="size-4" />
        </Toggle>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="p-3"
        align="start"
        sideOffset={6}
        onMouseLeave={() => setHover([1, 1])}
      >
        {/* GRID PICKER */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, 16px)` }}
          role="grid"
          aria-label="Table size picker"
        >
          {Array.from({ length: rows * cols }).map((_, i) => {
            const r = Math.floor(i / cols) + 1;
            const c = (i % cols) + 1;
            const active = r <= hover[0] && c <= hover[1];
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                role="gridcell"
                aria-label={`${r} by ${c}`}
                className={`h-4 w-4 rounded border ${
                  active ? "bg-slate-800 border-slate-800" : "bg-white border-slate-300"
                }`}
                onMouseEnter={() => handleHover(r, c)}
                onClick={() => handleClick(r, c)}
              />
            );
          })}
        </div>

        {/* INFO */}
        <div className="mt-2 text-center text-xs text-slate-600">
          {hover[0]} × {hover[1]} • {hover[0] * hover[1]} cells
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
