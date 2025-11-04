"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Rows, Columns, Columns3, Rows3,
  Plus, Minus, TableCellsMerge, TableCellsSplit, Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";

import { CellSelection, selectedRect } from "@tiptap/pm/tables";

type Props = { editor: Editor };

export default function TableOptionDropdown({ editor }: Props) {
  // Paksa re-render saat selection/transaction/update berubah
  const [, force] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const bump = () => force((v) => v + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    editor.on("update", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
      editor.off("update", bump);
    };
  }, [editor]);

  if (!editor) return null;

  const state = editor.state;
  const selection = state.selection;
  const isCellSelection = selection instanceof CellSelection;
  const inTable = isCellSelection || editor.isActive("table");

  // Untuk merge: pastikan ada lebih dari 1 sel dalam seleksi
  let multiCellSelected = false;
  if (isCellSelection) {
    try {
      const rect = selectedRect(state); // dari prosemirror-tables
      const width = rect.right - rect.left;
      const height = rect.bottom - rect.top;
      multiCellSelected = width * height > 1;
    } catch {
      multiCellSelected = false;
    }
  }

  const can = {
    addColBefore: inTable && !!editor.can().addColumnBefore?.(),
    addColAfter:  inTable && !!editor.can().addColumnAfter?.(),
    delCol:       inTable && !!editor.can().deleteColumn?.(),
    addRowBefore: inTable && !!editor.can().addRowBefore?.(),
    addRowAfter:  inTable && !!editor.can().addRowAfter?.(),
    delRow:       inTable && !!editor.can().deleteRow?.(),
    headerCol:    inTable && !!editor.can().toggleHeaderColumn?.(),
    headerRow:    inTable && !!editor.can().toggleHeaderRow?.(),
    merge:        inTable && multiCellSelected && !!editor.can().mergeCells?.(),
    // split aktif kalau sel saat ini bisa dipecah (colspan/rowspan > 1)
    split:        inTable && !!editor.can().splitCell?.(),
    delTable:     inTable && !!editor.can().deleteTable?.(),
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Toggle size="sm" className="inline-flex items-center">
          <span className="hidden sm:inline">Table Option</span>
        </Toggle>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={6} className="w-60">
        <DropdownMenuLabel>Table Option</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Columns */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Columns className="mr-2 size-4" />
            Columns
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                disabled={!can.addColBefore}
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              >
                <Plus className="mr-2 size-4" /> Add column before
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!can.addColAfter}
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                <Plus className="mr-2 size-4" /> Add column after
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!can.delCol}
                onClick={() => editor.chain().focus().deleteColumn().run()}
              >
                <Minus className="mr-2 size-4" /> Delete column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!can.headerCol}
                onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
              >
                <Columns3 className="mr-2 size-4" /> Toggle header column
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        {/* Rows */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Rows className="mr-2 size-4" />
            Rows
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                disabled={!can.addRowBefore}
                onClick={() => editor.chain().focus().addRowBefore().run()}
              >
                <Plus className="mr-2 size-4" /> Add row before
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!can.addRowAfter}
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                <Plus className="mr-2 size-4" /> Add row after
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!can.delRow}
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                <Minus className="mr-2 size-4" /> Delete row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!can.headerRow}
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              >
                <Rows3 className="mr-2 size-4" /> Toggle header row
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!can.merge}
            onClick={() => editor.chain().focus().mergeCells().run()}
          >
            <TableCellsMerge className="mr-2 size-4" />
            Merge cells
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!can.split}
            onClick={() => editor.chain().focus().splitCell().run()}
          >
            <TableCellsSplit className="mr-2 size-4" />
            Split cell
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={!can.delTable}
          onClick={() => editor.chain().focus().deleteTable().run()}
          className="text-red-600 focus:text-red-700 data-[disabled]:opacity-50"
        >
          <Trash2 className="mr-2 size-4" />
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
