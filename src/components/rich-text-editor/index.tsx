"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table"; // pastikan importnya benar
import Gapcursor from "@tiptap/extension-gapcursor";
import Dropcursor from "@tiptap/extension-dropcursor";
import MenuBar from "@/components/rich-text-editor/menu-bar";
import type { EditorView } from "prosemirror-view";
import type { Slice } from "prosemirror-model";

import { ResizableImage } from "@/components/rich-text-editor/image-control/resizeable-image";
import { useImageUpload } from "@/hooks/useImageUpload"; // <<— HOOK UPLOAD
// import "./style.scss"; // <-- 1. HAPUS impor style.scss dari sini

interface RichTextEditorProps {
  // 2. UBAH TIPE INI agar bisa menerima data dari database (termasuk null/string)
  content: JSONContent | string | null | undefined;
  onChange: (content: JSONContent) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: "list-disc ml-3" } },
        orderedList: { HTMLAttributes: { class: "list-decimal ml-3" } },
      }),
      TableKit.configure({ resizable: true }),
      Gapcursor,
      Dropcursor,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      ResizableImage.configure({
        inline: false,
        allowBase64: false, // sudah upload ke MinIO → gak perlu base64
      }),
    ],
    // 3. 'content' sekarang aman menerima string, null, atau JSON
    content: content || "", 
    immediatelyRender: false, // <-- Ini sudah benar untuk fix SSR
    editorProps: {
      attributes: {
        class:
          "tiptap-surface min-h-dvh border rounded-md py-2 px-3 focus:outline-none",
      },

      // Drag & drop upload (MinIO)
      handleDragEnter(view: EditorView) {
        view.dom.classList.add("is-dragover");
        return false;
      },
      handleDragOver(view: EditorView, event: DragEvent) {
        const items = event.dataTransfer?.items;
        const hasImage =
          !!items &&
          Array.from(items).some((it) => it.kind === "file" && it.type.startsWith("image/"));
        if (hasImage) {
          event.preventDefault();
          view.dom.classList.add("is-dragover");
          return true;
        }
        return false;
      },
      handleDragLeave(view: EditorView) {
        view.dom.classList.remove("is-dragover");
        return false;
      },
      handleDrop(view: EditorView, event: DragEvent, _slice: Slice, _moved: boolean) {
        view.dom.classList.remove("is-dragover");

        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length === 0) return false;

        event.preventDefault();

        const coords = { left: event.clientX, top: event.clientY };
        const pos = view.posAtCoords(coords);
        if (pos) {
          editor?.chain().setTextSelection(pos.pos).focus().run();
        }

        (async () => {
          for (const file of files) {
            await uploader.insertFile(file); // <<— pakai hook
          }
        })();

        return true;
      },

      // Paste image upload (MinIO)
      handlePaste(_view: EditorView, event: ClipboardEvent) {
        const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
          f.type.startsWith("image/")
        );
        if (!file) return false;

        event.preventDefault();
        (async () => {
          await uploader.insertFile(file); // <<— pakai hook
        })();
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  // inisialisasi hook SETELAH editor ada
  const uploader = useImageUpload(editor ?? null);

  // sinkronisasi controlled content
  useEffect(() => {
    if (!editor) return;
    // Cek jika content benar-benar berbeda sebelum di-set
    if (content === null && (editor.isEmpty || editor.getJSON() === null)) {
      return; // Jangan set content jika keduanya sudah "kosong"
    }
    const cur = JSON.stringify(editor.getJSON());
    const nxt = JSON.stringify(content);
    if (cur !== nxt) {
      editor.commands.setContent(content, false); // 'false' mencegah 'onUpdate' ter-trigger
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <MenuBar editor={editor} />
      {/* (opsional) indikator progress upload */}
      {/* {uploader.uploading && (
        <div className="text-xs text-slate-500">
          Uploading… {Math.round(uploader.progress * 100)}%
        </div>
      )} */}
      <div className="tiptap prose prose-sm max-w-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// /* eslint-disable @typescript-eslint/no-unused-vars */
// // components/rich-text-editor/RichTextEditor.tsx
// "use client";

// import { useEffect } from "react";
// import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import TextAlign from "@tiptap/extension-text-align";
// import Highlight from "@tiptap/extension-highlight";
// import { TableKit } from "@tiptap/extension-table"; // pastikan importnya benar
// import Gapcursor from "@tiptap/extension-gapcursor";
// import Dropcursor from "@tiptap/extension-dropcursor";
// import MenuBar from "@/components/rich-text-editor/menu-bar";
// import type { EditorView } from "prosemirror-view";
// import type { Slice } from "prosemirror-model";

// import { ResizableImage } from "@/components/rich-text-editor/image-control/resizeable-image";
// import { useImageUpload } from "@/hooks/useImageUpload"; // <<— HOOK UPLOAD
// import "./style.scss";

// interface RichTextEditorProps {
//   content: JSONContent;
//   onChange: (content: JSONContent) => void;
// }

// export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
//   const editor = useEditor({
//     extensions: [
//       StarterKit.configure({
//         bulletList: { HTMLAttributes: { class: "list-disc ml-3" } },
//         orderedList: { HTMLAttributes: { class: "list-decimal ml-3" } },
//       }),
//       TableKit.configure({ resizable: true }),
//       Gapcursor,
//       Dropcursor,
//       TextAlign.configure({ types: ["heading", "paragraph"] }),
//       Highlight,
//       ResizableImage.configure({
//         inline: false,
//         allowBase64: false, // sudah upload ke MinIO → gak perlu base64
//       }),
//     ],
//     content,
//     immediatelyRender: false,
//     editorProps: {
//       attributes: {
//         class:
//           "tiptap-surface min-h-dvh border rounded-md py-2 px-3 focus:outline-none",
//       },

//       // Drag & drop upload (MinIO)
//       handleDragEnter(view: EditorView) {
//         view.dom.classList.add("is-dragover");
//         return false;
//       },
//       handleDragOver(view: EditorView, event: DragEvent) {
//         const items = event.dataTransfer?.items;
//         const hasImage =
//           !!items &&
//           Array.from(items).some((it) => it.kind === "file" && it.type.startsWith("image/"));
//         if (hasImage) {
//           event.preventDefault();
//           view.dom.classList.add("is-dragover");
//           return true;
//         }
//         return false;
//       },
//       handleDragLeave(view: EditorView) {
//         view.dom.classList.remove("is-dragover");
//         return false;
//       },
//       handleDrop(view: EditorView, event: DragEvent, _slice: Slice, _moved: boolean) {
//         view.dom.classList.remove("is-dragover");

//         const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
//           f.type.startsWith("image/")
//         );
//         if (files.length === 0) return false;

//         event.preventDefault();

//         const coords = { left: event.clientX, top: event.clientY };
//         const pos = view.posAtCoords(coords);
//         if (pos) {
//           editor?.chain().setTextSelection(pos.pos).focus().run();
//         }

//         (async () => {
//           for (const file of files) {
//             await uploader.insertFile(file); // <<— pakai hook
//           }
//         })();

//         return true;
//       },

//       // Paste image upload (MinIO)
//       handlePaste(_view: EditorView, event: ClipboardEvent) {
//         const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
//           f.type.startsWith("image/")
//         );
//         if (!file) return false;

//         event.preventDefault();
//         (async () => {
//           await uploader.insertFile(file); // <<— pakai hook
//         })();
//         return true;
//       },
//     },
//     onUpdate: ({ editor }) => onChange(editor.getJSON()),
//   });

//   // inisialisasi hook SETELAH editor ada
//   const uploader = useImageUpload(editor ?? null);

//   // sinkronisasi controlled content
//   useEffect(() => {
//     if (!editor) return;
//     const cur = JSON.stringify(editor.getJSON());
//     const nxt = JSON.stringify(content);
//     if (cur !== nxt) editor.commands.setContent(content);
//   }, [content, editor]);

//   if (!editor) return null;

//   return (
//     <div className="space-y-2">
//       <MenuBar editor={editor} />
//       {/* (opsional) indikator progress upload */}
//       {/* {uploader.uploading && (
//         <div className="text-xs text-slate-500">
//           Uploading… {Math.round(uploader.progress * 100)}%
//         </div>
//       )} */}
//       <div className="tiptap prose prose-sm max-w-none">
//         <EditorContent editor={editor} />
//       </div>
//     </div>
//   );
// }
