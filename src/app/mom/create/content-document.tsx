"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { JSONContent } from "@tiptap/react";

// Impor RichTextInput Anda yang sudah diperbarui (yang me-load editor secara dinamis)
import RichTextInput from "@/components/input/rich-text-input";

export interface MomContentSection {
  label: string;
  content: JSONContent | null | string;
}

interface ContentDocumentProps {
  onChange: (sections: MomContentSection[]) => void;
  initialContent?: MomContentSection[];
}

const defaultSections: MomContentSection[] = [
  { label: "Latar Belakang", content: null },
  { label: "Key Point", content: null },
];

export default function ContentDocument({ 
  onChange, 
  initialContent 
}: ContentDocumentProps) {
  
  const [sections, setSections] = useState<MomContentSection[]>(
    initialContent && initialContent.length > 0 ? initialContent : defaultSections
  );

  useEffect(() => {
    onChange(sections);
  }, [sections, onChange]);

  const updateSection = (index: number, newSection: Partial<MomContentSection>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...newSection };
    setSections(newSections);
  };

  const addSection = (index: number) => {
    const newSections = [...sections];
    newSections.splice(index, 0, { label: "Section Baru", content: null });
    setSections(newSections);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return; // Jangan hapus section terakhir
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    const [movedItem] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, movedItem);
    setSections(newSections);
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4">Content</h2>
      <div className="flex flex-col gap-6">
        {sections.map((section, index) => (
          <RichTextInput
            key={index} // Sebaiknya gunakan ID unik jika ada, tapi index OK untuk saat ini
            index={index}
            total={sections.length}
            title={section.label}
            initialContent={section.content} // Kirim initial content ke editor
            content={section.content as JSONContent} // Fallback
            onTitle={(v) => updateSection(index, { label: v })}
            onContent={(v) => updateSection(index, { content: v })}
            onAddBefore={() => addSection(index)}
            onAddAfter={() => addSection(index + 1)}
            onMoveUp={() => moveSection(index, 'up')}
            onMoveDown={() => moveSection(index, 'down')}
            onRemove={() => removeSection(index)}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => addSection(sections.length)} // Tambah di akhir
        className="mt-4 flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Tambah Section
      </Button>
    </div>
  );
}


// "use client";

// import { useMemo, useReducer, useRef, useEffect } from "react";
// import type { JSONContent } from "@tiptap/react";
// import { FaPlus } from "react-icons/fa";
// import RichTextInput from "@/components/input/rich-text-input";

// export type MomContentSection = { label: string; content: JSONContent };

// const DEFAULT_TITLES = [
//   "Latar Belakang",
//   "Key Point",
//   "Ruang lingkup dan deskripsi inisiatif Kerja Sama",
//   "Hak & Kewajiban",
//   // "Next Action",
// ] as const;

// const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// type Section = { id: string; label: string; content: JSONContent };

// type Action =
//   | { type: "add"; index: number; offset: -1 | 1 }
//   | { type: "addEnd" }
//   | { type: "remove"; index: number }
//   | { type: "move"; index: number; dir: -1 | 1 }
//   | { type: "update"; id: string; patch: Partial<Pick<Section, "label" | "content">> }
//   | { type: "resetDefault" };

// export default function ContentDocument({
//   onChange,
// }: {
//   onChange?: (sections: MomContentSection[]) => void;
// }) {
//   const seq = useRef(0);
//   const newId = () => `sec_${seq.current++}`;

//   const initialSections = useMemo<Section[]>(
//     () => DEFAULT_TITLES.map((t) => ({ id: newId(), label: t, content: EMPTY_DOC })),
//     []
//   );

//   const reducer = (state: Section[], action: Action): Section[] => {
//     switch (action.type) {
//       case "add": {
//         const idx = Math.max(0, Math.min(action.index + (action.offset === -1 ? 0 : 1), state.length));
//         const draft = [...state];
//         draft.splice(idx, 0, { id: newId(), label: "Bagian Baru", content: EMPTY_DOC });
//         return draft;
//       }
//       case "addEnd":
//         return [...state, { id: newId(), label: "Bagian Baru", content: EMPTY_DOC }];
//       case "remove":
//         return state.length <= 1 ? state : state.filter((_, i) => i !== action.index);
//       case "move": {
//         const from = action.index;
//         const to = from + action.dir;
//         if (to < 0 || to >= state.length) return state;
//         const draft = [...state];
//         [draft[from], draft[to]] = [draft[to], draft[from]];
//         return draft;
//       }
//       case "update":
//         return state.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s));
//       case "resetDefault":
//         return DEFAULT_TITLES.map((t) => ({ id: newId(), label: t, content: EMPTY_DOC }));
//       default:
//         return state;
//     }
//   };

//   const [sections, dispatch] = useReducer(reducer, initialSections);

//   // ⬇️ Emit ke parent dengan format { label, content }
//   useEffect(() => {
//     const formatted = sections.map((s) => ({
//       label: s.label,
//       content: s.content, // bisa juga stringify di sini kalau mau langsung disimpan
//     }));
//     onChange?.(formatted);
//   }, [sections, onChange]);

//   return (
//     <div className="w-full bg-white rounded-2xl shadow p-6 mb-6">
//       <Header onReset={() => dispatch({ type: "resetDefault" })} />

//       <div className="divide-y">
//         {sections.map((s, i) => (
//           <RichTextInput
//             key={s.id}
//             className="py-6"
//             index={i}
//             total={sections.length}
//             title={s.label}
//             content={s.content}
//             onTitle={(v) => dispatch({ type: "update", id: s.id, patch: { label: v } })}
//             onContent={(v) => dispatch({ type: "update", id: s.id, patch: { content: v } })}
//             onAddBefore={() => dispatch({ type: "add", index: i, offset: -1 })}
//             onAddAfter={() => dispatch({ type: "add", index: i, offset: 1 })}
//             onMoveUp={() => dispatch({ type: "move", index: i, dir: -1 })}
//             onMoveDown={() => dispatch({ type: "move", index: i, dir: 1 })}
//             onRemove={() => dispatch({ type: "remove", index: i })}
//           />
//         ))}
//       </div>

//       <div className="w-full flex items-center justify-center">
//         <button
//           onClick={() => dispatch({ type: "addEnd" })}
//           aria-label="Tambah Section"
//           className="flex items-center justify-center rounded-full border border-gray-300 p-2 hover:bg-gray-100 transition"
//         >
//           <FaPlus size={14} className="text-gray-600" />
//         </button>
//       </div>
//     </div>
//   );
// }

// function Header({ onReset }: { onReset: () => void }) {
//   return (
//     <div className="flex items-center gap-2">
//       <h2 className="text-lg font-bold text-gray-900 mr-auto">Konten MOM</h2>
//       <button
//         className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
//         onClick={onReset}
//       >
//         Reset ke Default
//       </button>
//     </div>
//   );
// }
