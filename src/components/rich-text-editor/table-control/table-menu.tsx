"use client";

import type { Editor } from "@tiptap/react";
import TableInsertPicker from "@/components/rich-text-editor/table-control/table-insert-picker";
import TableOptionDropdown from "@/components/rich-text-editor/table-control/table-option-dropdown";

type Props = { editor: Editor };

export default function TableMenu({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="z-50 flex items-center gap-2">
      {/* Insert table (grid picker) */}
      <TableInsertPicker editor={editor} start={5} hardCap={50} />

      {/* Dropdown semua opsi tabel */}
      <TableOptionDropdown editor={editor} />
    </div>
  );
}
