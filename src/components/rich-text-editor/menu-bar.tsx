import {
  AlignCenter, AlignLeft, AlignRight,
  Bold, Highlighter, Italic, List, ListOrdered, Strikethrough,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import type { Editor } from "@tiptap/react";
import TableMenu from "@/components/rich-text-editor/table-control/table-menu";
import ImageBar from "@/components/rich-text-editor/image-control/image-bar";   // ⬅️ import

export default function MenuBar({ editor }: { editor: Editor }) {
  if (!editor) return null;

  const textItems = [
    { icon: <Bold className="size-4" />,       pressed: editor.isActive("bold"),        onClick: () => editor.chain().focus().toggleBold().run() },
    { icon: <Italic className="size-4" />,     pressed: editor.isActive("italic"),      onClick: () => editor.chain().focus().toggleItalic().run() },
    { icon: <Strikethrough className="size-4"/>, pressed: editor.isActive("strike"),    onClick: () => editor.chain().focus().toggleStrike().run() },
    { icon: <AlignLeft className="size-4" />,  pressed: editor.isActive({ textAlign:"left" }),   onClick: () => editor.chain().focus().setTextAlign("left").run() },
    { icon: <AlignCenter className="size-4"/>, pressed: editor.isActive({ textAlign:"center"}), onClick: () => editor.chain().focus().setTextAlign("center").run() },
    { icon: <AlignRight className="size-4" />, pressed: editor.isActive({ textAlign:"right"}),  onClick: () => editor.chain().focus().setTextAlign("right").run() },
    { icon: <List className="size-4" />,       pressed: editor.isActive("bulletList"),  onClick: () => editor.chain().focus().toggleBulletList().run() },
    { icon: <ListOrdered className="size-4"/>, pressed: editor.isActive("orderedList"), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: <Highlighter className="size-4"/>, pressed: editor.isActive("highlight"),   onClick: () => editor.chain().focus().toggleHighlight().run() },
  ];

  return (
    <div className="border rounded-md p-1 mb-1 bg-slate-50 z-50 flex flex-wrap items-center gap-2">
      {textItems.map((it, i) => (
        <Toggle key={i} pressed={!!it.pressed} onPressedChange={it.onClick}>
          {it.icon}
        </Toggle>
      ))}

      <span className="mx-2 h-5 w-px bg-slate-300" />

      <ImageBar editor={editor} />

      <span className="mx-2 h-5 w-px bg-slate-300" />

      <TableMenu editor={editor} />
    </div>
  );
}
